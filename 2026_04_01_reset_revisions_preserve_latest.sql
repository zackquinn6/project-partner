CREATE OR REPLACE FUNCTION public.reset_project_revisions_preserve_latest(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_project_id uuid;
  v_latest_project_id uuid;
  v_root_name text;
  v_latest_name text;
  v_reset_name text;
  v_delete_ids uuid[];
  v_dup_phase_ids uuid[];
  v_dup_operation_ids uuid[];
  v_dup_step_ids uuid[];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required to reset revisions';
  END IF;

  SELECT COALESCE(parent_project_id, id), name
  INTO v_root_project_id, v_root_name
  FROM public.projects
  WHERE id = p_project_id;

  IF v_root_project_id IS NULL THEN
    RAISE EXCEPTION 'Project not found for id=%', p_project_id;
  END IF;

  SELECT p.id, p.name
  INTO v_latest_project_id, v_latest_name
  FROM public.projects p
  WHERE p.id = v_root_project_id
     OR p.parent_project_id = v_root_project_id
  ORDER BY p.revision_number DESC, p.updated_at DESC, p.created_at DESC, p.id DESC
  LIMIT 1;

  IF v_latest_project_id IS NULL THEN
    RAISE EXCEPTION 'No revisions found for project family rooted at id=%', v_root_project_id;
  END IF;

  v_reset_name := btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            COALESCE(NULLIF(v_root_name, ''), NULLIF(v_latest_name, ''), ''),
            '\s*(—|-|–)\s*Rev\.?\s+\d+\s*$',
            '',
            'i'
          ),
          '\s*\(([Rr]ev\.?|[Rr]evision)\s+\d+\)\s*$',
          '',
          'i'
        ),
        '\s+[Rr]ev\.?\s+\d+\s*$',
        '',
        'i'
      ),
      '\s*\(([Dd]raft|[Pp]ublished|[Bb]eta)\)\s*$',
      '',
      'i'
    )
  );

  IF v_reset_name = '' THEN
    RAISE EXCEPTION 'Cannot reset revisions: project family rooted at id=% has no valid name', v_root_project_id;
  END IF;

  SELECT array_agg(p.id)
  INTO v_delete_ids
  FROM public.projects p
  WHERE (p.id = v_root_project_id OR p.parent_project_id = v_root_project_id)
    AND p.id <> v_latest_project_id;

  UPDATE public.projects
  SET parent_project_id = NULL
  WHERE id = v_latest_project_id;

  IF COALESCE(array_length(v_delete_ids, 1), 0) > 0 THEN
    DELETE FROM public.step_instructions si
    WHERE si.step_id IN (
      SELECT os.id
      FROM public.operation_steps os
      JOIN public.phase_operations po ON po.id = os.operation_id
      JOIN public.project_phases pp ON pp.id = po.phase_id
      WHERE pp.project_id = ANY(v_delete_ids)
    );

    DELETE FROM public.operation_steps os
    USING public.phase_operations po, public.project_phases pp
    WHERE os.operation_id = po.id
      AND po.phase_id = pp.id
      AND pp.project_id = ANY(v_delete_ids);

    DELETE FROM public.phase_operations po
    USING public.project_phases pp
    WHERE po.phase_id = pp.id
      AND pp.project_id = ANY(v_delete_ids);

    DELETE FROM public.project_phases pp
    WHERE pp.project_id = ANY(v_delete_ids);

    DELETE FROM public.project_runs pr
    WHERE pr.project_id = ANY(v_delete_ids);

    DELETE FROM public.projects p
    WHERE p.id = ANY(v_delete_ids);
  END IF;

  SELECT array_agg(id)
  INTO v_dup_phase_ids
  FROM (
    SELECT pp.id,
           row_number() OVER (
             PARTITION BY pp.project_id,
                          pp.name,
                          COALESCE(pp.position_rule, ''),
                          COALESCE(pp.position_value, -1),
                          COALESCE(pp.is_standard, false),
                          COALESCE(pp.is_linked, false),
                          COALESCE(pp.source_project_id, '00000000-0000-0000-0000-000000000000'::uuid)
             ORDER BY pp.created_at, pp.id
           ) AS rn
    FROM public.project_phases pp
    WHERE pp.project_id = v_latest_project_id
  ) dedupe
  WHERE rn > 1;

  IF COALESCE(array_length(v_dup_phase_ids, 1), 0) > 0 THEN
    DELETE FROM public.step_instructions si
    WHERE si.step_id IN (
      SELECT os.id
      FROM public.operation_steps os
      JOIN public.phase_operations po ON po.id = os.operation_id
      WHERE po.phase_id = ANY(v_dup_phase_ids)
    );

    DELETE FROM public.operation_steps os
    USING public.phase_operations po
    WHERE os.operation_id = po.id
      AND po.phase_id = ANY(v_dup_phase_ids);

    DELETE FROM public.phase_operations po
    WHERE po.phase_id = ANY(v_dup_phase_ids);

    DELETE FROM public.project_phases pp
    WHERE pp.id = ANY(v_dup_phase_ids);
  END IF;

  SELECT array_agg(id)
  INTO v_dup_operation_ids
  FROM (
    SELECT po.id,
           row_number() OVER (
             PARTITION BY po.phase_id, po.operation_name, COALESCE(po.display_order, -1)
             ORDER BY po.created_at, po.id
           ) AS rn
    FROM public.phase_operations po
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_latest_project_id
  ) dedupe
  WHERE rn > 1;

  IF COALESCE(array_length(v_dup_operation_ids, 1), 0) > 0 THEN
    DELETE FROM public.step_instructions si
    WHERE si.step_id IN (
      SELECT os.id
      FROM public.operation_steps os
      WHERE os.operation_id = ANY(v_dup_operation_ids)
    );

    DELETE FROM public.operation_steps os
    WHERE os.operation_id = ANY(v_dup_operation_ids);

    DELETE FROM public.phase_operations po
    WHERE po.id = ANY(v_dup_operation_ids);
  END IF;

  SELECT array_agg(id)
  INTO v_dup_step_ids
  FROM (
    SELECT os.id,
           row_number() OVER (
             PARTITION BY os.operation_id, os.step_title, COALESCE(os.display_order, -1)
             ORDER BY os.created_at, os.id
           ) AS rn
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_latest_project_id
  ) dedupe
  WHERE rn > 1;

  IF COALESCE(array_length(v_dup_step_ids, 1), 0) > 0 THEN
    DELETE FROM public.step_instructions si
    WHERE si.step_id = ANY(v_dup_step_ids);

    DELETE FROM public.operation_steps os
    WHERE os.id = ANY(v_dup_step_ids);
  END IF;

  UPDATE public.projects
  SET revision_number = 0,
      parent_project_id = NULL,
      publish_status = 'draft',
      revision_notes = NULL,
      name = v_reset_name,
      phases = public.rebuild_phases_json_from_project_phases(v_latest_project_id)
  WHERE id = v_latest_project_id;

  RETURN v_latest_project_id;
END;
$$;
