#!/usr/bin/env node
/**
 * Merge step 2: propose the crosswalk from extract output.
 *
 *   node scripts/vocab-merge/match.mjs --archive <export folder> [--carry <reviewed.csv>] [--dry-run]
 *
 * Entities: tool and material (Toolio cores vs Project Partner library), project (Toolio guided
 * projects vs Project Partner families), category (Toolio catalog groupings vs Project Partner
 * project categories), reference (Project Partner references that resolve to no library row).
 *
 * --carry reads a reviewed crosswalk or review workbook:
 *   - decision, canonical_key, canonical_name carry onto rows with the same identity and action;
 *   - pair_with on an unmatched row names the other app's item (name, key, or id) to pair with;
 *   - pair_with "-" on a matched row breaks that pairing;
 *   - rows with match_tier "reviewed" keep their pairing, and unpaired_from (ids of the other
 *     app's items, space-separated) keeps every break.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CROSSWALK_COLUMNS, archiveDir, kebabKey, parseArgs, readCsv, readJson, writeCsv, writeJson } from './lib.mjs';

const FUZZY_MIN = 0.5;
const FUZZY_LIMIT = 3;
const KEY_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const args = parseArgs();
const dir = archiveDir(args.archive);
const extract = (name) => readJson(join(dir, 'extract', `${name}.json`));
const cores = extract('toolio_cores');
const toolioProjects = extract('toolio_projects');
const families = extract('pp_families').map((f) => ({ ...f, id: f.root_id }));
const categories = extract('pp_categories');
const library = extract('pp_library');
const references = extract('pp_references');

const familyById = new Map(families.map((f) => [f.id, f]));
const toolioProjectById = new Map(toolioProjects.map((p) => [p.id, p]));

/** Each group pairs Toolio items (left) with Project Partner items (right). */
const GROUPS = {
  term: {
    lefts: cores,
    rights: library,
    leftKey: (c) => c.sku,
    leftEntity: (c) => c.entity,
    rightEntity: (e) => e.entity,
    alias: (c, e) =>
      e.alternate_keys.includes(c.name_key) ||
      e.variations.some((v) => v.name_key === c.name_key) ||
      c.discovery_tag_keys.includes(e.name_key),
  },
  project: {
    lefts: toolioProjects.filter((p) => !p.is_grouping),
    rights: families,
    leftKey: (p) => p.slug,
    leftEntity: () => 'project',
    rightEntity: () => 'project',
    alias: (p, f) => f.revision_name_keys.includes(p.name_key) || (f.name_key !== null && p.discovery_tag_keys.includes(f.name_key)),
  },
  category: {
    lefts: toolioProjects.filter((p) => p.is_grouping),
    rights: categories,
    leftKey: (p) => p.slug,
    leftEntity: () => 'category',
    rightEntity: () => 'category',
    /** Grouping search tags name the rooms a grouping serves (Kitchen, Bathroom), not the category itself. */
    alias: () => false,
  },
};
const groupOfEntity = { tool: 'term', material: 'term', project: 'project', category: 'category' };

// ---------- Reviewed pairings and breaks from the carry file ----------

const carryRows = args.carry ? loadCarry(args.carry) : [];
const reviewedPairs = { term: [], project: [], category: [] };
const blocks = new Map();
const block = (group, leftId, rightId) => blocks.set(`${group}|${leftId}|${rightId}`, { group, leftId, rightId });
for (const row of carryRows) {
  const group = groupOfEntity[row.entity];
  if (!group) continue;
  const pairWith = (row.pair_with ?? '').trim();
  if (row.match_tier === 'reviewed' && row.toolio_id && row.pp_id && pairWith !== '-') {
    reviewedPairs[group].push({ leftId: row.toolio_id, rightId: row.pp_id });
  }
  for (const otherId of (row.unpaired_from ?? '').split(/\s+/).filter(Boolean)) {
    if (row.toolio_id) block(group, row.toolio_id, otherId);
    else block(group, otherId, row.pp_id);
  }
  if (pairWith === '-') {
    if (!row.toolio_id || !row.pp_id) throw new Error(`pair_with "-" on ${row.entity} ${row.toolio_name || row.pp_name}: only a matched row can be unpaired`);
    block(group, row.toolio_id, row.pp_id);
  } else if (pairWith) {
    reviewedPairs[group].push(resolvePairWith(group, row, pairWith));
  }
}

