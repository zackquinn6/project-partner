-- Risk Radar titles: concrete causes, not vague categories or schedule outcomes.
-- 1) Delete "Underestimating project time" (outcome of many risks, not a causal risk).
-- 2) Replace foundation "Low-quality materials" with "Shelf-expired adhesives or finishes".
-- 3) Add Tile Flooring "Expired thinset or mortar past use-by date".
-- Also cleans matching project_run_risks so existing Risk Radar runs pick up the fix.

DO $migration$
DECLARE
  v_foundation_id uuid;
  v_tile_id uuid;
  v_updated integer;
  v_deleted integer;
  v_risk_id uuid;
  v_display_order integer;
BEGIN
  SELECT p.id INTO v_foundation_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_foundation_id IS NULL THEN
    SELECT p.id INTO v_foundation_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_foundation_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  SELECT p.id INTO v_tile_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_tile_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  -- -----------------------------------------------------------------------
  -- Remove outcome-style schedule risk everywhere it was authored
  -- -----------------------------------------------------------------------
  DELETE FROM public.project_run_risks
  WHERE lower(btrim(risk_title)) = 'underestimating project time';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % project_run_risks row(s) titled Underestimating project time', v_deleted;

  DELETE FROM public.project_risks
  WHERE lower(btrim(risk_title)) = 'underestimating project time';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % project_risks row(s) titled Underestimating project time', v_deleted;

  -- -----------------------------------------------------------------------
  -- Foundation: vague material category -> concrete shelf-life failure mode
  -- -----------------------------------------------------------------------
  UPDATE public.project_risks r
  SET risk_title = 'Shelf-expired adhesives or finishes',
      risk_dimension = 'budget',
      severity_score = 7,
      occurrence_score = 4,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'high',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 5,
      budget_impact_low = 75,
      budget_impact_high = 800,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy =
        'Read manufacture and use-by dates on adhesives, caulk, paint, and finish before buying and before opening. Return unopened expired stock. Do not thin or stretch product past the label window.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object(
          'action',
          'At pickup, read the manufacture or use-by date on every adhesive, caulk, paint, and finish SKU and reject any past the printed date',
          'benefit',
          'Stops dead stock before it reaches the job',
          'completed',
          false
        ),
        jsonb_build_object(
          'action',
          'Before opening a can or tube, re-check the date and return unopened expired product within the store return window',
          'benefit',
          'Preserves recovery without wasting opened material',
          'completed',
          false
        ),
        jsonb_build_object(
          'action',
          'If a product has no readable date, buy a fresh dated unit instead of guessing from smell or viscosity',
          'benefit',
          'Avoids false-economy failures that force a second buy',
          'completed',
          false
        )
      ),
      recommendation =
        'Do not open adhesives, caulk, paint, or finish with a missing or past use-by date. Return or replace first.',
      benefit =
        'Expired adhesives and finishes commonly force $75-$800 in replacement plus 1-5 days of remobilization when coats will not lay flat or bond.',
      risk_description =
        'Concrete shelf-life failure mode. Vague "low quality materials" is not actionable because mitigations differ by product.',
      updated_at = now()
  WHERE r.project_id = v_foundation_id
    AND lower(btrim(r.risk_title)) IN (
      'low-quality materials',
      'low quality materials',
      'shelf-expired adhesives or finishes'
    );
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION
      'Foundation shelf-expired adhesives risk update expected 1 row, got %.',
      v_updated;
  END IF;

  SELECT r.id INTO v_risk_id
  FROM public.project_risks r
  WHERE r.project_id = v_foundation_id
    AND r.risk_title = 'Shelf-expired adhesives or finishes'
  LIMIT 1;

  UPDATE public.project_run_risks prr
  SET risk_title = r.risk_title,
      risk_description = r.risk_description,
      likelihood = r.likelihood,
      severity = r.severity,
      schedule_impact_low_days = r.schedule_impact_low_days,
      schedule_impact_high_days = r.schedule_impact_high_days,
      budget_impact_low = r.budget_impact_low,
      budget_impact_high = r.budget_impact_high,
      mitigation_strategy = r.mitigation_strategy,
      mitigation_actions = r.mitigation_actions,
      mitigation_effort_level = r.mitigation_effort_level,
      recommendation = r.recommendation,
      benefit = r.benefit,
      risk_dimension = r.risk_dimension,
      severity_score = r.severity_score,
      occurrence_score = r.occurrence_score,
      detection_score = r.detection_score,
      updated_at = now()
  FROM public.project_risks r
  WHERE r.id = v_risk_id
    AND prr.template_risk_id = v_risk_id;

  -- Orphan run rows still carrying the old vague title (no template link): drop them.
  DELETE FROM public.project_run_risks
  WHERE template_risk_id IS NULL
    AND lower(btrim(risk_title)) IN ('low-quality materials', 'low quality materials');

  -- Any leftover Low-quality materials rows on other templates: delete (author project-specific causes instead).
  DELETE FROM public.project_run_risks prr
  USING public.project_risks r
  WHERE prr.template_risk_id = r.id
    AND lower(btrim(r.risk_title)) IN ('low-quality materials', 'low quality materials');

  DELETE FROM public.project_risks
  WHERE lower(btrim(risk_title)) IN ('low-quality materials', 'low quality materials');

  -- -----------------------------------------------------------------------
  -- Tile Flooring: project-specific expired thinset / mortar risk
  -- -----------------------------------------------------------------------
  SELECT coalesce(max(r.display_order), 0) + 1 INTO v_display_order
  FROM public.project_risks r
  WHERE r.project_id = v_tile_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_risks r
    WHERE r.project_id = v_tile_id
      AND lower(btrim(r.risk_title)) = 'expired thinset or mortar past use-by date'
  ) THEN
    INSERT INTO public.project_risks (
      project_id,
      risk_title,
      risk_description,
      risk_dimension,
      severity_score,
      occurrence_score,
      detection_score,
      likelihood,
      severity,
      schedule_impact_low_days,
      schedule_impact_high_days,
      budget_impact_low,
      budget_impact_high,
      mitigation_effort_level,
      occurrence_driver,
      prevention_strength,
      mitigation_strategy,
      mitigation_actions,
      recommendation,
      benefit,
      display_order
    ) VALUES (
      v_tile_id,
      'Expired thinset or mortar past use-by date',
      'Dated thinset or mortar that is past use-by will not bond reliably. Mitigation is date checks and fresh bags, not a vague quality tier.',
      'budget',
      8,
      4,
      3,
      'medium',
      'high',
      2,
      7,
      150,
      1200,
      'low',
      'process_design',
      'procedural',
      'Buy thinset and mortar with readable use-by dates, reject bags past the date or with hard lumps, and mix only what you will use inside the pot life on the bag.',
      jsonb_build_array(
        jsonb_build_object(
          'action',
          'At pickup, read the use-by or manufacture date on every thinset and mortar bag and reject any past the printed date',
          'benefit',
          'Keeps dead powder off the job before install starts',
          'completed',
          false
        ),
        jsonb_build_object(
          'action',
          'Before mixing, break a corner of each bag and reject bags with hard lumps or rock-solid powder',
          'benefit',
          'Catches moisture-damaged stock that dates alone may miss',
          'completed',
          false
        ),
        jsonb_build_object(
          'action',
          'Mix only the batch size you will place inside the pot life printed on the bag, and discard leftover that has begun to set',
          'benefit',
          'Prevents weak bond from overworked or expired mix',
          'completed',
          false
        )
      ),
      'Do not open or mix thinset or mortar with a missing or past use-by date. Replace the bag first.',
      'Expired thinset commonly forces $150-$1200 in tear-out and remobilization plus 2-7 days when tiles release or hollow spots appear.',
      v_display_order
    );
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN
      RAISE EXCEPTION 'Tile expired thinset risk insert expected 1 row, got %.', v_updated;
    END IF;
  ELSE
    UPDATE public.project_risks r
    SET risk_dimension = 'budget',
        severity_score = 8,
        occurrence_score = 4,
        detection_score = 3,
        likelihood = 'medium',
        severity = 'high',
        schedule_impact_low_days = 2,
        schedule_impact_high_days = 7,
        budget_impact_low = 150,
        budget_impact_high = 1200,
        mitigation_effort_level = 'low',
        occurrence_driver = 'process_design',
        prevention_strength = 'procedural',
        mitigation_strategy =
          'Buy thinset and mortar with readable use-by dates, reject bags past the date or with hard lumps, and mix only what you will use inside the pot life on the bag.',
        mitigation_actions = jsonb_build_array(
          jsonb_build_object(
            'action',
            'At pickup, read the use-by or manufacture date on every thinset and mortar bag and reject any past the printed date',
            'benefit',
            'Keeps dead powder off the job before install starts',
            'completed',
            false
          ),
          jsonb_build_object(
            'action',
            'Before mixing, break a corner of each bag and reject bags with hard lumps or rock-solid powder',
            'benefit',
            'Catches moisture-damaged stock that dates alone may miss',
            'completed',
            false
          ),
          jsonb_build_object(
            'action',
            'Mix only the batch size you will place inside the pot life printed on the bag, and discard leftover that has begun to set',
            'benefit',
            'Prevents weak bond from overworked or expired mix',
            'completed',
            false
          )
        ),
        recommendation =
          'Do not open or mix thinset or mortar with a missing or past use-by date. Replace the bag first.',
        benefit =
          'Expired thinset commonly forces $150-$1200 in tear-out and remobilization plus 2-7 days when tiles release or hollow spots appear.',
        risk_description =
          'Dated thinset or mortar that is past use-by will not bond reliably. Mitigation is date checks and fresh bags, not a vague quality tier.',
        updated_at = now()
    WHERE r.project_id = v_tile_id
      AND r.risk_title = 'Expired thinset or mortar past use-by date';
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 1 THEN
      RAISE EXCEPTION 'Tile expired thinset risk update expected 1 row, got %.', v_updated;
    END IF;
  END IF;

  RAISE NOTICE
    'Risk title concrete-cause fix applied (foundation %, tile %).',
    v_foundation_id, v_tile_id;
END
$migration$;
