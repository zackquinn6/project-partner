DO $$
DECLARE
  rec RECORD;
  source_tool RECORD;
  existing_material_id uuid;
  target_material_id uuid;
BEGIN
  CREATE TEMP TABLE tmp_material_move_specs (
    material_id uuid PRIMARY KEY,
    material_name text NOT NULL,
    lookup_names text[] NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    unit_size text NOT NULL,
    avg_cost_per_unit numeric,
    alternates text,
    notes text
  ) ON COMMIT DROP;

  INSERT INTO tmp_material_move_specs (
    material_id,
    material_name,
    lookup_names,
    category,
    description,
    unit,
    unit_size,
    avg_cost_per_unit,
    alternates,
    notes
  ) VALUES
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef001'::uuid,
      'Wire nuts',
      ARRAY['wire nuts', 'wire connectors'],
      'Hardware',
      'Twist-on wire connectors used to secure and insulate joined electrical conductors.',
      'pack',
      '100-count',
      10.98,
      'Twist-on wire connectors, wing wire connectors',
      'Typical retail package is a 100-count assortment or single-size pack.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef002'::uuid,
      'Spackle',
      ARRAY['spackle', 'spackling', 'spackling compound'],
      'Consumable',
      'Wall patching compound used to fill small holes, dents, and surface imperfections before sanding and paint.',
      'tub',
      '32 fl oz',
      8.99,
      'Lightweight spackling, patching compound',
      'Common consumer package size is approximately one quart / 32 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef003'::uuid,
      'Wood glue',
      ARRAY['wood glue'],
      'Consumable',
      'PVA adhesive used for bonding wood joints, trim, and woodworking assemblies.',
      'bottle',
      '16 fl oz',
      5.21,
      'PVA glue, carpenter''s glue',
      'Typical single-bottle retail size is 16 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef004'::uuid,
      'Concrete mix',
      ARRAY['concrete mix'],
      'Consumable',
      'Premixed concrete blend for small slabs, pads, footings, and post setting.',
      'bag',
      '60 lb',
      6.49,
      'Premixed concrete, ready-mix concrete',
      'Common homeowner bag size is 60 pounds.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef005'::uuid,
      'Double sided tape',
      ARRAY['double sided tape', 'double-sided tape', 'mounting tape'],
      'Consumable',
      'Adhesive tape with bonding surfaces on both sides for light mounting, trim positioning, and temporary hold tasks.',
      'roll',
      '1 in x 60 in',
      6.48,
      'Mounting tape, carpet tape',
      'Typical consumer roll size is about 1 inch wide by 60 inches long.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef006'::uuid,
      'Duct tape',
      ARRAY['duct tape'],
      'Consumable',
      'General-purpose reinforced tape used for temporary holds, bundling, masking, and light-duty repairs.',
      'roll',
      '1.88 in x 20 yd',
      6.49,
      'Utility tape',
      'Typical consumer roll size is about 1.88 inches by 20 yards.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef007'::uuid,
      'Nitrile gloves',
      ARRAY['nitrile gloves'],
      'PPE',
      'Disposable chemical-resistant gloves used to protect hands during painting, caulking, cleanup, and general repair work.',
      'box',
      '100-count',
      21.87,
      'Disposable work gloves',
      'Typical retail package is a 100-count box.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef008'::uuid,
      'Paint stir',
      ARRAY['paint stir', 'paint stir stick', 'paint stirring sticks'],
      'Consumable',
      'Wooden stir sticks used for mixing paint, stain, and similar liquid finishes.',
      'pack',
      '10-count',
      1.48,
      'Paint stir sticks, wooden stir sticks',
      'Common retail package is a 10-pack of 12 inch sticks.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef009'::uuid,
      'Silicon caulk',
      ARRAY['silicon caulk', 'silicone caulk'],
      'Consumable',
      'Flexible sealant used for waterproofing joints and gaps around wet-area fixtures and finished surfaces.',
      'tube',
      '10.1 fl oz',
      18.97,
      'Silicone sealant',
      'Typical retail tube size is 10.1 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef010'::uuid,
      'Painters caulk',
      ARRAY['painters caulk', 'painter''s caulk'],
      'Consumable',
      'Paintable acrylic-latex caulk used to seal trim, casing, and small finish gaps before painting.',
      'tube',
      '10.1 fl oz',
      2.97,
      'Acrylic latex caulk, paintable caulk',
      'Typical retail tube size is 10.1 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef011'::uuid,
      'Sandpaper',
      ARRAY['sandpaper', 'sanding sheets'],
      'Consumable',
      'Abrasive sheets used to smooth surfaces, feather repairs, and prep substrates for finish work.',
      'pack',
      '5 sheets',
      15.42,
      'Abrasive paper, sanding sheets',
      'Common homeowner package is a 5-sheet assorted pack.'
    );

  FOR rec IN
    SELECT *
    FROM tmp_material_move_specs
    ORDER BY material_name
  LOOP
    SELECT t.*
    INTO source_tool
    FROM public.tools t
    WHERE lower(t.name) = ANY(rec.lookup_names)
    ORDER BY CASE WHEN lower(t.name) = lower(rec.material_name) THEN 0 ELSE 1 END, t.created_at, t.id
    LIMIT 1;

    SELECT m.id
    INTO existing_material_id
    FROM public.materials m
    WHERE lower(m.name) = lower(rec.material_name)
    LIMIT 1;

    target_material_id := rec.material_id;

    IF existing_material_id IS NOT NULL AND existing_material_id <> rec.material_id THEN
      target_material_id := existing_material_id;

      UPDATE public.materials
      SET name = rec.material_name,
          category = rec.category,
          description = rec.description,
          unit = rec.unit,
          unit_size = rec.unit_size,
          avg_cost_per_unit = rec.avg_cost_per_unit,
          is_rental_available = false,
          supplier_link = NULL,
          photo_url = CASE
            WHEN source_tool.id IS NOT NULL AND source_tool.photo_url IS NOT NULL THEN source_tool.photo_url
            ELSE photo_url
          END,
          created_by = CASE
            WHEN source_tool.id IS NOT NULL THEN source_tool.created_by
            ELSE created_by
          END,
          alternates = CASE
            WHEN source_tool.id IS NOT NULL AND source_tool.alternates IS NOT NULL THEN source_tool.alternates
            ELSE rec.alternates
          END,
          notes = rec.notes,
          updated_at = now()
      WHERE id = existing_material_id;
    ELSE
      INSERT INTO public.materials (
        id,
        name,
        category,
        description,
        unit,
        unit_size,
        avg_cost_per_unit,
        is_rental_available,
        supplier_link,
        photo_url,
        created_by,
        alternates,
        notes
      ) VALUES (
        rec.material_id,
        rec.material_name,
        rec.category,
        rec.description,
        rec.unit,
        rec.unit_size,
        rec.avg_cost_per_unit,
        false,
        NULL,
        CASE
          WHEN source_tool.id IS NOT NULL THEN source_tool.photo_url
          ELSE NULL
        END,
        CASE
          WHEN source_tool.id IS NOT NULL THEN source_tool.created_by
          ELSE NULL
        END,
        CASE
          WHEN source_tool.id IS NOT NULL AND source_tool.alternates IS NOT NULL THEN source_tool.alternates
          ELSE rec.alternates
        END,
        rec.notes
      )
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          unit_size = EXCLUDED.unit_size,
          avg_cost_per_unit = EXCLUDED.avg_cost_per_unit,
          is_rental_available = EXCLUDED.is_rental_available,
          supplier_link = EXCLUDED.supplier_link,
          photo_url = EXCLUDED.photo_url,
          created_by = EXCLUDED.created_by,
          alternates = EXCLUDED.alternates,
          notes = EXCLUDED.notes,
          updated_at = now();
    END IF;

    IF source_tool.id IS NOT NULL THEN
      INSERT INTO public.materials_variants (
        id,
        material_id,
        name,
        description,
        photo_url,
        sku,
        attributes,
        attribute_definitions
      )
      SELECT
        tv.id,
        target_material_id,
        tv.name,
        tv.description,
        tv.photo_url,
        tv.sku,
        tv.attributes,
        tv.attribute_definitions
      FROM public.tool_variations tv
      WHERE tv.core_item_id = source_tool.id
      ON CONFLICT (id) DO UPDATE
      SET material_id = EXCLUDED.material_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          photo_url = EXCLUDED.photo_url,
          sku = EXCLUDED.sku,
          attributes = EXCLUDED.attributes,
          attribute_definitions = EXCLUDED.attribute_definitions,
          updated_at = now();

      INSERT INTO public.user_materials (
        user_id,
        material_id,
        name,
        description,
        unit,
        unit_size,
        quantity,
        user_photo_url
      )
      SELECT
        ut.user_id,
        target_material_id,
        rec.material_name,
        CASE
          WHEN ut.description IS NOT NULL THEN ut.description
          ELSE rec.description
        END,
        rec.unit,
        rec.unit_size,
        ut.quantity,
        ut.user_photo_url
      FROM public.user_tools ut
      WHERE ut.tool_id = source_tool.id
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_materials um
          WHERE um.user_id = ut.user_id
            AND um.material_id = target_material_id
            AND um.name = rec.material_name
        );

      DELETE FROM public.user_tools
      WHERE tool_id = source_tool.id;

      DELETE FROM public.tool_variations
      WHERE core_item_id = source_tool.id;

      DELETE FROM public.tools
      WHERE id = source_tool.id;
    END IF;
  END LOOP;
