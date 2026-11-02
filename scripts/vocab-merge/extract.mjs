#!/usr/bin/env node
/**
 * Merge step 1: build matching views from a validated export.
 *
 *   node scripts/vocab-merge/extract.mjs --archive <export folder> [--dry-run]
 *
 * Name keys come from Toolio's inventory_item_name_comparison_key so both apps share Toolio's
 * normalization. The first run writes toolio-3-name-keys.sql into the export folder and stops
 * (exit 2); run it in Toolio's SQL editor, save the payload as toolio-3-name-keys.json (or .csv)
 * in the same folder, and run extract again.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAME_KEYS_QUERY, archiveDir, parseArgs, payloadPath, readPayload, tableRows, writeJson } from './lib.mjs';

const args = parseArgs();
const dir = archiveDir(args.archive);
const toolioCatalog = readPayload(dir, 'toolio-1-catalog');
const ppLibrary = readPayload(dir, 'pp-1-library');
const ppProjectsPayload = readPayload(dir, 'pp-2-projects');
const ppReferences = readPayload(dir, 'pp-3-references');
const t = (table) => tableRows(toolioCatalog, table);

// ---------- Toolio ----------

const inventory = t('inventory_items');
const inventoryById = new Map(inventory.map((row) => [row.id, row]));
const cores = inventory.filter((row) => row.parent_inventory_item_id === null);

/** Resolves a line's inventory_item_id to its core; variants roll up through parent_inventory_item_id. */
function coreOf(inventoryItemId) {
  const item = inventoryById.get(inventoryItemId);
  if (!item) return null;
  if (item.parent_inventory_item_id === null) return item;
  const parent = inventoryById.get(item.parent_inventory_item_id);
  if (!parent || parent.parent_inventory_item_id !== null) return null;
  return parent;
}

const toolioProjects = t('projects');
const projectById = new Map(toolioProjects.map((row) => [row.id, row]));
const sectionsByProject = groupBy(t('ordering_sections'), 'project_id');
const sectionItemsBySection = groupBy(t('section_items'), 'section_id');
const standardItemsBySection = groupBy(t('standard_section_items'), 'standard_section_id');
const sectionOverrides = indexBy(t('project_section_overrides'), (r) => `${r.project_id}:${r.ordering_section_id}`);
const itemOverrides = indexBy(
  t('project_section_item_overrides'),
  (r) => `${r.project_id}:${r.section_item_id ?? r.standard_section_item_id}`,
);
const compositeMembers = groupBy(t('project_composite_members'), 'composite_project_id');
const catalogParents = groupBy(t('project_catalog_parent_links'), 'child_project_id');

const danglingLines = [];

/**
 * Lines a project shows, following the guided wiring in docs/AI_PROJECT_GUIDE.md: sections live
 * on the content foundation, standard sections are link stubs, composites merge their members,
 * and override rows decide visibility over the row's own is_visible. `viewers` lists the
 * projects whose overrides apply, nearest the shopper first (composite, then member).
 */