// ---------- Edges and rows per group ----------

const rows = [];
const libraryKeyById = new Map();
const familyByToolioProject = new Map();
for (const [name, group] of Object.entries(GROUPS)) {
  const edges = [];
  const seen = new Set();
  const addEdge = (left, right, tier) => {
    const id = `${name}|${left.id}|${right.id}`;
    if (blocks.has(id) || seen.has(id)) return;
    seen.add(id);
    edges.push({ left, right, tier });
  };
  const leftById = new Map(group.lefts.map((l) => [l.id, l]));
  const rightById = new Map(group.rights.map((r) => [r.id, r]));
  for (const pair of reviewedPairs[name]) {
    const left = leftById.get(pair.leftId);
    const right = rightById.get(pair.rightId);
    if (!left || !right) throw new Error(`Reviewed ${name} pairing ${pair.leftId} / ${pair.rightId} refers to an item not in this export`);
    addEdge(left, right, 'reviewed');
  }
  for (const left of group.lefts) {
    for (const right of group.rights) {
      if (right.name_key !== null && right.name_key === left.name_key) addEdge(left, right, 'exact');
      else if (group.alias(left, right)) addEdge(left, right, 'alias');
    }
  }
  if (name === 'project') edges.forEach((e) => familyByToolioProject.set(e.left.id, e.right.id));
  for (const component of components(group.lefts, group.rights, edges)) rows.push(...componentRows(name, group, component));
}

// Record every break on the Toolio item's rows (else the Project Partner item's) so it survives re-runs.
for (const { group, leftId, rightId } of blocks.values()) {
  const inGroup = rows.filter((r) => groupOfEntity[r.entity] === group);
  const leftRows = inGroup.filter((r) => r.toolio_id === leftId);
  const targets = leftRows.length ? leftRows : inGroup.filter((r) => r.pp_id === rightId && !r.toolio_id);
  const otherId = leftRows.length ? rightId : leftId;
  for (const row of targets) {
    const ids = new Set((row.unpaired_from ?? '').split(/\s+/).filter(Boolean));
    ids.add(otherId);
    row.unpaired_from = [...ids].join(' ');
  }
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
    ? fuzzy(group.name_key, library.filter((e) => group.kind === 'unknown' || e.entity === group.kind), true)
    : [];
  const sameNameCore = group.name_key ? cores.find((c) => c.name_key === group.name_key) : null;
  const count = [...group.sources.values()].reduce((a, b) => a + b, 0);
  const named = Boolean(group.name_key);
  const mapTarget = sameNameCore?.sku ?? null;
  const create = named && !mapTarget && candidates.length === 0;
  rows.push({
    entity: 'reference',
    pp_id: named ? '' : group.stored_library_id,
    pp_name: named ? topName : '',
    match_tier: mapTarget ? 'exact' : candidates.length ? 'fuzzy_suggestion' : 'none',
    proposed_action: create ? 'create_library_term' : 'map_to',
    canonical_key: create ? kebabKey(topName) : mapTarget ?? '',
    canonical_name: create ? topName : sameNameCore?.name ?? '',
    notes: joinNotes(
      named ? null : 'NO NAME: stored library id points to no library row',
      `kind=${group.kind}`,
      `count=${count}`,
      `resolution=${[...group.resolutions].join('/')}`,
      `sources=${[...group.sources].map(([s, n]) => `${s}:${n}`).join(' ')}`,
      group.names.size > 1 ? `spellings=${[...group.names.keys()].join(' | ')}` : null,
      mapTarget ? `Toolio core ${sameNameCore.name} [${mapTarget}] has this name` : null,
      candidates.length
        ? `suggest=${candidates.map((c) => `${c.entry.name} [${libraryKeyById.get(c.entry.id) || 'key undecided'}]`).join(' | ')}`
        : null,
    ),
    decision: '',
  });
}

