-- Home improvement PPE catalog bootstrap
-- Durable / reusable PPE goes to public.tools + tool_variations.
-- Consumable / disposable PPE goes to public.materials + materials_variants.
-- All inserted rows are tagged category = 'PPE'.

DO $$
DECLARE
  t_safety_glasses uuid;
  t_safety_goggles uuid;
  t_face_shield uuid;
  t_half_face_respirator uuid;
  t_full_face_respirator uuid;
  t_hard_hat uuid;
  t_earmuffs uuid;
  t_knee_pads uuid;
  t_fall_harness uuid;
  t_hi_vis_vest uuid;
  t_cut_resistant_gloves uuid;
  t_leather_work_gloves uuid;

  m_dust_mask uuid;
  m_n95 uuid;
  m_p100_filters uuid;
  m_ov_cartridges uuid;
  m_combo_cartridges uuid;
  m_earplugs uuid;
  m_nitrile_gloves uuid;
  m_disposable_coveralls uuid;
  m_shoe_covers uuid;
BEGIN
  -- =========================================================
  -- Durable PPE: tools
  -- =========================================================
  INSERT INTO public.tools (name, description, specialty_scale, category)
  SELECT v.name, v.description, v.specialty_scale, 'PPE'
  FROM (
    VALUES
      ('Safety Glasses', 'Impact-rated eye protection for cutting, drilling, demolition, sanding, and general debris exposure.', 1),
      ('Safety Goggles', 'Sealed eye protection for dust-heavy, splash, insulation, grinding, and overhead debris conditions.', 1),
      ('Face Shield', 'Full-face splash and flying-debris barrier used over primary eye protection during grinding, cutting, or chemical cleanup.', 2),
      ('Half-Face Respirator', 'Reusable respirator body for particulate and vapor cartridges during painting, solvent work, dust generation, and demolition.', 2),
      ('Full-Face Respirator', 'Reusable respirator with integrated eye protection for heavy dust, solvent, finish, and irritant exposure.', 3),
      ('Hard Hat', 'Head protection for overhead work, falling-object exposure, attic or framing work, and active jobsite conditions.', 2),
      ('Hearing Protection Earmuffs', 'Reusable hearing protection for saws, demolition hammers, compressors, nailers, and sustained loud tool use.', 1),
      ('Knee Pads', 'Knee protection for flooring, tile, trim, under-sink, and extended kneeling tasks.', 1),
      ('Fall Protection Harness', 'Personal fall arrest body harness for roof, ladder-transfer, scaffold, and elevated-edge work.', 3),
      ('High-Visibility Safety Vest', 'Visibility vest for driveway, roadside, delivery-zone, shared-trade, and low-light exterior work.', 1),
      ('Cut-Resistant Work Gloves', 'Reusable hand protection for sheet goods, glass handling, sharp trim, metal edges, and demolition debris.', 1),
      ('Leather Work Gloves', 'Reusable abrasion-resistant gloves for hauling lumber, block, rough materials, and general site handling.', 1)
  ) AS v(name, description, specialty_scale)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tools t
    WHERE t.name = v.name
  );

  SELECT id INTO t_safety_glasses FROM public.tools WHERE name = 'Safety Glasses' LIMIT 1;
  SELECT id INTO t_safety_goggles FROM public.tools WHERE name = 'Safety Goggles' LIMIT 1;
  SELECT id INTO t_face_shield FROM public.tools WHERE name = 'Face Shield' LIMIT 1;
  SELECT id INTO t_half_face_respirator FROM public.tools WHERE name = 'Half-Face Respirator' LIMIT 1;
  SELECT id INTO t_full_face_respirator FROM public.tools WHERE name = 'Full-Face Respirator' LIMIT 1;
  SELECT id INTO t_hard_hat FROM public.tools WHERE name = 'Hard Hat' LIMIT 1;
  SELECT id INTO t_earmuffs FROM public.tools WHERE name = 'Hearing Protection Earmuffs' LIMIT 1;
  SELECT id INTO t_knee_pads FROM public.tools WHERE name = 'Knee Pads' LIMIT 1;
  SELECT id INTO t_fall_harness FROM public.tools WHERE name = 'Fall Protection Harness' LIMIT 1;
  SELECT id INTO t_hi_vis_vest FROM public.tools WHERE name = 'High-Visibility Safety Vest' LIMIT 1;
  SELECT id INTO t_cut_resistant_gloves FROM public.tools WHERE name = 'Cut-Resistant Work Gloves' LIMIT 1;
  SELECT id INTO t_leather_work_gloves FROM public.tools WHERE name = 'Leather Work Gloves' LIMIT 1;

  INSERT INTO public.tool_variations (
    id, core_item_id, name, description, sku, attributes, attribute_definitions,
    quick_add, estimated_weight_lbs, estimated_rental_lifespan_days
  )
  SELECT
    gen_random_uuid(),
    s.core_item_id,
    s.name,
    s.description,
    s.sku,
    s.attributes,
    s.attribute_definitions,
    true,
    s.estimated_weight_lbs,
    s.estimated_rental_lifespan_days
  FROM (
    VALUES
      (
        t_safety_glasses,
        'Safety Glasses - Clear Anti-Fog',
        'Clear anti-fog impact-rated glasses for interior cutting, sanding, drilling, and general debris work.',
        'PPE-SG-CLR-AF',
        jsonb_build_object('lens', 'clear', 'coating', 'anti_fog'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-lens','name','lens','display_name','Lens','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-lens-clear','value','clear','display_value','Clear','sort_order',0)
          )),
          jsonb_build_object('id','ppe-tool-attr-coating','name','coating','display_name','Coating','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-coating-anti-fog','value','anti_fog','display_value','Anti-Fog','sort_order',0)
          ))
        ),
        0.12,
        365
      ),
      (
        t_safety_glasses,
        'Safety Glasses - Tinted Outdoor',
        'Tinted impact-rated glasses for exterior cutting, roofing, siding, and bright daylight work.',
        'PPE-SG-TINT',
        jsonb_build_object('lens', 'tinted', 'coating', 'standard'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-lens','name','lens','display_name','Lens','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-lens-tinted','value','tinted','display_value','Tinted','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-coating','name','coating','display_name','Coating','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-coating-standard','value','standard','display_value','Standard','sort_order',1)
          ))
        ),
        0.12,
        365
      ),
      (
        t_safety_goggles,
        'Safety Goggles - Indirect Vent',
        'Indirect-vent goggles for dust-heavy demolition, insulation, and grinding environments.',
        'PPE-GOG-IV',
        jsonb_build_object('venting', 'indirect', 'splash_rating', 'dust'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-venting','name','venting','display_name','Venting','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-venting-indirect','value','indirect','display_value','Indirect Vent','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-venting-non_vented','value','non_vented','display_value','Non-Vented','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-splash','name','splash_rating','display_name','Protection Type','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-splash-dust','value','dust','display_value','Dust / Debris','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-splash-chemical','value','chemical','display_value','Chemical Splash','sort_order',1)
          ))
        ),
        0.22,
        365
      ),
      (
        t_safety_goggles,
        'Safety Goggles - Chemical Splash',
        'Non-vented splash goggles for stripper, cleaner, solvent, or coating splash exposure.',
        'PPE-GOG-CHEM',
        jsonb_build_object('venting', 'non_vented', 'splash_rating', 'chemical'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-venting','name','venting','display_name','Venting','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-venting-indirect','value','indirect','display_value','Indirect Vent','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-venting-non_vented','value','non_vented','display_value','Non-Vented','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-splash','name','splash_rating','display_name','Protection Type','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-splash-dust','value','dust','display_value','Dust / Debris','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-splash-chemical','value','chemical','display_value','Chemical Splash','sort_order',1)
          ))
        ),
        0.23,
        365
      ),
      (
        t_face_shield,
        'Face Shield - Clear Flip-Up',
        'Clear flip-up face shield for grinders, cut-off tools, and splash-prone cleanup used over eye protection.',
        'PPE-FS-CLEAR',
        jsonb_build_object('visor', 'clear', 'mount', 'headgear'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-visor','name','visor','display_name','Visor','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-visor-clear','value','clear','display_value','Clear','sort_order',0)
          )),
          jsonb_build_object('id','ppe-tool-attr-mount','name','mount','display_name','Mount','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-mount-headgear','value','headgear','display_value','Headgear Mount','sort_order',0)
          ))
        ),
        0.8,
        730
      ),
      (
        t_half_face_respirator,
        'Half-Face Respirator - Medium',
        'Reusable half-face respirator body sized for most painting, sanding, and dust-control work.',
        'PPE-HFR-M',
        jsonb_build_object('size', 'medium'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-size-resp','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-size-resp-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-size-resp-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        0.7,
        730
      ),
      (
        t_half_face_respirator,
        'Half-Face Respirator - Large',
        'Reusable half-face respirator body for larger fit requirements during dust and solvent work.',
        'PPE-HFR-L',
        jsonb_build_object('size', 'large'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-size-resp','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-size-resp-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-size-resp-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        0.75,
        730
      ),
      (
        t_full_face_respirator,
        'Full-Face Respirator - Medium',
        'Reusable full-face respirator for heavy dust, vapor, and irritant exposure with integrated eye protection.',
        'PPE-FFR-M',
        jsonb_build_object('size', 'medium'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-size-full-resp','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-size-full-resp-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-size-full-resp-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        1.6,
        730
      ),
      (
        t_hard_hat,
        'Hard Hat - Type I Class G Vented',
        'General-impact vented hard hat for exterior framing, siding, and overhead material handling where electrical exposure is not primary.',
        'PPE-HH-G-V',
        jsonb_build_object('class', 'g', 'venting', 'vented'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-hardhat-class','name','class','display_name','Class','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-hardhat-class-g','value','g','display_value','Class G','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-hardhat-class-e','value','e','display_value','Class E','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-hardhat-venting','name','venting','display_name','Venting','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-hardhat-vented','value','vented','display_value','Vented','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-hardhat-non-vented','value','non_vented','display_value','Non-Vented','sort_order',1)
          ))
        ),
        0.95,
        1095
      ),
      (
        t_hard_hat,
        'Hard Hat - Type I Class E Non-Vented',
        'Electrical-rated non-vented hard hat for panel, service, and overhead hazard work with shock concerns.',
        'PPE-HH-E-NV',
        jsonb_build_object('class', 'e', 'venting', 'non_vented'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-hardhat-class','name','class','display_name','Class','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-hardhat-class-g','value','g','display_value','Class G','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-hardhat-class-e','value','e','display_value','Class E','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-hardhat-venting','name','venting','display_name','Venting','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-hardhat-vented','value','vented','display_value','Vented','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-hardhat-non-vented','value','non_vented','display_value','Non-Vented','sort_order',1)
          ))
        ),
        1.0,
        1095
      ),
      (
        t_earmuffs,
        'Hearing Protection Earmuffs - Over-the-Head',
        'Reusable over-the-head earmuffs for saws, planers, compressors, and demolition tools.',
        'PPE-EAR-OH',
        jsonb_build_object('mount', 'headband'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-ear-mount','name','mount','display_name','Mount','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-ear-mount-headband','value','headband','display_value','Headband','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-ear-mount-helmet','value','helmet','display_value','Helmet Mounted','sort_order',1)
          ))
        ),
        0.6,
        730
      ),
      (
        t_earmuffs,
        'Hearing Protection Earmuffs - Helmet Mounted',
        'Helmet-mounted earmuffs for overhead or climbing work that also requires head protection.',
        'PPE-EAR-HM',
        jsonb_build_object('mount', 'helmet'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-ear-mount','name','mount','display_name','Mount','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-ear-mount-headband','value','headband','display_value','Headband','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-ear-mount-helmet','value','helmet','display_value','Helmet Mounted','sort_order',1)
          ))
        ),
        0.55,
        730
      ),
      (
        t_knee_pads,
        'Knee Pads - Foam',
        'Foam knee pads for lighter finish, trim, and intermittent kneeling work.',
        'PPE-KP-FOAM',
        jsonb_build_object('padding', 'foam'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-kneepad-padding','name','padding','display_name','Padding','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-kneepad-padding-foam','value','foam','display_value','Foam','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-kneepad-padding-gel','value','gel','display_value','Gel','sort_order',1)
          ))
        ),
        0.7,
        730
      ),
      (
        t_knee_pads,
        'Knee Pads - Gel',
        'Gel knee pads for tile, flooring, cabinet install, and longer-duration kneeling work.',
        'PPE-KP-GEL',
        jsonb_build_object('padding', 'gel'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-kneepad-padding','name','padding','display_name','Padding','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-kneepad-padding-foam','value','foam','display_value','Foam','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-kneepad-padding-gel','value','gel','display_value','Gel','sort_order',1)
          ))
        ),
        0.95,
        730
      ),
      (
        t_fall_harness,
        'Fall Protection Harness - M/L',
        'Five-point full-body harness sized medium/large for roofing, edge work, scaffold, and elevated access tasks.',
        'PPE-FALL-ML',
        jsonb_build_object('size', 'm_l', 'style', '5_point'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-harness-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-harness-size-ml','value','m_l','display_value','M/L','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-harness-size-xl','value','xl','display_value','XL','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-harness-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-harness-style-5','value','5_point','display_value','5-Point','sort_order',0)
          ))
        ),
        3.2,
        1825
      ),
      (
        t_fall_harness,
        'Fall Protection Harness - XL',
        'Five-point full-body harness sized XL for elevated residential exterior work.',
        'PPE-FALL-XL',
        jsonb_build_object('size', 'xl', 'style', '5_point'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-harness-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-harness-size-ml','value','m_l','display_value','M/L','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-harness-size-xl','value','xl','display_value','XL','sort_order',1)
          )),
          jsonb_build_object('id','ppe-tool-attr-harness-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-harness-style-5','value','5_point','display_value','5-Point','sort_order',0)
          ))
        ),
        3.35,
        1825
      ),
      (
        t_hi_vis_vest,
        'High-Visibility Safety Vest - Lime',
        'Lime reflective vest for delivery zones, driveway work, exterior cleanup, and shared-traffic areas.',
        'PPE-HIVIS-LIME',
        jsonb_build_object('color', 'lime'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-vest-color','name','color','display_name','Color','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-vest-color-lime','value','lime','display_value','Lime','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-vest-color-orange','value','orange','display_value','Orange','sort_order',1)
          ))
        ),
        0.35,
        365
      ),
      (
        t_cut_resistant_gloves,
        'Cut-Resistant Work Gloves - Medium',
        'Reusable cut-resistant gloves sized medium for sheet metal, glass, and sharp-edged material handling.',
        'PPE-CRG-M',
        jsonb_build_object('size', 'medium'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-glove-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-glove-size-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-glove-size-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        0.25,
        365
      ),
      (
        t_cut_resistant_gloves,
        'Cut-Resistant Work Gloves - Large',
        'Reusable cut-resistant gloves sized large for sharp-edged demolition and handling tasks.',
        'PPE-CRG-L',
        jsonb_build_object('size', 'large'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-glove-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-glove-size-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-glove-size-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        0.28,
        365
      ),
      (
        t_leather_work_gloves,
        'Leather Work Gloves - Large',
        'Durable leather gloves for rough framing stock, masonry, hauling debris, and abrasion-heavy site handling.',
        'PPE-LWG-L',
        jsonb_build_object('size', 'large'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-tool-attr-glove-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-tool-attr-glove-size-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-tool-attr-glove-size-large','value','large','display_value','Large','sort_order',1)
          ))
        ),
        0.45,
        365
      )
  ) AS s(
    core_item_id, name, description, sku, attributes, attribute_definitions,
    estimated_weight_lbs, estimated_rental_lifespan_days
  )
  WHERE s.core_item_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.tool_variations tv
      WHERE tv.core_item_id = s.core_item_id
        AND tv.name = s.name
    );

  -- =========================================================
  -- Consumable PPE: materials
  -- =========================================================
  INSERT INTO public.materials (
    name, description, category, unit, unit_size, avg_cost_per_unit, is_rental_available
  )
  SELECT
    v.name,
    v.description,
    'PPE',
    v.unit,
    v.unit_size,
    v.avg_cost_per_unit,
    false
  FROM (
    VALUES
      ('Dust Mask', 'Disposable nuisance-dust mask for low-hazard sweeping, light sanding, and dry cleanup where respirator-level protection is not required.', 'box', '50-count', 18.00),
      ('N95 Disposable Respirator', 'Disposable N95 particulate respirator for drywall dust, insulation fibers, sanding dust, and other non-oil airborne particulates.', 'box', '20-count', 28.00),
      ('P100 Particulate Filters', 'Replaceable particulate filters for reusable respirators when sanding, grinding, demolition, and dust-heavy cleanup generate fine particulates.', 'pair', '2-pack', 14.00),
      ('Organic Vapor Cartridges', 'Replaceable respirator cartridges for paints, solvents, stains, adhesives, and finish work involving organic vapors.', 'pair', '2-pack', 22.00),
      ('OV/P100 Combination Cartridges', 'Combination cartridges for finish and coating work that includes both organic vapor exposure and fine particulates.', 'pair', '2-pack', 26.00),
      ('Foam Earplugs', 'Disposable hearing protection for saws, compressors, nailers, and loud intermittent work.', 'box', '100-pair', 24.00),
      ('Nitrile Gloves', 'Disposable chemical- and dirt-resistant gloves for painting, caulking, adhesive work, cleanup, and finish protection.', 'box', '100-count', 21.87),
      ('Disposable Coveralls', 'Disposable body covering for insulation, attic work, dusty demolition, and overspray-prone coating work.', 'each', 'single suit', 9.50),
      ('Shoe Covers', 'Disposable covers that protect finished floors from dirt, mastic, paint, or site debris tracked by work boots.', 'pack', '50-pair', 19.00)
  ) AS v(name, description, unit, unit_size, avg_cost_per_unit)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.materials m
    WHERE m.name = v.name
  );

  SELECT id INTO m_dust_mask FROM public.materials WHERE name = 'Dust Mask' LIMIT 1;
  SELECT id INTO m_n95 FROM public.materials WHERE name = 'N95 Disposable Respirator' LIMIT 1;
  SELECT id INTO m_p100_filters FROM public.materials WHERE name = 'P100 Particulate Filters' LIMIT 1;
  SELECT id INTO m_ov_cartridges FROM public.materials WHERE name = 'Organic Vapor Cartridges' LIMIT 1;
  SELECT id INTO m_combo_cartridges FROM public.materials WHERE name = 'OV/P100 Combination Cartridges' LIMIT 1;
  SELECT id INTO m_earplugs FROM public.materials WHERE name = 'Foam Earplugs' LIMIT 1;
  SELECT id INTO m_nitrile_gloves FROM public.materials WHERE name = 'Nitrile Gloves' LIMIT 1;
  SELECT id INTO m_disposable_coveralls FROM public.materials WHERE name = 'Disposable Coveralls' LIMIT 1;
  SELECT id INTO m_shoe_covers FROM public.materials WHERE name = 'Shoe Covers' LIMIT 1;

  INSERT INTO public.materials_variants (
    id, material_id, name, description, sku, attributes, attribute_definitions
  )
  SELECT
    gen_random_uuid(),
    s.material_id,
    s.name,
    s.description,
    s.sku,
    s.attributes,
    s.attribute_definitions
  FROM (
    VALUES
      (
        m_dust_mask,
        'Dust Mask - Flat Fold',
        'Flat-fold nuisance dust mask for quick-grab cleanup and low-hazard dust tasks.',
        'PPE-DM-FF',
        jsonb_build_object('style', 'flat_fold'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-dust-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-dust-style-flat','value','flat_fold','display_value','Flat Fold','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-dust-style-cup','value','cup','display_value','Cup Style','sort_order',1)
          ))
        )
      ),
      (
        m_dust_mask,
        'Dust Mask - Cup Style',
        'Cup-style nuisance dust mask with a more rigid shell for light sanding and sweeping.',
        'PPE-DM-CUP',
        jsonb_build_object('style', 'cup'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-dust-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-dust-style-flat','value','flat_fold','display_value','Flat Fold','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-dust-style-cup','value','cup','display_value','Cup Style','sort_order',1)
          ))
        )
      ),
      (
        m_n95,
        'N95 Disposable Respirator - Flat Fold',
        'Flat-fold N95 respirator for drywall dust, insulation, and sanding cleanup.',
        'PPE-N95-FF',
        jsonb_build_object('style', 'flat_fold'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-n95-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-n95-style-flat','value','flat_fold','display_value','Flat Fold','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-n95-style-cup','value','cup','display_value','Cup Style','sort_order',1)
          ))
        )
      ),
      (
        m_n95,
        'N95 Disposable Respirator - Cup Style',
        'Cup-style N95 respirator for repetitive dust tasks where a structured shell is preferred.',
        'PPE-N95-CUP',
        jsonb_build_object('style', 'cup'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-n95-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-n95-style-flat','value','flat_fold','display_value','Flat Fold','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-n95-style-cup','value','cup','display_value','Cup Style','sort_order',1)
          ))
        )
      ),
      (
        m_p100_filters,
        'P100 Particulate Filters - Pancake',
        'Low-profile P100 particulate filters for sanding, grinding, and dust-heavy demolition.',
        'PPE-P100-PAN',
        jsonb_build_object('profile', 'pancake'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-filter-profile','name','profile','display_name','Profile','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-filter-profile-pancake','value','pancake','display_value','Pancake','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-filter-profile-cartridge','value','cartridge','display_value','Cartridge Style','sort_order',1)
          ))
        )
      ),
      (
        m_ov_cartridges,
        'Organic Vapor Cartridges - Standard',
        'Organic vapor cartridges for paints, solvents, stains, and adhesives used with reusable respirators.',
        'PPE-OV-STD',
        jsonb_build_object('rating', 'organic_vapor'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-cartridge-rating','name','rating','display_name','Protection Type','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-cartridge-rating-ov','value','organic_vapor','display_value','Organic Vapor','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-cartridge-rating-ov_p100','value','ov_p100','display_value','OV / P100 Combo','sort_order',1)
          ))
        )
      ),
      (
        m_combo_cartridges,
        'OV/P100 Combination Cartridges - Standard',
        'Combination cartridges for coating and finish work with both vapor and fine particulate exposure.',
        'PPE-OVP100-STD',
        jsonb_build_object('rating', 'ov_p100'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-cartridge-rating','name','rating','display_name','Protection Type','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-cartridge-rating-ov','value','organic_vapor','display_value','Organic Vapor','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-cartridge-rating-ov_p100','value','ov_p100','display_value','OV / P100 Combo','sort_order',1)
          ))
        )
      ),
      (
        m_earplugs,
        'Foam Earplugs - Uncorded',
        'Uncorded disposable earplugs for saws, compressors, and intermittent tool noise.',
        'PPE-EP-UNC',
        jsonb_build_object('format', 'uncorded'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-earplug-format','name','format','display_name','Format','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-earplug-format-uncorded','value','uncorded','display_value','Uncorded','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-earplug-format-corded','value','corded','display_value','Corded','sort_order',1)
          ))
        )
      ),
      (
        m_earplugs,
        'Foam Earplugs - Corded',
        'Corded disposable earplugs for repeated insertion/removal throughout a workday.',
        'PPE-EP-COR',
        jsonb_build_object('format', 'corded'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-earplug-format','name','format','display_name','Format','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-earplug-format-uncorded','value','uncorded','display_value','Uncorded','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-earplug-format-corded','value','corded','display_value','Corded','sort_order',1)
          ))
        )
      ),
      (
        m_nitrile_gloves,
        'Nitrile Gloves - 5 mil Medium',
        'Medium disposable nitrile gloves for paint, caulk, finish protection, and light chemical contact.',
        'PPE-NG-5M-M',
        jsonb_build_object('thickness', '5_mil', 'size', 'medium'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-glove-thickness','name','thickness','display_name','Thickness','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-glove-thickness-5','value','5_mil','display_value','5 mil','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-glove-thickness-8','value','8_mil','display_value','8 mil','sort_order',1)
          )),
          jsonb_build_object('id','ppe-mat-attr-glove-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-glove-size-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-glove-size-large','value','large','display_value','Large','sort_order',1)
          ))
        )
      ),
      (
        m_nitrile_gloves,
        'Nitrile Gloves - 8 mil Large',
        'Large heavier-gauge nitrile gloves for harsher cleanup, adhesives, and messy demolition handling.',
        'PPE-NG-8L-L',
        jsonb_build_object('thickness', '8_mil', 'size', 'large'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-glove-thickness','name','thickness','display_name','Thickness','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-glove-thickness-5','value','5_mil','display_value','5 mil','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-glove-thickness-8','value','8_mil','display_value','8 mil','sort_order',1)
          )),
          jsonb_build_object('id','ppe-mat-attr-glove-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-glove-size-medium','value','medium','display_value','Medium','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-glove-size-large','value','large','display_value','Large','sort_order',1)
          ))
        )
      ),
      (
        m_disposable_coveralls,
        'Disposable Coveralls - Hooded Large',
        'Large hooded disposable coveralls for insulation, crawlspace, attic, and overspray-prone work.',
        'PPE-COV-L',
        jsonb_build_object('size', 'large', 'style', 'hooded'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-coverall-size','name','size','display_name','Size','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-coverall-size-large','value','large','display_value','Large','sort_order',0),
            jsonb_build_object('id','ppe-mat-attr-coverall-size-xl','value','xl','display_value','XL','sort_order',1)
          )),
          jsonb_build_object('id','ppe-mat-attr-coverall-style','name','style','display_name','Style','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-coverall-style-hooded','value','hooded','display_value','Hooded','sort_order',0)
          ))
        )
      ),
      (
        m_shoe_covers,
        'Shoe Covers - Non-Skid',
        'Disposable non-skid shoe covers for protecting finished floors during interior work.',
        'PPE-SC-NS',
        jsonb_build_object('sole', 'non_skid'),
        jsonb_build_array(
          jsonb_build_object('id','ppe-mat-attr-shoecover-sole','name','sole','display_name','Sole Type','attribute_type','text','values',jsonb_build_array(
            jsonb_build_object('id','ppe-mat-attr-shoecover-sole-nonskid','value','non_skid','display_value','Non-Skid','sort_order',0)
          ))
        )
      )
  ) AS s(material_id, name, description, sku, attributes, attribute_definitions)
  WHERE s.material_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.materials_variants mv
      WHERE mv.material_id = s.material_id
        AND mv.name = s.name
    );
END $$;
