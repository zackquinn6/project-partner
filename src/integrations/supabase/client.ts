import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Supabase browser client — anon key only (never service_role).
 * URL and key must come from env; no baked-in fallbacks (avoids leaked keys in bundles / git).
 */
function readSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'Missing VITE_SUPABASE_URL. Add it to .env (see .env.example).',
    );
  }
  return url.trim();
}

function readSupabaseAnonKey(): string {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof anon === 'string' && anon.trim() !== '') {
    return anon.trim();
  }
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof publishable === 'string' && publishable.trim() !== '') {
    return publishable.trim();
  }
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. Add one to .env (see .env.example).',
  );
}

const SUPABASE_URL = readSupabaseUrl();
const SUPABASE_ANON_KEY = readSupabaseAnonKey();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
