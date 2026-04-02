-- Top 50 common home-improvement power tools catalog bootstrap
-- Seeds public.tools and public.tool_variations with admin-style attributes/variants.
-- Every core tool is category = 'Power Tool'.
-- Every core tool gets both battery and 120V corded variants.

DO $$
BEGIN
  CREATE TEMP TABLE tmp_power_tool_specs (
    slug text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    specialty_scale integer NOT NULL,
    common_attr_key text NOT NULL,
    common_attr_label text NOT NULL,
    battery_common_value text NOT NULL,
    battery_common_display text NOT NULL,
    corded_common_value text NOT NULL,
    corded_common_display text NOT NULL,
    battery_variant_label text NOT NULL,
    corded_variant_label text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_power_tool_specs (
    slug, name, description, specialty_scale, common_attr_key, common_attr_label,
    battery_common_value, battery_common_display, corded_common_value, corded_common_display,
    battery_variant_label, corded_variant_label
  ) VALUES
    ('power-drill', 'Power Drill', 'General-purpose drill for holes, pilot holes, light mixing, and everyday fastening in wood, drywall, plastic, and light metal.', 2, 'chuck_size', 'Chuck Size', '1_2_in', '1/2 in', '3_8_in', '3/8 in', 'Battery 20V 1/2 in Chuck', '120V Corded 3/8 in Chuck'),
    ('impact-driver', 'Impact Driver', 'High-torque driver for structural screws, lag screws, ledger fasteners, and stubborn hardware.', 2, 'collet_size', 'Collet Size', '1_4_in', '1/4 in', '1_4_in', '1/4 in', 'Battery 20V 1/4 in Hex', '120V Corded 1/4 in Hex'),
    ('hammer-drill', 'Hammer Drill', 'Drill with hammer action for anchors, masonry drilling, and tougher fastening work.', 2, 'chuck_size', 'Chuck Size', '1_2_in', '1/2 in', '1_2_in', '1/2 in', 'Battery 20V 1/2 in Chuck', '120V Corded 1/2 in Chuck'),
    ('rotary-hammer', 'Rotary Hammer', 'Heavy-duty drilling and light chipping tool for concrete, block, and masonry anchoring.', 3, 'chuck_type', 'Chuck Type', 'sds_plus', 'SDS-Plus', 'sds_plus', 'SDS-Plus', 'Battery 20V SDS-Plus', '120V Corded SDS-Plus'),
    ('cordless-screwdriver', 'Cordless Screwdriver', 'Compact driver for cabinet hardware, switch plates, light assembly, and low-torque fastening.', 1, 'collet_size', 'Collet Size', '1_4_in', '1/4 in', '1_4_in', '1/4 in', 'Battery 12V 1/4 in Hex', '120V Corded 1/4 in Hex'),
    ('right-angle-drill', 'Right Angle Drill', 'Drill for studs, joists, cabinets, and tight mechanical or framing spaces.', 2, 'chuck_size', 'Chuck Size', '3_8_in', '3/8 in', '1_2_in', '1/2 in', 'Battery 20V 3/8 in Chuck', '120V Corded 1/2 in Chuck'),
    ('circular-saw', 'Circular Saw', 'Straight-cut saw for framing lumber, sheet goods, trim breakdown, and remodeling cuts.', 2, 'blade_size', 'Blade Size', '6_1_2_in', '6-1/2 in', '7_1_4_in', '7-1/4 in', 'Battery 20V 6-1/2 in Blade', '120V Corded 7-1/4 in Blade'),
    ('track-saw', 'Track Saw', 'Guided plunge saw for clean sheet-good cuts, cabinet panels, and finish carpentry breakdown.', 3, 'blade_size', 'Blade Size', '6_1_2_in', '6-1/2 in', '6_1_2_in', '6-1/2 in', 'Battery 20V 6-1/2 in Blade', '120V Corded 6-1/2 in Blade'),
    ('miter-saw', 'Miter Saw', 'Crosscut and angle-cut saw for trim, framing, casing, baseboard, and molding work.', 3, 'blade_size', 'Blade Size', '7_1_4_in', '7-1/4 in', '12_in', '12 in', 'Battery 20V 7-1/4 in Blade', '120V Corded 12 in Blade'),
    ('tile-saw', 'Tile Saw', 'Wet-cut saw for ceramic, porcelain, and stone tile sizing and finish cuts.', 3, 'blade_size', 'Blade Size', '7_in', '7 in', '10_in', '10 in', 'Battery 20V 7 in Blade', '120V Corded 10 in Blade'),
    ('jigsaw', 'Jigsaw', 'Saw for curved cuts, cutouts, sink openings, and finish trimming in sheet goods and trim.', 2, 'stroke_length', 'Stroke Length', '1_in', '1 in', '1_in', '1 in', 'Battery 20V 1 in Stroke', '120V Corded 1 in Stroke'),
    ('reciprocating-saw', 'Reciprocating Saw', 'Demolition saw for rough cutout work, framing tear-out, pipe cutting, and remodel access.', 2, 'stroke_length', 'Stroke Length', '1_1_4_in', '1-1/4 in', '1_1_4_in', '1-1/4 in', 'Battery 20V 1-1/4 in Stroke', '120V Corded 1-1/4 in Stroke'),
    ('oscillating-multi-tool', 'Oscillating Multi-Tool', 'Multi-purpose cut, scrape, and sanding tool for tight spaces, undercutting, and finish adjustments.', 2, 'interface', 'Accessory Interface', 'ois', 'OIS', 'ois', 'OIS', 'Battery 20V OIS', '120V Corded OIS'),
    ('angle-grinder', 'Angle Grinder', 'Cutting, grinding, surface prep, and metal cleanup tool for masonry, metal, and tile accessories.', 2, 'disc_size', 'Disc Size', '4_1_2_in', '4-1/2 in', '4_1_2_in', '4-1/2 in', 'Battery 20V 4-1/2 in Disc', '120V Corded 4-1/2 in Disc'),
    ('router', 'Router', 'Edge shaping, groove cutting, hinge mortising, and template-routing tool for finish carpentry.', 3, 'collet_size', 'Collet Size', '1_4_in', '1/4 in', '1_2_in', '1/2 in', 'Battery 20V 1/4 in Collet', '120V Corded 1/2 in Collet'),
    ('laminate-trimmer', 'Laminate Trimmer', 'Compact trim router for laminate, edge flush trimming, and light detail routing.', 2, 'collet_size', 'Collet Size', '1_4_in', '1/4 in', '1_4_in', '1/4 in', 'Battery 20V 1/4 in Collet', '120V Corded 1/4 in Collet'),
    ('random-orbital-sander', 'Random Orbital Sander', 'Finish sander for wood prep, primer sanding, paint scuffing, and surface smoothing.', 2, 'pad_size', 'Pad Size', '5_in', '5 in', '5_in', '5 in', 'Battery 20V 5 in Pad', '120V Corded 5 in Pad'),
    ('belt-sander', 'Belt Sander', 'Aggressive stock-removal sander for rough leveling, flattening, and heavy surface prep.', 3, 'belt_size', 'Belt Size', '3_x_18_in', '3 x 18 in', '3_x_21_in', '3 x 21 in', 'Battery 20V 3 x 18 in Belt', '120V Corded 3 x 21 in Belt'),
    ('detail-sander', 'Detail Sander', 'Corner and edge sander for trim, window sash, spindles, and tight finish surfaces.', 1, 'pad_style', 'Pad Style', 'delta', 'Delta', 'delta', 'Delta', 'Battery 20V Delta Pad', '120V Corded Delta Pad'),
    ('drywall-sander', 'Drywall Sander', 'Long-reach drywall finishing sander for joint compound smoothing and overhead wall prep.', 3, 'head_diameter', 'Head Diameter', '8_1_2_in', '8-1/2 in', '9_in', '9 in', 'Battery 20V 8-1/2 in Head', '120V Corded 9 in Head'),
    ('power-planer', 'Power Planer', 'Planer for door fitting, edge trimming, beveling, and flattening proud material.', 2, 'cut_width', 'Cut Width', '3_1_4_in', '3-1/4 in', '3_1_4_in', '3-1/4 in', 'Battery 20V 3-1/4 in Width', '120V Corded 3-1/4 in Width'),
    ('brad-nailer', 'Brad Nailer', 'Light fastening nailer for trim returns, narrow molding, and delicate finish work.', 2, 'fastener_gauge', 'Fastener Gauge', '18_ga', '18 ga', '18_ga', '18 ga', 'Battery 20V 18 ga', '120V Corded 18 ga'),
    ('finish-nailer', 'Finish Nailer', 'General finish nailer for casing, baseboard, trim, and small assembly work.', 2, 'fastener_gauge', 'Fastener Gauge', '16_ga', '16 ga', '16_ga', '16 ga', 'Battery 20V 16 ga', '120V Corded 16 ga'),
    ('framing-nailer', 'Framing Nailer', 'Structural nailer for walls, decks, blocking, and heavy framing assembly.', 3, 'nail_angle', 'Nail Angle', '30_degree', '30 degree', '21_degree', '21 degree', 'Battery 20V 30 degree', '120V Corded 21 degree'),
    ('crown-stapler', 'Crown Stapler', 'Stapler for sheathing wrap, panel backers, insulation support, and light trim fastening.', 2, 'crown_size', 'Crown Size', '1_4_in', '1/4 in Crown', '1_4_in', '1/4 in Crown', 'Battery 20V 1/4 in Crown', '120V Corded 1/4 in Crown'),
    ('flooring-nailer-stapler', 'Flooring Nailer/Stapler', 'Fastener tool for hardwood flooring install using cleats or staples depending on flooring system.', 3, 'fastener_type', 'Fastener Type', 'staples', 'Staples', 'cleats', 'Cleats', 'Battery 20V Staples', '120V Corded Cleats'),
    ('impact-wrench', 'Impact Wrench', 'High-torque fastening tool for anchors, structural bolts, lags, wheel lugs, and heavy hardware.', 2, 'anvil_size', 'Anvil Size', '1_2_in', '1/2 in', '1_2_in', '1/2 in', 'Battery 20V 1/2 in Anvil', '120V Corded 1/2 in Anvil'),
    ('heat-gun', 'Heat Gun', 'Tool for paint softening, shrink tubing, adhesive release, and controlled heating tasks.', 1, 'max_temperature', 'Max Temperature', '990_f', '990 F', '1100_f', '1100 F', 'Battery 20V 990 F', '120V Corded 1100 F'),
    ('power-caulk-gun', 'Power Caulk Gun', 'Powered caulk dispenser for long joints, repetitive sealing, and reduced hand fatigue.', 2, 'tube_size', 'Tube Size', '10_oz', '10 oz', '10_oz', '10 oz', 'Battery 20V 10 oz Tube', '120V Corded 10 oz Tube'),
    ('paint-sprayer', 'Paint Sprayer', 'Coating tool for walls, cabinets, trim, fences, and finish application.', 3, 'sprayer_type', 'Sprayer Type', 'hvlp', 'HVLP', 'airless', 'Airless', 'Battery 20V HVLP', '120V Corded Airless'),
    ('shop-vacuum', 'Shop Vacuum', 'Wet/dry vacuum for cleanup, dust collection, demolition debris, and jobsite extraction.', 2, 'tank_capacity', 'Tank Capacity', '2_gal', '2 gal', '12_gal', '12 gal', 'Battery 20V 2 gal Tank', '120V Corded 12 gal Tank'),
    ('pressure-washer', 'Pressure Washer', 'Exterior cleaning tool for siding, concrete, decks, masonry, and prep washing.', 2, 'pressure_rating', 'Pressure Rating', '600_psi', '600 PSI', '2000_psi', '2000 PSI', 'Battery 20V 600 PSI', '120V Corded 2000 PSI'),
    ('air-compressor', 'Air Compressor', 'Portable compressor for pneumatic fastening, inflation, and light spray support.', 2, 'tank_capacity', 'Tank Capacity', '2_gal', '2 gal', '6_gal', '6 gal', 'Battery 20V 2 gal Tank', '120V Corded 6 gal Tank'),
    ('drain-auger', 'Drain Auger', 'Powered drain-cleaning tool for sink, tub, and branch-line clog removal.', 2, 'cable_length', 'Cable Length', '25_ft', '25 ft', '50_ft', '50 ft', 'Battery 20V 25 ft Cable', '120V Corded 50 ft Cable'),
    ('drywall-screw-gun', 'Drywall Screw Gun', 'Fastener tool for drywall hanging, subfloor screws, and repetitive collated screw work.', 2, 'feed_type', 'Feed Type', 'collated', 'Collated', 'collated', 'Collated', 'Battery 20V Collated Feed', '120V Corded Collated Feed'),
    ('demolition-hammer', 'Demolition Hammer', 'Heavy chipping and breaking tool for tile demolition, slab removal, and concrete breakup.', 3, 'tool_mount', 'Tool Mount', 'sds_max', 'SDS-Max', 'sds_max', 'SDS-Max', 'Battery 20V SDS-Max', '120V Corded SDS-Max'),
    ('band-saw', 'Band Saw', 'Portable saw for metal conduit, threaded rod, strut, and compact stock cutting.', 2, 'throat_capacity', 'Throat Capacity', '3_1_4_in', '3-1/4 in', '5_in', '5 in', 'Battery 20V 3-1/4 in Throat', '120V Corded 5 in Throat'),
    ('metal-cut-off-saw', 'Metal Cut-Off Saw', 'Saw for steel studs, rebar, angle iron, and jobsite metal stock.', 3, 'disc_size', 'Disc Size', '5_3_8_in', '5-3/8 in', '14_in', '14 in', 'Battery 20V 5-3/8 in Disc', '120V Corded 14 in Disc'),
    ('wet-polisher', 'Wet Polisher', 'Stone and concrete polishing tool for countertop edges, tile edges, and finish refinement.', 2, 'pad_size', 'Pad Size', '5_in', '5 in', '5_in', '5 in', 'Battery 20V 5 in Pad', '120V Corded 5 in Pad'),
    ('power-shears', 'Power Shears', 'Metal-cutting shear for duct, flashing, sheet metal, and roofing trim cuts.', 2, 'cutting_capacity', 'Cutting Capacity', '18_ga', '18 ga', '18_ga', '18 ga', 'Battery 20V 18 ga', '120V Corded 18 ga'),
    ('nibbler', 'Nibbler', 'Punch-style metal cutter for corrugated panels, sheet metal, and tighter curved cuts.', 2, 'cutting_capacity', 'Cutting Capacity', '16_ga', '16 ga', '16_ga', '16 ga', 'Battery 20V 16 ga', '120V Corded 16 ga'),
    ('chainsaw', 'Chainsaw', 'Cutting tool for limbs, small trees, landscape timbers, and exterior renovation cleanup.', 2, 'bar_length', 'Bar Length', '12_in', '12 in', '16_in', '16 in', 'Battery 20V 12 in Bar', '120V Corded 16 in Bar'),
    ('leaf-blower', 'Leaf Blower', 'Blower for site cleanup, dust clearing, driveway prep, and exterior debris removal.', 1, 'air_speed', 'Air Speed', '120_mph', '120 MPH', '150_mph', '150 MPH', 'Battery 20V 120 MPH', '120V Corded 150 MPH'),
    ('electric-staple-gun', 'Electric Staple Gun', 'Stapler for insulation, fabric backers, wire tacking, and light trim fastening.', 1, 'staple_length', 'Staple Length', '3_8_in', '3/8 in', '1_2_in', '1/2 in', 'Battery 20V 3/8 in Staples', '120V Corded 1/2 in Staples'),
    ('glue-gun', 'Glue Gun', 'Adhesive gun for temporary jigs, mockups, light trim holding, and craft-like install support.', 1, 'glue_stick_size', 'Glue Stick Size', 'mini', 'Mini', 'full_size', 'Full Size', 'Battery 20V Mini Stick', '120V Corded Full-Size Stick'),
    ('grease-gun', 'Grease Gun', 'Powered grease gun for mechanical lubrication on doors, equipment, and hardware service points.', 1, 'cartridge_size', 'Cartridge Size', '14_oz', '14 oz', '14_oz', '14 oz', 'Battery 20V 14 oz Cartridge', '120V Corded 14 oz Cartridge'),
    ('transfer-pump', 'Transfer Pump', 'Pump for moving water from tubs, heaters, buckets, and cleanup areas during plumbing or restoration work.', 2, 'flow_rate', 'Flow Rate', '8_gpm', '8 GPM', '15_gpm', '15 GPM', 'Battery 20V 8 GPM', '120V Corded 15 GPM'),
    ('pipe-threader', 'Pipe Threader', 'Threading tool for black iron and gas-pipe prep where threaded connections are required.', 3, 'pipe_capacity', 'Pipe Capacity', '1_in', '1 in', '2_in', '2 in', 'Battery 20V 1 in Capacity', '120V Corded 2 in Capacity'),
    ('concrete-vibrator', 'Concrete Vibrator', 'Concrete consolidation tool for small pours, footings, forms, and patch placements.', 2, 'head_size', 'Head Size', '1_in', '1 in Head', '1_1_2_in', '1-1/2 in Head', 'Battery 20V 1 in Head', '120V Corded 1-1/2 in Head'),
    ('pex-expansion-tool', 'PEX Expansion Tool', 'Tubing expansion tool for expansion-style PEX fittings in water supply installs and modifications.', 2, 'tubing_capacity', 'Tubing Capacity', '1_in', '1 in', '1_in', '1 in', 'Battery 20V 1 in Capacity', '120V Corded 1 in Capacity');

  INSERT INTO public.tools (name, description, specialty_scale, category)
  SELECT s.name, s.description, s.specialty_scale, 'Power Tool'
  FROM tmp_power_tool_specs s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tools t
    WHERE t.name = s.name
  );

  INSERT INTO public.tool_variations (
    id, core_item_id, name, description, sku, attributes, attribute_definitions, quick_add
  )
  SELECT
    gen_random_uuid(),
    t.id,
    s.name || ' - ' || v.variant_label,
    s.description || CASE WHEN v.power_source_value = 'battery' THEN ' Battery-powered version.' ELSE ' 120V corded version.' END,
    upper(replace(s.slug, '-', '_')) || CASE WHEN v.power_source_value = 'battery' THEN '_BAT' ELSE '_120V' END,
    jsonb_build_object(
      'power_source', v.power_source_value,
      s.common_attr_key, v.common_attr_value
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', s.slug || '-attr-power-source',
        'name', 'power_source',
        'display_name', 'Power Source',
        'attribute_type', 'text',
        'values', jsonb_build_array(
          jsonb_build_object(
            'id', s.slug || '-attr-power-source-battery',
            'value', 'battery',
            'display_value', 'Battery',
            'sort_order', 0,
            'core_item_id', t.id
          ),
          jsonb_build_object(
            'id', s.slug || '-attr-power-source-corded-120v',
            'value', 'corded_120v',
            'display_value', '120V Corded',
            'sort_order', 1,
            'core_item_id', t.id
          )
        )
      ),
      jsonb_build_object(
        'id', s.slug || '-attr-' || s.common_attr_key,
        'name', s.common_attr_key,
        'display_name', s.common_attr_label,
        'attribute_type', 'text',
        'values', jsonb_build_array(
          jsonb_build_object(
            'id', s.slug || '-attr-' || s.common_attr_key || '-battery',
            'value', s.battery_common_value,
            'display_value', s.battery_common_display,
            'sort_order', 0,
            'core_item_id', t.id
          ),
          jsonb_build_object(
            'id', s.slug || '-attr-' || s.common_attr_key || '-corded',
            'value', s.corded_common_value,
            'display_value', s.corded_common_display,
            'sort_order', 1,
            'core_item_id', t.id
          )
        )
      )
    ),
    true
  FROM tmp_power_tool_specs s
  JOIN public.tools t
    ON t.name = s.name
  CROSS JOIN LATERAL (
    VALUES
      ('battery', s.battery_common_value, s.battery_common_display, s.battery_variant_label),
      ('corded_120v', s.corded_common_value, s.corded_common_display, s.corded_variant_label)
  ) AS v(power_source_value, common_attr_value, common_attr_display, variant_label)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tool_variations tv
    WHERE tv.core_item_id = t.id
      AND tv.name = s.name || ' - ' || v.variant_label
  );
END $$;
