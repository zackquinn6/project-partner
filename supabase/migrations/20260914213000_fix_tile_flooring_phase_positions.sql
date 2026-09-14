-- Fix Tile Flooring Installation process-map validation.
-- Standard Foundation reserves nth positions 1 (Kickoff), 2 (Plan), 3 (Ordering).
-- Tile Flooring had "Remove Tile Floor" (and the custom chain) starting at position 3,
-- which duplicated Ordering and failed:
--   - Duplicate position values in 'nth' phases
--   - Custom phases cannot occupy standard phase positions
-- Renumber custom/incorporated nth phases to start at 4, preserving relative order.
-- Applies to the published root and all revisions in that family. Idempotent.

DO $$
DECLARE
  v_root_id uuid;
  v_project_id uuid;
  v_standard_positions integer[];
  v_max_standard integer;
  v_phase record;
  v_next integer;
  v_needs_fix boolean;
BEGIN
  SELECT p.id
  INTO v_root_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND (p.is_standard IS DISTINCT FROM true)
    AND (
      lower(btrim(p.name)) = 'tile flooring installation'
      OR lower(btrim(p.name)) = 'tile flooring'
    )
  ORDER BY
    CASE
      WHEN lower(btrim(p.name)) = 'tile flooring installation' THEN 0
      ELSE 1
    END,
    p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found';
  END IF;

  SELECT coalesce(array_agg(pp.position_value ORDER BY pp.position_value), ARRAY[]::integer[])
  INTO v_standard_positions
  FROM public.project_phases pp
  JOIN public.projects sp ON sp.id = pp.project_id
  WHERE sp.is_standard IS TRUE
    AND pp.is_standard IS TRUE
    AND pp.position_rule = 'nth'
    AND pp.position_value IS NOT NULL;

  IF coalesce(array_length(v_standard_positions, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No standard nth phase positions found on Standard Project Foundation';
  END IF;

  v_max_standard := (SELECT max(x) FROM unnest(v_standard_positions) AS x);

  FOR v_project_id IN
    SELECT p.id
    FROM public.projects p
    WHERE p.id = v_root_id
       OR p.parent_project_id = v_root_id
  LOOP
    -- Detect whether any custom nth phase collides with a reserved standard position
    -- or shares a duplicate nth position within the combined standard+custom set.
    SELECT EXISTS (
      SELECT 1
      FROM public.project_phases cp
      WHERE cp.project_id = v_project_id
        AND (cp.is_standard IS DISTINCT FROM true)
        AND cp.position_rule = 'nth'
        AND cp.position_value = ANY (v_standard_positions)
    )
    INTO v_needs_fix;

    IF NOT v_needs_fix THEN
      SELECT EXISTS (
        SELECT 1
        FROM (
          SELECT position_value
          FROM public.project_phases
          WHERE project_id = v_project_id
            AND (is_standard IS DISTINCT FROM true)
            AND position_rule = 'nth'
            AND position_value IS NOT NULL
          GROUP BY position_value
          HAVING count(*) > 1
        ) d
      )
      INTO v_needs_fix;
    END IF;

    IF NOT v_needs_fix THEN
      RAISE NOTICE 'Tile Flooring project % already has valid custom phase positions; skipping', v_project_id;
      CONTINUE;
    END IF;

    -- Pass 1: move to temporary high positions to avoid unique/overlap collisions mid-update
    v_next := 1000;
    FOR v_phase IN
      SELECT pp.id
      FROM public.project_phases pp
      WHERE pp.project_id = v_project_id
        AND (pp.is_standard IS DISTINCT FROM true)
        AND pp.position_rule = 'nth'
        AND pp.position_value IS NOT NULL
      ORDER BY pp.position_value ASC, pp.created_at ASC NULLS LAST, pp.id ASC
    LOOP
      v_next := v_next + 1;
      UPDATE public.project_phases
      SET position_value = v_next,
          updated_at = now()
      WHERE id = v_phase.id;
    END LOOP;

    -- Pass 2: assign sequential positions after the last reserved standard nth slot
    v_next := v_max_standard;
    FOR v_phase IN
      SELECT pp.id, pp.name
      FROM public.project_phases pp
      WHERE pp.project_id = v_project_id
        AND (pp.is_standard IS DISTINCT FROM true)
        AND pp.position_rule = 'nth'
        AND pp.position_value IS NOT NULL
      ORDER BY pp.position_value ASC, pp.created_at ASC NULLS LAST, pp.id ASC
    LOOP
      v_next := v_next + 1;
      WHILE v_next = ANY (v_standard_positions) LOOP
        v_next := v_next + 1;
      END LOOP;

      UPDATE public.project_phases
      SET position_value = v_next,
          updated_at = now()
      WHERE id = v_phase.id;
    END LOOP;

    -- Auth-gated wrapper rejects SQL-editor/service callers; write cache via internal rebuild.
    UPDATE public.projects
    SET
      phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
    WHERE id = v_project_id;

    RAISE NOTICE
      'Renumbered custom nth phases for Tile Flooring project % starting after standard max %',
      v_project_id,
      v_max_standard;
  END LOOP;
END;
$$;
