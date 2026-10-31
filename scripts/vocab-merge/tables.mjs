/**
 * Tables archived by export.mjs. `select` narrows user-data tables to the columns the merge
 * reads, so the archive does not carry unrelated personal data.
 */
export const TOOLIO_TABLES = [
  { table: 'projects', select: '*', pk: 'id' },
  { table: 'project_catalog_parent_links', select: '*', pk: 'id' },
  { table: 'project_composite_members', select: '*', pk: 'id' },
  { table: 'ordering_sections', select: '*', pk: 'id' },
  { table: 'section_items', select: '*', pk: 'id' },
  { table: 'standard_ordering_sections', select: '*', pk: 'id' },
  { table: 'standard_section_items', select: '*', pk: 'id' },
  { table: 'project_section_overrides', select: '*', pk: 'id' },
  { table: 'project_section_item_overrides', select: '*', pk: 'id' },
  { table: 'inventory_items', select: '*', pk: 'id' },
  { table: 'inventory_item_variant_definitions', select: '*', pk: 'id' },
  { table: 'inventory_item_variant_options', select: '*', pk: 'id' },
  { table: 'inventory_item_relevant_models', select: '*', pk: 'id' },
  { table: 'ordering_customization_questions', select: '*', pk: 'id' },
  { table: 'ordering_customization_options', select: '*', pk: 'id' },
  { table: 'ordering_customization_rules', select: '*', pk: 'id' },
  { table: 'orders', select: 'id, order_number, project_slug, created_at', pk: 'id' },
  { table: 'order_line_pricing', select: 'line_id, order_id, inventory_item_id', pk: 'line_id' },
];

export const PP_TABLES = [
  { table: 'projects', select: '*', pk: 'id' },
  { table: 'project_phases', select: '*', pk: 'id' },
  { table: 'phase_operations', select: '*', pk: 'id' },
  { table: 'operation_steps', select: '*', pk: 'id' },
  { table: 'step_instructions', select: '*', pk: 'id' },
  { table: 'tools', select: '*', pk: 'id' },
  { table: 'tool_variations', select: '*', pk: 'id' },
  { table: 'materials', select: '*', pk: 'id' },
  { table: 'materials_variants', select: '*', pk: 'id' },
  { table: 'user_tools', select: 'id, user_id, tool_id, name, model_name, quantity', pk: 'id' },
  { table: 'user_materials', select: 'id, user_id, material_id, name, quantity', pk: 'id' },
  { table: 'user_profiles', select: 'user_id, owned_tools', pk: 'user_id' },
  {
    table: 'project_runs',
    select: 'id, user_id, project_id, status, phases, shopping_checklist_data, updated_at',
    pk: 'id',
  },
];

/**
 * Toolio tables whose archived content must be unchanged after the Toolio load. `updated_at`
 * is excluded because writing the new link columns touches it on linked rows.
 */
export const TOOLIO_CONTENT_TABLES = TOOLIO_TABLES.filter(
  (spec) => !['orders', 'order_line_pricing'].includes(spec.table),
).map((spec) => spec.table);

export const TOOLIO_CONTENT_IGNORED_COLUMNS = ['updated_at'];
