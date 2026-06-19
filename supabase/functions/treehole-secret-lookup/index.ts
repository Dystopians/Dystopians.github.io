import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type LookupBody = {
  passcode?: unknown;
  sessionId?: unknown;
  clientMeta?: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const passcodeLength = 4;
const lookupWindowMs = 10 * 60 * 1000;
const maxLookupAttempts = 30;

const parseKeyMap = (value?: string | null): Record<string, string> => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    }
  } catch (_error) {
    // Fall through to the comma-separated parser.
  }

  return Object.fromEntries(
    value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf(':');
        if (separator === -1) return ['default', part] as const;
        return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] as const;
      })
      .filter((entry) => entry[1]),
  );
};

const json = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

const getSecretKey = () => {
  const direct =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SERVICE_ROLE_KEY') ||
    Deno.env.get('SB_SERVICE_ROLE_KEY');
  if (direct) return direct;

  const secretKeys = parseKeyMap(Deno.env.get('SUPABASE_SECRET_KEYS'));
  return secretKeys.default || Object.values(secretKeys)[0] || '';
};

const hasAllowedApiKey = (req: Request) => {
  const supplied = req.headers.get('apikey') || '';
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  const extraKeys = parseKeyMap(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'));
  return (
    Boolean(supplied) &&
    (supplied === publishable || Object.values(extraKeys).some((key) => supplied === key))
  );
};

const normalizeText = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : fallback;

const cleanPasscode = (value: unknown) => {
  const passcode = typeof value === 'string' ? value.trim() : '';
  return {
    passcode,
    valid: new RegExp(`^\\d{${passcodeLength}}$`).test(passcode),
  };
};

const toClientMeta = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowedKeys = [
    'timezone',
    'language',
    'languages',
    'platform',
    'screen',
    'viewport',
    'hardwareConcurrency',
    'deviceMemory',
  ];

  return Object.fromEntries(
    allowedKeys
      .map((key) => {
        const item = source[key];
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return [key, item] as const;
        }
        if (Array.isArray(item)) {
          return [
            key,
            item
              .filter((entry) => typeof entry === 'string')
              .slice(0, 6)
              .join(', '),
          ] as const;
        }
        if (item && typeof item === 'object') {
          return [key, JSON.stringify(item).slice(0, 240)] as const;
        }
        return null;
      })
      .filter((entry): entry is readonly [string, string | number | boolean] => Boolean(entry)),
  );
};

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const firstForwarded = forwarded.split(',')[0]?.trim();
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    firstForwarded ||
    ''
  ).slice(0, 120);
};

const hash = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const checkLookupRateLimit = async (
  supabase: ReturnType<typeof createClient>,
  ipHash: string,
  sessionHash: string,
) => {
  const since = new Date(Date.now() - lookupWindowMs).toISOString();
  const query = supabase
    .from('treehole_secret_lookups')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  if (sessionHash) {
    query.or(`ip_hash.eq.${ipHash},session_hash.eq.${sessionHash}`);
  } else {
    query.eq('ip_hash', ipHash);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count || 0) < maxLookupAttempts;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      },
    });
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed.' }, 405);
  }

  if (!hasAllowedApiKey(req)) {
    return json(req, { error: 'Unauthorized.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json(req, { error: 'Server is not configured.' }, 500);
  }

  let body: LookupBody;
  try {
    body = await req.json();
  } catch (_error) {
    return json(req, { error: 'Invalid JSON.' }, 400);
  }

  const passcodeResult = cleanPasscode(body.passcode);
  if (!passcodeResult.valid) {
    return json(req, { error: 'Invalid passcode.' }, 400);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  const salt = Deno.env.get('TREEHOLE_HASH_SALT') || supabaseUrl;
  const ip = getClientIp(req);
  const sessionId = normalizeText(body.sessionId);
  const clientMeta = toClientMeta(body.clientMeta);
  const ipHash = ip ? await hash(`${salt}:ip:${ip}`) : '';
  const sessionHash = sessionId ? await hash(`${salt}:session:${sessionId}`) : '';
  const passcodeHash = await hash(`${salt}:passcode:${passcodeResult.passcode}`);

  try {
    const allowed = await checkLookupRateLimit(supabase, ipHash, sessionHash);
    if (!allowed) {
      return json(req, { error: 'Too many attempts. Please try again later.' }, 429);
    }
  } catch (error) {
    console.error('Lookup rate limit error', error);
    return json(req, { error: 'Could not verify request.' }, 500);
  }

  const { data, error } = await supabase
    .from('treehole_messages')
    .select('id, nickname, content, created_at, owner_reply, owner_reply_at')
    .eq('is_secret', true)
    .eq('passcode_hash', passcodeHash)
    .neq('status', 'flagged')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Secret lookup error', error);
    return json(req, { error: 'Could not look up messages.' }, 500);
  }

  const resultCount = data?.length || 0;
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);

  const { error: logError } = await supabase.from('treehole_secret_lookups').insert({
    passcode_hash: passcodeHash,
    session_hash: sessionHash || null,
    ip_hash: ipHash || null,
    success: resultCount > 0,
    result_count: resultCount,
    client_ip: ip || null,
    user_agent: userAgent || null,
    metadata: {
      client: clientMeta,
      headers: {
        acceptLanguage: (req.headers.get('accept-language') || '').slice(0, 240),
        origin: (req.headers.get('origin') || '').slice(0, 240),
        referer: (req.headers.get('referer') || '').slice(0, 500),
      },
    },
  });

  if (logError) {
    console.error('Secret lookup log error', logError);
  }

  return json(req, {
    messages: (data || []).map((message) => ({
      id: message.id,
      nickname: message.nickname,
      content: message.content,
      created_at: message.created_at,
      owner_reply: message.owner_reply || null,
      owner_reply_at: message.owner_reply_at || null,
    })),
  });
});