function projectLines(projectId, viewers = [projectId]) {
  const project = projectById.get(projectId);
  if (project.project_kind === 'composite') {
    const members = (compositeMembers.get(projectId) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    return members.flatMap((m) => projectLines(m.member_project_id, [...viewers, m.member_project_id]));
  }
  const firstOverride = (index, rowId) => {
    for (const viewerId of viewers) {
      const override = index.get(`${viewerId}:${rowId}`);
      if (override) return override;
    }
    return null;
  };
  const contentProjectId = project.content_foundation_project_id ?? projectId;
  const lines = [];
  for (const section of sectionsByProject.get(contentProjectId) ?? []) {
    const sectionOverride = firstOverride(sectionOverrides, section.id);
    const sectionVisible = sectionOverride ? sectionOverride.is_visible : section.is_visible;
    const items = section.standard_section_id
      ? (standardItemsBySection.get(section.standard_section_id) ?? []).map((row) => ({ row, via: 'standard_section_item' }))
      : (sectionItemsBySection.get(section.id) ?? []).map((row) => ({ row, via: 'section_item' }));
    for (const { row, via } of items) {
      const lineOverride = firstOverride(itemOverrides, row.id);
      const lineVisible = lineOverride ? lineOverride.is_visible : row.is_visible;
      const core = coreOf(row.inventory_item_id);
      if (!core) {
        danglingLines.push({ project_id: viewers[0], line_id: row.id, via, inventory_item_id: row.inventory_item_id });
        continue;
      }
      lines.push({
        core_id: core.id,
        via,
        line_id: row.id,
        section_slug: section.slug,
        package_type: lineOverride?.package_type ?? row.package_type,
        is_sales_item: row.is_sales_item,
        visible: sectionVisible && lineVisible,
      });
    }
  }
  return lines;
}

// ---------- Project Partner ----------

const ppProjects = tableRows(ppProjectsPayload, 'projects');
const ppProjectById = new Map(ppProjects.map((row) => [row.id, row]));
const families = groupBy(ppProjects, (row) => row.parent_project_id ?? row.id);
if (families.size !== ppProjectsPayload.counts.families) {
  throw new Error(`pp-2-projects: ${families.size} families from rows, count ${ppProjectsPayload.counts.families}`);
}
const latestPublished = ppProjectsPayload.latest_published;
const tools = tableRows(ppLibrary, 'tools');
const materials = tableRows(ppLibrary, 'materials');
const toolVariations = tableRows(ppLibrary, 'tool_variations');
const materialVariants = tableRows(ppLibrary, 'materials_variants');
const references = ppReferences.references ?? [];

// ---------- Name keys (Toolio normalization) ----------

const names = new Set();
const addName = (value) => {
  if (typeof value === 'string' && value.trim()) names.add(value);
};
[...cores, ...toolioProjects].forEach((row) => {
  addName(row.name);
  (row.discovery_tags ?? []).forEach(addName);
});
ppProjects.forEach((row) => addName(row.name));
[...tools, ...materials].forEach((row) => {
  addName(row.name);
  alternateNames(row.alternates).forEach(addName);
});
[...toolVariations, ...materialVariants].forEach((row) => addName(row.name));
references.forEach((ref) => addName(ref.name));

if (args.dryRun) {
  console.log(`Toolio cores: ${cores.length}, projects: ${toolioProjects.length}`);
  console.log(`Project Partner families: ${families.size}, tools: ${tools.length}, materials: ${materials.length}`);
  console.log(`Reference groups: ${references.length}, distinct names to normalize: ${names.size}`);
  process.exit(0);
}

const nameKeys = loadNameKeys();

const keyOf = (name) => {
  const key = nameKeys.get(name);
  if (typeof key !== 'string') throw new Error(`No name key for ${JSON.stringify(name)}`);
  return key;
};

// ---------- Output: Toolio ----------

const toolioCoresOut = cores.map((row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  name_key: keyOf(row.name),
  entity: row.product_type === 'material' ? 'material' : 'tool',
  product_type: row.product_type,
  fulfillment_method: row.fulfillment_method,
  offers_rental: row.offers_rental,
  offers_sales: row.offers_sales,
  lifecycle_status: row.lifecycle_status,
  equipment_category_slug: row.equipment_category_slug,
  discovery_tags: row.discovery_tags,
  discovery_tag_keys: tagKeys(row.discovery_tags),
  use_cases: row.use_cases,
  description: row.description,
}));

const toolioProjectsOut = toolioProjects.map((row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  name_key: keyOf(row.name),
  description: row.description,
  catalog_visibility: row.catalog_visibility,
  project_kind: row.project_kind,
  content_foundation_project_id: row.content_foundation_project_id,
  parent_id: row.parent_id,
  catalog_parent_ids: (catalogParents.get(row.id) ?? []).map((link) => link.parent_project_id),
  discovery_tags: row.discovery_tags,
  discovery_tag_keys: tagKeys(row.discovery_tags),
  lines: projectLines(row.id),
}));

// ---------- Output: Project Partner families ----------

