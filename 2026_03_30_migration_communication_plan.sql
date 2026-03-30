-- Communication Plan add-on: per-project-run stakeholders, schedule, triggers, outbound log.
-- Apply via your usual Supabase migration process.

CREATE TABLE IF NOT EXISTS public.project_communication_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  sms_early_access_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_communication_plans_project_run_id_key UNIQUE (project_run_id)
);

CREATE TABLE IF NOT EXISTS public.communication_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.project_communication_plans (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role_label text NOT NULL,
  concerns text[] NOT NULL DEFAULT '{}',
  preferred_frequency text NOT NULL
    CHECK (preferred_frequency IN ('as_needed', 'weekly', 'biweekly', 'monthly', 'milestone')),
  delivery_method text NOT NULL
    CHECK (delivery_method IN ('email', 'sms', 'off_app')),
  email text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_stakeholders_email_when_email_delivery
    CHECK (delivery_method <> 'email' OR (email IS NOT NULL AND length(trim(email)) > 0))
);

CREATE TABLE IF NOT EXISTS public.communication_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.project_communication_plans (id) ON DELETE CASCADE,
  stakeholder_id uuid REFERENCES public.communication_stakeholders (id) ON DELETE CASCADE,
  template_key text NOT NULL,
  cadence text NOT NULL
    CHECK (cadence IN ('once', 'weekly', 'biweekly', 'monthly')),
  next_due_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_trigger_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.project_communication_plans (id) ON DELETE CASCADE,
  trigger_type text NOT NULL
    CHECK (trigger_type IN (
      'task_slip',
      'risk_active',
      'budget_overage',
      'milestone_complete',
      'decision_needed'
    )),
  enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT communication_trigger_rules_plan_type_key UNIQUE (plan_id, trigger_type)
);

CREATE TABLE IF NOT EXISTS public.communication_outbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.project_communication_plans (id) ON DELETE CASCADE,
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  stakeholder_id uuid REFERENCES public.communication_stakeholders (id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'off_app_copy')),
  recipient_email text,
  subject text NOT NULL,
  body_text text NOT NULL,
  template_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS communication_schedule_items_plan_next_due_idx
  ON public.communication_schedule_items (plan_id, next_due_at);

CREATE INDEX IF NOT EXISTS communication_outbound_log_run_sent_idx
  ON public.communication_outbound_log (project_run_id, sent_at DESC);

-- updated_at on plan
CREATE OR REPLACE FUNCTION public.set_project_communication_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_communication_plans_set_updated_at ON public.project_communication_plans;
CREATE TRIGGER project_communication_plans_set_updated_at
  BEFORE UPDATE ON public.project_communication_plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_project_communication_plans_updated_at();

ALTER TABLE public.project_communication_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_outbound_log ENABLE ROW LEVEL SECURITY;

-- Idempotent: safe if migration is re-run after partial apply
DROP POLICY IF EXISTS "project_communication_plans_owner_all" ON public.project_communication_plans;
CREATE POLICY "project_communication_plans_owner_all"
  ON public.project_communication_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_communication_plans.project_run_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = project_communication_plans.project_run_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "communication_stakeholders_owner_all" ON public.communication_stakeholders;
CREATE POLICY "communication_stakeholders_owner_all"
  ON public.communication_stakeholders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_stakeholders.plan_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_stakeholders.plan_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "communication_schedule_items_owner_all" ON public.communication_schedule_items;
CREATE POLICY "communication_schedule_items_owner_all"
  ON public.communication_schedule_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_schedule_items.plan_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_schedule_items.plan_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "communication_trigger_rules_owner_all" ON public.communication_trigger_rules;
CREATE POLICY "communication_trigger_rules_owner_all"
  ON public.communication_trigger_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_trigger_rules.plan_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_communication_plans p
      JOIN public.project_runs pr ON pr.id = p.project_run_id
      WHERE p.id = communication_trigger_rules.plan_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "communication_outbound_log_owner_all" ON public.communication_outbound_log;
CREATE POLICY "communication_outbound_log_owner_all"
  ON public.communication_outbound_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = communication_outbound_log.project_run_id
        AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = communication_outbound_log.project_run_id
        AND pr.user_id = auth.uid()
    )
  );
