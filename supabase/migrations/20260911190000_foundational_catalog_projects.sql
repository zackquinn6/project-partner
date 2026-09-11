-- Trade-level foundational catalog projects:
-- is_foundational + foundation_project_id on projects,
-- project_hidden_operations for per-child op visibility,
-- attach/detach RPCs, rebuild/workflow resolution for linked phases + hidden ops.

-- ---------------------------------------------------------------------------
-- 1) projects columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_foundational boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foundation_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.is_foundational IS
  'When true, this catalog template can be used as a trade foundation that other templates build on.';
COMMENT ON COLUMN public.projects.foundation_project_id IS
  'Child template points at a foundational catalog project (not revision parent_project_id).';

CREATE INDEX IF NOT EXISTS projects_is_foundational_idx
  ON public.projects (is_foundational)
  WHERE is_foundational = true;

CREATE INDEX IF NOT EXISTS projects_foundation_project_id_idx
  ON public.projects (foundation_project_id)
  WHERE foundation_project_id IS NOT NULL;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_foundation_no_self_ref;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_foundation_no_self_ref
  CHECK (foundation_project_id IS NULL OR foundation_project_id <> id);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_foundation_one_level;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_foundation_one_level
  CHECK (
    foundation_project_id IS NULL
    OR is_foundational = false
  );

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_standard_not_foundation_child;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_standard_not_foundation_child
  CHECK (
    foundation_project_id IS NULL
    OR COALESCE(is_standard, false) = false
  );

-- ---------------------------------------------------------------------------
-- 2) project_hidden_operations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_hidden_operations (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_operation_id uuid NOT NULL REFERENCES public.phase_operations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, source_operation_id)
);

COMMENT ON TABLE public.project_hidden_operations IS
  'Operations from a foundational (or incorporated) source that are hidden on this child template. Absence of a row means visible.';

CREATE INDEX IF NOT EXISTS project_hidden_operations_source_op_idx
  ON public.project_hidden_operations (source_operation_id);

ALTER TABLE public.project_hidden_operations ENABLE ROW LEVEL SECURITY;

-- Inline ownership checks (can_caller_edit_project is revoked from authenticated clients).
DROP POLICY IF EXISTS "Admins and owners can select project_hidden_operations"
  ON public.project_hidden_operations;
CREATE POLICY "Admins and owners can select project_hidden_operations"
  ON public.project_hidden_operations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> ARRAY['admin']::text[]
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_id AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and owners can insert project_hidden_operations"
  ON public.project_hidden_operations;
CREATE POLICY "Admins and owners can insert project_hidden_operations"
  ON public.project_hidden_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> ARRAY['admin']::text[]
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_id AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and owners can delete project_hidden_operations"
  ON public.project_hidden_operations;
CREATE POLICY "Admins and owners can delete project_hidden_operations"
  ON public.project_hidden_operations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> ARRAY['admin']::text[]
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_id AND po.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Published project hidden ops are readable"
  ON public.project_hidden_operations;
CREATE POLICY "Published project hidden ops are readable"
  ON public.project_hidden_operations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.publish_status IN ('published', 'beta-testing')
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Helpers: foundation family root / latest published
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_family_root_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(p.parent_project_id, p.id)
  FROM public.projects p
  WHERE p.id = p_project_id;
$$;

