-- Per-user, per-home mitigation status for catalog rows in public.homes_risks.
-- Referenced by HomeDetailsWindow (Manage Home → Projects & maintenance).

CREATE TABLE IF NOT EXISTS public.home_risk_mitigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes (id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES public.homes_risks (id) ON DELETE CASCADE,
  is_mitigated BOOLEAN NOT NULL DEFAULT false,
  mitigation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT home_risk_mitigations_user_home_risk_unique UNIQUE (user_id, home_id, risk_id)
);

CREATE INDEX IF NOT EXISTS home_risk_mitigations_user_home_idx
  ON public.home_risk_mitigations (user_id, home_id);

ALTER TABLE public.home_risk_mitigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_risk_mitigations_select_own"
  ON public.home_risk_mitigations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "home_risk_mitigations_insert_own"
  ON public.home_risk_mitigations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "home_risk_mitigations_update_own"
  ON public.home_risk_mitigations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "home_risk_mitigations_delete_own"
  ON public.home_risk_mitigations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
