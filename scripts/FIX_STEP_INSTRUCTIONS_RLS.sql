-- Fix: allow authenticated users to insert/update step_instructions they have access to.
-- Root cause: step_instructions INSERT/UPDATE was blocked by RLS (403 42501) when saving new instruction rows
-- via upsert in EditWorkflowView.
--
-- Policy approach:
-- - step_instructions.template_step_id -> operation_steps.id
-- - operation_steps.operation_id -> phase_operations.id
-- - phase_operations.phase_id -> project_phases.id
-- - project_phases.project_id -> projects.id
--
-- Access granted when the underlying project is owned by auth.uid() or the user is in project_owners.

BEGIN;

ALTER TABLE public.step_instructions ENABLE ROW LEVEL SECURITY;

-- INSERT
CREATE POLICY step_instructions_insert_authenticated
  ON public.step_instructions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.operation_steps os
      JOIN public.phase_operations po
        ON po.id = os.operation_id
      JOIN public.project_phases pp
        ON pp.id = po.phase_id
      JOIN public.projects p
        ON p.id = pp.project_id
      WHERE os.id = step_instructions.template_step_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_owners pov
            WHERE pov.project_id = pp.project_id
              AND pov.user_id = auth.uid()
          )
        )
    )
  );

-- UPDATE
CREATE POLICY step_instructions_update_authenticated
  ON public.step_instructions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.operation_steps os
      JOIN public.phase_operations po
        ON po.id = os.operation_id
      JOIN public.project_phases pp
        ON pp.id = po.phase_id
      JOIN public.projects p
        ON p.id = pp.project_id
      WHERE os.id = step_instructions.template_step_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_owners pov
            WHERE pov.project_id = pp.project_id
              AND pov.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.operation_steps os
      JOIN public.phase_operations po
        ON po.id = os.operation_id
      JOIN public.project_phases pp
        ON pp.id = po.phase_id
      JOIN public.projects p
        ON p.id = pp.project_id
      WHERE os.id = step_instructions.template_step_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_owners pov
            WHERE pov.project_id = pp.project_id
              AND pov.user_id = auth.uid()
          )
        )
    )
  );

-- DELETE (optional but keeps behavior consistent)
CREATE POLICY step_instructions_delete_authenticated
  ON public.step_instructions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.operation_steps os
      JOIN public.phase_operations po
        ON po.id = os.operation_id
      JOIN public.project_phases pp
        ON pp.id = po.phase_id
      JOIN public.projects p
        ON p.id = pp.project_id
      WHERE os.id = step_instructions.template_step_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_owners pov
            WHERE pov.project_id = pp.project_id
              AND pov.user_id = auth.uid()
          )
        )
    )
  );

COMMIT;