CREATE OR REPLACE FUNCTION public.latest_published_in_family(p_any_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_root uuid;
  v_latest uuid;
BEGIN
  v_root := public.project_family_root_id(p_any_project_id);
  IF v_root IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO v_latest
  FROM public.projects p
  WHERE (p.id = v_root OR p.parent_project_id = v_root)
    AND p.publish_status = 'published'
  ORDER BY COALESCE(p.revision_number, 0) DESC, p.updated_at DESC
  LIMIT 1;

  IF v_latest IS NULL THEN
    RETURN v_root;
  END IF;
  RETURN v_latest;
END;
$$;

REVOKE ALL ON FUNCTION public.project_family_root_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_family_root_id(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.latest_published_in_family(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.latest_published_in_family(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) rebuild_phases_json_from_project_phases_internal: resolve linked ops
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases_internal(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  phases_json jsonb := '[]'::jsonb;
  phase_record RECORD;
  operations_json jsonb;
  op_record RECORD;
  steps_json jsonb;
  ops_phase_id uuid;
BEGIN
  FOR phase_record IN
    SELECT
      id,
      project_id,
      name,
      description,
      is_standard,
      is_linked,
      source_project_id,
      source_phase_id,
      position_rule,
      position_value,
      created_at
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY
      CASE
        WHEN position_rule = 'nth' THEN COALESCE(position_value, 999)
        WHEN position_rule = 'last' THEN 2147483647
        ELSE 999
      END ASC,
      created_at ASC
  LOOP
    ops_phase_id := COALESCE(phase_record.source_phase_id, phase_record.id);
    operations_json := '[]'::jsonb;

    FOR op_record IN
      SELECT id, phase_id, operation_name, operation_description, flow_type, display_order
      FROM public.phase_operations
      WHERE phase_id = ops_phase_id
      ORDER BY display_order ASC
    LOOP
      steps_json := public.get_operation_steps_json(op_record.id, false);
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', op_record.id,
          'name', op_record.operation_name,
          'description', op_record.operation_description,
          'flowType', COALESCE(op_record.flow_type, 'prime'),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', phase_record.is_standard
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard,
        'isLinked', COALESCE(phase_record.is_linked, phase_record.source_project_id IS NOT NULL),
        'sourceProjectId', phase_record.source_project_id,
        'sourcePhaseId', phase_record.source_phase_id,
        'phaseOrderNumber',
          CASE
            WHEN phase_record.position_rule = 'last' THEN '"last"'::jsonb
            WHEN phase_record.position_rule = 'nth' AND phase_record.position_value IS NOT NULL
              THEN to_jsonb(phase_record.position_value)
            ELSE to_jsonb(999)
          END,
        'position_rule', phase_record.position_rule,
        'position_value', phase_record.position_value
      )
    );
  END LOOP;

  RETURN COALESCE(phases_json, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Filter hidden operations out of a workflow JSON for a child project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.filter_hidden_operations_from_workflow(
  p_project_id uuid,
  p_workflow jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hidden uuid[];
  v_phase jsonb;
  v_ops jsonb;
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF p_workflow IS NULL OR jsonb_typeof(p_workflow) <> 'array' THEN
    RETURN COALESCE(p_workflow, '[]'::jsonb);
  END IF;

  SELECT COALESCE(array_agg(source_operation_id), ARRAY[]::uuid[])
  INTO v_hidden
  FROM public.project_hidden_operations
  WHERE project_id = p_project_id;

  IF v_hidden IS NULL OR cardinality(v_hidden) = 0 THEN
    RETURN p_workflow;
  END IF;

  FOR v_phase IN SELECT value FROM jsonb_array_elements(p_workflow)
  LOOP
    SELECT COALESCE(jsonb_agg(op.value), '[]'::jsonb)
    INTO v_ops
    FROM jsonb_array_elements(COALESCE(v_phase->'operations', '[]'::jsonb)) AS op(value)
    WHERE NOT ((op.value->>'id')::uuid = ANY (v_hidden));

    v_result := v_result || jsonb_build_array(
      (v_phase - 'operations') || jsonb_build_object('operations', COALESCE(v_ops, '[]'::jsonb))
    );
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.filter_hidden_operations_from_workflow(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.filter_hidden_operations_from_workflow(uuid, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) get_project_workflow_with_standards: keep merge + filter hidden ops
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  standard_project_id uuid;
  workflow_json jsonb;
  standard_phases_json jsonb;
  custom_phases_json jsonb;
  is_standard_project boolean;
  template_phases_fallback jsonb;
BEGIN
  SELECT id INTO standard_project_id
  FROM public.projects
  WHERE is_standard = true
  LIMIT 1;
  IF standard_project_id IS NULL THEN
    standard_project_id := 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid;
  END IF;

  SELECT COALESCE(p.is_standard, false) INTO is_standard_project
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF is_standard_project = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases_internal(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  SELECT public.rebuild_phases_json_from_project_phases_internal(standard_project_id)
  INTO standard_phases_json;

  SELECT COALESCE(jsonb_agg(phase), '[]'::jsonb)
  INTO custom_phases_json
  FROM (
    SELECT public.rebuild_phases_json_from_project_phases_internal(p_project_id) AS all_phases
  ) phases_data,
  LATERAL jsonb_array_elements(COALESCE(phases_data.all_phases, '[]'::jsonb)) AS phase
  WHERE (phase->>'isStandard') IS DISTINCT FROM 'true';

  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);
  workflow_json := public.filter_hidden_operations_from_workflow(p_project_id, workflow_json);

  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    SELECT p.phases INTO template_phases_fallback
    FROM public.projects p
    WHERE p.id = p_project_id;
    IF template_phases_fallback IS NOT NULL
       AND jsonb_array_length(COALESCE(template_phases_fallback, '[]'::jsonb)) > 0 THEN
      RETURN public.filter_hidden_operations_from_workflow(p_project_id, template_phases_fallback);
    END IF;
  END IF;

  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_workflow_with_standards(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_workflow_with_standards(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Attach / detach foundational project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attach_foundational_project(
  p_child_project_id uuid,
  p_foundation_project_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child public.projects%ROWTYPE;
  v_foundation public.projects%ROWTYPE;
  v_foundation_live uuid;
  v_foundation_root uuid;
  v_old_root uuid;
  v_phase RECORD;
  v_max_nth integer;
  v_inserted integer := 0;
  v_skipped integer := 0;
BEGIN
  IF NOT public.can_caller_edit_project(p_child_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_child FROM public.projects WHERE id = p_child_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child project not found: %', p_child_project_id;
  END IF;

  IF COALESCE(v_child.is_standard, false) THEN
    RAISE EXCEPTION 'Standard foundation cannot be built on another project';
  END IF;

  IF COALESCE(v_child.is_foundational, false) THEN
    RAISE EXCEPTION 'A foundational project cannot itself be built on another foundation';
  END IF;

  SELECT * INTO v_foundation FROM public.projects WHERE id = p_foundation_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Foundation project not found: %', p_foundation_project_id;
  END IF;

  IF NOT COALESCE(v_foundation.is_foundational, false) THEN
    -- Allow pointing at a revision of a foundational family if the root is foundational
    IF NOT EXISTS (
      SELECT 1 FROM public.projects root
      WHERE root.id = COALESCE(v_foundation.parent_project_id, v_foundation.id)
        AND root.is_foundational = true
    ) THEN
      RAISE EXCEPTION 'Target project is not foundational';
    END IF;
  END IF;

  v_foundation_root := public.project_family_root_id(p_foundation_project_id);
  IF v_foundation_root = public.project_family_root_id(p_child_project_id) THEN
    RAISE EXCEPTION 'Cannot attach a project as foundation of its own revision family';
  END IF;

  v_foundation_live := public.latest_published_in_family(p_foundation_project_id);
  IF v_foundation_live IS NULL THEN
    v_foundation_live := p_foundation_project_id;
  END IF;

  -- Remove prior foundation-linked phases (same family as previous foundation)
  IF v_child.foundation_project_id IS NOT NULL THEN
    v_old_root := public.project_family_root_id(v_child.foundation_project_id);
    DELETE FROM public.project_phases pp
    WHERE pp.project_id = p_child_project_id
      AND pp.source_project_id IS NOT NULL
      AND public.project_family_root_id(pp.source_project_id) = v_old_root;
    DELETE FROM public.project_hidden_operations
    WHERE project_id = p_child_project_id;
  END IF;

  UPDATE public.projects
  SET foundation_project_id = v_foundation_root,
      updated_at = now()
  WHERE id = p_child_project_id;

  SELECT COALESCE(MAX(position_value), 2) INTO v_max_nth
  FROM public.project_phases
  WHERE project_id = p_child_project_id
    AND position_rule = 'nth';

  FOR v_phase IN
    SELECT pp.*
    FROM public.project_phases pp
    WHERE pp.project_id = v_foundation_live
      AND NOT (COALESCE(pp.is_standard, false) = true AND COALESCE(pp.is_linked, false) = false)
    ORDER BY
      CASE
        WHEN pp.position_rule = 'nth' THEN COALESCE(pp.position_value, 999)
        WHEN pp.position_rule = 'last' THEN 2147483647
        ELSE 999
      END ASC,
      pp.created_at ASC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.project_phases c
      WHERE c.project_id = p_child_project_id
        AND c.source_phase_id = v_phase.id
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.project_phases c
      WHERE c.project_id = p_child_project_id
        AND lower(trim(c.name)) = lower(trim(v_phase.name))
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_max_nth := v_max_nth + 1;

    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      is_standard,
      is_linked,
      position_rule,
      position_value,
      source_project_id,
      source_phase_id
    ) VALUES (
      p_child_project_id,
      v_phase.name,
      v_phase.description,
      false,
      true,
      'nth',
      v_max_nth,
      v_foundation_live,
      v_phase.id
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  PERFORM public.rebuild_phases_json_from_project_phases_internal(p_child_project_id);

  RETURN jsonb_build_object(
    'foundation_project_id', v_foundation_root,
    'foundation_live_id', v_foundation_live,
    'phases_inserted', v_inserted,
    'phases_skipped', v_skipped
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.detach_foundational_project(p_child_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child public.projects%ROWTYPE;
  v_root uuid;
  v_deleted integer := 0;
BEGIN
  IF NOT public.can_caller_edit_project(p_child_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_child FROM public.projects WHERE id = p_child_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child project not found: %', p_child_project_id;
  END IF;

  IF v_child.foundation_project_id IS NULL THEN
    RETURN jsonb_build_object('detached', false, 'phases_deleted', 0);
  END IF;

  v_root := public.project_family_root_id(v_child.foundation_project_id);

  DELETE FROM public.project_phases pp
  WHERE pp.project_id = p_child_project_id
    AND pp.source_project_id IS NOT NULL
    AND public.project_family_root_id(pp.source_project_id) = v_root;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  DELETE FROM public.project_hidden_operations
  WHERE project_id = p_child_project_id;

  UPDATE public.projects
  SET foundation_project_id = NULL,
      updated_at = now()
  WHERE id = p_child_project_id;

  PERFORM public.rebuild_phases_json_from_project_phases_internal(p_child_project_id);

  RETURN jsonb_build_object('detached', true, 'phases_deleted', v_deleted);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_operation_hidden(
  p_project_id uuid,
  p_source_operation_id uuid,
  p_hidden boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_caller_edit_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_hidden THEN
    INSERT INTO public.project_hidden_operations (project_id, source_operation_id)
    VALUES (p_project_id, p_source_operation_id)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.project_hidden_operations
    WHERE project_id = p_project_id
      AND source_operation_id = p_source_operation_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_foundational_project(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_foundational_project(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.detach_foundational_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detach_foundational_project(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.set_project_operation_hidden(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_project_operation_hidden(uuid, uuid, boolean) TO authenticated;
