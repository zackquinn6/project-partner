-- Step 5: tools for Professional-only Tile Flooring steps.
-- Bootstrap shared library rows by name when absent. Step JSON uses CompactToolsTable shape
-- (id, name, category, quantity, parentId substitutes).

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_clips CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000005'::uuid;
  v_step_final CONSTANT uuid := '373adcbf-0a8c-42e9-9bcb-a5c100000006'::uuid;
  v_updated int;
  v_tool text;
  v_missing text[] := ARRAY[]::text[];
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

  INSERT INTO public.tools (name, description, category, alternates)
  SELECT v.name, v.description, v.category, v.alternates
  FROM (VALUES
    ('Tile Leveling Clip Tool',
     'Pliers that set and tension tile leveling clips and wedges.',
     'Hand Tool',
     'Hand pressure with wedge clips works on tile under 15 in, but not on large format'),
    ('Straightedge',
     'Straight metal edge for checking lippage and field flatness.',
     'Hand Tool',
     'A factory edge of a 10 ft aluminum level, or a jointed 10 ft screed'),
    ('Rubber Mallet',
     'Seats tile without cracking glaze.',
     'Hand Tool',
     'Dead-blow mallet with a soft face for large format'),
    ('Beating Block',
     'Spreads mallet force across the tile face.',
     'Hand Tool',
     'Manufacturer beating block sized to the tile'),
    ('Tape Measure',
     'Measures joint width and clip spacing.',
     'Hand Tool',
     NULL),
    ('Level',
     'Checks plane and any intended slope.',
     'Hand Tool',
     'Laser level for long runs'),
    ('Flashlight',
     'Low-angle light for raking inspection of finished floors.',
     'Other',
     'Work light aimed across the floor'),
    ('Margin Trowel',
     'Lifts and re-beds tile during corrections.',
     'Hand Tool',
     NULL),
    ('Knee Pads',
     'Protects knees during continuous floor work.',
     'PPE',
     'Gel knee pads for long sessions'),
    ('Safety Glasses',
     'Eye protection for clip tensioning and breakaway.',
     'PPE',
     'Wraparound glasses when breaking stems')
  ) AS v(name, description, category, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v.name))
  );

  FOREACH v_tool IN ARRAY ARRAY[
    'Tile Leveling Clip Tool','Straightedge','Rubber Mallet','Beating Block',
    'Tape Measure','Level','Flashlight','Margin Trowel','Knee Pads','Safety Glasses'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v_tool))) THEN
      v_missing := array_append(v_missing, v_tool);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Tool library bootstrap failed for: %', array_to_string(v_missing, ', ');
  END IF;

  UPDATE public.operation_steps os
  SET tools = v.tools::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_clips, '[
      {"id":"tl-cl-glasses","name":"Safety Glasses","description":"Protects eyes when tensioning clips and when stems snap.","category":"PPE","alternates":[],"quantity":1},
      {"id":"tl-cl-cliptool","name":"Tile Leveling Clip Tool","description":"Tensions clips and wedges to pull adjacent faces flush.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-mallet","name":"Rubber Mallet","description":"Seats the tile before clips are tensioned.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-block","name":"Beating Block","description":"Spreads mallet force on tile 12 in and larger.","category":"Hand Tool","alternates":[],"quantity":1,"parentId":"tl-cl-mallet"},
      {"id":"tl-cl-straight","name":"Straightedge","description":"4 ft check across clipped joints while mortar is plastic.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-tape","name":"Tape Measure","description":"Confirms clip spacing and joint width after tension.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-level","name":"Level","description":"Confirms plane on clipped runs.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-cl-knees","name":"Knee Pads","description":"Continuous floor work while clipping.","category":"PPE","alternates":[],"quantity":1}
    ]'),
    (v_step_final, '[
      {"id":"tl-ff-light","name":"Flashlight","description":"Held low to rake light across the finished field.","category":"Other","alternates":[],"quantity":1},
      {"id":"tl-ff-straight","name":"Straightedge","description":"Checks marked lippage lines after cure.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-tape","name":"Tape Measure","description":"Measures joint width at start, mid-field, and far wall.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-level","name":"Level","description":"Confirms plane on suspect runs.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-margin","name":"Margin Trowel","description":"Probes soft sealant and helps lift a marked tile if replacement is required.","category":"Hand Tool","alternates":[],"quantity":1},
      {"id":"tl-ff-knees","name":"Knee Pads","description":"Floor-level inspection passes.","category":"PPE","alternates":[],"quantity":1}
    ]')
  ) AS v(step_id, tools)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 2 THEN
    RAISE EXCEPTION 'Expected tools on 2 quality-gated steps, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Tile quality-gated tools authored for project %', v_project_id;
END
$migration$;
