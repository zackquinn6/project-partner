-- Step 1 (related links): Tile Flooring Installation — link out-of-scope projects, do not duplicate.
-- Project root: resolve by name (canonical live id 373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0).
--
-- Scope rule: core tile work stays on Prepare subfloor / Install / Grout & Finish only.
-- Demo, self-leveler, dishwasher, baseboard, toilet, caulk, dust control, wood finish remain
-- separate catalog templates and are incorporated via project_phases.source_* (no ops/steps copied).
--
-- This migration:
--   1) Links Tile Flooring Demolition → Remove Tile Floor (missing link)
--   2) Sets is_linked = true wherever source_project_id is set
--   3) Fixes Baseboard Installation: Paint-grade missing source_phase_id
--   4) Rebuilds phases JSON cache

DO $$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_demo_project_id uuid;
  v_demo_phase_id uuid;
  v_baseboard_install_phase_id uuid;
  v_link_id CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a1b100000001'::uuid;
  v_max_nth integer;
BEGIN
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN (
          'tile flooring installation',
          'tile floor installation',
          'tile flooring'
        )
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id
    FROM public.projects pr
    WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id
    FROM public.projects par
    INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (
    SELECT DISTINCT id AS root_id
    FROM up
    WHERE parent_project_id IS NULL
  )
  SELECT
    (SELECT count(*)::integer FROM roots),
    (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots = 0 THEN
    RAISE EXCEPTION
      'No Tile Flooring Installation template root found. '
      'Query: SELECT id, name, parent_project_id FROM projects WHERE lower(btrim(name)) LIKE ''%%tile flooring%%'' ORDER BY name;';
  END IF;

  IF v_nroots > 1 THEN
    RAISE EXCEPTION
      'Multiple (%) Tile Flooring Installation roots matched. Resolve duplicates before running.',
      v_nroots;
  END IF;

  -- --- Demo source (Tile Flooring Demolition) ---
  SELECT p.id INTO v_demo_project_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND (p.is_standard IS DISTINCT FROM true)
    AND lower(btrim(p.name)) IN (
      'tile flooring demolition',
      'tile floor demolition',
      'tile flooring demo',
      'tile floor demo'
    )
  LIMIT 1;

  IF v_demo_project_id IS NULL THEN
    RAISE EXCEPTION
      'Tile Flooring Demolition root not found — cannot link related demo phase. '
      'Query: SELECT id, name FROM projects WHERE lower(btrim(name)) LIKE ''%%tile%%demo%%'' OR lower(btrim(name)) LIKE ''%%tile%%demolition%%'';';
  END IF;

  SELECT pp.id INTO v_demo_phase_id
  FROM public.project_phases pp
  WHERE pp.project_id = v_demo_project_id
    AND lower(btrim(pp.name)) IN ('remove tile floor', 'removal', 'tile removal')
  ORDER BY pp.position_value NULLS LAST, pp.created_at
  LIMIT 1;

  IF v_demo_phase_id IS NULL THEN
    SELECT pp.id INTO v_demo_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = v_demo_project_id
      AND (pp.is_standard IS DISTINCT FROM true)
    ORDER BY
      CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
      pp.position_value NULLS LAST,
      pp.created_at
    LIMIT 1;
  END IF;

  IF v_demo_phase_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Demolition has no incorporable phase for project_id=%', v_demo_project_id;
  END IF;

  -- Baseboard Installation source phase (for paint-grade fix)
  SELECT pp.id INTO v_baseboard_install_phase_id
  FROM public.project_phases pp
  JOIN public.projects p ON p.id = pp.project_id
  WHERE p.parent_project_id IS NULL
    AND lower(btrim(p.name)) LIKE 'baseboard%'
    AND lower(btrim(pp.name)) = 'baseboard installation'
  LIMIT 1;

  IF v_baseboard_install_phase_id IS NULL THEN
    RAISE EXCEPTION 'Baseboard Installation source phase not found on Baseboard & Trim template';
  END IF;

  -- Link demo if not already present by source_phase_id
  IF NOT EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.project_id = v_project_id
      AND pp.source_phase_id = v_demo_phase_id
  ) THEN
    SELECT coalesce(max(pp.position_value), 0) INTO v_max_nth
    FROM public.project_phases pp
    WHERE pp.project_id = v_project_id
      AND pp.position_rule = 'nth';

    -- Place before existing early removals (typically nth starting at 4): use 3 when free, else max+1
    IF NOT EXISTS (
      SELECT 1 FROM public.project_phases pp
      WHERE pp.project_id = v_project_id AND pp.position_rule = 'nth' AND pp.position_value = 3
    ) THEN
      v_max_nth := 3;
    ELSE
      v_max_nth := v_max_nth + 1;
    END IF;

    INSERT INTO public.project_phases (
      id, project_id, name, description,
      position_rule, position_value,
      is_standard, is_linked,
      source_project_id, source_phase_id
    ) VALUES (
      v_link_id,
      v_project_id,
      'Remove Tile Floor',
      'Linked from Tile Flooring Demolition — remove existing tile floor before substrate prep. Not authored inside Tile Flooring Installation.',
      'nth',
      v_max_nth,
      false,
      true,
      v_demo_project_id,
      v_demo_phase_id
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      position_rule = EXCLUDED.position_rule,
      position_value = EXCLUDED.position_value,
      is_linked = true,
      source_project_id = EXCLUDED.source_project_id,
      source_phase_id = EXCLUDED.source_phase_id;

    RAISE NOTICE 'Linked Remove Tile Floor (source_phase=%) onto tile project % at nth=%',
      v_demo_phase_id, v_project_id, v_max_nth;
  ELSE
    RAISE NOTICE 'Tile Flooring Demolition phase already linked; skipping insert';
  END IF;

  -- Mark all incorporated rows as linked
  UPDATE public.project_phases pp
  SET is_linked = true
  WHERE pp.project_id = v_project_id
    AND pp.source_project_id IS NOT NULL
    AND (pp.is_linked IS DISTINCT FROM true);

  -- Fix paint-grade baseboard: was pointing at baseboard project without source_phase_id
  UPDATE public.project_phases pp
  SET
    source_phase_id = v_baseboard_install_phase_id,
    is_linked = true,
    description = 'Linked from Baseboard & Trim Installation — paint-grade path. Same source phase as stain-grade; finish choice is a decision, not a duplicated project.'
  WHERE pp.id = '592964d7-caa0-449b-956c-19e6e93e87a7'::uuid
    AND pp.project_id = v_project_id
    AND pp.source_phase_id IS NULL;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(v_project_id)
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation related links applied for project_id=%', v_project_id;
END $$;
