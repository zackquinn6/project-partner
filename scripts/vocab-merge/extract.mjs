#!/usr/bin/env node
/**
 * Merge step 1: build matching views from an export archive.
 *
 *   node scripts/vocab-merge/extract.mjs --archive <export folder> [--dry-run]
 *
 * Name keys come from Toolio's inventory_item_name_comparison_key RPC so both sides share
 * Toolio's normalization. The current revision of each Project Partner family comes from
 * Project Partner's latest_published_in_family RPC.
 *
 * Env: TOOLIO_SUPABASE_URL, TOOLIO_SERVICE_ROLE_KEY, PP_SUPABASE_URL, PP_SERVICE_ROLE_KEY,
 *      VOCAB_MERGE_ARCHIVE_DIR.
 */
import { join } from 'node:path';
import {
  archiveDir,
  mapWithConcurrency,
  parseArgs,
  ppClient,
  readArchiveTable,
  toolioClient,
  writeJson,
} from './lib.mjs';

const args = parseArgs();
const dir = archiveDir(args);
const toolio = toolioClient();
const pp = ppClient();

const t = (table) => readArchiveTable(dir, 'toolio', table);
const p = (table) => readArchiveTable(dir, 'pp', table);

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

const ppProjects = p('projects');
const ppProjectById = new Map(ppProjects.map((row) => [row.id, row]));
const families = groupBy(ppProjects, (row) => row.parent_project_id ?? row.id);
const tools = p('tools');
const materials = p('materials');
const toolVariations = p('tool_variations');
const materialVariants = p('materials_variants');

// ---------- Name keys (Toolio normalization) ----------

const names = new Set();
const addName = (value) => {
  if (typeof value === 'string' && value.trim()) names.add(value);
};
cores.forEach((row) => {
  addName(row.name);
  (row.discovery_tags ?? []).forEach(addName);
});
toolioProjects.forEach((row) => {
  addName(row.name);
  (row.discovery_tags ?? []).forEach(addName);
});
ppProjects.forEach((row) => addName(row.name));
[...tools, ...materials].forEach((row) => {
  addName(row.name);
  alternateNames(row.alternates).forEach(addName);
});
[...toolVariations, ...materialVariants].forEach((row) => addName(row.name));

const references = collectReferences();
references.forEach((ref) => addName(ref.name));

if (args.dryRun) {
  console.log(`Toolio cores: ${cores.length}, projects: ${toolioProjects.length}`);
  console.log(`Project Partner families: ${families.size}, tools: ${tools.length}, materials: ${materials.length}`);
  console.log(`References: ${references.length}, distinct names to normalize: ${names.size}`);
  process.exit(0);
}

const nameList = [...names];
const keyList = await mapWithConcurrency(nameList, 8, async (name) => {
  const { data, error } = await toolio.rpc('inventory_item_name_comparison_key', { p_name: name });
  if (error) throw new Error(`inventory_item_name_comparison_key(${JSON.stringify(name)}): ${error.message}`);
  if (typeof data !== 'string') throw new Error(`inventory_item_name_comparison_key(${JSON.stringify(name)}) returned no key`);
  return data;
});
const nameKeys = new Map(nameList.map((name, i) => [name, keyList[i]]));
const keyOf = (name) => {
  if (!nameKeys.has(name)) throw new Error(`No name key for ${JSON.stringify(name)}`);
  return nameKeys.get(name);
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
  discovery_tag_keys: (row.discovery_tags ?? []).filter((tag) => names.has(tag)).map(keyOf),
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
  discovery_tag_keys: (row.discovery_tags ?? []).filter((tag) => names.has(tag)).map(keyOf),
  lines: projectLines(row.id),
}));

// ---------- Output: Project Partner families ----------

const familyRoots = [...families.keys()];
const latestIds = await mapWithConcurrency(familyRoots, 8, async (rootId) => {
  const { data, error } = await pp.rpc('latest_published_in_family', { p_any_project_id: rootId });
  if (error) throw new Error(`latest_published_in_family(${rootId}): ${error.message}`);
  return data;
});

