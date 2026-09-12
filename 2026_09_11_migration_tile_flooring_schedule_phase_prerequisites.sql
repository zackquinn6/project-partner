-- Tile Flooring Installation: seed schedule prerequisite edges (phase chain).
-- Admin Decision Tree Prerequisites persist as string[] maps on
-- projects.scheduling_prerequisites (entityId -> prerequisite entity ids).
-- Tile only had reserved __decision_tree_config__ / GPD keys, so the scheduler
-- had no cross-phase edges and could interleave Prep / Install / Finish.
--
-- Chains all project_phases in foundation order (position_rule / position_value):
-- Kickoff -> Plan -> customs -> Ordering -> Close.
-- Also chains consecutive prime operations within each phase.
-- Preserves reserved keys. Idempotent.

DO $$
DECLARE
  v_project_id uuid;
  v_prereqs jsonb;
  v_phase_ids uuid[];
  v_i integer;
  v_curr uuid;
  v_prev uuid;
  v_n integer;
  v_phase_id uuid;
  v_op_ids uuid[];
  v_j integer;
  v_op_curr uuid;
  v_op_prev uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) = 'tile flooring installation'
      OR lower(btrim(p.name)) = 'tile flooring'
      OR (
        lower(btrim(p.name)) LIKE 'tile%floor%'
        AND lower(btrim(p.name)) NOT LIKE '%demo%'
        AND lower(btrim(p.name)) NOT LIKE '%backsplash%'
        AND lower(btrim(p.name)) NOT LIKE '%shower%'
      )
    )
  ORDER BY
    CASE
      WHEN lower(btrim(p.name)) = 'tile flooring installation' THEN 0
      WHEN lower(btrim(p.name)) = 'tile flooring' THEN 1
      ELSE 2
    END,
    p.updated_at DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root not found';
  END IF;

  SELECT COALESCE(p.scheduling_prerequisites, '{}'::jsonb)
  INTO v_prereqs
  FROM public.projects p
  WHERE p.id = v_project_id;

  SELECT array_agg(s.id ORDER BY s.ord)
  INTO v_phase_ids
  FROM (
    SELECT
      pp.id,
      row_number() OVER (
        ORDER BY
          CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
          CASE
            WHEN pp.position_rule = 'last' THEN 2147483647
            WHEN pp.position_rule = 'last_minus_n' THEN 2147483646 - COALESCE(pp.position_value, 0)
            ELSE COALESCE(pp.position_value, 999)
          END,
          pp.created_at ASC,
          pp.id ASC
      ) AS ord
    FROM public.project_phases pp
    WHERE pp.project_id = v_project_id
  ) s;

  IF v_phase_ids IS NULL OR coalesce(array_length(v_phase_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION
      'Tile Flooring needs at least 2 phases to chain prerequisites (project %)',
      v_project_id;
  END IF;

  v_n := array_length(v_phase_ids, 1);
  FOR v_i IN 2 .. v_n LOOP
    v_curr := v_phase_ids[v_i];
    v_prev := v_phase_ids[v_i - 1];
    v_prereqs := jsonb_set(
      v_prereqs,
      ARRAY[v_curr::text],
      to_jsonb(ARRAY[v_prev::text]),
      true
    );
  END LOOP;

  FOREACH v_phase_id IN ARRAY v_phase_ids LOOP
    SELECT array_agg(x.id ORDER BY x.display_order NULLS LAST, x.created_at, x.id)
    INTO v_op_ids
    FROM (
      SELECT po.id, po.display_order, po.created_at
      FROM public.phase_operations po
      WHERE po.phase_id = v_phase_id
        AND (po.flow_type IS NULL OR po.flow_type = 'prime')
    ) x;

    IF v_op_ids IS NULL OR coalesce(array_length(v_op_ids, 1), 0) < 2 THEN
      CONTINUE;
    END IF;

    FOR v_j IN 2 .. array_length(v_op_ids, 1) LOOP
      v_op_curr := v_op_ids[v_j];
      v_op_prev := v_op_ids[v_j - 1];
      v_prereqs := jsonb_set(
        v_prereqs,
        ARRAY[v_op_curr::text],
        to_jsonb(ARRAY[v_op_prev::text]),
        true
      );
    END LOOP;
  END LOOP;

  UPDATE public.projects
  SET
    scheduling_prerequisites = v_prereqs,
    updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE
    'Tile Flooring schedule prerequisites chained across % phases (project %)',
    v_n, v_project_id;
END;
$$;
