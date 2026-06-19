import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type MessageBody = {
  nickname?: unknown;
  content?: unknown;
  mood?: unknown;
  sessionId?: unknown;
  turnstileToken?: unknown;
};

const allowedOrigins = new Set([
  'http://127.0.0.1:4000',
  'http://localhost:4000',
  'https://caipeilin.com',
  'https://www.caipeilin.com',
  'https://dystopians.github.io',
]);

const allowedMoods = new Set(['whisper', 'spark', 'rain', 'memory', 'question']);
const contentMinLength = 2;
const contentMaxLength = 800;
const nicknameMaxLength = 24;
const cooldownMs = 60_000;
const dailySessionLimit = 12;
const dailyIpLimit = 40;

const corsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://caipeilin.com';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
};

const json = (req: Request, body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    },
  });

const parseKeyMap = (value: string | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
};

const getSecretKey = () => {
  const legacyServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyServiceRole) return legacyServiceRole;

  const secretKeys = parseKeyMap(Deno.env.get('SUPABASE_SECRET_KEYS'));
  return secretKeys.default || Object.values(secretKeys)[0] || '';
};

const hasAllowedApiKey = (req: Request) => {
  const publishableKeys = parseKeyMap(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'));
  const knownKeys = Object.values(publishableKeys).filter(Boolean);
  if (knownKeys.length === 0) return true;

  const providedKey = req.headers.get('apikey') || '';
  return knownKeys.includes(providedKey);
};

const cleanNickname = (value: unknown) => {
  const raw = typeof value === 'string' ? value : '';
  const normalized = raw.normalize('NFKC')
    .replace(/[<>{}[\]\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (normalized || 'Anonymous').slice(0, nicknameMaxLength);
};

const cleanContent = (value: unknown) => {
  const raw = typeof value === 'string' ? value : '';
  return raw.normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, contentMaxLength);
};

const cleanMood = (value: unknown) => {
  const mood = typeof value === 'string' ? value : 'whisper';
  return allowedMoods.has(mood) ? mood : 'whisper';
};

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.headers.get('cf-connecting-ip') || forwarded || 'unknown';
};

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const verifyTurnstile = async (token: unknown, req: Request) => {
  const secret = Deno.env.get('TREEHOLE_TURNSTILE_SECRET_KEY') || Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return { ok: true };

  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, error: 'Verification is required.' };
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  form.set('remoteip', getClientIp(req));

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const result = await response.json().catch(() => null);
  return result?.success ? { ok: true } : { ok: false, error: 'Verification failed.' };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed.' }, 405);
  }

  if (!hasAllowedApiKey(req)) {
    return json(req, { error: 'Unauthorized request.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json(req, { error: 'Missing server configuration.' }, 500);
  }

  let body: MessageBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Invalid JSON body.' }, 400);
  }

  const nickname = cleanNickname(body.nickname);
  const content = cleanContent(body.content);
  const mood = cleanMood(body.mood);
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

  if (sessionId.length < 8 || sessionId.length > 128) {
    return json(req, { error: 'Invalid session.' }, 400);
  }

  if (content.length < contentMinLength) {
    return json(req, { error: 'Message is too short.' }, 400);
  }

  const turnstile = await verifyTurnstile(body.turnstileToken, req);
  if (!turnstile.ok) {
    return json(req, { error: turnstile.error || 'Verification failed.' }, 403);
  }

  const salt = Deno.env.get('TREEHOLE_HASH_SALT') || supabaseUrl;
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const sessionHash = await hash(`${salt}:session:${sessionId}`);
  const ipHash = await hash(`${salt}:ip:${ip}`);
  const userAgentHash = await hash(`${salt}:ua:${userAgent}`);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const recentSince = new Date(Date.now() - cooldownMs).toISOString();
  const { data: recentRows, error: recentError } = await supabase
    .from('treehole_messages')
    .select('id')
    .or(`session_hash.eq.${sessionHash},ip_hash.eq.${ipHash}`)
    .gte('created_at', recentSince)
    .limit(1);

  if (recentError) {
    return json(req, { error: 'Unable to check rate limit.' }, 500);
  }

  if (recentRows && recentRows.length > 0) {
    return json(req, { error: 'Please wait a minute before leaving another note.' }, 429);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { count: sessionCount, error: sessionCountError } = await supabase
    .from('treehole_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_hash', sessionHash)
    .gte('created_at', today.toISOString());

  if (sessionCountError) {
    return json(req, { error: 'Unable to check daily limit.' }, 500);
  }

  if ((sessionCount || 0) >= dailySessionLimit) {
    return json(req, { error: 'Daily note limit reached.' }, 429);
  }

  const { count: ipCount, error: ipCountError } = await supabase
    .from('treehole_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', today.toISOString());

  if (ipCountError) {
    return json(req, { error: 'Unable to check daily limit.' }, 500);
  }

  if ((ipCount || 0) >= dailyIpLimit) {
    return json(req, { error: 'Daily note limit reached.' }, 429);
  }

  const defaultStatus = Deno.env.get('TREEHOLE_DEFAULT_STATUS') === 'hidden'
    ? 'hidden'
    : 'published';

  const { data, error } = await supabase
    .from('treehole_messages')
    .insert({
      nickname,
      content,
      mood,
      status: defaultStatus,
      session_hash: sessionHash,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: {
        referrer: req.headers.get('referer') || null,
      },
    })
    .select('id, nickname, content, mood, created_at, status')
    .single();

  if (error || !data) {
    return json(req, { error: 'Unable to save message.' }, 500);
  }

  return json(req, {
    message: {
      id: data.id,
      nickname: data.nickname,
      content: data.content,
      mood: data.mood,
      created_at: data.created_at,
      status: data.status,
    },
  });
});
