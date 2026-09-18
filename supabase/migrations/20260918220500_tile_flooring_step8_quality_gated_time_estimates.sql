-- Step 8: time estimates for Professional-only Tile Flooring steps.
-- Both steps are scaled (hours per scaling unit / sq ft).

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
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

  IF NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_clips)
     OR NOT EXISTS (SELECT 1 FROM public.operation_steps WHERE id = v_step_final) THEN
    RAISE EXCEPTION 'Quality-gated steps missing. Apply quality goals migration first.';
  END IF;

  -- Clips: incremental time on top of set-tile for seating and tensioning.
  -- Evidence band from trade DIY rates on large format with clip systems.
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.025,
    time_estimate_med = 0.04,
    time_estimate_high = 0.065,
    updated_at = now()
  WHERE id = v_step_clips
    AND step_type = 'scaled'
    AND number_of_workers = 2;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Clip step time estimates did not update (updated=%).', v_updated;
  END IF;

  -- Final finish inspection: quality_control_scaled, hours per sq ft.
  UPDATE public.operation_steps
  SET
    time_estimate_low = 0.008,
    time_estimate_med = 0.012,
    time_estimate_high = 0.02,
    updated_at = now()
  WHERE id = v_step_final
    AND step_type = 'quality_control_scaled'
    AND number_of_workers = 1;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Final finish inspection time estimates did not update (updated=%).', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated time estimates authored for project %', v_project_id;
END
$migration$;
