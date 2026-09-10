import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';
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

/** Lovable editor iframes often block third-party auth refresh (Tracking Prevention → Failed to fetch). */
function isLovablePreviewFrame(): boolean {
  if (typeof window === 'undefined') return false;
  const framed = window.parent !== window;
  if (!framed) return false;
  const host = window.location.hostname;
  return (
    host === 'lovable.app' ||
    host.endsWith('.lovable.app') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host.endsWith('.lovableproject-dev.com') ||
    host.endsWith('.gpt-eng.com') ||
    host.endsWith('.gptengineer.run')
  );
}

const inLovablePreviewFrame = isLovablePreviewFrame();

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    // Avoid noisy Failed-to-fetch refresh loops inside the Lovable editor iframe.
    autoRefreshToken: !inLovablePreviewFrame,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'project-partner-web',
    },
  },
});
