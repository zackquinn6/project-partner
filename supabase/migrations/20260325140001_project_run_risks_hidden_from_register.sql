-- Risk-Less: hide predefined (template-linked) risks from the register without deleting them.

ALTER TABLE public.project_run_risks
  ADD COLUMN IF NOT EXISTS hidden_from_register boolean NOT NULL DEFAULT false;
