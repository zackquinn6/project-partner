-- Wave 1a: Rework events + anonymized stuck-point capture (foundation for AI help chat).
-- RLS: users manage their own rows; admins can read all; aggregates via security definer RPC.
--
-- Apply in Supabase SQL Editor after reviewing.

-- ---------------------------------------------------------------------------
-- rework_events: durable recovery plans tied to a project run / step
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rework_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  template_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  template_family text,
  phase_id text,
  phase_name text,
  step_id text,
  step_title text,
  triage_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('minor', 'critical', 'delay', 'stop')),
  comments text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  recovery_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'applied', 'resolved', 'cancelled')),
  applied_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rework_events_user_id_idx ON public.rework_events (user_id);
CREATE INDEX IF NOT EXISTS rework_events_project_run_id_idx ON public.rework_events (project_run_id);
CREATE INDEX IF NOT EXISTS rework_events_template_family_step_idx
  ON public.rework_events (template_family, step_id);

ALTER TABLE public.rework_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own rework_events" ON public.rework_events;
CREATE POLICY "Users select own rework_events"
  ON public.rework_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own rework_events" ON public.rework_events;
CREATE POLICY "Users insert own rework_events"
  ON public.rework_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own rework_events" ON public.rework_events;
CREATE POLICY "Users update own rework_events"
  ON public.rework_events FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users delete own rework_events" ON public.rework_events;
CREATE POLICY "Users delete own rework_events"
  ON public.rework_events FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- stuck_events: learning / cross-user hotspot feed (PII kept for RLS; aggregates strip it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stuck_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_run_id uuid REFERENCES public.project_runs (id) ON DELETE SET NULL,
  template_project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  template_family text,
  phase_id text,
  step_id text,
  step_title text,
  triage_type text NOT NULL,
  resolution_action text,
  rework_event_id uuid REFERENCES public.rework_events (id) ON DELETE SET NULL,
  time_to_unstick_seconds integer,
  thumbs smallint CHECK (thumbs IS NULL OR thumbs IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stuck_events_family_step_idx
  ON public.stuck_events (template_family, step_id, triage_type);
CREATE INDEX IF NOT EXISTS stuck_events_user_id_idx ON public.stuck_events (user_id);

ALTER TABLE public.stuck_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own stuck_events" ON public.stuck_events;
CREATE POLICY "Users select own stuck_events"
  ON public.stuck_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own stuck_events" ON public.stuck_events;
CREATE POLICY "Users insert own stuck_events"
  ON public.stuck_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own stuck_events" ON public.stuck_events;
CREATE POLICY "Users update own stuck_events"
  ON public.stuck_events FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Anonymized aggregates for "Others got stuck here" (no user_id returned)
CREATE OR REPLACE FUNCTION public.get_step_stuck_aggregates(
  p_template_family text,
  p_step_id text DEFAULT NULL
)
RETURNS TABLE (
  step_id text,
  triage_type text,
  event_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.step_id,
    s.triage_type,
    count(*)::bigint AS event_count
  FROM public.stuck_events s
  WHERE s.template_family = p_template_family
    AND (p_step_id IS NULL OR s.step_id = p_step_id)
  GROUP BY s.step_id, s.triage_type
  ORDER BY event_count DESC;
$$;

REVOKE ALL ON FUNCTION public.get_step_stuck_aggregates(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_step_stuck_aggregates(text, text) TO authenticated;