const ppFamiliesOut = [...families.keys()].map((rootId) => {
  const members = families.get(rootId);
  if (!ppProjectById.get(rootId)) throw new Error(`Project Partner family ${rootId} has revisions but no root row`);
  if (!(rootId in latestPublished)) throw new Error(`pp-2-projects: no latest_published entry for family ${rootId}`);
  let current = null;
  let currentSource;
  if (latestPublished[rootId]) {
    current = ppProjectById.get(latestPublished[rootId]);
    if (!current) throw new Error(`latest_published_in_family(${rootId}) returned ${latestPublished[rootId]}, which is not in the export`);
    currentSource = 'latest_published';
  } else {
    const drafts = members.filter((row) => row.publish_status === 'draft');
    if (drafts.length > 0) {
      current = drafts.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
      currentSource = 'newest_draft';
    } else {
      currentSource = 'none';
    }
  }
  const revisionNames = [...new Set(members.map((row) => row.name))];
  return {
    root_id: rootId,
    current_id: current?.id ?? null,
    current_source: currentSource,
    revision_statuses: [...new Set(members.map((row) => row.publish_status))],
    name: current?.name ?? null,
    name_key: current ? keyOf(current.name) : null,
    description: current?.description ?? null,
    category: current?.category ?? null,
    tags: current?.tags ?? null,
    publish_status: current?.publish_status ?? null,
    visibility_status: current?.visibility_status ?? null,
    is_foundational: current?.is_foundational ?? null,
    is_standard: current?.is_standard ?? null,
    item_type: current?.item_type ?? null,
    owner_user_id: current?.user_id ?? null,
    foundation_project_id: current?.foundation_project_id ?? null,
    foundation_root_id: current?.foundation_project_id
      ? (ppProjectById.get(current.foundation_project_id)?.parent_project_id ?? current.foundation_project_id)
      : null,
    revision_count: members.length,
    revision_names: revisionNames,
    revision_name_keys: revisionNames.map(keyOf),
  };
});

// ---------- Output: Project Partner library ----------

const variationsByTool = groupBy(toolVariations, 'core_item_id');
const variantsByMaterial = groupBy(materialVariants, 'material_id');
const libraryOut = [
  ...tools.map((row) => libraryEntry('tool', row, variationsByTool.get(row.id) ?? [])),
  ...materials.map((row) => libraryEntry('material', row, variantsByMaterial.get(row.id) ?? [])),
];

function libraryEntry(entity, row, variations) {
  const alternates = alternateNames(row.alternates);
  return {
    entity,
    id: row.id,
    name: row.name,
    name_key: keyOf(row.name),
    category: row.category,
    description: row.description,
    alternates,
    alternate_keys: alternates.map(keyOf),
    variations: variations.map((v) => ({ id: v.id, name: v.name, name_key: keyOf(v.name), sku: v.sku })),
  };
}

// ---------- Reference resolution ----------

const libraryById = new Map(libraryOut.map((entry) => [entry.id, entry]));
const variationOwner = new Map();
libraryOut.forEach((entry) => entry.variations.forEach((v) => variationOwner.set(v.id, entry)));
const byKey = { name: new Map(), variation: new Map(), alternate: new Map() };
const addKey = (index, key, entry) => {
  if (!index.has(key)) index.set(key, new Map());
  index.get(key).set(entry.id, entry);
};
libraryOut.forEach((entry) => {
  addKey(byKey.name, entry.name_key, entry);
  entry.variations.forEach((v) => addKey(byKey.variation, v.name_key, entry));
  entry.alternate_keys.forEach((k) => addKey(byKey.alternate, k, entry));
});

function resolveReference(ref) {
  if (ref.library_id) {
    const entry = libraryById.get(ref.library_id) ?? variationOwner.get(ref.library_id);
    if (entry) return { resolved_by: 'id', library_id: entry.id, library_entity: entry.entity };
    return { resolved_by: 'dangling_id', library_id: null, library_entity: null };
  }
  if (!ref.name || !ref.name.trim()) return { resolved_by: 'unnamed', library_id: null, library_entity: null };
  const key = keyOf(ref.name);
  for (const [via, index] of Object.entries(byKey)) {
    const hits = [...(index.get(key)?.values() ?? [])].filter((e) => ref.kind === 'unknown' || e.entity === ref.kind);
    if (hits.length === 1) return { resolved_by: via, library_id: hits[0].id, library_entity: hits[0].entity };
    if (hits.length > 1) {
      return { resolved_by: 'ambiguous', library_id: null, library_entity: null, candidates: hits.map((e) => e.id) };
    }
  }
  return { resolved_by: 'none', library_id: null, library_entity: null };
}

const referencesOut = references.map((ref) => ({
  source: ref.source,
  kind: ref.kind,
  shape: ref.shape,
  name: ref.name,
  stored_library_id: ref.library_id,
  count: ref.count,
  name_key: ref.name && ref.name.trim() ? keyOf(ref.name) : null,
  ...resolveReference(ref),
}));

// ---------- Write ----------

