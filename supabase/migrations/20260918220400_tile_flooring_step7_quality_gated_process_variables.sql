-- Step 7: process variables for Professional-only Tile Flooring steps.
-- No tool/material catalog inserts in this file.

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

  UPDATE public.operation_steps os
  SET process_variables = v.pvars::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"pv-cl-spacing","name":"Clip spacing along shared edges","type":"process","unit":"in","required":true,"description":"Distance between clips along each shared edge.","targetValue":"The spacing printed on the clip pack for this tile size"},
      {"id":"pv-cl-lippage","name":"Lippage after clip tension","type":"process","unit":"in","required":true,"description":"Face-to-face difference across a clipped joint under a straightedge.","targetValue":"1/32 in plus measured tile warpage for joints under 1/4 in (ANSI A108.02)"},
      {"id":"pv-cl-joint","name":"Joint width after tension","type":"process","unit":"in","required":true,"description":"Joint width measured after clips are tensioned.","targetValue":"The spacer size set in the layout plan"},
      {"id":"pv-cl-open","name":"Mortar open time remaining","type":"process","unit":"min","required":true,"description":"Time left to tension and correct before the mortar skins.","targetValue":"Inside the adjustment window on the mortar data sheet"},
      {"id":"pv-i4-lippage-up","name":"Lippage target from set step","type":"upstream","unit":"in","description":"The lippage limit this step must hold with clips.","targetValue":"1/32 in plus inherent tile warpage for joints under 1/4 in","sourceStepName":"Set tile, beat-in, and check plane"}
    ]'),
    (v_step_final, '[
      {"id":"pv-ff-lippage","name":"Finished lippage under raking light","type":"process","unit":"in","required":true,"description":"Lippage measured on the cured floor in zones inspected under low-angle light.","targetValue":"1/32 in plus warpage for joints under 1/4 in"},
      {"id":"pv-ff-joint","name":"Finished joint width uniformity","type":"process","unit":"in","required":true,"description":"Joint width at start, mid-field, and far wall on sampled runs.","targetValue":"Within the layout plan tolerance across the run"},
      {"id":"pv-ff-haze","name":"Haze wipe-test result","type":"process","options":["Pass - no transfer","Fail - haze present","Fail - sealer film present"],"required":true,"description":"White cloth wipe across sampled tile faces.","targetValue":"Pass - no transfer"},
      {"id":"pv-ff-ej171","name":"Movement joints status","type":"process","options":["Open and sealed","Grout bridge present","Sealant incomplete"],"required":true,"description":"Perimeter and field movement joints per TCNA EJ171.","targetValue":"Open and sealed"},
      {"id":"pv-cl-lippage-up","name":"Clip-held lippage from install","type":"upstream","unit":"in","description":"Plane quality locked in during Professional clipping.","targetValue":"1/32 in plus warpage for joints under 1/4 in","sourceStepName":"Install leveling clips and verify plane"}
    ]')
  ) AS v(step_id, pvars)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected process variables on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated process variables authored for project %', v_project_id;
END
$migration$;
