-- Populate workflow content for template project "Tile Flooring Installation".
-- Phases (custom, non-standard, non-linked): Prepare subfloor, Install, Grout & Finish.
-- Process structure: phase > operation > step; alternate operations for membrane vs backer board.
-- Excludes: caulking, baseboard, toilet installation.

DO $migration$
DECLARE
  v_project_id uuid;
  v_phase_prep uuid;
  v_phase_install uuid;
  v_phase_grout uuid;
  v_op_membrane uuid;
  v_op_backer uuid;
  v_op_install uuid;
  v_op_grout uuid;
  v_phase_ids uuid[];
  v_total int;
  v_strict_count int;
  v_rebuild regproc;
BEGIN
  SELECT p.id
  INTO v_project_id
  FROM public.projects p
  WHERE lower(trim(p.name)) = lower(trim('Tile Flooring Installation'))
  ORDER BY p.revision_number DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Migration skipped: no project named "Tile Flooring Installation".';
    RETURN;
  END IF;

  SELECT count(*)::int
  INTO v_strict_count
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE;

  SELECT array_agg(id ORDER BY display_order)
  INTO v_phase_ids
  FROM public.project_phases pp
  WHERE pp.project_id = v_project_id
    AND pp.is_standard IS NOT TRUE
    AND pp.is_linked IS NOT TRUE;

  IF v_phase_ids IS NULL OR cardinality(v_phase_ids) <> 3 THEN
    SELECT count(*)::int
    INTO v_total
    FROM public.project_phases pp
    WHERE pp.project_id = v_project_id;

    IF v_total >= 5 THEN
      SELECT array_agg(id ORDER BY display_order)
      INTO v_phase_ids
      FROM (
        SELECT pp2.id, pp2.display_order
        FROM public.project_phases pp2
        WHERE pp2.project_id = v_project_id
        ORDER BY pp2.display_order
        LIMIT 3 OFFSET 2
      ) sub;
    ELSIF v_total = 3 THEN
      SELECT array_agg(id ORDER BY display_order)
      INTO v_phase_ids
      FROM public.project_phases pp
      WHERE pp.project_id = v_project_id;
    ELSIF v_total = 0 THEN
      WITH ins AS (
        INSERT INTO public.project_phases (
          id,
          project_id,
          name,
          description,
          display_order,
          is_standard,
          is_linked,
          position_rule,
          position_value,
          created_at,
          updated_at
        )
        VALUES
          (
            gen_random_uuid(),
            v_project_id,
            'Prepare subfloor',
            'Bring the structural floor to a clean, sound, flat plane and install an appropriate tile underlayment system (uncoupling membrane or cement backer board) before setting tile. Scope stops at a ready-to-tile substrate; it does not include finish trim, perimeter sealant, or fixture work.',
            1,
            false,
            false,
            'nth',
            1,
            now(),
            now()
          ),
          (
            gen_random_uuid(),
            v_project_id,
            'Install',
            'Lay out the floor, cut tile to fit, bond tile with the correct mortar, and control lippage and alignment. Covers floor tile setting only (not toilet reset, baseboard, or transition caulking).',
            2,
            false,
            false,
            'nth',
            2,
            now(),
            now()
          ),
          (
            gen_random_uuid(),
            v_project_id,
            'Grout & Finish',
            'After mortar has cured, fill joints with grout, clean haze, cure, and apply grout sealer when the grout manufacturer requires it. Does not include caulking at tub or perimeter, base shoe, or toilet installation.',
            3,
            false,
            false,
            'nth',
            3,
            now(),
            now()
          )
        RETURNING id, display_order
      )
      SELECT array_agg(id ORDER BY display_order)
      INTO v_phase_ids
      FROM ins;
    ELSE
      RAISE EXCEPTION
        'Tile Flooring Installation: expected 3 phases with is_standard and is_linked not true (found %), or 5+ total phases to use display_order rows 3-5, or exactly 3 total phases, or 0 rows to auto-create three phases. Total project_phases: %.',
        v_strict_count,
        v_total;
    END IF;
  END IF;

  IF v_phase_ids IS NULL OR cardinality(v_phase_ids) <> 3 THEN
    RAISE EXCEPTION
      'Tile Flooring Installation: could not resolve exactly 3 phase IDs after fallback (cardinality=%).',
      cardinality(v_phase_ids);
  END IF;

  v_phase_prep := v_phase_ids[1];
  v_phase_install := v_phase_ids[2];
  v_phase_grout := v_phase_ids[3];

  DELETE FROM public.step_instructions si
  USING public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  WHERE si.template_step_id = os.id
    AND po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout);

  DELETE FROM public.operation_steps os
  USING public.phase_operations po
  WHERE os.operation_id = po.id
    AND po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout);

  DELETE FROM public.phase_operations po
  WHERE po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout);

  UPDATE public.projects
  SET
    instructions_data_sources = 'TCNA Handbook for Ceramic, Glass, and Stone Tile Installation; ANSI A108 / A118 / A136 family standards; manufacturer literature for mortars, membranes, backer board, tile, and grout; local building code for structural and underlayment requirements.',
    updated_at = now()
  WHERE id = v_project_id;

  UPDATE public.project_phases
  SET
    name = 'Prepare subfloor',
    description = 'Bring the structural floor to a clean, sound, flat plane and install an appropriate tile underlayment system (uncoupling membrane or cement backer board) before setting tile. Scope stops at a ready-to-tile substrate; it does not include finish trim, perimeter sealant, or fixture work.',
    updated_at = now()
  WHERE id = v_phase_prep;

  UPDATE public.project_phases
  SET
    name = 'Install',
    description = 'Lay out the floor, cut tile to fit, bond tile with the correct mortar, and control lippage and alignment. Covers floor tile setting only (not toilet reset, baseboard, or transition caulking).',
    updated_at = now()
  WHERE id = v_phase_install;

  UPDATE public.project_phases
  SET
    name = 'Grout & Finish',
    description = 'After mortar has cured, fill joints with grout, clean haze, cure, and apply grout sealer when the grout manufacturer requires it. Does not include caulking at tub or perimeter, base shoe, or toilet installation.',
    updated_at = now()
  WHERE id = v_phase_grout;

  INSERT INTO public.phase_operations (id, phase_id, operation_name, operation_description, flow_type, display_order, estimated_time)
  VALUES
    (gen_random_uuid(), v_phase_prep, 'Install uncoupling membrane',
     'Bond an uncoupling membrane over a prepared subfloor using the mortar and trowel sizes specified by the membrane manufacturer. Choose this path when using a sheet membrane system instead of cement backer board.',
     'alternate', 1, '4-6 hours'),
    (gen_random_uuid(), v_phase_prep, 'Install cement backer board',
     'Install cementitious backer board over a wood subfloor (or as specified for your assembly), fasten per manufacturer, and tape or mesh seams so the plane is stiff and ready for tile. Alternate to uncoupling membrane for this phase.',
     'alternate', 2, '6-8 hours'),
    (gen_random_uuid(), v_phase_install, 'Install floor tile',
     'Plan layout, cut tile, spread mortar with correct trowel and coverage, and set tile to plane with controlled lippage.',
     'prime', 1, '1-2 days'),
    (gen_random_uuid(), v_phase_grout, 'Grout and cure',
     'Prepare joints, pack grout, wash, cure, and seal grout if required.',
     'prime', 1, '4-8 hours');

  SELECT id INTO v_op_membrane FROM public.phase_operations
  WHERE phase_id = v_phase_prep AND display_order = 1 LIMIT 1;
  SELECT id INTO v_op_backer FROM public.phase_operations
  WHERE phase_id = v_phase_prep AND display_order = 2 LIMIT 1;
  SELECT id INTO v_op_install FROM public.phase_operations
  WHERE phase_id = v_phase_install AND display_order = 1 LIMIT 1;
  SELECT id INTO v_op_grout FROM public.phase_operations
  WHERE phase_id = v_phase_grout AND display_order = 1 LIMIT 1;

  -- ---------- Prepare subfloor: membrane ----------
  INSERT INTO public.operation_steps (
    operation_id, step_title, description, display_order, flow_type, step_type,
    content_type, materials, tools, outputs, apps, content_sections,
    time_estimate_low, time_estimate_med, time_estimate_high, allow_content_edit
  ) VALUES
  (v_op_membrane, 'Clean and inspect subfloor',
   'Remove debris, check stiffness and deflection limits for your assembly, verify moisture and flatness tolerances from tile and mortar manufacturers.',
   1, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-m1a","name":"Subfloor cleaned and cleared","description":"Loose material, adhesive residue, and sealers that would block bond are removed.","type":"none"},
     {"id":"out-m1b","name":"Flatness and plane documented","description":"Gaps, hollows, and high spots are identified against manufacturer flatness requirements.","type":"none"},
     {"id":"out-m1c","name":"Moisture and substrate type recorded","description":"Substrate category and any moisture readings or tests required by product data are noted.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"m1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Tile failures often trace to a dirty, overly flexible, or out-of-flat subfloor. Follow the deflection and preparation requirements from the TCNA method that matches your assembly, the membrane manufacturer, and the mortar manufacturer.","width":"full","alignment":"left"},
     {"id":"m1-cs-ins","type":"text","title":"Instructions","content":"Clear the room, remove protrusions, scrape old adhesives, and vacuum. Walk the floor and mark soft spots, squeaks, and cracks. Check flatness with a straightedge over the field and near changes in plane. Document substrate type (wood, concrete, existing tile, etc.) and any moisture testing required before bonding.","width":"full","alignment":"left"},
     {"id":"m1-cs-er","type":"text","title":"Error-Recovery","content":"If flatness is out of spec, stop and remediate with methods allowed by your assembly (grinding humps, filling low areas with approved patch, screwing down panels) before membrane work. Do not spot-bond membrane over contaminants.","width":"full","alignment":"left"},
     {"id":"m1-cs-safe","type":"safety-warning","title":"Safety","content":"Wear a properly fitted respirator when creating silica dust from grinding or cutting cementitious materials.","severity":"high","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 1.5, 2.5, true),
  (v_op_membrane, 'Spread mortar for membrane',
   'Mix and apply the mortar specified for the membrane using the correct trowel notch to achieve wet contact when the sheet is embedded.',
   2, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-m2a","name":"Mortar mixed to manufacturer limits","description":"Pot life and liquid ratio respected; no dry clumps.","type":"none"},
     {"id":"out-m2b","name":"Combbed mortar ready for sheet","description":"Ridge pattern and coverage area match membrane instructions.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"m2-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Uncoupling sheets bond by mechanical keying and adhesive contact in the fleece. The wrong mortar or a skim coat that skins over prevents transfer.","width":"full","alignment":"left"},
     {"id":"m2-cs-ins","type":"text","title":"Instructions","content":"Mix polymer-modified mortar as required. Spread with the trowel size named for your membrane. Comb in straight ridges. Work in manageable areas so the mortar does not skin before embedding.","width":"full","alignment":"left"},
     {"id":"m2-cs-er","type":"text","title":"Error-Recovery","content":"If mortar skins or you see bare fleece after embedding, pull the sheet, remove dried mortar, remix, and reapply.","width":"full","alignment":"left"}
   ]'::jsonb,
   0.75, 1.25, 2.0, true),
  (v_op_membrane, 'Embed membrane and detail seams',
   'Lay sheets, embed with float, overlap seams per print, and treat corners and changes in plane per manufacturer.',
   3, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-m3a","name":"Membrane fully embedded","description":"No loose pockets; fleece shows transfer without voids.","type":"none"},
     {"id":"out-m3b","name":"Seams and details completed","description":"Overlap, seam tape or banding, and perimeter details match manufacturer drawings.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"m3-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Seams and movement joints at perimeters are part of the system warranty path when one applies. Follow the printed side, overlap direction, and inside or outside corner treatments shown for your brand.","width":"full","alignment":"left"},
     {"id":"m3-cs-ins","type":"text","title":"Instructions","content":"Dry-lay to minimize small cuts. Press the sheet into fresh mortar with a flat side of the trowel or block, working air toward edges. Roll or beat per manufacturer. Stagger end joints, maintain overlap, and install any seam banding. Keep the surface clear for tile layout after cure.","width":"full","alignment":"left"},
     {"id":"m3-cs-er","type":"text","title":"Error-Recovery","content":"Lift and re-embed any area with drummy sound or visible voids before tile. Patch thin spots with fresh mortar rather than spot-dabbing on a cured skin.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.5, 2.5, 4.0, true);

  -- ---------- Prepare subfloor: backer ----------
  INSERT INTO public.operation_steps (
    operation_id, step_title, description, display_order, flow_type, step_type,
    content_type, materials, tools, outputs, apps, content_sections,
    time_estimate_low, time_estimate_med, time_estimate_high, allow_content_edit
  ) VALUES
  (v_op_backer, 'Cut and fit backer panels',
   'Measure, cut, and dry-lay panels with correct gaps at edges and abutting sheets.',
   1, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-b1a","name":"Panels cut and numbered","description":"Cuts clear obstructions; layout minimizes small slivers at walls.","type":"none"},
     {"id":"out-b1b","name":"Edge and field gaps set","description":"Perimeter and panel gaps match manufacturer spacing requirements.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"b1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Cement backer board adds stiffness and a dimensionally stable face for tile on wood framing. Gaps manage movement; tight butt joints risk telegraphing or cracking.","width":"full","alignment":"left"},
     {"id":"b1-cs-ins","type":"text","title":"Instructions","content":"Score and snap or saw outdoors or with dust control. Dry-lay full sheets first, then fill with cut pieces. Leave required gaps at walls, cabinets, and between boards. Plan fastener spacing before you lift sheets for fastening.","width":"full","alignment":"left"},
     {"id":"b1-cs-er","type":"text","title":"Error-Recovery","content":"Replace fractured panels; do not bridge large hollows with only backer. Fill low spots with approved floor patch first.","width":"full","alignment":"left"},
     {"id":"b1-cs-safe","type":"safety-warning","title":"Safety","content":"Cutting cement board generates silica dust; use dust collection and a respirator rated for silica.","severity":"high","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 2.0, 3.0, true),
  (v_op_backer, 'Fasten backer to subfloor',
   'Set panels on a bed of thinset if required, drive fasteners on the printed pattern, and keep fastener heads flush without crushing the core.',
   2, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-b2a","name":"Fastener pattern complete","description":"Screws at spacing and edge distance per board print.","type":"none"},
     {"id":"out-b2b","name":"Plane suitable for tile","description":"No proud fastener heads; surface ready for mesh or tape at seams.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"b2-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Many assemblies call for a fresh mortar bond coat under backer on wood to fill voids and increase contact. Use the mortar class named by the board maker.","width":"full","alignment":"left"},
     {"id":"b2-cs-ins","type":"text","title":"Instructions","content":"Spread mortar if required, then seat the panel without trapping air. Drive backer screws on the marked grid; add structural screws to the framing where the print requires. Check for twist and re-shim before final tightening.","width":"full","alignment":"left"},
     {"id":"b2-cs-er","type":"text","title":"Error-Recovery","content":"Back out and replace stripped screws; add a nearby fastener. Grind or reset proud heads so they do not telegraph through tile.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.5, 2.5, 4.0, true),
  (v_op_backer, 'Tape or mesh seams and embed',
   'Reinforce seams with alkali-resistant tape or mesh and mortar so the field is monolithic before tile.',
   3, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-b3a","name":"Seams reinforced","description":"Tape or mesh centered on joints without bubbles.","type":"none"},
     {"id":"out-b3b","name":"Surface ready for waterproofing or tile","description":"Feathered joints; no sharp shoulders at seams.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"b3-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Seam treatment reduces crack migration at board joints. Match the mortar type to wet areas if you later liquid waterproof.","width":"full","alignment":"left"},
     {"id":"b3-cs-ins","type":"text","title":"Instructions","content":"Spread a layer of mortar, embed tape or mesh, and skim flat. Allow to cure before tile bond coat unless the system allows same-day sequence.","width":"full","alignment":"left"},
     {"id":"b3-cs-er","type":"text","title":"Error-Recovery","content":"Cut out bubbled tape, reapply mortar, and re-embed. Feather wide transitions so trowel ridges do not show as lippage in thin tile.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 1.75, 3.0, true);

  -- ---------- Install ----------
  INSERT INTO public.operation_steps (
    operation_id, step_title, description, display_order, flow_type, step_type,
    content_type, materials, tools, outputs, apps, content_sections,
    time_estimate_low, time_estimate_med, time_estimate_high, allow_content_edit
  ) VALUES
  (v_op_install, 'Layout and reference lines',
   'Dry-lay rows, balance cuts at borders, and snap chalk or laser references for bond coat and alignment.',
   1, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-i1a","name":"Layout plan recorded","description":"Start line, row height, and cut strategy at doorways and niches agreed.","type":"none"},
     {"id":"out-i1b","name":"Reference lines established","description":"Square and straight baselines for installer alignment.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"i1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Balanced cuts at visible walls read better than full tiles hidden behind a door and slivers at the entry. Confirm cabinet, appliance, and swing-clear dimensions before locking a start line.","width":"full","alignment":"left"},
     {"id":"i1-cs-ins","type":"text","title":"Instructions","content":"Measure the room, account for grout joint width, and dry-lay a row along the longest sightline. Mark a start line parallel to the primary wall you see first. Transfer 90-degree references and mark grid lines for large formats.","width":"full","alignment":"left"},
     {"id":"i1-cs-er","type":"text","title":"Error-Recovery","content":"If diagonals disagree with square, find which wall is out and shift the start line to hide taper in low-visibility zones without violating minimum cut width.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 2.0, 3.5, true),
  (v_op_install, 'Cut tiles to layout',
   'Cut straight and hole cuts with the appropriate saw or scorer; dry-fit critical pieces at borders.',
   2, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-i2a","name":"Cuts verified dry","description":"Border and jamb cuts fit without force.","type":"none"},
     {"id":"out-i2b","name":"Cut quality acceptable","description":"Glazed edges chamfered where needed; no visible chipping in show areas.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"i2-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Porcelain usually needs a wet saw; snap cutters suit many ceramics. Cooling water reduces chipping and silica exposure compared to dry grinding.","width":"full","alignment":"left"},
     {"id":"i2-cs-ins","type":"text","title":"Instructions","content":"Transfer measurements from the floor to tile. Cut slightly shy on inside corners and pare to fit. Label stacks by row. Test L cuts at door jambs before spreading mortar.","width":"full","alignment":"left"},
     {"id":"i2-cs-er","type":"text","title":"Error-Recovery","content":"Toss tiles with cracks through the glaze. For chips in hidden areas, rotate cut to the wall; for show chips, recut.","width":"full","alignment":"left"},
     {"id":"i2-cs-safe","type":"safety-warning","title":"Safety","content":"Keep hands clear of the blade path; use GFCI for wet saws; manage silica slurry per local disposal rules.","severity":"medium","width":"full","alignment":"left"}
   ]'::jsonb,
   1.5, 3.0, 6.0, true),
  (v_op_install, 'Spread mortar and verify coverage',
   'Use the trowel size from the tile and mortar data; comb consistently and lift sample tiles to confirm transfer.',
   3, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-i3a","name":"Mortar mixed within spec","description":"Mix, slake if required, and remix before use.","type":"none"},
     {"id":"out-i3b","name":"Coverage spot-checked","description":"Field and edges show required contact after beating in.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"i3-cs-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI installation methods reference mortar contact area by application (dry areas, wet areas, exteriors). Large tiles often need back-buttering in addition to trowel ridges on the floor.","width":"full","alignment":"left"},
     {"id":"i3-cs-ins","type":"text","title":"Instructions","content":"Key the substrate, then apply mortar with a notched trowel. Comb in one direction for large formats. Lift the first few tiles and corners to verify transfer; increase notch depth or back-butter if coverage is light.","width":"full","alignment":"left"},
     {"id":"i3-cs-er","type":"text","title":"Error-Recovery","content":"If skinning occurs, scrape and relay fresh mortar. Do not add water to extend life beyond manufacturer limits.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 2.0, 4.0, true),
  (v_op_install, 'Set tile, beat-in, and check plane',
   'Place tiles to layout, use spacers for joint width, beat flat, and check lippage with a straightedge.',
   4, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-i4a","name":"Tile set to layout","description":"Joints align; pattern and directional grain honored.","type":"none"},
     {"id":"out-i4b","name":"Lippage within tolerance","description":"Checked with straightedge per project criteria and manufacturer limits.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"i4-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Lippage limits depend on tile type, grout joint width, and whether edges are cushioned. Use leveling clips where the manufacturer allows for your tile thickness.","width":"full","alignment":"left"},
     {"id":"i4-cs-ins","type":"text","title":"Instructions","content":"Work to lines; maintain joint width with spacers or systems. Beat in with a rubber mallet and beating block. Step back for plane and adjust while mortar is plastic. Protect finished edges from impact.","width":"full","alignment":"left"},
     {"id":"i4-cs-er","type":"text","title":"Error-Recovery","content":"If a tile is low after initial set, lift and add mortar; if high, compress before flash time expires. After cure, replacement is the remedy.","width":"full","alignment":"left"}
   ]'::jsonb,
   2.0, 6.0, 12.0, true);

  -- ---------- Grout & finish ----------
  INSERT INTO public.operation_steps (
    operation_id, step_title, description, display_order, flow_type, step_type,
    content_type, materials, tools, outputs, apps, content_sections,
    time_estimate_low, time_estimate_med, time_estimate_high, allow_content_edit
  ) VALUES
  (v_op_grout, 'Prepare joints for grout',
   'Remove spacers that interfere, clean joints to depth, and confirm mortar is cured before grouting.',
   1, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-g1a","name":"Joints cleared to depth","description":"No hardened mortar proud of joint.","type":"none"},
     {"id":"out-g1b","name":"Mortar cure verified","description":"Grouting begins only after mortar meets manufacturer cure minimums.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"g1-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Grouting over soft mortar can shift tile and stain porous stone. Depth cleaning prevents low grout and pinholes.","width":"full","alignment":"left"},
     {"id":"g1-cs-ins","type":"text","title":"Instructions","content":"Remove surface spacers. Rake excess mortar from joints without chipping glaze. Vacuum dust. Verify cure time for your mortar and ambient temperature.","width":"full","alignment":"left"},
     {"id":"g1-cs-er","type":"text","title":"Error-Recovery","content":"If low spots in mortar block the joint, cut back carefully with a grout saw or blade suited to the tile hardness.","width":"full","alignment":"left"}
   ]'::jsonb,
   0.75, 1.5, 3.0, true),
  (v_op_grout, 'Pack grout and initial clean',
   'Force grout fully into joints on a diagonal, then sponge on a first pass before haze sets hard.',
   2, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-g2a","name":"Joints filled full","description":"No continuous voids along joint bottom.","type":"none"},
     {"id":"out-g2b","name":"Initial haze controlled","description":"Major grout residue removed while joints are tooled.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"g2-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Sanded grout suits wider joints; unsanded suits narrow joints and scratch-sensitive glazes. Epoxy systems follow a different sequence from cement grouts.","width":"full","alignment":"left"},
     {"id":"g2-cs-ins","type":"text","title":"Instructions","content":"Mix grout to a smooth peanut-butter consistency unless epoxy. Work in zones. Pack joints with a rubber float held steeply, then cut diagonally to scrape excess. Sponge with clean water, changing rinse often. Tool joints uniform to depth.","width":"full","alignment":"left"},
     {"id":"g2-cs-er","type":"text","title":"Error-Recovery","content":"If grout dries on the face, use manufacturer-approved cleaners; avoid acids on fresh cement grout. For pinholes, re-pack while grout is still workable.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 2.5, 5.0, true),
  (v_op_grout, 'Final wash, cure, and seal if required',
   'Remove haze after cure windows, protect traffic, and apply penetrating grout sealer when the grout data sheet requires it.',
   3, 'prime', 'scaled', 'text', '[]'::jsonb, '[]'::jsonb,
   '[
     {"id":"out-g3a","name":"Face clean and joints uniform","description":"Haze removed without rounding joints excessively.","type":"none"},
     {"id":"out-g3b","name":"Sealer applied per schedule","description":"If required, sealer after grout cure and only on grout as directed.","type":"none"}
   ]'::jsonb, '[]'::jsonb,
   '[
     {"id":"g3-cs-bg","type":"text","title":"Background/Need-to-Know","content":"Sealers address grout porosity, not structural waterproofing. This step does not replace movement joints or perimeter sealant details outside this project scope.","width":"full","alignment":"left"},
     {"id":"g3-cs-ins","type":"text","title":"Instructions","content":"After initial cure, buff haze with a soft cloth or manufacturer cleaner. Keep foot traffic off per grout instructions. If sealing, flood only grout lines, wipe tile face, and ventilate. Record product batch for warranty folders.","width":"full","alignment":"left"},
     {"id":"g3-cs-er","type":"text","title":"Error-Recovery","content":"If sealer dries on the tile face, use the remover recommended by the sealer maker. Do not wax or film-coat unless the system allows it.","width":"full","alignment":"left"}
   ]'::jsonb,
   1.0, 2.0, 4.0, true);

  -- Level-specific instructions (JSON arrays for MultiContentEditor / Edit Workflow)
  INSERT INTO public.step_instructions (template_step_id, instruction_level, content)
  SELECT os.id, lvl.level,
    CASE lvl.level
      WHEN 'beginner' THEN (
        CASE os.step_title
          WHEN 'Clean and inspect subfloor' THEN
            '[
              {"id":"m1-b-bg","type":"text","title":"Background/Need-to-Know","content":"A clean, solid floor helps tile stay put. You are checking for dirt, bounce, and big bumps before the membrane goes down.","width":"full","alignment":"left"},
              {"id":"m1-b-ins","type":"text","title":"Instructions","content":"Sweep and vacuum. Walk slowly and mark squeaks. Lay a long straightedge on the floor and look for gaps. Write down whether the floor is wood or concrete. If the product instructions mention a moisture test, plan that before glue-down work.","width":"full","alignment":"left"},
              {"id":"m1-b-er","type":"text","title":"Error-Recovery","content":"If you see loose boards, protruding nails, or oily spots, fix those first. Do not glue over dust or paint unless the manufacturer says it is allowed.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Spread mortar for membrane' THEN
            '[
              {"id":"m2-b-bg","type":"text","title":"Background/Need-to-Know","content":"The sheet needs wet, sticky mortar under it. If the mix is too dry or sits too long, it will not grab.","width":"full","alignment":"left"},
              {"id":"m2-b-ins","type":"text","title":"Instructions","content":"Mix bags exactly like the label says. Spread with the trowel size shown for your membrane. Make straight ridges and only cover an area you can finish in a few minutes.","width":"full","alignment":"left"},
              {"id":"m2-b-er","type":"text","title":"Error-Recovery","content":"If ridges look crusty, scrape them off and mix a fresh batch.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Embed membrane and detail seams' THEN
            '[
              {"id":"m3-b-bg","type":"text","title":"Background/Need-to-Know","content":"The mat has a correct overlap at seams and special pieces for corners. Follow the pictures that came with the roll.","width":"full","alignment":"left"},
              {"id":"m3-b-ins","type":"text","title":"Instructions","content":"Lay the sheet into the mortar and push out air with the flat side of the trowel. Stagger seams like bricks. Add overlap strips where the book shows. Keep the top surface clean.","width":"full","alignment":"left"},
              {"id":"m3-b-er","type":"text","title":"Error-Recovery","content":"If you see a bubble, peel that area back, add fresh mortar, and press again.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Cut and fit backer panels' THEN
            '[
              {"id":"b1-b-bg","type":"text","title":"Background/Need-to-Know","content":"Backer board is stiff and brittle. Leave small gaps at walls and between sheets so the house can move a little without cracking tile.","width":"full","alignment":"left"},
              {"id":"b1-b-ins","type":"text","title":"Instructions","content":"Measure each piece, cut outside if you can, and test the fit before fastening. Avoid tiny slivers along the main doorway.","width":"full","alignment":"left"},
              {"id":"b1-b-er","type":"text","title":"Error-Recovery","content":"Swap out cracked boards instead of forcing them flat.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Fasten backer to subfloor' THEN
            '[
              {"id":"b2-b-bg","type":"text","title":"Background/Need-to-Know","content":"Screws hold the board tight to joists or plywood below. Some jobs also want a layer of mortar under the sheet.","width":"full","alignment":"left"},
              {"id":"b2-b-ins","type":"text","title":"Instructions","content":"Spread mortar if your instructions say to. Seat the sheet, then drive screws on the printed pattern. Screws should sit slightly below the surface, not torn through the paper.","width":"full","alignment":"left"},
              {"id":"b2-b-er","type":"text","title":"Error-Recovery","content":"Add another screw if one spins without biting.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Tape or mesh seams and embed' THEN
            '[
              {"id":"b3-b-bg","type":"text","title":"Background/Need-to-Know","content":"Tape bridges the crack between boards so tile does not see a sharp hinge.","width":"full","alignment":"left"},
              {"id":"b3-b-ins","type":"text","title":"Instructions","content":"Spread thin mortar, press tape into it, and skim flat like drywall mud. Let it harden before tiling if the label says to wait.","width":"full","alignment":"left"},
              {"id":"b3-b-er","type":"text","title":"Error-Recovery","content":"Cut out bubbles, add more mud, and smooth again.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Layout and reference lines' THEN
            '[
              {"id":"i1-b-bg","type":"text","title":"Background/Need-to-Know","content":"A little planning keeps you from narrow tile strips in the doorway where everyone looks.","width":"full","alignment":"left"},
              {"id":"i1-b-ins","type":"text","title":"Instructions","content":"Dry-lay a row of tiles with spacers. Shift the starting line so cuts at both sides look reasonable. Snap chalk lines you can follow while the mortar is open.","width":"full","alignment":"left"},
              {"id":"i1-b-er","type":"text","title":"Error-Recovery","content":"If lines are crooked, wipe chalk and snap again before you spread mud.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Cut tiles to layout' THEN
            '[
              {"id":"i2-b-bg","type":"text","title":"Background/Need-to-Know","content":"Measure twice, cut once. Wet saws are loud but give smooth cuts on hard tile.","width":"full","alignment":"left"},
              {"id":"i2-b-ins","type":"text","title":"Instructions","content":"Mark cuts from the floor, not from memory. Test tricky cuts dry before you butter tile. Keep fingers away from the blade.","width":"full","alignment":"left"},
              {"id":"i2-b-er","type":"text","title":"Error-Recovery","content":"If a show face chips, recut a new piece.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Spread mortar and verify coverage' THEN
            '[
              {"id":"i3-b-bg","type":"text","title":"Background/Need-to-Know","content":"Tile needs mortar touching almost all of the back on floors. Big tiles need bigger trowel notches and sometimes extra butter on the tile.","width":"full","alignment":"left"},
              {"id":"i3-b-ins","type":"text","title":"Instructions","content":"Comb mortar with the notch size on the bag. Lift a tile now and then to see ridges squashed on the back. Add mortar if you see empty spots.","width":"full","alignment":"left"},
              {"id":"i3-b-er","type":"text","title":"Error-Recovery","content":"Scrape off stiff mortar and spread fresh mud if it gets crusty.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Set tile, beat-in, and check plane' THEN
            '[
              {"id":"i4-b-bg","type":"text","title":"Background/Need-to-Know","content":"Spacers keep grout lines even. A rubber mallet taps tile down without cracking glaze.","width":"full","alignment":"left"},
              {"id":"i4-b-ins","type":"text","title":"Instructions","content":"Press and twist each tile into the ridges. Tap evenly. Lay a straightedge across several tiles and look for corners sticking up. Fix lows while the mud is soft.","width":"full","alignment":"left"},
              {"id":"i4-b-er","type":"text","title":"Error-Recovery","content":"Pry up a high corner gently and press it down, or add mud under a low corner before the mud skins.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Prepare joints for grout' THEN
            '[
              {"id":"g1-b-bg","type":"text","title":"Background/Need-to-Know","content":"Grout fills the space between tiles. Hardened mortar in the joint blocks grout from sitting deep.","width":"full","alignment":"left"},
              {"id":"g1-b-ins","type":"text","title":"Instructions","content":"Pull out spacer tops that show. Scrape joints with a dull tool that will not chip glaze. Wait the hours listed on the mortar bag before grouting.","width":"full","alignment":"left"},
              {"id":"g1-b-er","type":"text","title":"Error-Recovery","content":"Vacuum dust after scraping so grout is not streaky.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Pack grout and initial clean' THEN
            '[
              {"id":"g2-b-bg","type":"text","title":"Background/Need-to-Know","content":"Sanded grout feels gritty; unsanded feels smooth. Pick the one that matches your joint width label.","width":"full","alignment":"left"},
              {"id":"g2-b-ins","type":"text","title":"Instructions","content":"Smear grout diagonally across joints, pushing down until joints look full. Sponge in an arc, rinse often, and do not dig grout out of the joint.","width":"full","alignment":"left"},
              {"id":"g2-b-er","type":"text","title":"Error-Recovery","content":"If grout looks low, pack more in before it hardens.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Final wash, cure, and seal if required' THEN
            '[
              {"id":"g3-b-bg","type":"text","title":"Background/Need-to-Know","content":"A haze can form on tile after grout dries. Some grouts need a sealer later; read your grout bag.","width":"full","alignment":"left"},
              {"id":"g3-b-ins","type":"text","title":"Instructions","content":"Wait until you can walk on the floor per the grout label. Buff with a cloth. If sealing, paint sealer on grout lines and wipe tile before it dries glossy.","width":"full","alignment":"left"},
              {"id":"g3-b-er","type":"text","title":"Error-Recovery","content":"If sealer clouds the tile, use the remover the sealer company recommends.","width":"full","alignment":"left"}
            ]'::jsonb
          ELSE '[]'::jsonb
        END
      )
      WHEN 'intermediate' THEN os.content_sections
      WHEN 'advanced' THEN (
        CASE os.step_title
          WHEN 'Clean and inspect subfloor' THEN
            '[
              {"id":"m1-a-bg","type":"text","title":"Background/Need-to-Know","content":"Relate substrate prep to the TCNA assembly method you are emulating and to mortar and membrane Product Data Sheets (PDS). Document deflection, RH or MVER tests when wood or concrete moisture is a risk, and photograph anomalies for warranty files.","width":"full","alignment":"left"},
              {"id":"m1-a-ins","type":"text","title":"Instructions","content":"Mechanically remove bond breakers. Verify panel thickness and fastener schedule for wood systems. For concrete, confirm curing compounds are compatible or removed. Map flatness with a straightedge; note 1/8 in 10 ft requirements typical for large tile unless PDS differs. Stage repairs with polymers or patching compounds rated for the finished floor height.","width":"full","alignment":"left"},
              {"id":"m1-a-er","type":"text","title":"Error-Recovery","content":"Cracks with movement need engineered treatment per TCNA detail before membrane. Do not membrane over known bond breakers hoping to compensate.","width":"full","alignment":"left"},
              {"id":"m1-a-safe","type":"safety-warning","title":"Safety","content":"Silica exposures from grinding concrete or cement board require engineering controls and PPE per OSHA guidance.","severity":"high","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Spread mortar for membrane' THEN
            '[
              {"id":"m2-a-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI mortar types and polymer levels must match the membrane PDS. Open time and sag resistance matter on verticals; on floors skinning blocks transfer.","width":"full","alignment":"left"},
              {"id":"m2-a-ins","type":"text","title":"Instructions","content":"Use a calibrated mix ratio, full mixing time, and slake if required. Spread with the specified trowel, usually with directional ridges for large sheets. Maintain ambient ranges in PDS. Verify transfer immediately after embedding with a peel check.","width":"full","alignment":"left"},
              {"id":"m2-a-er","type":"text","title":"Error-Recovery","content":"If ambient heat shortens open time, reduce batch size and clean the substrate temperature where possible.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Embed membrane and detail seams' THEN
            '[
              {"id":"m3-a-bg","type":"text","title":"Background/Need-to-Know","content":"Uncoupling performance depends on full fleece saturation and correct seam geometry. Inside corners often need prefabricated sections or two-piece cuts, not forced folds.","width":"full","alignment":"left"},
              {"id":"m3-a-ins","type":"text","title":"Instructions","content":"Sequence rolls to keep factory edges aligned to overlap marks. Use manufacturer rollers or blocks at specified psi if listed. Treat penetrations with collars or seal bands. Record lot numbers.","width":"full","alignment":"left"},
              {"id":"m3-a-er","type":"text","title":"Error-Recovery","content":"Tented seams: remove, clean, re-mortar, and re-embed; do not inject adhesive.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Cut and fit backer panels' THEN
            '[
              {"id":"b1-a-bg","type":"text","title":"Background/Need-to-Know","content":"Backer board is not a structural span fix; it needs a compliant subfloor beneath. Stagger joints away from subfloor joints when possible.","width":"full","alignment":"left"},
              {"id":"b1-a-ins","type":"text","title":"Instructions","content":"Cut with score-and-snap, carbide shears, or diamond blade with dust control. Maintain 1/8 in gaps at abutting sheets and perimeters unless PDS differs. Plan fastener density at edges and around plumbing.","width":"full","alignment":"left"},
              {"id":"b1-a-er","type":"text","title":"Error-Recovery","content":"Feather high edges with carbide rasp; do not leave shoulders that telegraph.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Fasten backer to subfloor' THEN
            '[
              {"id":"b2-a-bg","type":"text","title":"Background/Need-to-Know","content":"Bonded underlayment per ANSI A118.11-style systems uses modified mortar contact and corrosion-resistant fasteners at printed spacing into framing or subfloor as approved.","width":"full","alignment":"left"},
              {"id":"b2-a-ins","type":"text","title":"Instructions","content":"Butter the floor or back-butter the sheet as required. Seat progressively to avoid air locks. Set screws without breaking the mesh; countersink slightly. Confirm panel edges supported at transitions.","width":"full","alignment":"left"},
              {"id":"b2-a-er","type":"text","title":"Error-Recovery","content":"Over-driven screws: add an adjacent fastener; patch divots with mortar before tile.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Tape or mesh seams and embed' THEN
            '[
              {"id":"b3-a-bg","type":"text","title":"Background/Need-to-Know","content":"Alkali-resistant reinforcement reduces crack reflection at joints. Wet-area assemblies may continue to liquid-applied membranes after this step.","width":"full","alignment":"left"},
              {"id":"b3-a-ins","type":"text","title":"Instructions","content":"Use polymer-modified mortar for embedding. Center reinforcement and eliminate blisters. Feather transitions to limit telegraphing under large thin tile.","width":"full","alignment":"left"},
              {"id":"b3-a-er","type":"text","title":"Error-Recovery","content":"If mesh lifts after skim sets, slice, re-wet, and re-embed; do not tile over loose tape.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Layout and reference lines' THEN
            '[
              {"id":"i1-a-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI A108.02 references joint aesthetics and lippage relative to grout width and tile warpage. Large-format layout must account for caliper variation and arrow direction if directional.","width":"full","alignment":"left"},
              {"id":"i1-a-ins","type":"text","title":"Instructions","content":"Establish primary and secondary baselines with laser or Pythagorean checks. Balance cuts at focal walls. Mark movement joint locations that continue through tile per TCNA EJ171 guidance, separate from this scope document.","width":"full","alignment":"left"},
              {"id":"i1-a-er","type":"text","title":"Error-Recovery","content":"If stone or porcelain shows shade lots, blend boxes now and update the start line to hide batch shifts.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Cut tiles to layout' THEN
            '[
              {"id":"i2-a-bg","type":"text","title":"Background/Need-to-Know","content":"Porcelain typically requires continuous rim diamond blades and adequate water. Miters and jamb undercuts demand precision to avoid chipped arrises in traffic.","width":"full","alignment":"left"},
              {"id":"i2-a-ins","type":"text","title":"Instructions","content":"Support large panels on edge to reduce flex breaks. Use hole saws or coring bits with water for penetrations. Chamfer exposed glaze cuts that will receive grout.","width":"full","alignment":"left"},
              {"id":"i2-a-er","type":"text","title":"Error-Recovery","content":"Hairline cracks from handling: discard; do not rely on grout to hide structural cracks in body.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Spread mortar and verify coverage' THEN
            '[
              {"id":"i3-a-bg","type":"text","title":"Background/Need-to-Know","content":"ANSI defines mortar contact percentages by environment. Large-and-heavy tile often requires directional troweling plus back-buttering to meet coverage on both substrate and tile.","width":"full","alignment":"left"},
              {"id":"i3-a-ins","type":"text","title":"Instructions","content":"Key, comb, and press. Lift random tiles at perimeter and field; photograph coverage. Adjust trowel angle, mortar rheology, or add back-butter until transfer is continuous.","width":"full","alignment":"left"},
              {"id":"i3-a-er","type":"text","title":"Error-Recovery","content":"Collapsed ridges from over-watered mix: discard batch; remix within ratio.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Set tile, beat-in, and check plane' THEN
            '[
              {"id":"i4-a-bg","type":"text","title":"Background/Need-to-Know","content":"Warpage interaction with narrow joints drives lippage perception. Clip systems can reduce capillary voids if used per manufacturer for your tile thickness.","width":"full","alignment":"left"},
              {"id":"i4-a-ins","type":"text","title":"Instructions","content":"Maintain bond coat flash time guidance. Beat parallel to short side of large panels to collapse air. Check with a machinist straightedge and feeler policy agreed in the contract documents. Protect edges from point loads during cure.","width":"full","alignment":"left"},
              {"id":"i4-a-er","type":"text","title":"Error-Recovery","content":"After cure, lippage remediation is replace, not grind glaze, for most porcelains.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Prepare joints for grout' THEN
            '[
              {"id":"g1-a-bg","type":"text","title":"Background/Need-to-Know","content":"Grout performance depends on depth without voids and on mortar cure below the joint. Cool, damp rooms extend cure.","width":"full","alignment":"left"},
              {"id":"g1-a-ins","type":"text","title":"Instructions","content":"Depth should be at least two-thirds of tile thickness for cement grout in typical floors unless PDS differs. Use grout saws that match body hardness. Verify mortar hardness before packing grout.","width":"full","alignment":"left"},
              {"id":"g1-a-er","type":"text","title":"Error-Recovery","content":"Localized soft mortar: delay grout; address bonding issue before sealing joints cosmetically.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Pack grout and initial clean' THEN
            '[
              {"id":"g2-a-bg","type":"text","title":"Background/Need-to-Know","content":"Epoxy, urethane, and cement grouts differ in pot life, cleanup chemistry, and joint width limits. Sanded grout can scratch soft stone; test first.","width":"full","alignment":"left"},
              {"id":"g2-a-ins","type":"text","title":"Instructions","content":"Pack diagonally to fill without dragging voids. Clean in two-pass method per grout maker: initial pull, then sponge with minimal water to avoid diluting color. Tool joints flush without exposing bond coat.","width":"full","alignment":"left"},
              {"id":"g2-a-er","type":"text","title":"Error-Recovery","content":"Efflorescence-prone settings: use distilled water for final wipe if manufacturer allows; log water source.","width":"full","alignment":"left"}
            ]'::jsonb
          WHEN 'Final wash, cure, and seal if required' THEN
            '[
              {"id":"g3-a-bg","type":"text","title":"Background/Need-to-Know","content":"Penetrating sealers do not replace movement accommodation at perimeters. Color-enhancing sealers on stone are a different specification from cement grout sealers.","width":"full","alignment":"left"},
              {"id":"g3-a-ins","type":"text","title":"Instructions","content":"Perform haze removal with pH appropriate to grout family. Apply sealer only after minimum cure; flood joints, wipe faces, and observe slip ratings on adjacent untreated tile. Keep SDS and batch numbers.","width":"full","alignment":"left"},
              {"id":"g3-a-er","type":"text","title":"Error-Recovery","content":"Streaked sealer: strip per chemical guide, neutralize, and reapply at correct temperature window.","width":"full","alignment":"left"}
            ]'::jsonb
          ELSE '[]'::jsonb
        END
      )
    END
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  CROSS JOIN (VALUES ('beginner'), ('intermediate'), ('advanced')) AS lvl(level)
  WHERE po.phase_id IN (v_phase_prep, v_phase_install, v_phase_grout);

  SELECT to_regproc('public.rebuild_phases_json_from_project_phases(uuid)') INTO v_rebuild;
  IF v_rebuild IS NOT NULL THEN
    UPDATE public.projects p
    SET
      phases = public.rebuild_phases_json_from_project_phases(p.id),
      updated_at = now()
    WHERE p.id = v_project_id;
  ELSE
    RAISE NOTICE 'rebuild_phases_json_from_project_phases(uuid) not found; projects.phases not auto-rebuilt. Rebuild from admin tooling if needed.';
  END IF;
END;
$migration$;
