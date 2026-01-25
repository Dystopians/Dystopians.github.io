import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  name: string;
  message: string;
  sessionId: string;
  token: string;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');

  if (!supabaseUrl || !serviceRoleKey || !turnstileSecret) {
    return json(500, { error: 'Missing server configuration.' });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const { name, message, sessionId, token } = payload;
  if (!name || !message || !sessionId || !token) {
    return json(400, { error: 'Missing required fields.' });
  }

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: turnstileSecret,
      response: token,
      remoteip: req.headers.get('x-forwarded-for') ?? '',
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyJson.success) {
    return json(403, { error: 'Turnstile validation failed.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: lastRows } = await supabase
    .from('bytefisher_messages')
    .select('created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (lastRows?.[0]) {
    const lastAt = new Date(lastRows[0].created_at).getTime();
    if (Date.now() - lastAt < 300000) {
      return json(429, { error: 'Cooldown in effect.' });
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('bytefisher_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .gte('created_at', startOfDay.toISOString());

  if ((count ?? 0) >= 5) {
    return json(429, { error: 'Daily limit reached.' });
  }

  const { data, error } = await supabase
    .from('bytefisher_messages')
    .insert({
      name: name.slice(0, 12),
      message: message.slice(0, 50),
      session_id: sessionId,
    })
    .select('id, name, message, created_at')
    .single();

  if (error || !data) {
    return json(500, { error: 'Insert failed.' });
  }

  return json(200, { message: data });
});