const ppFamiliesOut = familyRoots.map((rootId, i) => {
  const members = families.get(rootId);
  const root = ppProjectById.get(rootId);
  if (!root) throw new Error(`Project Partner family ${rootId} has revisions but no root row in the archive`);
  let current = null;
  let currentSource;
  if (latestIds[i]) {
    current = ppProjectById.get(latestIds[i]);
    if (!current) throw new Error(`latest_published_in_family(${rootId}) returned ${latestIds[i]}, which is not in the archive`);
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
    variations: variations.map((v) => ({ id: v.id, name: v.name, name_key: keyOf(v.name), sku: v.sku ?? null })),
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
  if (!ref.name || !ref.name.trim()) return { resolved_by: 'none', library_id: null, library_entity: null };
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
  ...ref,
  name_key: ref.name && ref.name.trim() ? keyOf(ref.name) : null,
  ...resolveReference(ref),
}));

// ---------- Write ----------

const outDir = join(dir, 'extract');
writeJson(join(outDir, 'name_keys.json'), Object.fromEntries(nameKeys));
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
  pp_tools: tools.length,
  pp_materials: materials.length,
  references_by_source: countBy(referencesOut, (r) => r.source),
  references_by_resolution: countBy(referencesOut, (r) => r.resolved_by),
};
writeJson(join(outDir, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
console.log(`Next: node scripts/vocab-merge/match.mjs --archive ${args.archive}`);

// ---------- Helpers ----------

/**
 * Every tool or material reference outside the library tables. Step entries carry a per-entry
 * id (`tool-<time>-<random>`), not a library id, so they resolve by name; `parentId` points to
 * the primary entry the row substitutes for.
 */
function collectReferences() {
  const refs = [];
  const fromEntries = (source, ownerId, kind, entries) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !entry.name.trim()) continue;
      refs.push({
        source,
        owner_id: ownerId,
        kind,
        entry_id: entry.id ?? null,
        parent_entry_id: entry.parentId ?? null,
        name: entry.name,
        library_id: entry.library_tool_id ?? entry.library_material_id ?? null,
      });
    }
  };
  const fromPhasesJson = (source, ownerId, phases) => {
    if (!Array.isArray(phases)) return;
    for (const phase of phases) {
      for (const operation of phase?.operations ?? []) {
        for (const step of operation?.steps ?? []) {
          fromEntries(source, ownerId, 'tool', step?.tools);
          fromEntries(source, ownerId, 'material', step?.materials);
        }
      }
    }
  };

  for (const step of p('operation_steps')) {
    fromEntries('operation_steps', step.id, 'tool', step.tools);
    fromEntries('operation_steps', step.id, 'material', step.materials);
  }
  for (const project of ppProjects) fromPhasesJson('projects.phases', project.id, project.phases);
  for (const run of p('project_runs')) {
    fromPhasesJson('project_runs.phases', run.id, run.phases);
    for (const item of run.shopping_checklist_data?.orderedItems ?? []) {
      if (typeof item?.itemName !== 'string' || !item.itemName.trim()) continue;
      refs.push({
        source: 'project_runs.shopping_checklist_data',
        owner_id: run.id,
        kind: item.itemType ?? 'unknown',
        entry_id: item.itemId ?? null,
        parent_entry_id: null,
        name: item.itemName,
        library_id: null,
      });
    }
  }
  for (const profile of p('user_profiles')) {
    for (const owned of Array.isArray(profile.owned_tools) ? profile.owned_tools : []) {
      const name = owned?.name || owned?.item;
      if (typeof name !== 'string' || !name.trim()) continue;
      refs.push({
        source: 'user_profiles.owned_tools',
        owner_id: profile.user_id,
        kind: 'tool',
        entry_id: owned.id ?? null,
        parent_entry_id: null,
        name,
        library_id: owned.tool_id ?? null,
      });
    }
  }
  for (const row of p('user_tools')) {
    refs.push({ source: 'user_tools', owner_id: row.user_id, kind: 'tool', entry_id: row.id, parent_entry_id: null, name: row.name, library_id: row.tool_id });
  }
  for (const row of p('user_materials')) {
    refs.push({ source: 'user_materials', owner_id: row.user_id, kind: 'material', entry_id: row.id, parent_entry_id: null, name: row.name, library_id: row.material_id });
  }
  return refs;
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
