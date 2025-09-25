-- Clean up any existing "Jig Saw Blade" entries and consolidate properly
-- Delete existing Jig Saw Blade tool if it exists
DELETE FROM public.tools WHERE item = 'Jig Saw Blade';

-- Delete any related variation data
DELETE FROM public.variation_instances WHERE core_item_id IN (
  SELECT id FROM public.tools WHERE item = 'Jig Saw Blade'
);

-- Now create the consolidated Jig Saw Blade tool with variants
INSERT INTO public.tools (item, description, created_by)
VALUES ('Jig Saw Blade', 'Cutting Tools - Various jig saw blade types for different materials', NULL);

-- Get the ID of the newly created tool and existing type attribute
WITH new_tool AS (
  SELECT id FROM public.tools WHERE item = 'Jig Saw Blade'
),
existing_type_attribute AS (
  SELECT id as attribute_id FROM public.variation_attributes WHERE name = 'type'
),
-- Create attribute values for each blade type
attribute_values AS (
  INSERT INTO public.variation_attribute_values (attribute_id, value, display_value, sort_order, core_item_id)
  SELECT 
    eta.attribute_id,
    LOWER(REPLACE(REPLACE(blade_types.display_name, '/', '_'), ' ', '_')) as value,
    blade_types.display_name,
    blade_types.sort_order,
    nt.id as core_item_id
  FROM existing_type_attribute eta
  CROSS JOIN new_tool nt
  CROSS JOIN (VALUES
    ('Close Cut', 1),
    ('Foam Cutting', 2),
    ('Laminate/Down Cut', 3),
    ('PVC/Plastic', 4),
    ('Scroll Blade', 5),
    ('Thick Metal', 6),
    ('Thin Metal', 7),
    ('Wood Clean', 8),
    ('Wood Fast', 9)
  ) AS blade_types(display_name, sort_order)
  ON CONFLICT (attribute_id, core_item_id, value) DO NOTHING
  RETURNING *
)
-- Create variation instances for each blade type
INSERT INTO public.variation_instances (core_item_id, item_type, name, description, attributes)
SELECT 
  nt.id as core_item_id,
  'tools' as item_type,
  'Jig Saw Blade - ' || blade_data.display_name as name,
  'Cutting Tools - Jig saw blade- ' || LOWER(blade_data.display_name) as description,
  jsonb_build_object('type', LOWER(REPLACE(REPLACE(blade_data.display_name, '/', '_'), ' ', '_'))) as attributes
FROM new_tool nt
CROSS JOIN (VALUES
  ('Close Cut'),
  ('Foam Cutting'),
  ('Laminate/Down Cut'),
  ('PVC/Plastic'),
  ('Scroll Blade'),
  ('Thick Metal'),
  ('Thin Metal'),
  ('Wood Clean'),
  ('Wood Fast')
) AS blade_data(display_name);

-- Delete the old separate jig saw blade tools
DELETE FROM public.tools 
WHERE item IN (
  'Jig saw blade- close-cut',
  'Jig saw blade- foam cutting',
  'Jig saw blade- laminate/down-cut',
  'Jig saw blade- PVC/plastic',
  'Jig saw blade- scroll blade',
  'Jig saw blade- thick metal',
  'Jig saw blade- thin metal',
  'Jig saw blade- wood, clean',
  'Jig saw blade- wood, fast'
);