END $$;
DO $$
DECLARE
  rec RECORD;
  source_tool RECORD;
  existing_material_id uuid;
  target_material_id uuid;
BEGIN
  CREATE TEMP TABLE tmp_material_move_specs (
    material_id uuid PRIMARY KEY,
    material_name text NOT NULL,
    lookup_names text[] NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    unit_size text NOT NULL,
    avg_cost_per_unit numeric,
    alternates text,
    notes text
  ) ON COMMIT DROP;

  INSERT INTO tmp_material_move_specs (
    material_id,
    material_name,
    lookup_names,
    category,
    description,
    unit,
    unit_size,
    avg_cost_per_unit,
    alternates,
    notes
  ) VALUES
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef001'::uuid,
      'Wire nuts',
      ARRAY['wire nuts', 'wire connectors'],
      'Hardware',
      'Twist-on wire connectors used to secure and insulate joined electrical conductors.',
      'pack',
      '100-count',
      10.98,
      'Twist-on wire connectors, wing wire connectors',
      'Typical retail package is a 100-count assortment or single-size pack.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef002'::uuid,
      'Spackle',
      ARRAY['spackle', 'spackling', 'spackling compound'],
      'Consumable',
      'Wall patching compound used to fill small holes, dents, and surface imperfections before sanding and paint.',
      'tub',
      '32 fl oz',
      8.99,
      'Lightweight spackling, patching compound',
      'Common consumer package size is approximately one quart / 32 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef003'::uuid,
      'Wood glue',
      ARRAY['wood glue'],
      'Consumable',
      'PVA adhesive used for bonding wood joints, trim, and woodworking assemblies.',
      'bottle',
      '16 fl oz',
      5.21,
      'PVA glue, carpenter''s glue',
      'Typical single-bottle retail size is 16 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef004'::uuid,
      'Concrete mix',
      ARRAY['concrete mix'],
      'Consumable',
      'Premixed concrete blend for small slabs, pads, footings, and post setting.',
      'bag',
      '60 lb',
      6.49,
      'Premixed concrete, ready-mix concrete',
      'Common homeowner bag size is 60 pounds.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef005'::uuid,
      'Double sided tape',
      ARRAY['double sided tape', 'double-sided tape', 'mounting tape'],
      'Consumable',
      'Adhesive tape with bonding surfaces on both sides for light mounting, trim positioning, and temporary hold tasks.',
      'roll',
      '1 in x 60 in',
      6.48,
      'Mounting tape, carpet tape',
      'Typical consumer roll size is about 1 inch wide by 60 inches long.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef006'::uuid,
      'Duct tape',
      ARRAY['duct tape'],
      'Consumable',
      'General-purpose reinforced tape used for temporary holds, bundling, masking, and light-duty repairs.',
      'roll',
      '1.88 in x 20 yd',
      6.49,
      'Utility tape',
      'Typical consumer roll size is about 1.88 inches by 20 yards.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef007'::uuid,
      'Nitrile gloves',
      ARRAY['nitrile gloves'],
      'PPE',
      'Disposable chemical-resistant gloves used to protect hands during painting, caulking, cleanup, and general repair work.',
      'box',
      '100-count',
      21.87,
      'Disposable work gloves',
      'Typical retail package is a 100-count box.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef008'::uuid,
      'Paint stir',
      ARRAY['paint stir', 'paint stir stick', 'paint stirring sticks'],
      'Consumable',
      'Wooden stir sticks used for mixing paint, stain, and similar liquid finishes.',
      'pack',
      '10-count',
      1.48,
      'Paint stir sticks, wooden stir sticks',
      'Common retail package is a 10-pack of 12 inch sticks.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef009'::uuid,
      'Silicon caulk',
      ARRAY['silicon caulk', 'silicone caulk'],
      'Consumable',
      'Flexible sealant used for waterproofing joints and gaps around wet-area fixtures and finished surfaces.',
      'tube',
      '10.1 fl oz',
      18.97,
      'Silicone sealant',
      'Typical retail tube size is 10.1 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef010'::uuid,
      'Painters caulk',
      ARRAY['painters caulk', 'painter''s caulk'],
      'Consumable',
      'Paintable acrylic-latex caulk used to seal trim, casing, and small finish gaps before painting.',
      'tube',
      '10.1 fl oz',
      2.97,
      'Acrylic latex caulk, paintable caulk',
      'Typical retail tube size is 10.1 fluid ounces.'
    ),
    (
      'd3b50e21-61fc-4a87-9a2f-7ae6ea4ef011'::uuid,
      'Sandpaper',
      ARRAY['sandpaper', 'sanding sheets'],
      'Consumable',
      'Abrasive sheets used to smooth surfaces, feather repairs, and prep substrates for finish work.',
      'pack',
      '5 sheets',
      15.42,
      'Abrasive paper, sanding sheets',
      'Common homeowner package is a 5-sheet assorted pack.'
    );

  FOR rec IN
    SELECT *
    FROM tmp_material_move_specs
    ORDER BY material_name
  LOOP
    SELECT t.*
    INTO source_tool
    FROM public.tools t
    WHERE lower(t.name) = ANY(rec.lookup_names)
    ORDER BY CASE WHEN lower(t.name) = lower(rec.material_name) THEN 0 ELSE 1 END, t.created_at, t.id
    LIMIT 1;

    SELECT m.id
    INTO existing_material_id
    FROM public.materials m
    WHERE lower(m.name) = lower(rec.material_name)
    LIMIT 1;

    target_material_id := rec.material_id;

    IF existing_material_id IS NOT NULL AND existing_material_id <> rec.material_id THEN
      target_material_id := existing_material_id;

      UPDATE public.materials
      SET name = rec.material_name,
          category = rec.category,
          description = rec.description,
          unit = rec.unit,
          unit_size = rec.unit_size,
          avg_cost_per_unit = rec.avg_cost_per_unit,
          is_rental_available = false,
          supplier_link = NULL,
          photo_url = CASE
            WHEN source_tool.id IS NOT NULL AND source_tool.photo_url IS NOT NULL THEN source_tool.photo_url
            ELSE photo_url
          END,
          created_by = CASE
            WHEN source_tool.id IS NOT NULL THEN source_tool.created_by
            ELSE created_by
          END,
          alternates = CASE
            WHEN source_tool.id IS NOT NULL AND source_tool.alternates IS NOT NULL THEN source_tool.alternates
            ELSE rec.alternates
          END,
          notes = rec.notes,
          updated_at = now()
      WHERE id = existing_material_id;
    ELSE
      INSERT INTO public.materials (
        id,
        name,
        category,
        description,
        unit,
        unit_size,
        avg_cost_per_unit,
        is_rental_available,
        supplier_link,
        photo_url,
        created_by,
        alternates,
        notes
      ) VALUES (
        rec.material_id,
        rec.material_name,
        rec.category,
        rec.description,
        rec.unit,
        rec.unit_size,
        rec.avg_cost_per_unit,
        false,
        NULL,
        CASE
          WHEN source_tool.id IS NOT NULL THEN source_tool.photo_url
          ELSE NULL
        END,
        CASE
          WHEN source_tool.id IS NOT NULL THEN source_tool.created_by
          ELSE NULL
        END,
        CASE
          WHEN source_tool.id IS NOT NULL AND source_tool.alternates IS NOT NULL THEN source_tool.alternates
          ELSE rec.alternates
        END,
        rec.notes
      )
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          unit = EXCLUDED.unit,
          unit_size = EXCLUDED.unit_size,
          avg_cost_per_unit = EXCLUDED.avg_cost_per_unit,
          is_rental_available = EXCLUDED.is_rental_available,
          supplier_link = EXCLUDED.supplier_link,
          photo_url = EXCLUDED.photo_url,
          created_by = EXCLUDED.created_by,
          alternates = EXCLUDED.alternates,
          notes = EXCLUDED.notes,
          updated_at = now();
    END IF;

    IF source_tool.id IS NOT NULL THEN
      INSERT INTO public.materials_variants (
        id,
        material_id,
        name,
        description,
        photo_url,
        sku,
        attributes,
        attribute_definitions
      )
      SELECT
        tv.id,
        target_material_id,
        tv.name,
        tv.description,
        tv.photo_url,
        tv.sku,
        tv.attributes,
        tv.attribute_definitions
      FROM public.tool_variations tv
      WHERE tv.core_item_id = source_tool.id
      ON CONFLICT (id) DO UPDATE
      SET material_id = EXCLUDED.material_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          photo_url = EXCLUDED.photo_url,
          sku = EXCLUDED.sku,
          attributes = EXCLUDED.attributes,
          attribute_definitions = EXCLUDED.attribute_definitions,
          updated_at = now();

      INSERT INTO public.user_materials (
        user_id,
        material_id,
        name,
        description,
        unit,
        unit_size,
        quantity,
        user_photo_url
      )
      SELECT
        ut.user_id,
        target_material_id,
        rec.material_name,
        CASE
          WHEN ut.description IS NOT NULL THEN ut.description
          ELSE rec.description
        END,
        rec.unit,
        rec.unit_size,
        ut.quantity,
        ut.user_photo_url
      FROM public.user_tools ut
      WHERE ut.tool_id = source_tool.id
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_materials um
          WHERE um.user_id = ut.user_id
            AND um.material_id = target_material_id
            AND um.name = rec.material_name
        );

      DELETE FROM public.user_tools
      WHERE tool_id = source_tool.id;

      DELETE FROM public.tool_variations
      WHERE core_item_id = source_tool.id;

      DELETE FROM public.tools
      WHERE id = source_tool.id;
    END IF;
  END LOOP;
END $$;
