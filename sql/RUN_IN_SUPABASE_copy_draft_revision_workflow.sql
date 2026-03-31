-- =============================================================================
-- Run in Supabase SQL editor (same Supabase project as the app URL).
-- Copies workflow + PFMEA + risks from source project onto an EXISTING target
-- project row. The app inserts the target row via REST first (name set in JSON).
--
-- Requires public.rebuild_phases_json_from_project_phases(uuid).
-- =============================================================================

DROP FUNCTION IF EXISTS public.copy_draft_revision_workflow(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.copy_draft_revision_workflow(
  p_source_project_id uuid,
  p_target_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wf$
DECLARE
  r_phase public.project_phases%ROWTYPE;
  r_op public.phase_operations%ROWTYPE;
  r_step public.operation_steps%ROWTYPE;
  v_new_phase_id uuid;
  v_new_op_id uuid;
  v_new_step_id uuid;
  phase_map jsonb := '{}'::jsonb;
  op_map jsonb := '{}'::jsonb;
  step_map jsonb := '{}'::jsonb;
  r_fm public.pfmea_failure_modes%ROWTYPE;
  v_new_fm_id uuid;
  fm_map jsonb := '{}'::jsonb;
  r_eff public.pfmea_potential_effects%ROWTYPE;
  r_cause public.pfmea_potential_causes%ROWTYPE;
  v_new_cause_id uuid;
  cause_map jsonb := '{}'::jsonb;
  r_ctrl public.pfmea_controls%ROWTYPE;
  r_ai public.pfmea_action_items%ROWTYPE;
  v_old_fm_for_ctrl uuid;
  v_new_fm_for_ctrl uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_source_project_id) THEN
    RAISE EXCEPTION 'copy_draft_revision_workflow: source project not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_target_project_id) THEN
    RAISE EXCEPTION 'copy_draft_revision_workflow: target project not found';
  END IF;
  IF p_source_project_id = p_target_project_id THEN
    RAISE EXCEPTION 'copy_draft_revision_workflow: source and target must differ';
  END IF;
  FOR r_phase IN
    SELECT * FROM public.project_phases WHERE project_id = p_source_project_id ORDER BY id
  LOOP
    v_new_phase_id := gen_random_uuid();
    INSERT INTO public.project_phases (
      id,
      created_at,
      updated_at,
      description,
      is_linked,
      is_standard,
      name,
      position_rule,
      position_value,
      project_id,
      source_project_id
    ) VALUES (
      v_new_phase_id,
      now(),
      now(),
      r_phase.description,
      r_phase.is_linked,
      r_phase.is_standard,
      r_phase.name,
      r_phase.position_rule,
      r_phase.position_value,
      p_target_project_id,
      r_phase.source_project_id
    );
    phase_map := phase_map || jsonb_build_object(r_phase.id::text, v_new_phase_id::text);
  END LOOP;

  FOR r_op IN
    SELECT po.*
    FROM public.phase_operations po
    INNER JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = p_source_project_id
    ORDER BY po.id
  LOOP
    v_new_phase_id := (phase_map ->> r_op.phase_id::text)::uuid;
    IF v_new_phase_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: phase_operations % references unmapped phase %',
        r_op.id, r_op.phase_id;
    END IF;
    v_new_op_id := gen_random_uuid();
    INSERT INTO public.phase_operations (
      id,
      created_at,
      updated_at,
      display_order,
      estimated_time,
      flow_type,
      operation_description,
      operation_name,
      phase_id
    ) VALUES (
      v_new_op_id,
      now(),
      now(),
      r_op.display_order,
      r_op.estimated_time,
      r_op.flow_type,
      r_op.operation_description,
      r_op.operation_name,
      v_new_phase_id
    );
    op_map := op_map || jsonb_build_object(r_op.id::text, v_new_op_id::text);
  END LOOP;

  FOR r_step IN
    SELECT os.*
    FROM public.operation_steps os
    INNER JOIN public.phase_operations po ON po.id = os.operation_id
    INNER JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = p_source_project_id
    ORDER BY os.id
  LOOP
    v_new_op_id := (op_map ->> r_step.operation_id::text)::uuid;
    IF v_new_op_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: operation_steps % references unmapped operation %',
        r_step.id, r_step.operation_id;
    END IF;
    v_new_step_id := gen_random_uuid();
    INSERT INTO public.operation_steps (
      id,
      created_at,
      updated_at,
      allow_content_edit,
      apps,
      description,
      display_order,
      flow_type,
      materials,
      number_of_workers,
      operation_id,
      outputs,
      process_variables,
      skill_level,
      step_title,
      step_type,
      time_estimate_high,
      time_estimate_low,
      time_estimate_med,
      tools
    ) VALUES (
      v_new_step_id,
      now(),
      now(),
      r_step.allow_content_edit,
      r_step.apps,
      r_step.description,
      r_step.display_order,
      r_step.flow_type,
      r_step.materials,
      r_step.number_of_workers,
      v_new_op_id,
      r_step.outputs,
      r_step.process_variables,
      r_step.skill_level,
      r_step.step_title,
      r_step.step_type,
      r_step.time_estimate_high,
      r_step.time_estimate_low,
      r_step.time_estimate_med,
      r_step.tools
    );
    step_map := step_map || jsonb_build_object(r_step.id::text, v_new_step_id::text);
  END LOOP;

  FOR r_fm IN
    SELECT * FROM public.pfmea_failure_modes WHERE project_id = p_source_project_id ORDER BY id
  LOOP
    v_new_step_id := (step_map ->> r_fm.operation_step_id::text)::uuid;
    IF v_new_step_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_failure_modes % references unmapped operation_step %',
        r_fm.id, r_fm.operation_step_id;
    END IF;
    v_new_fm_id := gen_random_uuid();
    INSERT INTO public.pfmea_failure_modes (
      id,
      project_id,
      operation_step_id,
      requirement_output_id,
      failure_mode,
      severity_score,
      created_at,
      updated_at
    ) VALUES (
      v_new_fm_id,
      p_target_project_id,
      v_new_step_id,
      r_fm.requirement_output_id,
      r_fm.failure_mode,
      r_fm.severity_score,
      now(),
      now()
    );
    fm_map := fm_map || jsonb_build_object(r_fm.id::text, v_new_fm_id::text);
  END LOOP;

  FOR r_eff IN
    SELECT e.*
    FROM public.pfmea_potential_effects e
    INNER JOIN public.pfmea_failure_modes fm ON fm.id = e.failure_mode_id
    WHERE fm.project_id = p_source_project_id
    ORDER BY e.id
  LOOP
    v_new_fm_id := (fm_map ->> r_eff.failure_mode_id::text)::uuid;
    IF v_new_fm_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_potential_effects % unmapped failure_mode %',
        r_eff.id, r_eff.failure_mode_id;
    END IF;
    INSERT INTO public.pfmea_potential_effects (
      id,
      failure_mode_id,
      effect_description,
      severity_score,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_new_fm_id,
      r_eff.effect_description,
      r_eff.severity_score,
      now(),
      now()
    );
  END LOOP;

  FOR r_cause IN
    SELECT c.*
    FROM public.pfmea_potential_causes c
    INNER JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.project_id = p_source_project_id
    ORDER BY c.id
  LOOP
    v_new_fm_id := (fm_map ->> r_cause.failure_mode_id::text)::uuid;
    IF v_new_fm_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_potential_causes % unmapped failure_mode %',
        r_cause.id, r_cause.failure_mode_id;
    END IF;
    v_new_cause_id := gen_random_uuid();
    INSERT INTO public.pfmea_potential_causes (
      id,
      failure_mode_id,
      cause_description,
      occurrence_score,
      created_at,
      updated_at
    ) VALUES (
      v_new_cause_id,
      v_new_fm_id,
      r_cause.cause_description,
      r_cause.occurrence_score,
      now(),
      now()
    );
    cause_map := cause_map || jsonb_build_object(r_cause.id::text, v_new_cause_id::text);
  END LOOP;

  FOR r_ctrl IN
    SELECT DISTINCT c.*
    FROM public.pfmea_controls c
    WHERE c.failure_mode_id IN (SELECT id FROM public.pfmea_failure_modes WHERE project_id = p_source_project_id)
       OR c.cause_id IN (
         SELECT pc.id
         FROM public.pfmea_potential_causes pc
         INNER JOIN public.pfmea_failure_modes fm ON fm.id = pc.failure_mode_id
         WHERE fm.project_id = p_source_project_id
       )
    ORDER BY c.id
  LOOP
    v_old_fm_for_ctrl := COALESCE(
      r_ctrl.failure_mode_id,
      (SELECT pc.failure_mode_id FROM public.pfmea_potential_causes pc WHERE pc.id = r_ctrl.cause_id LIMIT 1)
    );
    IF v_old_fm_for_ctrl IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_controls % has no failure_mode_id and no resolvable cause',
        r_ctrl.id;
    END IF;
    v_new_fm_for_ctrl := (fm_map ->> v_old_fm_for_ctrl::text)::uuid;
    IF v_new_fm_for_ctrl IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_controls % unmapped failure_mode %',
        r_ctrl.id, v_old_fm_for_ctrl;
    END IF;
    INSERT INTO public.pfmea_controls (
      id,
      failure_mode_id,
      cause_id,
      control_type,
      control_description,
      detection_score,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      CASE
        WHEN r_ctrl.failure_mode_id IS NOT NULL THEN v_new_fm_for_ctrl
        ELSE NULL
      END,
      CASE
        WHEN r_ctrl.cause_id IS NOT NULL THEN (cause_map ->> r_ctrl.cause_id::text)::uuid
        ELSE NULL
      END,
      r_ctrl.control_type,
      r_ctrl.control_description,
      r_ctrl.detection_score,
      now(),
      now()
    );
  END LOOP;

  FOR r_ai IN
    SELECT ai.*
    FROM public.pfmea_action_items ai
    INNER JOIN public.pfmea_failure_modes fm ON fm.id = ai.failure_mode_id
    WHERE fm.project_id = p_source_project_id
    ORDER BY ai.id
  LOOP
    v_new_fm_id := (fm_map ->> r_ai.failure_mode_id::text)::uuid;
    IF v_new_fm_id IS NULL THEN
      RAISE EXCEPTION 'copy_draft_revision_workflow: pfmea_action_items % unmapped failure_mode %',
        r_ai.id, r_ai.failure_mode_id;
    END IF;
    INSERT INTO public.pfmea_action_items (
      id,
      failure_mode_id,
      recommended_action,
      responsible_person,
      target_completion_date,
      status,
      completion_notes,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_new_fm_id,
      r_ai.recommended_action,
      r_ai.responsible_person,
      r_ai.target_completion_date,
      r_ai.status,
      r_ai.completion_notes,
      now(),
      now()
    );
  END LOOP;

  INSERT INTO public.project_risks (
    id,
    created_at,
    updated_at,
    benefit,
    budget_impact_high,
    budget_impact_low,
    display_order,
    impact,
    likelihood,
    mitigation_actions,
    mitigation_cost,
    mitigation_strategy,
    project_id,
    recommendation,
    risk_description,
    risk_title,
    schedule_impact_high_days,
    schedule_impact_low_days,
    severity
  )
  SELECT
    gen_random_uuid(),
    now(),
    now(),
    pr.benefit,
    pr.budget_impact_high,
    pr.budget_impact_low,
    pr.display_order,
    pr.impact,
    pr.likelihood,
    pr.mitigation_actions,
    pr.mitigation_cost,
    pr.mitigation_strategy,
    p_target_project_id,
    pr.recommendation,
    pr.risk_description,
    pr.risk_title,
    pr.schedule_impact_high_days,
    pr.schedule_impact_low_days,
    pr.severity
  FROM public.project_risks pr
  WHERE pr.project_id = p_source_project_id;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(p_target_project_id)
  WHERE id = p_target_project_id;

  RETURN p_target_project_id;
END;
$wf$;

COMMENT ON FUNCTION public.copy_draft_revision_workflow(uuid, uuid) IS
  'Copy phases/ops/steps/PFMEA/risks from source project to existing target project; rebuilds phases JSON.';

GRANT EXECUTE ON FUNCTION public.copy_draft_revision_workflow(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_draft_revision_workflow(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
