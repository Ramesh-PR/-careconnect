import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 *
 * Reads the Project URL and Publishable (anon) Key from Vite environment variables (.env).
 * SECURITY RULE: Never place a Supabase `service_role` or `secret` key in frontend code!
 */
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Check if the user has added valid Supabase credentials in their .env file
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id');

// Safety check: Warn if someone accidentally pasted a service_role/secret key
if (supabaseAnonKey.startsWith('sb_secret_')) {
  console.error(
    'SECURITY ERROR: You pasted a Supabase secret key in VITE_SUPABASE_ANON_KEY. Please replace it with your publishable / anon public key immediately!'
  );
}

// Create the Supabase client only when valid credentials exist; otherwise null (Demo Mode)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