const outDir = join(dir, 'extract');
writeJson(join(outDir, 'toolio_cores.json'), toolioCoresOut);
writeJson(join(outDir, 'toolio_projects.json'), toolioProjectsOut);
writeJson(join(outDir, 'pp_families.json'), ppFamiliesOut);
writeJson(join(outDir, 'pp_library.json'), libraryOut);
writeJson(join(outDir, 'pp_references.json'), referencesOut);
writeJson(join(outDir, 'toolio_dangling_lines.json'), danglingLines);

const summary = {
  toolio_cores: toolioCoresOut.length,
  toolio_projects: toolioProjectsOut.length,
  toolio_dangling_lines: danglingLines.length,
  pp_families: ppFamiliesOut.length,
  pp_families_without_current_revision: ppFamiliesOut.filter((f) => f.current_source === 'none').length,
  pp_tools: tools.length,
  pp_materials: materials.length,
  references_by_source: sumBy(referencesOut, (r) => r.source),
  references_by_resolution: sumBy(referencesOut, (r) => r.resolved_by),
};
writeJson(join(outDir, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
console.log(`Next: node scripts/vocab-merge/match.mjs --archive ${args.archive}`);

// ---------- Name keys round trip ----------

function loadNameKeys() {
  const sqlPath = join(dir, `${NAME_KEYS_QUERY}.sql`);
  if (payloadPath(dir, NAME_KEYS_QUERY)) {
    const keys = readPayload(dir, NAME_KEYS_QUERY).keys;
    if (!keys || typeof keys !== 'object') throw new Error(`${NAME_KEYS_QUERY}: no keys object`);
    const missing = [...names].filter((name) => typeof keys[name] !== 'string');
    if (missing.length === 0) return new Map(Object.entries(keys));
    writeNameKeysSql(sqlPath);
    console.error(`${NAME_KEYS_QUERY} is missing ${missing.length} names (first: ${JSON.stringify(missing[0])}).`);
  } else {
    writeNameKeysSql(sqlPath);
  }
  console.error(`Run ${sqlPath} in Toolio's SQL editor, save the payload as ${NAME_KEYS_QUERY}.json (or .csv) in ${dir}, then run extract again.`);
  process.exit(2);
}

function writeNameKeysSql(path) {
  const list = JSON.stringify([...names].sort());
  const tag = '$vocab_names$';
  if (list.includes(tag)) throw new Error(`A name contains ${tag}; pick another dollar-quote tag`);
  const sql = [
    '-- Vocab merge: Toolio name keys for every name in this export (read-only, generated by extract.mjs).',
    `-- Run in Toolio's SQL editor (Lovable). Save the single payload cell as ${NAME_KEYS_QUERY}.json`,
    `-- (or the downloaded result as ${NAME_KEYS_QUERY}.csv) in this export folder.`,
    'SELECT jsonb_build_object(',
    `  'query', '${NAME_KEYS_QUERY}',`,
    "  'version', 1,",
    "  'exported_at', now(),",
    "  'keys', (",
    '    SELECT jsonb_object_agg(n.name, public.inventory_item_name_comparison_key(n.name))',
    `    FROM jsonb_array_elements_text(${tag}${list}${tag}::jsonb) AS n(name)`,
    '  )',
    ')::text AS payload;',
    '',
  ].join('\n');
  writeFileSync(path, sql);
}

// ---------- Helpers ----------

function tagKeys(tags) {
  return (tags ?? []).filter((tag) => typeof tag === 'string' && tag.trim()).map(keyOf);
}

/** Same parsing as the app's expandToolAlternateKeys: JSON array of names/objects, else one name. */
function alternateNames(alternates) {
  if (alternates === null || alternates === undefined) return [];
  let value = alternates;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((alt) => (typeof alt === 'string' ? alt : alt?.name || alt?.item || alt?.label))
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());
}

function groupBy(rows, keyFn) {
  const fn = typeof keyFn === 'function' ? keyFn : (row) => row[keyFn];
  const map = new Map();
  for (const row of rows) {
    const key = fn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function indexBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (map.has(key)) throw new Error(`Duplicate override row for ${key}`);
    map.set(key, row);
  }
  return map;
}

function sumBy(rows, keyFn) {
  const totals = {};
  for (const row of rows) {
    const key = keyFn(row);
    totals[key] = (totals[key] ?? 0) + row.count;
  }
  return totals;
}
