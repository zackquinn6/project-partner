-- Step 8 (time estimates): Tile Flooring Installation - owned steps only.
--
-- Scaled and quality_control_scaled steps store HOURS PER SCALING UNIT. This project scales by
-- square foot, so the numbers are hours per sq ft and the spread between low and high is the
-- difference between an open rectangular room and a small room full of cuts.
--
-- Prime (non-scaled) steps store total hours. The two cure steps are prime with zero workers
-- (see cross-cutting waiting-steps): the hours are elapsed wait, not labor, which is why they
-- belong in the schedule but not in the effort total.
--
-- Reference points used for the field rates: a practiced installer sets roughly 8 to 12 sq ft
-- per hour of 12 in tile including mortar and spacing, and a first timer runs about half that.
-- The rates below are split across the separate mortar, setting, and inspection steps rather
-- than lumped, so they add up to that range rather than each carrying it.

DO $migration$
DECLARE
  v_project_id uuid;
  v_nroots integer;
  v_owned_n integer;
  v_updated integer;
BEGIN
  WITH RECURSIVE matched AS (
    SELECT p.id
    FROM public.projects p
    WHERE (p.is_standard IS DISTINCT FROM true)
      AND (
        lower(btrim(p.name)) IN ('tile flooring installation', 'tile floor installation', 'tile flooring')
        OR lower(btrim(p.name)) LIKE 'tile flooring installation%'
      )
  ),
  up AS (
    SELECT pr.id, pr.parent_project_id FROM public.projects pr WHERE pr.id IN (SELECT id FROM matched)
    UNION ALL
    SELECT par.id, par.parent_project_id FROM public.projects par INNER JOIN up ON par.id = up.parent_project_id
  ),
  roots AS (SELECT DISTINCT id AS root_id FROM up WHERE parent_project_id IS NULL)
  SELECT (SELECT count(*)::integer FROM roots), (SELECT root_id FROM roots LIMIT 1)
  INTO v_nroots, v_project_id;

  IF v_nroots <> 1 THEN
    RAISE EXCEPTION 'Tile Flooring Installation root did not resolve to exactly one row (found %).', v_nroots;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Owned steps, scoped by the phase columns that define ownership rather than by operation
  -- name. The two Prepare subfloor operations were renamed to carry product names, so a name
  -- match there resolves nothing.
  -- ---------------------------------------------------------------------------
  DROP TABLE IF EXISTS owned_steps;
  CREATE TEMP TABLE owned_steps ON COMMIT DROP AS
  SELECT os.id AS step_id, lower(btrim(os.step_title)) AS step_key
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE AND pp.is_linked IS NOT TRUE
    AND pp.source_phase_id IS NULL AND pp.source_project_id IS NULL;

  SELECT count(*)::integer INTO v_owned_n FROM owned_steps;
  IF v_owned_n <> 17 THEN
    RAISE EXCEPTION 'Expected 17 owned steps, found %. Run the step 1 structure migration first.', v_owned_n;
  END IF;

  UPDATE public.operation_steps os
  SET
    time_estimate_low = v.low,
    time_estimate_med = v.med,
    time_estimate_high = v.high,
    updated_at = now()
  FROM (VALUES
    -- Hours per sq ft. Scraping old adhesive is the variable, not sweeping.
    ('Clean and inspect subfloor',          0.010, 0.020, 0.045),
    ('Spread mortar for membrane',          0.012, 0.018, 0.030),
    ('Embed membrane and detail seams',     0.014, 0.022, 0.035),
    ('Cut and fit backer panels',           0.020, 0.032, 0.055),
    ('Fasten backer to subfloor',           0.018, 0.028, 0.045),
    ('Tape or mesh seams and embed',        0.010, 0.016, 0.026),
    -- Layout is mostly fixed cost per room, so it reads high per sq ft on small floors.
    ('Layout and reference lines',          0.008, 0.015, 0.030),
    -- Cut count per sq ft is what moves this, so a small room with jogs sits at the top.
    ('Cut tiles to layout',                 0.020, 0.040, 0.080),
    ('Spread mortar and verify coverage',   0.020, 0.032, 0.050),
    ('Set tile, beat-in, and check plane',  0.035, 0.060, 0.110),
    ('Inspect set tile before cure',        0.004, 0.008, 0.015),
    ('Prepare joints for grout',            0.006, 0.012, 0.022),
    ('Pack grout and initial clean',        0.020, 0.032, 0.050),
    ('Wash haze and tool joints',           0.012, 0.020, 0.035),
    ('Apply grout sealer',                  0.008, 0.014, 0.024)
  ) AS v(step_title, low, med, high)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 15 THEN
    RAISE EXCEPTION 'Expected 15 scaled owned steps to receive time estimates, updated %.', v_updated;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Cure steps: total elapsed hours, not labor. Zero workers, so nothing is added to effort.
  -- Low is the fast case named on a fast-setting product, med is the common 24 and 72 hour
  -- published wait, high is what cold or a membrane assembly turns it into.
  -- ---------------------------------------------------------------------------
  UPDATE public.operation_steps os
  SET
    time_estimate_low = v.low,
    time_estimate_med = v.med,
    time_estimate_high = v.high,
    updated_at = now()
  FROM (VALUES
    ('Cure thinset before grouting', 12.0, 24.0, 48.0),
    ('Cure grout before sealing',    48.0, 72.0, 96.0)
  ) AS v(step_title, low, med, high)
  WHERE os.id IN (SELECT step_id FROM owned_steps)
    AND lower(btrim(os.step_title)) = lower(btrim(v.step_title));

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected 2 cure steps to receive elapsed time, updated %.', v_updated;
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Tile Flooring Installation step 8 time estimates applied for project %', v_project_id;
END
$migration$;
