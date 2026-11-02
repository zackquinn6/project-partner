-- Vocab merge export: Toolio catalog and guided wiring (read-only).
-- Run in Toolio's SQL editor (Lovable). Save the single `payload` cell as toolio-1-catalog.json
-- (or the downloaded result as toolio-1-catalog.csv) in the export folder.
WITH
inventory AS (
  SELECT id, sku, name, parent_inventory_item_id, product_type, fulfillment_method, offers_rental,
         offers_sales, lifecycle_status, equipment_category_slug, discovery_tags, use_cases, description
  FROM public.inventory_items
),
projects AS (
  SELECT id, slug, name, description, catalog_visibility, project_kind, content_foundation_project_id,
         parent_id, discovery_tags
  FROM public.projects
),
catalog_parent_links AS (
  SELECT id, child_project_id, parent_project_id FROM public.project_catalog_parent_links
),
composite_members AS (
  SELECT id, composite_project_id, member_project_id, sort_order FROM public.project_composite_members
),
sections AS (
  SELECT id, project_id, slug, is_visible, standard_section_id FROM public.ordering_sections
),
section_items AS (
  SELECT id, section_id, inventory_item_id, package_type, is_sales_item, is_visible FROM public.section_items
),
standard_section_items AS (
  SELECT id, standard_section_id, inventory_item_id, package_type, is_sales_item, is_visible
  FROM public.standard_section_items
),
section_overrides AS (
  SELECT id, project_id, ordering_section_id, is_visible FROM public.project_section_overrides
),
item_overrides AS (
  SELECT id, project_id, section_item_id, standard_section_item_id, is_visible, package_type
  FROM public.project_section_item_overrides
)
SELECT jsonb_build_object(
  'query', 'toolio-1-catalog',
  'version', 1,
  'exported_at', now(),
  'counts', jsonb_build_object(
    'inventory_items', (SELECT count(*) FROM inventory),
    'projects', (SELECT count(*) FROM projects),
    'project_catalog_parent_links', (SELECT count(*) FROM catalog_parent_links),
    'project_composite_members', (SELECT count(*) FROM composite_members),
    'ordering_sections', (SELECT count(*) FROM sections),
    'section_items', (SELECT count(*) FROM section_items),
    'standard_section_items', (SELECT count(*) FROM standard_section_items),
    'project_section_overrides', (SELECT count(*) FROM section_overrides),
    'project_section_item_overrides', (SELECT count(*) FROM item_overrides)
  ),
  'tables', jsonb_build_object(
    'inventory_items', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM inventory t),
    'projects', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM projects t),
    'project_catalog_parent_links', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM catalog_parent_links t),
    'project_composite_members', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM composite_members t),
    'ordering_sections', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM sections t),
    'section_items', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM section_items t),
    'standard_section_items', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM standard_section_items t),
    'project_section_overrides', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM section_overrides t),
    'project_section_item_overrides', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM item_overrides t)
  )
)::text AS payload;
