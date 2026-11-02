#!/usr/bin/env node
/**
 * Phase 3: generate Project Partner's vocabulary migration from a reviewed export.
 *
 *   node scripts/vocab-merge/build-pp-load.mjs --archive <export folder> [--dry-run] [--out <file>]
 *
 * --out writes elsewhere (the local test harness uses it); the default is the phase 3 migration.
 *
 * Inputs: the export folder (validated, extracted, crosswalk fully decided, plus
 * toolio-4-name-key-function), docs/integration/new-term-attributes.csv, and the static SQL parts
 * in scripts/vocab-merge/sql/pp-phase3-*.sql.
 *
 * Output: supabase/migrations/20261102210000_vocab_link_phase3.sql (one migration for the phase).
 * Every Project Partner library row, category, and project family must get exactly one fate,
 * and every reference must resolve; otherwise nothing is written.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveDir, parseArgs, readCsv, readJson, readPayload, tableRows } from './lib.mjs';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(REPO, 'supabase', 'migrations', '20261102210000_vocab_link_phase3.sql');
const SQL_DIR = fileURLToPath(new URL('./sql/', import.meta.url));

const args = parseArgs();
const dir = archiveDir(args.archive);
const crosswalk = readCsv(join(dir, 'vocab-crosswalk.csv'));
const attributes = new Map(readCsv(join(REPO, 'docs', 'integration', 'new-term-attributes.csv')).map((r) => [r.key, r]));
const extract = (name) => readJson(join(dir, 'extract', `${name}.json`));
const toolioCatalog = readPayload(dir, 'toolio-1-catalog');
const ppLibraryPayload = readPayload(dir, 'pp-1-library');
const nameKeys = readPayload(dir, 'toolio-3-name-keys').keys;

const undecided = crosswalk.filter((r) => !r.decision);
if (undecided.length) fail(`${undecided.length} crosswalk rows have no decision`);

const toolioInventory = new Map(tableRows(toolioCatalog, 'inventory_items').map((r) => [r.id, r]));
const toolioProjectRows = new Map(tableRows(toolioCatalog, 'projects').map((r) => [r.id, r]));
const toolioProjects = new Map(extract('toolio_projects').map((p) => [p.id, p]));
const ppLibrary = new Map(extract('pp_library').map((e) => [e.id, e]));
const ppFamilies = new Map(extract('pp_families').map((f) => [f.root_id, f]));
const ppCategories = extract('pp_categories');
const references = extract('pp_references');
const ppTools = tableRows(ppLibraryPayload, 'tools');
const ppMaterials = tableRows(ppLibraryPayload, 'materials');

const problems = [];
const nonEmpty = (text) => (typeof text === 'string' && text.trim() ? text : null);
const keyOfName = (name) => {
  if (typeof nameKeys[name] !== 'string') problems.push(`No Toolio name key for "${name}"`);
  return nameKeys[name];
};

// ---------- Library: tools and materials ----------

const library = new Map(); // key -> { key, entity, ppId, name, description, category, specialty }
const redirects = new Map(); // old library id -> { oldEntity, targetKey }
const aliases = []; // { key, alias, source }
const fateOfLibraryId = new Map();
const coreKey = new Map(); // Toolio core id -> term key

function claimLibraryId(id, fate) {
  if (fateOfLibraryId.has(id)) problems.push(`Library row ${id} has two fates: ${fateOfLibraryId.get(id)} and ${fate}`);
  fateOfLibraryId.set(id, fate);
}
function addLibrary(entry) {
  if (library.has(entry.key)) {
    const existing = library.get(entry.key);
    if (existing.ppId !== entry.ppId || existing.entity !== entry.entity) problems.push(`Key ${entry.key} is given to two library terms`);
    return;
  }
  library.set(entry.key, entry);
  if (entry.ppId) claimLibraryId(entry.ppId, `keep ${entry.key}`);
}
function addAlias(key, alias, source, name) {
  if (alias && alias !== name) aliases.push({ key, alias, source });
}
function ppAlternates(key, ppId, name) {
  for (const alt of ppLibrary.get(ppId)?.alternates ?? []) addAlias(key, alt, 'alternates', name);
}
function referenceCount(libraryId) {
  return references.filter((r) => r.library_id === libraryId).reduce((sum, r) => sum + r.count, 0);
}

const termRows = crosswalk.filter((r) => r.entity === 'tool' || r.entity === 'material');
const byDecision = (decision) => termRows.filter((r) => r.decision === decision);

for (const r of byDecision('merge')) {
  const pp = ppLibrary.get(r.pp_id);
  addLibrary({
    key: r.canonical_key,
    entity: pp.entity,
    ppId: r.pp_id,
    name: r.canonical_name,
    description: nonEmpty(toolioInventory.get(r.toolio_id)?.description),
  });
  addAlias(r.canonical_key, r.pp_name, 'pp_name', r.canonical_name);
  addAlias(r.canonical_key, r.toolio_name, 'toolio_name', r.canonical_name);
  ppAlternates(r.canonical_key, r.pp_id, r.canonical_name);
  coreKey.set(r.toolio_id, r.canonical_key);
}

for (const rows of groupBy(byDecision('merge_many'), (r) => r.toolio_id).values()) {
  const ranked = [...rows].sort(
    (a, b) =>
      referenceCount(b.pp_id) - referenceCount(a.pp_id) ||
      Number(b.match_tier === 'exact') - Number(a.match_tier === 'exact') ||
      a.pp_id.localeCompare(b.pp_id),
  );
  const kept = ranked[0];
  const key = kept.canonical_key;
  if (rows.some((r) => r.canonical_key !== key)) problems.push(`merge_many rows for ${kept.toolio_name} disagree on the key`);
  addLibrary({
    key,
    entity: ppLibrary.get(kept.pp_id).entity,
    ppId: kept.pp_id,
    name: kept.canonical_name,
    description: nonEmpty(toolioInventory.get(kept.toolio_id)?.description),
  });
  addAlias(key, kept.toolio_name, 'toolio_name', kept.canonical_name);
  for (const r of rows) {
    addAlias(key, r.pp_name, r === kept ? 'pp_name' : 'merged_term', kept.canonical_name);
    ppAlternates(key, r.pp_id, kept.canonical_name);
    if (r !== kept) {
      redirects.set(r.pp_id, { oldEntity: ppLibrary.get(r.pp_id).entity, targetKey: key });
      claimLibraryId(r.pp_id, `merged into ${key}`);
    }
  }
  coreKey.set(kept.toolio_id, key);
}

for (const rows of groupBy(byDecision('one_to_many'), (r) => r.pp_id).values()) {
  const first = rows[0];
  if (rows.some((r) => r.canonical_key !== first.canonical_key || r.canonical_name !== first.canonical_name)) {
    problems.push(`one_to_many rows for ${first.pp_name} disagree on key or name`);
  }
  addLibrary({ key: first.canonical_key, entity: ppLibrary.get(first.pp_id).entity, ppId: first.pp_id, name: first.canonical_name, description: null });
  addAlias(first.canonical_key, first.pp_name, 'pp_name', first.canonical_name);
  ppAlternates(first.canonical_key, first.pp_id, first.canonical_name);
  for (const r of rows) {
    addAlias(first.canonical_key, r.toolio_name, 'toolio_name', first.canonical_name);
    coreKey.set(r.toolio_id, first.canonical_key);
  }
}

for (const r of byDecision('keep_pp')) {
  addLibrary({ key: r.canonical_key, entity: ppLibrary.get(r.pp_id).entity, ppId: r.pp_id, name: r.pp_name, description: null });
  ppAlternates(r.canonical_key, r.pp_id, r.pp_name);
}

const usedAttributes = new Set();
function newTermFromAttributes(key, name, description) {
  const attr = attributes.get(key);
  if (!attr) {
    problems.push(`New term ${key} (${name}) has no row in new-term-attributes.csv`);
    return;
  }
  usedAttributes.add(key);
  if (!['tool', 'material'].includes(attr.pp_entity)) problems.push(`new-term-attributes ${key}: pp_entity must be tool or material`);
  if (attr.pp_entity === 'tool' && !['1', '2', '3'].includes(attr.specialty_scale)) problems.push(`new-term-attributes ${key}: tools need specialty_scale 1, 2, or 3`);
  if (attr.pp_entity === 'material' && attr.specialty_scale) problems.push(`new-term-attributes ${key}: materials take no specialty_scale`);
  if (!attr.pp_category) problems.push(`new-term-attributes ${key}: pp_category is required`);
  addLibrary({
    key,
    entity: attr.pp_entity,
    ppId: null,
    name,
    description,
    category: attr.pp_category,
    specialty: attr.pp_entity === 'tool' ? Number(attr.specialty_scale) : null,
  });
}

for (const r of byDecision('create_in_pp')) {
  newTermFromAttributes(r.canonical_key, r.canonical_name, nonEmpty(toolioInventory.get(r.toolio_id)?.description));
  coreKey.set(r.toolio_id, r.canonical_key);
}
const referenceRows = crosswalk.filter((r) => r.entity === 'reference');
for (const r of referenceRows.filter((r) => r.decision === 'create_library_term')) {
  newTermFromAttributes(r.canonical_key, r.canonical_name, null);
}

for (const r of byDecision('fold_into')) {
  redirects.set(r.pp_id, { oldEntity: ppLibrary.get(r.pp_id).entity, targetKey: r.canonical_key });
  claimLibraryId(r.pp_id, `folded into ${r.canonical_key}`);
  aliases.push({ key: r.canonical_key, alias: r.pp_name, source: 'merged_term' });
}

for (const key of attributes.keys()) {
  if (!usedAttributes.has(key)) problems.push(`new-term-attributes.csv row ${key} matches no new term`);
}
const variationOwners = new Set([
  ...tableRows(ppLibraryPayload, 'tool_variations').map((v) => v.core_item_id),
  ...tableRows(ppLibraryPayload, 'materials_variants').map((v) => v.material_id),
]);
for (const [id, { oldEntity, targetKey }] of redirects) {
  const target = library.get(targetKey);
  if (!target) problems.push(`Library row ${id} is redirected to ${targetKey}, which is not a term`);
  else if (target.entity !== oldEntity && variationOwners.has(id)) {
    problems.push(`${ppLibrary.get(id).name} (${oldEntity}) has variations but merges into ${target.entity} ${targetKey}`);
  }
}
for (const row of [...ppTools, ...ppMaterials]) {
  if (!fateOfLibraryId.has(row.id)) problems.push(`Project Partner library row "${row.name}" (${row.id}) has no fate`);
}
for (const id of fateOfLibraryId.keys()) {
  if (!ppLibrary.has(id)) problems.push(`Crosswalk refers to library row ${id}, which is not in the export`);
}

// ---------- Name and id maps for step entries and owned tools ----------

function keyOfLibraryId(id) {
  if (redirects.has(id)) return redirects.get(id).targetKey;
  for (const entry of library.values()) if (entry.ppId === id) return entry.key;
  return null;
}

const referenceDecisionByNameKey = new Map();
const referenceDecisionById = new Map();
for (const r of referenceRows) {
  if (r.pp_name) referenceDecisionByNameKey.set(keyOfName(r.pp_name), r);
  else referenceDecisionById.set(r.pp_id, r);
}

const nameMap = new Map(); // `${kind}|${name}` -> key
const idAliases = new Map(); // dangling stored id -> key
function mapName(kind, name, key, why) {
  const id = `${kind}|${name}`;
  if (nameMap.has(id) && nameMap.get(id) !== key) problems.push(`"${name}" (${kind}) maps to both ${nameMap.get(id)} and ${key} (${why})`);
  nameMap.set(id, key);
}

for (const ref of references) {
  if (ref.source === 'project_runs.shopping_checklist_data' || ref.source === 'user_tools' || ref.source === 'user_materials') continue;
  if (ref.resolved_by === 'id') continue;
  if (['name', 'variation', 'alternate'].includes(ref.resolved_by)) {
    const key = keyOfLibraryId(ref.library_id);
    if (!key) problems.push(`Reference "${ref.name}" resolved to library row ${ref.library_id}, which has no term`);
    else mapName(ref.kind, ref.name, key, `resolved by ${ref.resolved_by}`);
    continue;
  }
  if (['ambiguous', 'none', 'dangling_id'].includes(ref.resolved_by)) {
    const decision = ref.name_key ? referenceDecisionByNameKey.get(ref.name_key) : referenceDecisionById.get(ref.stored_library_id);
    if (!decision || !decision.canonical_key) {
      problems.push(`Unresolved reference "${ref.name}" (${ref.kind}, ${ref.source}) has no crosswalk decision`);
      continue;
    }
    if (ref.name) mapName(ref.kind, ref.name, decision.canonical_key, 'crosswalk reference');
    if (ref.stored_library_id) idAliases.set(ref.stored_library_id, decision.canonical_key);
    continue;
  }
  problems.push(`Reference ${JSON.stringify(ref)} cannot be mapped (${ref.resolved_by})`);
}
for (const key of new Set([...nameMap.values(), ...idAliases.values()])) {
  if (!library.has(key)) problems.push(`A reference maps to ${key}, which is not a library term`);
}

// ---------- Categories ----------

const categories = new Map(); // key -> name
const categoryRename = new Map(); // old Project Partner name -> final name
const categoryOfGrouping = new Map(); // Toolio grouping id -> final name
const categoryFate = new Map();
function addCategory(key, name) {
  if (categories.has(key) && categories.get(key) !== name) problems.push(`Category key ${key} has two names`);
  categories.set(key, name);
}
function claimCategory(ppName, fate) {
  if (categoryFate.has(ppName)) problems.push(`Category "${ppName}" has two fates`);
  categoryFate.set(ppName, fate);
}
for (const r of crosswalk.filter((r) => r.entity === 'category')) {
  if (['merge', 'merge_many'].includes(r.decision)) {
    addCategory(r.canonical_key, r.canonical_name);
    categoryRename.set(r.pp_name, r.canonical_name);
    claimCategory(r.pp_name, `category ${r.canonical_key}`);
    categoryOfGrouping.set(r.toolio_id, r.canonical_name);
    addAlias(r.canonical_key, r.pp_name, 'pp_name', r.canonical_name);
    addAlias(r.canonical_key, r.toolio_name, 'toolio_name', r.canonical_name);
  } else if (r.decision === 'keep_pp') {
    addCategory(r.canonical_key, r.pp_name);
    claimCategory(r.pp_name, `category ${r.canonical_key}`);
  } else if (r.decision === 'create_in_pp') {
    addCategory(r.canonical_key, r.canonical_name);
    categoryOfGrouping.set(r.toolio_id, r.canonical_name);
    addAlias(r.canonical_key, r.toolio_name, 'toolio_name', r.canonical_name);
  } else {
    problems.push(`Category decision ${r.decision} is not supported`);
  }
}
for (const c of ppCategories) if (!categoryFate.has(c.name)) problems.push(`Project Partner category "${c.name}" has no fate`);
const categoryNames = [...categories.values()];
if (new Set(categoryNames).size !== categoryNames.length) problems.push('Two categories end up with the same name');

function groupingCategories(toolioProjectId) {
  const project = toolioProjects.get(toolioProjectId);
  return [...new Set(project.catalog_parent_ids.map((id) => categoryOfGrouping.get(id)).filter(Boolean))];
}

// ---------- Project families ----------

const families = new Map(); // key -> { key, ppRoot, name, rename, description, categories }
const familyFate = new Map();
const addCategoriesTo = []; // { key, category }
const seedTools = []; // { familyKey, termKey }
for (const r of crosswalk.filter((r) => r.entity === 'project')) {
  if (r.decision === 'merge') {
    const family = ppFamilies.get(r.pp_id);
    families.set(r.canonical_key, { key: r.canonical_key, ppRoot: r.pp_id, name: r.canonical_name, rename: r.canonical_name !== family.name });
    if (familyFate.has(r.pp_id)) problems.push(`Project family ${family.name} has two fates`);
    familyFate.set(r.pp_id, r.canonical_key);
    addAlias(r.canonical_key, r.toolio_name, 'toolio_name', r.canonical_name);
    addAlias(r.canonical_key, family.name, 'pp_name', r.canonical_name);
    for (const n of family.revision_names) addAlias(r.canonical_key, n, 'pp_revision_name', r.canonical_name);
    for (const c of groupingCategories(r.toolio_id)) addCategoriesTo.push({ key: r.canonical_key, category: c });
  } else if (r.decision === 'keep_pp') {
    const family = ppFamilies.get(r.pp_id);
    families.set(r.canonical_key, { key: r.canonical_key, ppRoot: r.pp_id, name: family.name, rename: false });
    if (familyFate.has(r.pp_id)) problems.push(`Project family ${family.name} has two fates`);
    familyFate.set(r.pp_id, r.canonical_key);
    for (const n of family.revision_names) addAlias(r.canonical_key, n, 'pp_revision_name', family.name);
  } else if (r.decision === 'create_in_pp') {
    families.set(r.canonical_key, {
      key: r.canonical_key,
      ppRoot: null,
      name: r.canonical_name,
      description: nonEmpty(toolioProjectRows.get(r.toolio_id)?.description),
      categories: groupingCategories(r.toolio_id),
    });
    addAlias(r.canonical_key, r.toolio_name, 'toolio_name', r.canonical_name);
    const seeded = new Set();
    for (const line of toolioProjects.get(r.toolio_id).lines.filter((l) => l.visible)) {
      const termKey = coreKey.get(line.core_id);
      if (!termKey) problems.push(`Toolio project ${r.toolio_key}: core ${line.core_id} has no term`);
      else if (!seeded.has(termKey)) {
        seeded.add(termKey);
        seedTools.push({ familyKey: r.canonical_key, termKey });
      }
    }
  } else {
    problems.push(`Project decision ${r.decision} for ${r.toolio_name || r.pp_name} is not supported`);
  }
}
for (const id of ppFamilies.keys()) if (!familyFate.has(id)) problems.push(`Project Partner family ${ppFamilies.get(id).name} has no fate`);

// ---------- Global key checks ----------

const allKeys = [
  ...[...library.values()].map((e) => [e.key, e.entity]),
  ...[...categories.keys()].map((k) => [k, 'category']),
  ...[...families.keys()].map((k) => [k, 'project']),
];
const seenKeys = new Map();
for (const [key, entity] of allKeys) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) problems.push(`Key "${key}" is not lowercase kebab-case`);
  if (seenKeys.has(key)) problems.push(`Key ${key} is used by a ${seenKeys.get(key)} and a ${entity}`);
  seenKeys.set(key, entity);
}
for (const entity of ['tool', 'material']) {
  const byNameKey = new Map();
  for (const e of [...library.values()].filter((e) => e.entity === entity)) {
    const nk = keyOfName(e.name);
    if (byNameKey.has(nk)) problems.push(`${entity}s "${byNameKey.get(nk)}" and "${e.name}" normalize to the same name`);
    byNameKey.set(nk, e.name);
  }
}

if (problems.length) fail(`${problems.length} problems:\n  - ${[...new Set(problems)].join('\n  - ')}`);

// ---------- Accounting ----------

const count = (entity, fn = () => true) => [...library.values()].filter((e) => e.entity === entity && fn(e)).length;
const expected = {
  tools: count('tool'),
  materials: count('material'),
  categories: categories.size,
  families: families.size,
};
const summary = {
  library_kept: [...library.values()].filter((e) => e.ppId).length,
  library_new: [...library.values()].filter((e) => !e.ppId).length,
  library_redirected: redirects.size,
  expected,
  categories_renamed: [...categoryRename].filter(([a, b]) => a !== b).length,
  families_kept: [...families.values()].filter((f) => f.ppRoot).length,
  families_new: [...families.values()].filter((f) => !f.ppRoot).length,
  families_renamed: [...families.values()].filter((f) => f.rename).length,
  family_seed_tools: seedTools.length,
  aliases: aliases.length,
  name_map: nameMap.size,
  id_aliases: idAliases.size,
};
console.log(JSON.stringify(summary, null, 2));
if (args.dryRun) process.exit(0);

// ---------- SQL ----------

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (items) => (items.length ? `ARRAY[${items.map(q).join(', ')}]::text[]` : 'ARRAY[]::text[]');
const values = (rows) => rows.map((r) => `  (${r.join(', ')})`).join(',\n');
const insertRows = (table, rows) => (rows.length ? `INSERT INTO ${table} VALUES\n${values(rows)};\n` : '');

const nameKeyFunction = readPayload(dir, 'toolio-4-name-key-function').definition;
const header = nameKeyFunction.match(/CREATE OR REPLACE FUNCTION public\.inventory_item_name_comparison_key\(/g);
if (!header || header.length !== 1) fail('toolio-4-name-key-function: unexpected function header');
const vocabNameKey = `${nameKeyFunction.replace('public.inventory_item_name_comparison_key(', 'public.vocab_name_key(').trim()};\n`;

const load = `
-- ===========================================================================
-- Part 3: load (generated by scripts/vocab-merge/build-pp-load.mjs)
-- ===========================================================================

CREATE TEMP TABLE _vm_library (key text PRIMARY KEY, entity text NOT NULL, pp_id uuid, name text NOT NULL,
  description text, category text, specialty_scale integer) ON COMMIT DROP;
${insertRows('_vm_library', [...library.values()].map((e) => [q(e.key), q(e.entity), e.ppId ? `${q(e.ppId)}::uuid` : 'NULL', q(e.name), q(e.description), q(e.category), e.specialty ?? 'NULL']))}
CREATE TEMP TABLE _vm_redirect (old_id uuid PRIMARY KEY, old_entity text NOT NULL, target_key text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_redirect', [...redirects].map(([id, r]) => [`${q(id)}::uuid`, q(r.oldEntity), q(r.targetKey)]))}
CREATE TEMP TABLE _vm_id_alias (old_id text PRIMARY KEY, target_key text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_id_alias', [...idAliases].map(([id, key]) => [q(id), q(key)]))}
CREATE TEMP TABLE _vm_name_map (kind text NOT NULL, name text NOT NULL, target_key text NOT NULL, PRIMARY KEY (kind, name)) ON COMMIT DROP;
${insertRows('_vm_name_map', [...nameMap].map(([id, key]) => { const [kind, ...rest] = id.split('|'); return [q(kind), q(rest.join('|')), q(key)]; }))}
CREATE TEMP TABLE _vm_alias (key text NOT NULL, alias text NOT NULL, source text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_alias', aliases.map((a) => [q(a.key), q(a.alias), q(a.source)]))}
CREATE TEMP TABLE _vm_category (key text PRIMARY KEY, name text NOT NULL UNIQUE) ON COMMIT DROP;
${insertRows('_vm_category', [...categories].map(([key, name]) => [q(key), q(name)]))}
CREATE TEMP TABLE _vm_category_rename (old_name text PRIMARY KEY, new_name text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_category_rename', [...categoryRename].filter(([a, b]) => a !== b).map(([a, b]) => [q(a), q(b)]))}
CREATE TEMP TABLE _vm_family (key text PRIMARY KEY, pp_root uuid, name text NOT NULL, rename boolean NOT NULL,
  description text, categories text[]) ON COMMIT DROP;
${insertRows('_vm_family', [...families.values()].map((f) => [q(f.key), f.ppRoot ? `${q(f.ppRoot)}::uuid` : 'NULL', q(f.name), f.rename ? 'true' : 'false', q(f.description), f.ppRoot ? 'NULL' : arr(f.categories)]))}
CREATE TEMP TABLE _vm_family_category (key text NOT NULL, category text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_family_category', addCategoriesTo.map((a) => [q(a.key), q(a.category)]))}
CREATE TEMP TABLE _vm_seed_tools (family_key text NOT NULL, term_key text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_seed_tools', seedTools.map((s) => [q(s.familyKey), q(s.termKey)]))}
CREATE TEMP TABLE _vm_parity (name text PRIMARY KEY, name_key text NOT NULL) ON COMMIT DROP;
${insertRows('_vm_parity', Object.entries(nameKeys).map(([name, key]) => [q(name), q(key)]))}

-- Keys for every term.
INSERT INTO public.vocab_keys (public_key, entity)
  SELECT key, entity FROM _vm_library
  UNION ALL SELECT key, 'category' FROM _vm_category
  UNION ALL SELECT key, 'project' FROM _vm_family;

-- Kept library rows get their key; new terms are inserted.
UPDATE public.tools t SET public_key = l.key FROM _vm_library l WHERE l.pp_id = t.id AND l.entity = 'tool';
UPDATE public.materials m SET public_key = l.key FROM _vm_library l WHERE l.pp_id = m.id AND l.entity = 'material';
INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
  SELECT name, description, category, specialty_scale, key FROM _vm_library WHERE pp_id IS NULL AND entity = 'tool';
INSERT INTO public.materials (name, description, category, public_key)
  SELECT name, description, category, key FROM _vm_library WHERE pp_id IS NULL AND entity = 'material';

-- Merged-away rows: variations and ownership move to the kept term, then the rows are deleted.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _vm_redirect r JOIN public.tool_variations v ON v.core_item_id = r.old_id
    WHERE r.old_entity = 'tool' AND NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.public_key = r.target_key)
  ) OR EXISTS (
    SELECT 1 FROM _vm_redirect r JOIN public.materials_variants v ON v.material_id = r.old_id
    WHERE r.old_entity = 'material' AND NOT EXISTS (SELECT 1 FROM public.materials m WHERE m.public_key = r.target_key)
  ) THEN
    RAISE EXCEPTION 'vocab load: a merged-away row with variations would move between tools and materials';
  END IF;
END $$;
UPDATE public.tool_variations v SET core_item_id = t.id
  FROM _vm_redirect r JOIN public.tools t ON t.public_key = r.target_key WHERE v.core_item_id = r.old_id;
UPDATE public.materials_variants v SET material_id = m.id
  FROM _vm_redirect r JOIN public.materials m ON m.public_key = r.target_key WHERE v.material_id = r.old_id;
UPDATE public.user_tools u SET tool_id = t.id
  FROM _vm_redirect r JOIN public.tools t ON t.public_key = r.target_key WHERE u.tool_id = r.old_id;
UPDATE public.user_materials u SET material_id = m.id
  FROM _vm_redirect r JOIN public.materials m ON m.public_key = r.target_key WHERE u.material_id = r.old_id;
INSERT INTO public.user_materials (user_id, material_id, name, quantity, description, user_photo_url)
  SELECT u.user_id, m.id, u.name, u.quantity, u.description, u.user_photo_url
  FROM public.user_tools u JOIN _vm_redirect r ON r.old_id = u.tool_id JOIN public.materials m ON m.public_key = r.target_key;
DELETE FROM public.user_tools u USING _vm_redirect r, public.materials m WHERE u.tool_id = r.old_id AND m.public_key = r.target_key;
INSERT INTO public.user_tools (user_id, tool_id, name, quantity, description, user_photo_url)
  SELECT u.user_id, t.id, u.name, u.quantity, u.description, u.user_photo_url
  FROM public.user_materials u JOIN _vm_redirect r ON r.old_id = u.material_id JOIN public.tools t ON t.public_key = r.target_key;
DELETE FROM public.user_materials u USING _vm_redirect r, public.tools t WHERE u.material_id = r.old_id AND t.public_key = r.target_key;
DELETE FROM public.tools WHERE id IN (SELECT old_id FROM _vm_redirect WHERE old_entity = 'tool');
DELETE FROM public.materials WHERE id IN (SELECT old_id FROM _vm_redirect WHERE old_entity = 'material');

-- Canonical names and descriptions, then normalized names.
UPDATE public.tools t SET name = l.name, description = CASE WHEN l.description IS NULL THEN t.description ELSE l.description END
  FROM _vm_library l WHERE l.key = t.public_key;
UPDATE public.materials m SET name = l.name, description = CASE WHEN l.description IS NULL THEN m.description ELSE l.description END
  FROM _vm_library l WHERE l.key = m.public_key;
UPDATE public.tools SET name_key = public.vocab_name_key(name);
UPDATE public.materials SET name_key = public.vocab_name_key(name);

-- One map for every step entry and owned tool: library ids (kept rows, merged-away rows, gone rows) and names.
CREATE TEMP TABLE _vm_targets ON COMMIT DROP AS
  SELECT public_key AS key, id, name, category FROM public.tools
  UNION ALL SELECT public_key, id, name, category FROM public.materials;
CREATE TEMP TABLE _vm_map ON COMMIT DROP AS
SELECT jsonb_build_object(
  'by_id', (
    SELECT jsonb_object_agg(src, jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category))
    FROM (
      SELECT id::text AS src, key FROM _vm_targets
      UNION ALL SELECT old_id::text, target_key FROM _vm_redirect
      UNION ALL SELECT old_id, target_key FROM _vm_id_alias
    ) ids JOIN _vm_targets t ON t.key = ids.key
  ),
  'by_name', (
    SELECT jsonb_object_agg(n.kind || '|' || n.name, jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category))
    FROM _vm_name_map n JOIN _vm_targets t ON t.key = n.target_key
  )
) AS m;

UPDATE public.operation_steps
  SET tools = public.vocab_map_entries(tools, 'tool', (SELECT m FROM _vm_map), true)
  WHERE jsonb_typeof(tools) = 'array';
UPDATE public.operation_steps
  SET materials = public.vocab_map_entries(materials, 'material', (SELECT m FROM _vm_map), true)
  WHERE jsonb_typeof(materials) = 'array';
UPDATE public.projects SET phases = public.vocab_walk_run_phases(phases, (SELECT m FROM _vm_map), true) WHERE phases IS NOT NULL;
UPDATE public.project_runs SET phases = public.vocab_walk_run_phases(phases, (SELECT m FROM _vm_map), true) WHERE phases IS NOT NULL;
UPDATE public.user_profiles SET owned_tools = public.vocab_map_owned_tools(owned_tools, (SELECT m FROM _vm_map), true)
  WHERE owned_tools IS NOT NULL;

-- Categories become vocabulary; projects carry the final names.
INSERT INTO public.project_categories (public_key, name) SELECT key, name FROM _vm_category;
UPDATE public.projects p
  SET category = (
    SELECT array_agg(DISTINCT CASE WHEN r.old_name IS NULL THEN c ELSE r.new_name END)
    FROM unnest(p.category) AS c LEFT JOIN _vm_category_rename r ON r.old_name = c
  )
  WHERE cardinality(p.category) > 0;

-- Project families: keys and names on existing families, new families as drafts.
UPDATE public.projects p SET public_key = f.key FROM _vm_family f WHERE p.id = f.pp_root;
UPDATE public.projects p SET name = f.name
  FROM _vm_family f WHERE f.rename AND (p.id = f.pp_root OR p.parent_project_id = f.pp_root);
INSERT INTO public.projects (name, description, category, publish_status, visibility_status, public_key)
  SELECT name, description, categories, 'draft', 'coming-soon', key FROM _vm_family WHERE pp_root IS NULL;
UPDATE public.projects p
  SET category = (SELECT array_agg(DISTINCT c) FROM unnest(p.category || a.categories) AS c)
  FROM (SELECT key, array_agg(category) AS categories FROM _vm_family_category GROUP BY key) a
  JOIN public.projects root ON root.public_key = a.key
  WHERE p.id = root.id OR p.parent_project_id = root.id;

INSERT INTO public.vocab_aliases (public_key, alias, source)
  SELECT DISTINCT ON (key, alias) key, alias, source FROM _vm_alias ORDER BY key, alias, source
  ON CONFLICT (public_key, alias) DO NOTHING;

INSERT INTO public.project_family_tools (family_key, term_key, role, source)
  SELECT family_key, term_key, 'required', 'toolio_seed' FROM _vm_seed_tools;
DO $$ BEGIN PERFORM public.vocab_rebuild_family_tools(id) FROM public.projects WHERE public_key IS NOT NULL; END $$;
-- The feed starts after the load: Toolio's first snapshot carries this state.
DELETE FROM public.vocab_change_events;

-- ---------------------------------------------------------------------------
-- Accounting: any failure rolls the whole migration back.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count bigint;
  v_detail text;
BEGIN
  SELECT count(*) INTO v_count FROM public.tools;
  IF v_count <> ${expected.tools} THEN RAISE EXCEPTION 'vocab load: % tools, expected ${expected.tools}', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.materials;
  IF v_count <> ${expected.materials} THEN RAISE EXCEPTION 'vocab load: % materials, expected ${expected.materials}', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.project_categories;
  IF v_count <> ${expected.categories} THEN RAISE EXCEPTION 'vocab load: % categories, expected ${expected.categories}', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.projects WHERE parent_project_id IS NULL;
  IF v_count <> ${expected.families} THEN RAISE EXCEPTION 'vocab load: % project families, expected ${expected.families}', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.projects WHERE parent_project_id IS NULL AND public_key IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'vocab load: % project families without a key', v_count; END IF;
  SELECT count(*) INTO v_count FROM (SELECT public_key FROM public.tools UNION ALL SELECT public_key FROM public.materials) k WHERE k.public_key IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'vocab load: % library rows without a key', v_count; END IF;

  SELECT string_agg(p.name || ' -> ' || public.vocab_name_key(p.name) || ' (Toolio ' || p.name_key || ')', ', ')
    INTO v_detail FROM _vm_parity p WHERE public.vocab_name_key(p.name) IS DISTINCT FROM p.name_key;
  IF v_detail IS NOT NULL THEN RAISE EXCEPTION 'vocab load: name normalization differs from Toolio: %', v_detail; END IF;

  SELECT count(*) INTO v_count
  FROM public.operation_steps s,
       jsonb_array_elements(
         (CASE WHEN jsonb_typeof(s.tools) = 'array' THEN s.tools ELSE '[]'::jsonb END)
         || (CASE WHEN jsonb_typeof(s.materials) = 'array' THEN s.materials ELSE '[]'::jsonb END)) e
  WHERE NOT EXISTS (SELECT 1 FROM _vm_targets t WHERE t.id::text = e.value->>'library_id');
  IF v_count > 0 THEN RAISE EXCEPTION 'vocab load: % step entries without a valid library_id', v_count; END IF;

  SELECT count(*) INTO v_count
  FROM public.user_profiles u, jsonb_array_elements(CASE WHEN jsonb_typeof(u.owned_tools) = 'array' THEN u.owned_tools ELSE '[]'::jsonb END) e
  WHERE e.value->>'tool_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.id::text = e.value->>'tool_id');
  IF v_count > 0 THEN RAISE EXCEPTION 'vocab load: % owned tools point to no tool', v_count; END IF;

  SELECT string_agg(DISTINCT c, ', ') INTO v_detail
  FROM public.projects p, unnest(p.category) AS c
  WHERE NOT EXISTS (SELECT 1 FROM public.project_categories pc WHERE pc.name = c);
  IF v_detail IS NOT NULL THEN RAISE EXCEPTION 'vocab load: projects use unknown categories: %', v_detail; END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tools_public_key_unique ON public.tools (public_key);
CREATE UNIQUE INDEX IF NOT EXISTS materials_public_key_unique ON public.materials (public_key);
CREATE UNIQUE INDEX IF NOT EXISTS projects_public_key_unique ON public.projects (public_key);
CREATE UNIQUE INDEX IF NOT EXISTS tools_name_key_unique ON public.tools (name_key);
CREATE UNIQUE INDEX IF NOT EXISTS materials_name_key_unique ON public.materials (name_key);
ALTER TABLE public.tools ALTER COLUMN public_key SET NOT NULL;
ALTER TABLE public.tools ALTER COLUMN name_key SET NOT NULL;
ALTER TABLE public.materials ALTER COLUMN public_key SET NOT NULL;
ALTER TABLE public.materials ALTER COLUMN name_key SET NOT NULL;
`;

const part = (name) => readFileSync(join(SQL_DIR, name), 'utf8');
const migration = [
  '-- Project Partner and Toolio vocabulary link, phase 3 (one migration).',
  '-- Generated by scripts/vocab-merge/build-pp-load.mjs from the reviewed crosswalk; do not edit by hand.',
  `-- Export folder: ${args.archive}`,
  `-- Expected after load: ${expected.tools} tools, ${expected.materials} materials, ${expected.categories} categories, ${expected.families} project families.`,
  '-- Apply in one run. Any failed check rolls everything back.',
  '',
  'BEGIN;',
  '',
  part('pp-phase3-schema.sql'),
  '-- Toolio inventory_item_name_comparison_key, copied verbatim under a Project Partner name.',
  vocabNameKey,
  part('pp-phase3-functions.sql'),
  load,
  part('pp-phase3-triggers.sql'),
  'COMMIT;',
  '',
].join('\n');
const outPath = args.out ?? OUT;
writeFileSync(outPath, migration);
console.log(`Wrote ${outPath}`);

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
