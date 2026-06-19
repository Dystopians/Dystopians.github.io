import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type MessageBody = {
  nickname?: unknown;
  email?: unknown;
  content?: unknown;
  isSecret?: unknown;
  passcode?: unknown;
  website?: unknown;
  turnstileToken?: unknown;
  sessionId?: unknown;
  clientMeta?: unknown;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds?: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const maxNicknameLength = 32;
const maxEmailLength = 254;
const maxContentLength = 800;
const passcodeLength = 4;
const rateLimitWindowMs = 60 * 60 * 1000;
const maxMessagesPerWindow = 8;

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

const normalizeMultilineText = (value: unknown) =>
  typeof value === 'string'
    ? value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : '';

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const cleanPasscode = (value: unknown) => {
  const passcode = typeof value === 'string' ? value.trim() : '';
  return {
    passcode,
    valid: new RegExp(`^\\d{${passcodeLength}}$`).test(passcode),
  };
};

const isValidEmail = (email: string) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

const verifyTurnstile = async (token: unknown, ip: string) => {
  const secret = Deno.env.get('TREEHOLE_TURNSTILE_SECRET_KEY') || Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return { ok: true };
  if (typeof token !== 'string' || !token.trim()) return { ok: false, status: 400, error: 'Missing verification.' };

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  return result.success ? { ok: true } : { ok: false, status: 403, error: 'Verification failed.' };
};

const checkRateLimit = async (
  supabase: ReturnType<typeof createClient>,
  ipHash: string,
  sessionHash: string,
): Promise<RateLimitResult> => {
  const since = new Date(Date.now() - rateLimitWindowMs).toISOString();
  const query = supabase
    .from('treehole_messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  if (sessionHash) {
    query.or(`ip_hash.eq.${ipHash},session_hash.eq.${sessionHash}`);
  } else {
    query.eq('ip_hash', ipHash);
  }

  const { count, error } = await query;
  if (error) throw error;
  if ((count || 0) >= maxMessagesPerWindow) {
    return { ok: false, retryAfterSeconds: Math.ceil(rateLimitWindowMs / 1000) };
  }
  return { ok: true };
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

  let body: MessageBody;
  try {
    body = await req.json();
  } catch (_error) {
    return json(req, { error: 'Invalid JSON.' }, 400);
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return json(req, { ok: true });
  }

  const ip = getClientIp(req);
  const verification = await verifyTurnstile(body.turnstileToken, ip);
  if (!verification.ok) {
    return json(req, { error: verification.error }, verification.status);
  }

  const nickname = normalizeText(body.nickname, 'Anonymous') || 'Anonymous';
  const email = normalizeEmail(body.email);
  const content = normalizeMultilineText(body.content);
  const providedSessionId = normalizeText(body.sessionId);
  const clientMeta = toClientMeta(body.clientMeta);
  const isSecret = body.isSecret === true;
  const passcodeResult = cleanPasscode(body.passcode);

  if (nickname.length > maxNicknameLength) {
    return json(req, { error: 'Nickname is too long.' }, 400);
  }

  if (email.length > maxEmailLength || !isValidEmail(email)) {
    return json(req, { error: 'Email is invalid.' }, 400);
  }

  if (content.length < 2 || content.length > maxContentLength) {
    return json(req, { error: 'Message must be between 2 and 800 characters.' }, 400);
  }

  if (isSecret && !passcodeResult.valid) {
    return json(req, { error: 'Invalid passcode.' }, 400);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
  const salt = Deno.env.get('TREEHOLE_HASH_SALT') || supabaseUrl;
  const sessionId =
    providedSessionId ||
    `${ip || 'unknown-ip'}:${userAgent || 'unknown-agent'}:${crypto.randomUUID()}`;
  const ipHash = ip ? await hash(`${salt}:ip:${ip}`) : '';
  const sessionHash = await hash(`${salt}:session:${sessionId}`);
  const passcodeHash = isSecret ? await hash(`${salt}:passcode:${passcodeResult.passcode}`) : null;

  try {
    const rateLimit = await checkRateLimit(supabase, ipHash, sessionHash);
    if (!rateLimit.ok) {
      return json(
        req,
        {
          error: 'Too many messages. Please try again later.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        429,
      );
    }
  } catch (error) {
    console.error('Rate limit error', error);
    return json(req, { error: 'Could not verify request.' }, 500);
  }

  const recentCutoff = new Date(Date.now() - 30_000).toISOString();
  const { count: duplicateCount, error: duplicateError } = await supabase
    .from('treehole_messages')
    .select('id', { count: 'exact', head: true })
    .eq('content_hash', await hash(`${salt}:content:${content}`))
    .gte('created_at', recentCutoff);

  if (duplicateError) {
    console.error('Duplicate check error', duplicateError);
    return json(req, { error: 'Could not submit message.' }, 500);
  }

  if ((duplicateCount || 0) > 0) {
    return json(req, { error: 'Duplicate message.' }, 409);
  }

  const acceptLanguage = (req.headers.get('accept-language') || '').slice(0, 240);
  const referer = (req.headers.get('referer') || '').slice(0, 500);
  const origin = (req.headers.get('origin') || '').slice(0, 240);
  const cfCountry = (req.headers.get('cf-ipcountry') || '').slice(0, 12);
  const metadata = {
    client: clientMeta,
    headers: {
      host: req.headers.get('host') || '',
      forwardedProto: req.headers.get('x-forwarded-proto') || '',
    },
  };
  const defaultStatus = isSecret
    ? 'hidden'
    : Deno.env.get('TREEHOLE_DEFAULT_STATUS') === 'hidden'
      ? 'hidden'
      : 'published';

  const { data, error } = await supabase
    .from('treehole_messages')
    .insert({
      nickname,
      email: email || null,
      content,
      content_hash: await hash(`${salt}:content:${content}`),
      ip_hash: ipHash || null,
      session_hash: sessionHash,
      status: defaultStatus,
      is_secret: isSecret,
      passcode_hash: passcodeHash,
      client_ip: ip || null,
      user_agent: userAgent || null,
      accept_language: acceptLanguage || null,
      referer: referer || null,
      origin: origin || null,
      cf_country: cfCountry || null,
      client_timezone: typeof clientMeta.timezone === 'string' ? clientMeta.timezone : null,
      client_language: typeof clientMeta.language === 'string' ? clientMeta.language : null,
      client_platform: typeof clientMeta.platform === 'string' ? clientMeta.platform : null,
      client_screen: typeof clientMeta.screen === 'string' ? clientMeta.screen : null,
      client_viewport: typeof clientMeta.viewport === 'string' ? clientMeta.viewport : null,
      metadata,
    })
    .select('id, nickname, content, created_at, status, is_secret')
    .single();

  if (error) {
    console.error('Insert error', error);
    return json(req, { error: 'Could not submit message.' }, 500);
  }

  return json(req, {
    message: {
      id: data.id,
      nickname: data.nickname,
      content: data.content,
      created_at: data.created_at,
      status: data.status,
      is_secret: data.is_secret,
    },
  });
});
