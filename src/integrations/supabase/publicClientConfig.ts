/**
 * Public Supabase settings for the browser client (anon / publishable JWT only).
 *
 * Why this file exists: some hosts (e.g. Lovable) do not offer project environment variables
 * for Vite. The web app still needs a URL and anon key at build time; they live here so deploys
 * work without host-specific env configuration.
 *
 * Security (Supabase’s model):
 * - This key is meant to ship to untrusted clients. It is not a secret in the same sense as
 *   `service_role`. Protect data with Row Level Security, and keep privileged logic in Edge
 *   Functions or other server code that uses the service role only on the server.
 * - Never add `service_role`, database passwords, or third-party API secrets to this file.
 * - If a key is exposed or rotated, update this file and redeploy; rotate in Supabase Dashboard
 *   → Project Settings → API as needed.
 */

export const SUPABASE_URL = 'https://drshvrukkavtpsprfcbc.supabase.co';

/** Anon or publishable key from the same API settings page (`role` in JWT must be `anon`). */
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyc2h2cnVra2F2dHBzcHJmY2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDQ5NDgsImV4cCI6MjA2ODE4MDk0OH0.yR61yCPJvqs_TVi5hmdmT7CF0QJKqr_lWR5TX25EwTc';
