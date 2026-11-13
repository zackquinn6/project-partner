-- Vocab merge export: Toolio content fingerprints and past-order resolution (read-only).
-- Run in Toolio's SQL editor (Lovable). Save the single `payload` cell as toolio-2-checks.json
-- (or the downloaded result as toolio-2-checks.csv) in the export folder.
--
-- Each fingerprint is an md5 of the full row without updated_at and the integration's own link
-- columns (pp_link_status, pp_vocab_key; absent before phase 4, so the subtraction is a no-op
-- then). Comparing two exports shows exactly which archived rows changed.
SELECT jsonb_build_object(
  'query', 'toolio-2-checks',
  'version', 2,
  'exported_at', now(),
  -- The project rebuild changes only name and slug; this fingerprint leaves them out.
  'projects_without_identity', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at' - 'pp_link_status' - 'pp_vocab_key' - 'pp_vocab_pending' - 'name' - 'slug')::text)) FROM public.projects t),
  'project_identity', (SELECT jsonb_object_agg(t.id, jsonb_build_object('name', t.name, 'slug', t.slug)) FROM public.projects t),
  'content_hashes', jsonb_build_object(
    'projects', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at' - 'pp_link_status' - 'pp_vocab_key')::text)) FROM public.projects t),
    'project_catalog_parent_links', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.project_catalog_parent_links t),
    'project_composite_members', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.project_composite_members t),
    'ordering_sections', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.ordering_sections t),
    'section_items', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.section_items t),
    'standard_ordering_sections', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.standard_ordering_sections t),
    'standard_section_items', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.standard_section_items t),
    'project_section_overrides', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.project_section_overrides t),
    'project_section_item_overrides', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.project_section_item_overrides t),
    'inventory_items', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at' - 'pp_link_status' - 'pp_vocab_key')::text)) FROM public.inventory_items t),
    'inventory_item_variant_definitions', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.inventory_item_variant_definitions t),
    'inventory_item_variant_options', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.inventory_item_variant_options t),
    'inventory_item_relevant_models', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.inventory_item_relevant_models t),
    'ordering_customization_questions', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.ordering_customization_questions t),
    'ordering_customization_options', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.ordering_customization_options t),
    'ordering_customization_rules', (SELECT jsonb_object_agg(t.id, md5((to_jsonb(t) - 'updated_at')::text)) FROM public.ordering_customization_rules t)
  ),
  'counts', jsonb_build_object(
    'projects', (SELECT count(*) FROM public.projects),
    'project_catalog_parent_links', (SELECT count(*) FROM public.project_catalog_parent_links),
    'project_composite_members', (SELECT count(*) FROM public.project_composite_members),
    'ordering_sections', (SELECT count(*) FROM public.ordering_sections),
    'section_items', (SELECT count(*) FROM public.section_items),
    'standard_ordering_sections', (SELECT count(*) FROM public.standard_ordering_sections),
    'standard_section_items', (SELECT count(*) FROM public.standard_section_items),
    'project_section_overrides', (SELECT count(*) FROM public.project_section_overrides),
    'project_section_item_overrides', (SELECT count(*) FROM public.project_section_item_overrides),
    'inventory_items', (SELECT count(*) FROM public.inventory_items),
    'inventory_item_variant_definitions', (SELECT count(*) FROM public.inventory_item_variant_definitions),
    'inventory_item_variant_options', (SELECT count(*) FROM public.inventory_item_variant_options),
    'inventory_item_relevant_models', (SELECT count(*) FROM public.inventory_item_relevant_models),
    'ordering_customization_questions', (SELECT count(*) FROM public.ordering_customization_questions),
    'ordering_customization_options', (SELECT count(*) FROM public.ordering_customization_options),
    'ordering_customization_rules', (SELECT count(*) FROM public.ordering_customization_rules),
    'orders', (SELECT count(*) FROM public.orders),
    'order_line_pricing', (SELECT count(*) FROM public.order_line_pricing)
  ),
  'unresolved_order_refs', (
    SELECT jsonb_agg(ref ORDER BY ref)
    FROM (
      SELECT 'order ' || o.order_number::text || ' project_slug ' || o.project_slug AS ref
      FROM public.orders o
      WHERE o.project_slug IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.slug = o.project_slug)
      UNION ALL
      SELECT 'order line ' || l.line_id::text || ' inventory_item_id ' || l.inventory_item_id::text
      FROM public.order_line_pricing l
      WHERE l.inventory_item_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.id = l.inventory_item_id)
    ) refs
  )
)::text AS payload;
