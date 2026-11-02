#!/usr/bin/env node
/**
 * Merge step 2: propose the crosswalk from extract output.
 *
 *   node scripts/vocab-merge/match.mjs --archive <export folder> [--carry <reviewed.csv>] [--dry-run]
 *
 * --carry copies decision, canonical_key, and canonical_name from a reviewed crosswalk onto rows
 * with the same identity and the same proposed_action, so a re-run only needs new rows reviewed.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { archiveDir, kebabKey, parseArgs, readCsv, readJson, writeCsv, writeJson } from './lib.mjs';

const CROSSWALK_COLUMNS = [
  'entity',
  'toolio_id',
  'toolio_key',
  'toolio_name',
  'pp_id',
  'pp_name',
  'match_tier',
  'proposed_action',
  'canonical_key',
  'canonical_name',
  'notes',
  'decision',
];

const FUZZY_MIN = 0.5;
const FUZZY_LIMIT = 3;

const args = parseArgs();
const dir = archiveDir(args.archive);
const extract = (name) => readJson(join(dir, 'extract', `${name}.json`));
const cores = extract('toolio_cores');
const toolioProjects = extract('toolio_projects');
const families = extract('pp_families');
const library = extract('pp_library');
const references = extract('pp_references');

const rows = [];

// ---------- Terms: Toolio cores vs Project Partner tools and materials ----------

const termEdges = [];
for (const core of cores) {
  for (const entry of library) {
    if (entry.name_key === core.name_key) {
      termEdges.push({ left: core, right: entry, tier: 'exact' });
    } else if (
      entry.alternate_keys.includes(core.name_key) ||
      entry.variations.some((v) => v.name_key === core.name_key) ||
      core.discovery_tag_keys.includes(entry.name_key)
    ) {
      termEdges.push({ left: core, right: entry, tier: 'alias' });
    }
  }
}

const libraryKeyById = new Map();
for (const component of components(cores, library, termEdges)) {
  rows.push(...termRows(component));
}

// ---------- Projects: Toolio projects vs Project Partner families ----------

const familyAsRight = families.map((f) => ({ ...f, id: f.root_id }));
const projectEdges = [];
for (const project of toolioProjects) {
  for (const family of familyAsRight) {
    if (family.name_key !== null && family.name_key === project.name_key) {
      projectEdges.push({ left: project, right: family, tier: 'exact' });
    } else if (
      family.revision_name_keys.includes(project.name_key) ||
      (family.name_key !== null && project.discovery_tag_keys.includes(family.name_key))
    ) {
      projectEdges.push({ left: project, right: family, tier: 'alias' });
    }
  }
}

const familyByToolioProject = new Map();
for (const edge of projectEdges) familyByToolioProject.set(edge.left.id, edge.right.root_id);
for (const component of components(toolioProjects, familyAsRight, projectEdges)) {
  rows.push(...projectRows(component));
}

// ---------- References that resolve to no library row ----------

const UNRESOLVED = ['none', 'ambiguous', 'dangling_id'];
const unresolved = new Map();
for (const ref of references) {
  if (!UNRESOLVED.includes(ref.resolved_by)) continue;
  const groupKey = ref.name_key ? `${ref.kind}|${ref.name_key}` : `${ref.kind}|id:${ref.stored_library_id}`;
  if (!unresolved.has(groupKey)) {
    unresolved.set(groupKey, {
      kind: ref.kind,
      name_key: ref.name_key,
      stored_library_id: ref.name_key ? null : ref.stored_library_id,
      names: new Map(),
      sources: new Map(),
      resolutions: new Set(),
    });
  }
  const group = unresolved.get(groupKey);
  group.names.set(ref.name, (group.names.get(ref.name) ?? 0) + ref.count);
  group.sources.set(ref.source, (group.sources.get(ref.source) ?? 0) + ref.count);
  group.resolutions.add(ref.resolved_by);
}
for (const group of unresolved.values()) {
  const [topName] = [...group.names.entries()].sort((a, b) => b[1] - a[1])[0];
  const candidates = group.name_key
    ? fuzzy(group.name_key, library.filter((e) => group.kind === 'unknown' || e.entity === group.kind))
    : [];
  const count = [...group.sources.values()].reduce((a, b) => a + b, 0);
  const named = Boolean(group.name_key);
  const create = named && candidates.length === 0;
  rows.push({
    entity: 'reference',
    pp_id: named ? '' : group.stored_library_id,
    pp_name: named ? topName : '',
    match_tier: candidates.length ? 'fuzzy_suggestion' : 'none',
    proposed_action: create ? 'create_library_term' : 'map_to',
    canonical_key: create ? kebabKey(topName) : '',
    canonical_name: create ? topName : '',
    notes: [
      named ? null : 'NO NAME: stored library id points to no library row',
      `kind=${group.kind}`,
      `count=${count}`,
      `resolution=${[...group.resolutions].join('/')}`,
      `sources=${[...group.sources].map(([s, n]) => `${s}:${n}`).join(' ')}`,
      group.names.size > 1 ? `spellings=${[...group.names.keys()].join(' | ')}` : null,
      candidates.length
        ? `suggest=${candidates.map((c) => `${c.entry.name} [${libraryKeyById.get(c.entry.id) || 'key undecided'}]`).join(' | ')}`
        : null,
    ]
      .filter(Boolean)
      .join('; '),
    decision: '',
  });
}

// ---------- Key clashes across the shared key space ----------

const keyOwners = new Map();
for (const row of rows) {
  if (!row.canonical_key || ['map_to', 'toolio_only'].includes(row.proposed_action)) continue;
  const owner = row.entity === 'reference' ? `reference:${row.pp_name}` : `${row.entity}:${row.toolio_id || row.pp_id}`;
  if (!keyOwners.has(row.canonical_key)) keyOwners.set(row.canonical_key, new Set());
  keyOwners.get(row.canonical_key).add(owner);
}
for (const row of rows) {
  const owners = keyOwners.get(row.canonical_key);
  if (owners && owners.size > 1) {
    row.notes = appendNote(row.notes, `KEY CLASH: ${row.canonical_key} also proposed for ${[...owners].join(', ')}`);
    row.decision = '';
  }
}

// ---------- Carry reviewed decisions ----------

let carried = 0;
if (args.carry) {
  const carryPath = resolve(args.carry);
  if (!existsSync(carryPath)) throw new Error(`--carry file not found: ${carryPath}`);
  const previous = new Map(readCsv(carryPath).map((row) => [identity(row), row]));
  for (const row of rows) {
    const prior = previous.get(identity(row));
    if (!prior || !prior.decision || prior.proposed_action !== row.proposed_action) continue;
    row.decision = prior.decision;
    row.canonical_key = prior.canonical_key;
    row.canonical_name = prior.canonical_name;
    carried += 1;
  }
}

// ---------- Write ----------

const summary = {
  rows: rows.length,
  by_entity_and_action: countBy(rows, (r) => `${r.entity}:${r.proposed_action}`),
  pre_accepted: rows.filter((r) => r.decision).length,
  needs_decision: rows.filter((r) => !r.decision).length,
  carried_from_review: carried,
  matched: rows.filter((r) => ['merge', 'merge_many', 'one_to_many'].includes(r.proposed_action)).length,
  toolio_only_candidates: rows.filter((r) => r.proposed_action === 'create_in_pp').length,
  pp_only: rows.filter((r) => r.proposed_action === 'keep_pp').length,
  conflicts: rows.filter((r) => /KEY CLASH|NO KEY|NO NAME|many-to-many|ENTITY DIFFERS|STRUCTURE DIFFERS|NO CURRENT REVISION/.test(r.notes ?? '')).length,
  unresolved_reference_groups: unresolved.size,
  unresolved_references: references.filter((r) => UNRESOLVED.includes(r.resolved_by)).reduce((sum, r) => sum + r.count, 0),
  unnamed_references: references.filter((r) => r.resolved_by === 'unnamed').reduce((sum, r) => sum + r.count, 0),
};

if (args.dryRun) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const order = { project: 0, tool: 1, material: 2, reference: 3 };
rows.sort(
  (a, b) =>
    order[a.entity] - order[b.entity] ||
    String(a.canonical_key || a.toolio_key || a.pp_name).localeCompare(String(b.canonical_key || b.toolio_key || b.pp_name)),
);
writeCsv(join(dir, 'vocab-crosswalk.csv'), CROSSWALK_COLUMNS, rows);
writeJson(join(dir, 'match_summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
console.log(`Crosswalk: ${join(dir, 'vocab-crosswalk.csv')}`);

// ---------- Row builders ----------

function termRows({ lefts, rights, edges }) {
  const out = [];
  if (edges.length === 0 && lefts.length === 1) {
    const core = lefts[0];
    const suggestions = fuzzy(core.name_key, library);
    out.push({
      ...toolioSide(core),
      entity: core.entity,
      match_tier: suggestions.length ? 'fuzzy_suggestion' : 'none',
      proposed_action: 'create_in_pp',
      canonical_key: core.sku ?? '',
      canonical_name: core.name,
      notes: joinNotes(
        noKeyNote(core),
        suggestions.length ? `suggest=${suggestions.map((s) => `${s.entry.name} (${s.score})`).join(' | ')}` : null,
      ),
      decision: '',
    });
    return out;
  }
  if (edges.length === 0 && rights.length === 1) {
    const entry = rights[0];
    const suggestions = fuzzy(entry.name_key, cores);
    const key = kebabKey(entry.name);
    libraryKeyById.set(entry.id, key);
    out.push({
      entity: entry.entity,
      pp_id: entry.id,
      pp_name: entry.name,
      match_tier: suggestions.length ? 'fuzzy_suggestion' : 'none',
      proposed_action: 'keep_pp',
      canonical_key: key,
      canonical_name: entry.name,
      notes: suggestions.length ? `suggest=${suggestions.map((s) => `${s.entry.name} [${s.entry.sku}] (${s.score})`).join(' | ')}` : '',
      decision: suggestions.length ? '' : 'keep_pp',
    });
    return out;
  }

  const action =
    lefts.length === 1 && rights.length === 1 ? 'merge' : lefts.length === 1 ? 'merge_many' : 'one_to_many';
  const manyToMany = lefts.length > 1 && rights.length > 1;
  for (const edge of edges) {
    const core = edge.left;
    const entry = edge.right;
    const entityDiffers = core.entity !== entry.entity;
    const key = action === 'one_to_many' ? '' : core.sku ?? '';
    if (key) libraryKeyById.set(entry.id, key);
    out.push({
      ...toolioSide(core),
      entity: core.entity,
      pp_id: entry.id,
      pp_name: entry.name,
      match_tier: edge.tier,
      proposed_action: action,
      canonical_key: key,
      canonical_name: action === 'one_to_many' ? '' : core.name,
      notes: joinNotes(
        noKeyNote(core),
        entityDiffers ? `ENTITY DIFFERS: Toolio ${core.entity}, Project Partner ${entry.entity}` : null,
        action === 'one_to_many' ? `cores=${lefts.map((c) => c.sku).join(' | ')}` : null,
        action === 'merge_many' ? `synonyms=${rights.map((r) => r.name).join(' | ')}` : null,
        manyToMany ? 'many-to-many component' : null,
      ),
      decision: action === 'merge' && edge.tier === 'exact' && !entityDiffers && core.sku ? 'merge' : '',
    });
  }
  return out;
}

function projectRows({ lefts, rights, edges }) {
  const out = [];
  if (edges.length === 0 && lefts.length === 1) {
    const project = lefts[0];
    const suggestions = fuzzy(project.name_key, familyAsRight.filter((f) => f.name_key));
    out.push({
      entity: 'project',
      toolio_id: project.id,
      toolio_key: project.slug,
      toolio_name: project.name,
      match_tier: suggestions.length ? 'fuzzy_suggestion' : 'none',
      proposed_action: 'create_in_pp',
      canonical_key: project.slug,
      canonical_name: project.name,
      notes: joinNotes(
        `kind=${project.project_kind}`,
        `visible_lines=${project.lines.filter((l) => l.visible).length}`,
        suggestions.length ? `suggest=${suggestions.map((s) => `${s.entry.name} (${s.score})`).join(' | ')}` : null,
      ),
      decision: '',
    });
    return out;
  }
  if (edges.length === 0 && rights.length === 1) {
    const family = rights[0];
    out.push({
      entity: 'project',
      pp_id: family.root_id,
      pp_name: family.name ?? family.revision_names.join(' | '),
      match_tier: 'none',
      proposed_action: 'keep_pp',
      canonical_key: family.name ? kebabKey(family.name) : '',
      canonical_name: family.name ?? '',
      notes: familyNotes(family),
      decision: '',
    });
    return out;
  }
  const action =
    lefts.length === 1 && rights.length === 1 ? 'merge' : lefts.length === 1 ? 'merge_many' : 'one_to_many';
  for (const edge of edges) {
    const project = edge.left;
    const family = edge.right;
    out.push({
      entity: 'project',
      toolio_id: project.id,
      toolio_key: project.slug,
      toolio_name: project.name,
      pp_id: family.root_id,
      pp_name: family.name ?? family.revision_names.join(' | '),
      match_tier: edge.tier,
      proposed_action: action,
      canonical_key: action === 'one_to_many' ? '' : project.slug,
      canonical_name: action === 'one_to_many' ? '' : project.name,
      notes: joinNotes(`kind=${project.project_kind}`, structureNote(project, family), familyNotes(family)),
      decision: '',
    });
  }
  return out;
}

function toolioSide(core) {
  return { toolio_id: core.id, toolio_key: core.sku ?? '', toolio_name: core.name };
}

function noKeyNote(core) {
  return core.sku ? null : 'NO KEY: Toolio core has no sku';
}

function familyNotes(family) {
  return joinNotes(
    family.current_source === 'none' ? `NO CURRENT REVISION: statuses ${family.revision_statuses.join('/')}` : `current=${family.current_source}`,
    family.is_standard ? 'is_standard' : null,
    family.is_foundational ? 'is_foundational' : null,
    family.item_type ? `item_type=${family.item_type}` : null,
    `revisions=${family.revision_count}`,
  );
}

/** Compares Toolio's content-foundation link with Project Partner's foundation link. */
function structureNote(project, family) {
  const toolioFoundation = project.content_foundation_project_id;
  if (!toolioFoundation && !family.foundation_root_id) return null;
  const expectedFamily = toolioFoundation ? familyByToolioProject.get(toolioFoundation) ?? null : null;
  if (expectedFamily && expectedFamily === family.foundation_root_id) return 'structure agrees';
  return `STRUCTURE DIFFERS: Toolio foundation ${toolioFoundation ?? 'none'} maps to family ${expectedFamily ?? 'none'}, Project Partner foundation family ${family.foundation_root_id ?? 'none'}`;
}

