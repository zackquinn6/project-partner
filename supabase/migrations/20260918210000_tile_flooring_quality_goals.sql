-- Tile Flooring Installation: quality goal levels + min_quality_goal gating.
-- Owned phases only. Linked source projects keep their own quality rows (gap-reported).

DO $migration$
DECLARE
  v_project_id uuid;
  v_phase_prep uuid;
  v_phase_install uuid;
  v_phase_grout uuid;
  v_op_install uuid;
  v_op_grout uuid;
  v_op_count integer;
  v_updated int;
  v_linked record;
  v_missing_sources text[] := ARRAY[]::text[];
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  SELECT pp.id INTO v_phase_prep
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'prepare subfloor';

  SELECT pp.id INTO v_phase_install
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) = 'install';

  SELECT pp.id INTO v_phase_grout
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL
    AND pp.source_project_id IS NULL
    AND lower(btrim(pp.name)) IN ('grout & finish', 'grout and finish');

  IF v_phase_prep IS NULL OR v_phase_install IS NULL OR v_phase_grout IS NULL THEN
    RAISE EXCEPTION
      'Tile owned phases did not resolve (prep=%, install=%, grout=%).',
      v_phase_prep, v_phase_install, v_phase_grout;
  END IF;

  -- Prepare subfloor ops were renamed to product names; do not match by operation_name.
  -- Quality gating only touches Install and Grout & Finish (one op each).
  SELECT count(*)::integer INTO v_op_count
  FROM public.phase_operations WHERE phase_id = v_phase_install;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Install phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_install FROM public.phase_operations WHERE phase_id = v_phase_install;

  SELECT count(*)::integer INTO v_op_count
  FROM public.phase_operations WHERE phase_id = v_phase_grout;
  IF v_op_count <> 1 THEN
    RAISE EXCEPTION 'Grout & Finish phase holds % operations, expected exactly 1.', v_op_count;
  END IF;
  SELECT id INTO v_op_grout FROM public.phase_operations WHERE phase_id = v_phase_grout;

  -- ---------------------------------------------------------------------------
  -- Three quality level rows (descriptions first; placeholder images for UI test)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_quality_levels (
    project_id,
    quality_level,
    outcome_summary,
    process_summary,
    vs_lower_summary,
    example_image_urls
  ) VALUES
  (
    v_project_id,
    'good',
    'Floor is covered and serviceable. Minor lippage, uneven joint widths, or light grout haze can remain within loose DIY tolerances. Edges and transitions look finished enough for daily use, not for close inspection.',
    'Core set and grout path only: prepare the chosen underlayment, layout, cut, set, cure, pack grout, and wash. Skip premium flatness work, leveling-clip systems, formal pre-cure QC, and sealing.',
    NULL,
    '["https://placehold.co/640x400/e8e4df/444?text=Good+tile+finish"]'::jsonb
  ),
  (
    v_project_id,
    'great',
    'Field reads as a deliberate DIY install: lippage and joint width stay inside stated DIY targets, mortar coverage looks intentional on lift checks, and grout joints are tooled clean without heavy haze.',
    'Core path plus standard best-practice checks: verify coverage while setting and walk the field for flatness, lippage, and joint width before the thinset cures.',
    'Choosing Great instead of Good adds the pre-cure inspection and coverage discipline that catch lippage and hollow spots while they are still correctable. Good leaves those defects more likely to stay in the finished floor.',
    '["https://placehold.co/640x400/dce8f5/334?text=Great+tile+finish"]'::jsonb
  ),
  (
    v_project_id,
    'professional',
    'Near-trade plane and joint uniformity under raking light. Edges and transitions look intentional. Grout is sealed where the product calls for it, and the floor holds up to close inspection.',
    'Great path plus extra prep and finish: install a leveling system while setting, hold a stricter final finish inspection, and apply grout sealer as a required step rather than optional.',
    'Choosing Professional instead of Great adds leveling clips, a final finish inspection against tighter tolerances, and mandatory sealing. Great can still look strong day-to-day without that extra labor.',
    '["https://placehold.co/640x400/e6f0e4/345?text=Professional+tile+finish"]'::jsonb
  )
  ON CONFLICT (project_id, quality_level) DO UPDATE SET
    outcome_summary = EXCLUDED.outcome_summary,
    process_summary = EXCLUDED.process_summary,
    vs_lower_summary = EXCLUDED.vs_lower_summary,
    example_image_urls = EXCLUDED.example_image_urls,
    updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Gate existing steps
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps
  SET min_quality_goal = 'great', updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid
    AND operation_id = v_op_install
    AND lower(btrim(step_title)) = 'inspect set tile before cure';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to gate Inspect set tile before cure (updated=%).', v_updated;
  END IF;

  UPDATE public.operation_steps
  SET
    min_quality_goal = 'professional',
    flow_type = 'prime',
    updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000004'::uuid
    AND operation_id = v_op_grout
    AND lower(btrim(step_title)) = 'apply grout sealer';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to gate Apply grout sealer as professional (updated=%).', v_updated;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Professional-only process steps
  -- ---------------------------------------------------------------------------
  INSERT INTO public.operation_steps (
    id, operation_id, step_title, description, display_order,
    flow_type, step_type, number_of_workers, skill_level, allow_content_edit,
    min_quality_goal
  ) VALUES
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid,
    v_op_install,
    'Install leveling clips and verify plane',
    'Seat manufacturer leveling clips or wedges as each tile is set and confirm the field stays inside the professional lippage limit before the mortar skins over.',
    5,
    'prime',
    'scaled',
    2,
    'Advanced',
    true,
    'professional'
  ),
  (
    '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid,
    v_op_grout,
    'Final finish inspection',
    'Inspect the cured floor for lippage, joint uniformity, haze, and edge transitions against professional tolerances before calling the work complete.',
    7,
    'prime',
    'quality_control_scaled',
    1,
    'Intermediate',
    true,
    'professional'
  )
  ON CONFLICT (id) DO UPDATE SET
    operation_id = EXCLUDED.operation_id,
    step_title = EXCLUDED.step_title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    flow_type = EXCLUDED.flow_type,
    step_type = EXCLUDED.step_type,
    number_of_workers = EXCLUDED.number_of_workers,
    skill_level = EXCLUDED.skill_level,
    min_quality_goal = EXCLUDED.min_quality_goal,
    updated_at = now();

  -- Order: set tile, then leveling clips (pro), then inspect (great+).
  UPDATE public.operation_steps
  SET display_order = 5, updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;

  UPDATE public.operation_steps
  SET display_order = 6, updated_at = now()
  WHERE id = '373adcbf-0a8c-42e9-9bcb-a5c100000001'::uuid;

  -- ---------------------------------------------------------------------------
  -- Gap-report linked sources without quality levels (do not author on their behalf)
  -- ---------------------------------------------------------------------------
  FOR v_linked IN
    SELECT DISTINCT pp.source_project_id AS source_id, sp.name AS source_name
    FROM public.project_phases pp
    LEFT JOIN public.projects sp ON sp.id = pp.source_project_id
    WHERE pp.project_id = v_project_id
      AND pp.source_project_id IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.project_quality_levels pql
      WHERE pql.project_id = v_linked.source_id
    ) THEN
      v_missing_sources := array_append(
        v_missing_sources,
        coalesce(v_linked.source_name, v_linked.source_id::text)
      );
    END IF;
  END LOOP;

  IF array_length(v_missing_sources, 1) IS NOT NULL THEN
    RAISE NOTICE
      'Tile quality seed: linked source projects still missing project_quality_levels (author on those templates): %',
      array_to_string(v_missing_sources, ' | ');
  END IF;

  UPDATE public.projects
  SET
    phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
    updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation quality goals seeded for project %', v_project_id;
END
$migration$;