// ---------- Carry reviewed decisions ----------

let carried = 0;
if (carryRows.length) {
  const previous = new Map(carryRows.map((row) => [identity(row), row]));
  for (const row of rows) {
    const prior = previous.get(identity(row));
    if (!prior) continue;
    if (!prior.decision || prior.proposed_action !== row.proposed_action) continue;
    row.decision = prior.decision;
    row.canonical_key = prior.canonical_key;
    row.canonical_name = prior.canonical_name;
    carried += 1;
  }
}

// ---------- Key checks on the final keys ----------

/** Who a key belongs to: one_to_many rows share their Project Partner term; other rows their Toolio item. */
function keyOwner(row) {
  if (row.entity === 'reference') return `reference:${row.pp_name}`;
  const group = groupOfEntity[row.entity];
  if (row.proposed_action === 'one_to_many') return `${group}:pp:${row.pp_id}`;
  return row.toolio_id ? `${group}:toolio:${row.toolio_id}` : `${group}:pp:${row.pp_id}`;
}

const keyOwners = new Map();
for (const row of rows) {
  if (!row.canonical_key || row.proposed_action === 'map_to') continue;
  if (!keyOwners.has(row.canonical_key)) keyOwners.set(row.canonical_key, new Set());
  keyOwners.get(row.canonical_key).add(keyOwner(row));
}
for (const row of rows) {
  const owners = keyOwners.get(row.canonical_key);
  if (owners && owners.size > 1 && row.proposed_action !== 'map_to') {
    row.notes = appendNote(row.notes, `KEY CLASH: ${row.canonical_key} also proposed for ${[...owners].join(', ')}`);
    row.decision = '';
  }
  if (row.canonical_key && !KEY_FORMAT.test(row.canonical_key)) {
    row.notes = appendNote(row.notes, `BAD KEY: ${row.canonical_key} is not lowercase kebab-case`);
    row.decision = '';
  }
}

// ---------- Write ----------

const summary = {
  rows: rows.length,
  by_entity_and_action: countBy(rows, (r) => `${r.entity}:${r.proposed_action}`),
  decided: rows.filter((r) => r.decision).length,
  needs_decision: rows.filter((r) => !r.decision).length,
  carried_from_review: carried,
  reviewed_pairings: rows.filter((r) => r.match_tier === 'reviewed').length,
  matched: rows.filter((r) => ['merge', 'merge_many', 'one_to_many'].includes(r.proposed_action)).length,
  toolio_new_in_pp: rows.filter((r) => r.proposed_action === 'create_in_pp').length,
  pp_only: rows.filter((r) => r.proposed_action === 'keep_pp').length,
  conflicts: rows.filter((r) => /KEY CLASH|BAD KEY|NO KEY|NO NAME|many-to-many|ENTITY DIFFERS|STRUCTURE DIFFERS|NO CURRENT REVISION/.test(r.notes ?? '')).length,
  unresolved_reference_groups: unresolved.size,
  unresolved_references: references.filter((r) => UNRESOLVED.includes(r.resolved_by)).reduce((sum, r) => sum + r.count, 0),
  unnamed_references: references.filter((r) => r.resolved_by === 'unnamed').reduce((sum, r) => sum + r.count, 0),
};

if (args.dryRun) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const order = { category: 0, project: 1, tool: 2, material: 3, reference: 4 };
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