// ---------- Helpers ----------

/** Connected components over match edges; unmatched items become single-item components. */
function components(lefts, rights, edges) {
  const parent = new Map();
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  const union = (a, b) => parent.set(find(a), find(b));
  lefts.forEach((l) => parent.set(`L:${l.id}`, `L:${l.id}`));
  rights.forEach((r) => parent.set(`R:${r.id}`, `R:${r.id}`));
  edges.forEach((e) => union(`L:${e.left.id}`, `R:${e.right.id}`));
  const groups = new Map();
  const add = (node, side, item) => {
    const root = find(node);
    if (!groups.has(root)) groups.set(root, { lefts: [], rights: [], edges: [] });
    groups.get(root)[side].push(item);
  };
  lefts.forEach((l) => add(`L:${l.id}`, 'lefts', l));
  rights.forEach((r) => add(`R:${r.id}`, 'rights', r));
  edges.forEach((e) => groups.get(find(`L:${e.left.id}`)).edges.push(e));
  return [...groups.values()];
}

function tokens(key) {
  return new Set(key.split(/[^a-z0-9]+/).filter(Boolean));
}

/** Token-overlap suggestions; never accepted automatically. */
function fuzzy(nameKey, candidates) {
  const mine = tokens(nameKey);
  if (mine.size === 0) return [];
  return candidates
    .map((entry) => {
      const theirs = tokens(entry.name_key);
      const shared = [...mine].filter((t) => theirs.has(t)).length;
      const score = shared / new Set([...mine, ...theirs]).size;
      return { entry, score: Math.round(score * 100) / 100 };
    })
    .filter((s) => s.score >= FUZZY_MIN && s.score < 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, FUZZY_LIMIT);
}

function identity(row) {
  return [row.entity, row.toolio_id ?? '', row.pp_id ?? '', row.entity === 'reference' ? row.pp_name : ''].join('|');
}

function joinNotes(...notes) {
  return notes.filter(Boolean).join('; ');
}

function appendNote(existing, note) {
  return existing ? `${existing}; ${note}` : note;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
