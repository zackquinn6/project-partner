-- Wave 1b–1d: AI project help chat (threads, messages, usage caps).
-- Apply in Supabase SQL Editor after Wave 1a rework/stuck migrations.

-- ---------------------------------------------------------------------------
-- help_threads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.help_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_run_id uuid REFERENCES public.project_runs (id) ON DELETE SET NULL,
  template_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  template_family text NOT NULL,
  step_id text,
  step_title text,
  phase_id text,
  phase_name text,
  title text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'escalated', 'archived')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_threads_user_id_idx ON public.help_threads (user_id);
CREATE INDEX IF NOT EXISTS help_threads_user_family_idx ON public.help_threads (user_id, template_family);
CREATE INDEX IF NOT EXISTS help_threads_run_idx ON public.help_threads (project_run_id);

ALTER TABLE public.help_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own help_threads" ON public.help_threads;
CREATE POLICY "Users select own help_threads"
  ON public.help_threads FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own help_threads" ON public.help_threads;
CREATE POLICY "Users insert own help_threads"
  ON public.help_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own help_threads" ON public.help_threads;
CREATE POLICY "Users update own help_threads"
  ON public.help_threads FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- help_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.help_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.help_threads (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  photo_paths text[] NOT NULL DEFAULT '{}',
  safety_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_messages_thread_id_idx ON public.help_messages (thread_id, created_at);

ALTER TABLE public.help_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own help_messages" ON public.help_messages;
CREATE POLICY "Users select own help_messages"
  ON public.help_messages FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own help_messages" ON public.help_messages;
CREATE POLICY "Users insert own help_messages"
  ON public.help_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.help_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- help_usage: rolling message counters (user messages counted toward cap)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.help_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS help_usage_user_period_idx ON public.help_usage (user_id, period_start, period_end);

ALTER TABLE public.help_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own help_usage" ON public.help_usage;
CREATE POLICY "Users select own help_usage"
  ON public.help_usage FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own help_usage" ON public.help_usage;
CREATE POLICY "Users insert own help_usage"
  ON public.help_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own help_usage" ON public.help_usage;
CREATE POLICY "Users update own help_usage"
  ON public.help_usage FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Cap helper: 20 user messages / rolling 7-day window
CREATE OR REPLACE FUNCTION public.get_help_usage_status(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  message_count bigint,
  message_cap integer,
  remaining integer,
  period_start timestamptz,
  period_end timestamptz,
  capped boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_start timestamptz := now() - interval '7 days';
  v_cap integer := 20;
  v_count bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_uid <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT count(*)::bigint INTO v_count
  FROM public.help_messages m
  WHERE m.user_id = v_uid
    AND m.role = 'user'
    AND m.created_at >= v_start;

  RETURN QUERY
  SELECT
    v_count,
    v_cap,
    greatest(v_cap - v_count, 0)::integer,
    v_start,
    now(),
    (v_count >= v_cap);
END;
$$;

REVOKE ALL ON FUNCTION public.get_help_usage_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_help_usage_status(uuid) TO authenticated;

-- Storage bucket for chat photos (private; path = {user_id}/...)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'help-chat-photos',
  'help-chat-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users read own help chat photos" ON storage.objects;
CREATE POLICY "Users read own help chat photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'help-chat-photos'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Users upload own help chat photos" ON storage.objects;
CREATE POLICY "Users upload own help chat photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'help-chat-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own help chat photos" ON storage.objects;
CREATE POLICY "Users delete own help chat photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'help-chat-photos'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );
