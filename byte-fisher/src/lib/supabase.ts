import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let client: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