function componentRows(groupName, group, { lefts, rights, edges }) {
  if (edges.length === 0 && lefts.length === 1) return [toolioOnlyRow(groupName, group, lefts[0])];
  if (edges.length === 0 && rights.length === 1) return [ppOnlyRow(groupName, group, rights[0])];

  const action = lefts.length === 1 && rights.length === 1 ? 'merge' : lefts.length === 1 ? 'merge_many' : 'one_to_many';
  const manyToMany = lefts.length > 1 && rights.length > 1;
  return edges.map((edge) => {
    const left = edge.left;
    const right = edge.right;
    const entity = group.leftEntity(left);
    const entityDiffers = entity !== group.rightEntity(right);
    const leftKey = group.leftKey(left);
    const key = action === 'one_to_many' ? '' : leftKey ?? '';
    if (groupName === 'term' && key) libraryKeyById.set(right.id, key);
    const termName = groupName === 'term' ? left.name : right.name ?? left.name;
    const autoAccept = action === 'merge' && !entityDiffers && leftKey && (edge.tier === 'reviewed' || (groupName === 'term' && edge.tier === 'exact'));
    return {
      entity,
      toolio_id: left.id,
      toolio_key: leftKey ?? '',
      toolio_name: left.name,
      pp_id: right.id,
      pp_name: rightName(groupName, right),
      match_tier: edge.tier,
      proposed_action: action,
      canonical_key: key,
      canonical_name: action === 'one_to_many' ? '' : termName,
      pair_with: '',
      notes: joinNotes(
        leftKey ? null : 'NO KEY: Toolio item has no key',
        entityDiffers ? `ENTITY DIFFERS: Toolio ${entity}, Project Partner ${group.rightEntity(right)}` : null,
        action === 'one_to_many' ? `toolio=${lefts.map((l) => group.leftKey(l)).join(' | ')}` : null,
        action === 'merge_many' ? `synonyms=${rights.map((r) => rightName(groupName, r)).join(' | ')}` : null,
        manyToMany ? 'many-to-many component' : null,
        groupName === 'project' ? projectNotes(left) : null,
        groupName === 'project' ? structureNote(left, right) : null,
        groupName === 'project' ? familyNotes(right) : null,
        groupName === 'category' ? groupingNotes(left) : null,
      ),
      decision: autoAccept ? 'merge' : '',
    };
  });
}

function toolioOnlyRow(groupName, group, left) {
  const suggestions = fuzzy(left.name_key, group.rights.filter((r) => r.name_key));
  const key = group.leftKey(left);
  return {
    entity: group.leftEntity(left),
    toolio_id: left.id,
    toolio_key: key ?? '',
    toolio_name: left.name,
    match_tier: suggestions.length ? 'fuzzy_suggestion' : 'none',
    proposed_action: 'create_in_pp',
    canonical_key: key ?? '',
    canonical_name: left.name,
    pair_with: '',
    notes: joinNotes(
      key ? null : 'NO KEY: Toolio item has no key',
      groupName === 'project' ? projectNotes(left) : null,
      groupName === 'category' ? groupingNotes(left) : null,
      suggestions.length ? `suggest=${suggestions.map((s) => `${rightName(groupName, s.entry)} (${s.score})`).join(' | ')}` : null,
    ),
    decision: '',
  };
}

function ppOnlyRow(groupName, group, right) {
  const suggestions = fuzzy(right.name_key ?? '', group.lefts);
  const key = right.name ? kebabKey(right.name) : '';
  if (groupName === 'term') libraryKeyById.set(right.id, key);
  return {
    entity: group.rightEntity(right),
    pp_id: right.id,
    pp_name: rightName(groupName, right),
    match_tier: suggestions.length ? 'fuzzy_suggestion' : 'none',
    proposed_action: 'keep_pp',
    canonical_key: key,
    canonical_name: right.name ?? '',
    pair_with: '',
    notes: joinNotes(
      groupName === 'project' ? familyNotes(right) : null,
      groupName === 'category' ? `families=${right.family_ids.map((id) => familyById.get(id)?.name).join(' | ')}` : null,
      suggestions.length ? `suggest=${suggestions.map((s) => `${s.entry.name} [${group.leftKey(s.entry)}] (${s.score})`).join(' | ')}` : null,
    ),
    decision: groupName === 'term' && suggestions.length === 0 ? 'keep_pp' : '',
  };
}

