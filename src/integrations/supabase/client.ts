import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './publicClientConfig';

/**
 * Supabase browser client — anon key only (never service_role).
 * URL and key come from `publicClientConfig.ts` so deploys work without host env vars; see that
 * file for the security model (RLS + server-side secrets).
 */
function readSupabaseUrl(): string {
  const url = SUPABASE_URL.trim();
  if (url === '') {
    throw new Error('SUPABASE_URL is empty in publicClientConfig.ts.');
  }
  return url;
}

function readSupabaseAnonKey(): string {
  const key = SUPABASE_ANON_KEY.trim();
  if (key === '') {
    throw new Error('SUPABASE_ANON_KEY is empty in publicClientConfig.ts.');
  }
  return key;
}

const resolvedUrl = readSupabaseUrl();
const resolvedKey = readSupabaseAnonKey();

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'project-partner-web',
    },
  },
});
