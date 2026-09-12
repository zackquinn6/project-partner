-- Fix draft revision deep-copy: remap scheduling_prerequisites / decision-tree IDs,
-- copy step_instructions, preserve true linked phases (source_phase_id), clear
-- self-links to the prior revision, copy project_hidden_operations, and patch
-- decision-detail fields onto projects.phases after rebuild.
--
-- Replaces public.copy_draft_revision_workflow_internal (auth wrapper unchanged).

-- ---------------------------------------------------------------------------
-- Helpers: remap workflow UUIDs inside scheduling_prerequisites JSON
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remap_id_text_via_map(p_id text, p_id_map jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_id IS NULL OR length(btrim(p_id)) = 0 THEN p_id
    WHEN p_id_map ? p_id THEN p_id_map ->> p_id
    ELSE p_id
  END;
$$;

CREATE OR REPLACE FUNCTION public.remap_id_array_via_map(p_arr jsonb, p_id_map jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_elem text;
BEGIN
  IF p_arr IS NULL OR jsonb_typeof(p_arr) <> 'array' THEN
    RETURN p_arr;
  END IF;
  FOR v_elem IN SELECT jsonb_array_elements_text(p_arr)
  LOOP
    v_out := v_out || jsonb_build_array(public.remap_id_text_via_map(v_elem, p_id_map));
  END LOOP;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.remap_scheduling_prerequisites_for_revision(
  p_prereqs jsonb,
  p_id_map jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_new_key text;
  v_dtc jsonb;
  v_dtc_out jsonb := '{}'::jsonb;
  v_entity_key text;
  v_entity jsonb;
  v_entity_out jsonb;
  v_new_entity_key text;
BEGIN
  IF p_prereqs IS NULL OR jsonb_typeof(p_prereqs) <> 'object' THEN
    RETURN COALESCE(p_prereqs, '{}'::jsonb);
  END IF;

  FOR v_key, v_val IN SELECT key, value FROM jsonb_each(p_prereqs)
  LOOP
    IF v_key = '__general_project_decisions__' THEN
      v_out := v_out || jsonb_build_object(v_key, v_val);
      CONTINUE;
    END IF;

    IF v_key = '__decision_tree_config__' THEN
      IF jsonb_typeof(v_val) = 'object' THEN
        v_dtc := v_val;
        FOR v_entity_key, v_entity IN SELECT key, value FROM jsonb_each(v_dtc)
        LOOP
          v_new_entity_key := public.remap_id_text_via_map(v_entity_key, p_id_map);
          IF jsonb_typeof(v_entity) = 'object' THEN
            v_entity_out := v_entity;
            IF v_entity_out ? 'alternateIds' THEN
              v_entity_out := jsonb_set(
                v_entity_out,
                '{alternateIds}',
                public.remap_id_array_via_map(v_entity_out -> 'alternateIds', p_id_map),
                true
              );
            END IF;
            IF v_entity_out ? 'predecessorIds' THEN
              v_entity_out := jsonb_set(
                v_entity_out,
                '{predecessorIds}',
                public.remap_id_array_via_map(v_entity_out -> 'predecessorIds', p_id_map),
                true
              );
            END IF;
            IF v_entity_out ? 'dependentOn'
               AND jsonb_typeof(v_entity_out -> 'dependentOn') = 'string' THEN
              v_entity_out := jsonb_set(
                v_entity_out,
                '{dependentOn}',
                to_jsonb(
                  public.remap_id_text_via_map(v_entity_out ->> 'dependentOn', p_id_map)
                ),
                true
              );
            END IF;
          ELSE
            v_entity_out := v_entity;
          END IF;
          v_dtc_out := v_dtc_out || jsonb_build_object(v_new_entity_key, v_entity_out);
        END LOOP;
        v_out := v_out || jsonb_build_object(v_key, v_dtc_out);
      ELSE
        v_out := v_out || jsonb_build_object(v_key, v_val);
      END IF;
      CONTINUE;
    END IF;

    -- Schedule predecessor map: entityId -> string[] of predecessor ids
    v_new_key := public.remap_id_text_via_map(v_key, p_id_map);
    IF jsonb_typeof(v_val) = 'array' THEN
      v_out := v_out || jsonb_build_object(
        v_new_key,
        public.remap_id_array_via_map(v_val, p_id_map)
      );
    ELSE
      v_out := v_out || jsonb_build_object(v_new_key, v_val);
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_decision_details_to_phases_json(
  p_phases jsonb,
  p_decision_tree_config jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_new_phases jsonb := '[]'::jsonb;
  v_phase jsonb;
  v_new_ops jsonb;
  v_op jsonb;
  v_op_id text;
  v_cfg jsonb;
  v_patch jsonb;
  v_prompt text;
  v_detailed text;
  v_image text;
  v_option_detail text;
BEGIN
  IF p_phases IS NULL OR jsonb_typeof(p_phases) <> 'array' THEN
    RETURN COALESCE(p_phases, '[]'::jsonb);
  END IF;
  IF p_decision_tree_config IS NULL OR jsonb_typeof(p_decision_tree_config) <> 'object' THEN
    RETURN p_phases;
  END IF;

  FOR v_phase IN SELECT value FROM jsonb_array_elements(p_phases)
  LOOP
    v_new_ops := '[]'::jsonb;
    FOR v_op IN SELECT value FROM jsonb_array_elements(COALESCE(v_phase -> 'operations', '[]'::jsonb))
    LOOP
      v_op_id := v_op ->> 'id';
      v_cfg := p_decision_tree_config -> v_op_id;
      IF v_cfg IS NOT NULL AND jsonb_typeof(v_cfg) = 'object' THEN
        v_prompt := NULLIF(btrim(COALESCE(v_cfg ->> 'decisionPrompt', '')), '');
        v_detailed := NULLIF(btrim(COALESCE(v_cfg ->> 'decisionDetailedSummary', '')), '');
        v_image := NULLIF(btrim(COALESCE(v_cfg ->> 'optionImageUrl', '')), '');
        v_option_detail := NULLIF(btrim(COALESCE(v_cfg ->> 'optionDetailedDescription', '')), '');
        v_patch := '{}'::jsonb;
        IF v_prompt IS NOT NULL THEN
          v_patch := v_patch || jsonb_build_object('userPrompt', v_prompt);
        END IF;
        IF v_detailed IS NOT NULL THEN
          v_patch := v_patch || jsonb_build_object('decisionDetailedSummary', v_detailed);
        END IF;
        IF v_image IS NOT NULL THEN
          v_patch := v_patch || jsonb_build_object('optionImageUrl', v_image);
        END IF;
        IF v_option_detail IS NOT NULL THEN
          v_patch := v_patch || jsonb_build_object('optionDetailedDescription', v_option_detail);
        END IF;
        IF v_patch <> '{}'::jsonb THEN
          v_op := v_op || v_patch;
        END IF;
      END IF;
      v_new_ops := v_new_ops || jsonb_build_array(v_op);
    END LOOP;
    v_new_phases := v_new_phases || jsonb_build_array(
      (v_phase - 'operations') || jsonb_build_object('operations', v_new_ops)
    );
  END LOOP;

  RETURN v_new_phases;
END;
$$;

REVOKE ALL ON FUNCTION public.remap_id_text_via_map(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remap_id_array_via_map(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remap_scheduling_prerequisites_for_revision(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_decision_details_to_phases_json(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remap_id_text_via_map(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.remap_id_array_via_map(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.remap_scheduling_prerequisites_for_revision(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_decision_details_to_phases_json(jsonb, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- copy_draft_revision_workflow_internal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_draft_revision_workflow_internal(
  p_source_project_id uuid,
  p_target_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  id_map jsonb := '{}'::jsonb;
  linked_old_phase_ids uuid[] := ARRAY[]::uuid[];
  v_is_self_link boolean;
  v_is_incorporated boolean;
  v_is_linked boolean;
  v_source_project_id uuid;
  v_source_phase_id uuid;
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
  v_prereqs jsonb;
  v_remapped_prereqs jsonb;
  v_phases jsonb;
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

  -- Phases
  FOR r_phase IN
    SELECT * FROM public.project_phases WHERE project_id = p_source_project_id ORDER BY id
  LOOP
    v_is_self_link := (
      r_phase.source_project_id IS NOT NULL
      AND r_phase.source_project_id = p_source_project_id
    );
    v_is_incorporated := (
      r_phase.source_project_id IS NOT NULL
      AND r_phase.source_project_id IS DISTINCT FROM p_source_project_id
    );

    IF v_is_self_link THEN
      v_is_linked := false;
      v_source_project_id := NULL;
      v_source_phase_id := NULL;
    ELSIF v_is_incorporated THEN
      v_is_linked := COALESCE(r_phase.is_linked, true);
      v_source_project_id := r_phase.source_project_id;
      v_source_phase_id := r_phase.source_phase_id;
      linked_old_phase_ids := array_append(linked_old_phase_ids, r_phase.id);
    ELSE
      v_is_linked := COALESCE(r_phase.is_linked, false);
      v_source_project_id := NULL;
      v_source_phase_id := NULL;
    END IF;

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
      source_project_id,
      source_phase_id
    ) VALUES (
      v_new_phase_id,
      now(),
      now(),
      r_phase.description,
      v_is_linked,
      r_phase.is_standard,
      r_phase.name,
      r_phase.position_rule,
      r_phase.position_value,
      p_target_project_id,
      v_source_project_id,
      v_source_phase_id
    );
    phase_map := phase_map || jsonb_build_object(r_phase.id::text, v_new_phase_id::text);
  END LOOP;

  -- Operations (skip ops belonging to truly incorporated/linked phases)
  FOR r_op IN
    SELECT po.*
    FROM public.phase_operations po
    INNER JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = p_source_project_id
      AND NOT (po.phase_id = ANY (linked_old_phase_ids))
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

  -- Steps
  FOR r_step IN
    SELECT os.*
    FROM public.operation_steps os
    INNER JOIN public.phase_operations po ON po.id = os.operation_id
    INNER JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = p_source_project_id
      AND NOT (po.phase_id = ANY (linked_old_phase_ids))
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

  -- step_instructions for remapped steps
  INSERT INTO public.step_instructions (
    id,
    step_id,
    instruction_level,
    content,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    (step_map ->> si.step_id::text)::uuid,
    si.instruction_level,
    si.content,
    now(),
    now()
  FROM public.step_instructions si
  WHERE step_map ? si.step_id::text;

  -- project_hidden_operations (remap local ops; keep foundation op ids)
  INSERT INTO public.project_hidden_operations (
    project_id,
    source_operation_id,
    created_at
  )
  SELECT
    p_target_project_id,
    CASE
      WHEN op_map ? pho.source_operation_id::text
        THEN (op_map ->> pho.source_operation_id::text)::uuid
      ELSE pho.source_operation_id
    END,
    now()
  FROM public.project_hidden_operations pho
  WHERE pho.project_id = p_source_project_id
  ON CONFLICT (project_id, source_operation_id) DO NOTHING;

  -- PFMEA failure modes
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

  -- Remap scheduling_prerequisites (including __decision_tree_config__) onto target
  id_map := phase_map || op_map || step_map;
  SELECT COALESCE(p.scheduling_prerequisites, '{}'::jsonb)
  INTO v_prereqs
  FROM public.projects p
  WHERE p.id = p_target_project_id;

  v_remapped_prereqs := public.remap_scheduling_prerequisites_for_revision(v_prereqs, id_map);

  v_phases := public.rebuild_phases_json_from_project_phases_internal(p_target_project_id);
  v_phases := public.apply_decision_details_to_phases_json(
    v_phases,
    v_remapped_prereqs -> '__decision_tree_config__'
  );

  UPDATE public.projects
  SET
    scheduling_prerequisites = v_remapped_prereqs,
    phases = v_phases,
    updated_at = now()
  WHERE id = p_target_project_id;

  RETURN p_target_project_id;
END;
$wf$;

COMMENT ON FUNCTION public.copy_draft_revision_workflow_internal(uuid, uuid) IS
  'Deep-copy phases/ops/steps/instructions/PFMEA/risks/hidden ops; remap scheduling_prerequisites IDs; rebuild and patch phases JSON.';

COMMENT ON FUNCTION public.remap_scheduling_prerequisites_for_revision(jsonb, jsonb) IS
  'Remap phase/op/step UUIDs inside projects.scheduling_prerequisites for a draft revision copy.';

NOTIFY pgrst, 'reload schema';