function rightName(groupName, right) {
  if (groupName === 'project') return right.name ?? right.revision_names.join(' | ');
  return right.name;
}

function projectNotes(project) {
  return joinNotes(
    `status=${project.catalog_visibility}`,
    `visible_lines=${project.lines.filter((l) => l.visible).length}`,
    project.content_foundation_project_id ? `variant_of=${toolioProjectById.get(project.content_foundation_project_id)?.slug}` : null,
  );
}

function groupingNotes(project) {
  return `groups=${project.catalog_child_ids.map((id) => toolioProjectById.get(id)?.slug).join(' | ')}`;
}

function familyNotes(family) {
  return joinNotes(
    family.current_source === 'none' ? `NO CURRENT REVISION: statuses ${family.revision_statuses.join('/')}` : `pp_status=${family.publish_status}`,
    family.is_standard ? 'is_standard' : null,
    family.is_foundational ? 'is_foundational' : null,
    family.category?.length ? `pp_categories=${family.category.join(' | ')}` : null,
  );
}

/** Compares Toolio's content-foundation link with Project Partner's foundation link. */
function structureNote(project, family) {
  const toolioFoundation = project.content_foundation_project_id;
  if (!toolioFoundation && !family.foundation_root_id) return null;
  const pairedFamily = familyByToolioProject.get(toolioFoundation) ?? null;
  if (pairedFamily && pairedFamily === family.foundation_root_id) return 'structure agrees';
  return `STRUCTURE DIFFERS: Toolio foundation ${toolioProjectById.get(toolioFoundation)?.slug ?? 'none'}, Project Partner foundation ${familyById.get(family.foundation_root_id)?.name ?? 'none'}`;
}

// ---------- Carry helpers ----------

function loadCarry(path) {
  const full = resolve(path);
  if (!existsSync(full)) throw new Error(`--carry file not found: ${full}`);
  return readCsv(full);
}

/** pair_with names the other app's item by exact name, key, or id (case and punctuation ignored). */
function resolvePairWith(groupName, row, value) {
  const group = GROUPS[groupName];
  const wanted = kebabKey(value);
  if (row.toolio_id && !row.pp_id) {
    const hits = group.rights.filter((r) => r.id === value || (r.name && kebabKey(r.name) === wanted) || (groupName === 'project' && r.revision_names.some((n) => kebabKey(n) === wanted)));
    if (hits.length !== 1) throw new Error(`pair_with "${value}" on ${row.entity} ${row.toolio_name}: ${hits.length} Project Partner matches`);
    return { leftId: row.toolio_id, rightId: hits[0].id };
  }
  if (row.pp_id && !row.toolio_id) {
    const hits = group.lefts.filter((l) => l.id === value || kebabKey(l.name) === wanted || (group.leftKey(l) && kebabKey(group.leftKey(l)) === wanted));
    if (hits.length !== 1) throw new Error(`pair_with "${value}" on ${row.entity} ${row.pp_name}: ${hits.length} Toolio matches`);
    return { leftId: hits[0].id, rightId: row.pp_id };
  }
  throw new Error(`pair_with "${value}" on an already matched ${row.entity} row; use "-" to unpair it first`);
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
function fuzzy(nameKey, candidates, includeExact = false) {
  const mine = tokens(nameKey);
  if (mine.size === 0) return [];
  return candidates
    .map((entry) => {
      const theirs = tokens(entry.name_key);
      const shared = [...mine].filter((t) => theirs.has(t)).length;
      const score = shared / new Set([...mine, ...theirs]).size;
      return { entry, score: Math.round(score * 100) / 100 };
    })
    .filter((s) => s.score >= FUZZY_MIN && (includeExact || s.score < 1))
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
