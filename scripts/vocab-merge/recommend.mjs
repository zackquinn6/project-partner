#!/usr/bin/env node
/**
 * Merge step 3 (prep): pre-fill the review workbook from the crosswalk.
 *
 *   node scripts/vocab-merge/recommend.mjs --archive <export folder>
 *
 * Writes vocab-review.csv: every crosswalk row with a decision filled in, plus `confidence`
 * (confident or check) and `reason`. Rows match.mjs already decided keep their decision.
 * Review the `check` rows, edit decision / canonical_name / canonical_key / pair_with where you
 * disagree, save as CSV UTF-8, then run match.mjs --carry vocab-review.csv.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { join } from 'node:path';
import { CROSSWALK_COLUMNS, archiveDir, kebabKey, parseArgs, readCsv, writeCsv } from './lib.mjs';

const REVIEW_COLUMNS = [
  'confidence',
  'entity',
  'toolio_name',
  'pp_name',
  'decision',
  'canonical_name',
  'canonical_key',
  'pair_with',
  'reason',
  ...CROSSWALK_COLUMNS.filter(
    (c) => !['entity', 'toolio_name', 'pp_name', 'decision', 'canonical_name', 'canonical_key', 'pair_with'].includes(c),
  ),
];

const args = parseArgs();
const dir = archiveDir(args.archive);
const rows = readCsv(join(dir, 'vocab-crosswalk.csv'));

const usedKeys = new Set(rows.map((r) => r.canonical_key).filter(Boolean));
const termKeyByName = new Map();
for (const row of rows) {
  if (['tool', 'material'].includes(row.entity) && row.pp_name && row.canonical_key) {
    termKeyByName.set(kebabKey(row.pp_name), row.canonical_key);
  }
}

// One key and name per one_to_many component (all rows sharing a Project Partner item).
const oneToMany = new Map();
for (const row of rows.filter((r) => r.proposed_action === 'one_to_many' && !r.decision)) {
  if (!oneToMany.has(row.pp_id)) oneToMany.set(row.pp_id, []);
  oneToMany.get(row.pp_id).push(row);
}
for (const group of oneToMany.values()) {
  const sameName = group.find((r) => kebabKey(r.toolio_name) === kebabKey(r.pp_name));
  const key = sameName ? sameName.toolio_key : kebabKey(group[0].pp_name);
  for (const row of group) {
    row.canonical_key = key;
    row.canonical_name = group[0].pp_name;
  }
}

for (const row of rows) Object.assign(row, recommend(row));

const order = { check: 0, confident: 1 };
rows.sort((a, b) => order[a.confidence] - order[b.confidence]);
writeCsv(join(dir, 'vocab-review.csv'), REVIEW_COLUMNS, rows);

const counts = {};
for (const row of rows) counts[`${row.confidence}:${row.entity}`] = (counts[`${row.confidence}:${row.entity}`] ?? 0) + 1;
console.log(JSON.stringify(counts, null, 2));
console.log(`Review workbook: ${join(dir, 'vocab-review.csv')}`);

function recommend(row) {
  const notes = row.notes ?? '';
  const suggest = /suggest=([^;]+)/.exec(notes)?.[1];
  const flags = /KEY CLASH|NO KEY|NO NAME|many-to-many|STRUCTURE DIFFERS|NO CURRENT REVISION/.exec(notes)?.[0];

  if (row.decision && row.canonical_name && ![row.toolio_name, row.pp_name].includes(row.canonical_name)) {
    return {
      confidence: 'check',
      reason: `New name "${row.canonical_name}" (Toolio: "${row.toolio_name || '-'}", Project Partner: "${row.pp_name || '-'}"). Confirm or edit canonical_name.`,
    };
  }
  if (row.decision) {
    return { confidence: 'confident', reason: decidedReason(row) };
  }

  if (row.entity === 'project' || row.entity === 'category') return groupRecommendation(row, suggest, flags);
  if (row.entity === 'reference') return referenceRecommendation(row, notes);

  if (/BAD KEY/.test(notes)) {
    const proposed = freeKey(kebabKey(row.toolio_name || row.pp_name));
    return {
      decision: row.proposed_action,
      canonical_key: proposed,
      confidence: 'check',
      reason: `Key ${row.toolio_key || row.canonical_key} is not a valid key; proposed ${proposed}. Toolio's own SKU or slug stays as it is.`,
    };
  }
  if (flags) {
    return { decision: row.proposed_action, confidence: 'check', reason: `Needs a decision: ${flags}. ${notes}` };
  }
  switch (row.proposed_action) {
    case 'create_in_pp':
      return suggest
        ? { decision: 'create_in_pp', confidence: 'check', reason: `Not in Project Partner; becomes a new term. Similar Project Partner items: ${suggest}. If one is the same item, type its name in pair_with.` }
        : { decision: 'create_in_pp', confidence: 'confident', reason: 'Not in Project Partner; becomes a new Project Partner term with Toolio\'s name.' };
    case 'keep_pp':
      return { decision: 'keep_pp', confidence: 'check', reason: `Only in Project Partner. Similar Toolio items: ${suggest}. If one is the same item, type its name in pair_with.` };
    case 'merge':
      return /ENTITY DIFFERS/.test(notes)
        ? { decision: 'merge', confidence: 'check', reason: 'Same item; Toolio and Project Partner file it under different types. The merged term keeps Project Partner\'s type and takes Toolio\'s name.' }
        : { decision: 'merge', confidence: 'check', reason: `Matched through an alternate name: Toolio "${row.toolio_name}" = Project Partner "${row.pp_name}".` };
    case 'merge_many':
      return { decision: 'merge_many', confidence: 'check', reason: `Project Partner has several entries for this Toolio item (${/synonyms=([^;]+)/.exec(notes)?.[1]}). They fold into one term with Toolio's name; the rest become alternate names. Put "-" in pair_with on any that is a different item.` };
    case 'one_to_many':
      return { decision: 'one_to_many', confidence: 'check', reason: `Several Toolio items match one Project Partner term (${/toolio=([^;]+)/.exec(notes)?.[1]}). All link to "${row.canonical_name}". If a Toolio item is a different tool, put "-" in pair_with on its row to give it its own term.` };
    default:
      return { decision: row.proposed_action, confidence: 'check', reason: notes };
  }
}

function groupRecommendation(row, suggest, flags) {
  const label = row.entity;
  if (/BAD KEY/.test(row.notes)) {
    const proposed = freeKey(kebabKey(row.toolio_name || row.pp_name));
    return {
      decision: row.proposed_action,
      canonical_key: proposed,
      confidence: 'check',
      reason: `Key ${row.toolio_key} is not a valid key; proposed ${proposed}.${suggest ? ` Similar Project Partner ${plural(label)}: ${suggest}; type one in pair_with if it is the same.` : ''}`,
    };
  }
  switch (row.proposed_action) {
    case 'merge':
      return {
        decision: 'merge',
        confidence: 'check',
        reason: `Same ${label}. Name: Project Partner "${row.pp_name}" is filled in; change canonical_name to keep Toolio's "${row.toolio_name}" or use a new name.${flags ? ` ${flags}.` : ''}`,
      };
    case 'create_in_pp':
      return {
        decision: 'create_in_pp',
        confidence: 'check',
        reason: suggest
          ? `No exact Project Partner ${label}. Likely the same: ${suggest}. Type the Project Partner name in pair_with to pair them, or leave it to create a new ${label}.`
          : `No Project Partner ${label}; becomes a new Project Partner ${label} named "${row.toolio_name}".`,
      };
    case 'keep_pp':
      return {
        decision: 'keep_pp',
        confidence: suggest || flags ? 'check' : 'confident',
        reason: suggest
          ? `Only in Project Partner. Similar Toolio ${plural(label)}: ${suggest}; type one in pair_with if it is the same.`
          : `Only in Project Partner; stays there and is mirrored to Toolio.${flags ? ` ${flags}.` : ''}`,
      };
    default:
      return { decision: row.proposed_action, confidence: 'check', reason: `${row.proposed_action}: ${row.notes}` };
  }
}

function referenceRecommendation(row, notes) {
  if (row.proposed_action === 'map_to' && row.canonical_key) {
    return { decision: 'map_to', confidence: 'check', reason: `Library entry is gone; references map to the term ${row.canonical_key} (same name). ${notes}` };
  }
  const existing = row.pp_name ? termKeyByName.get(kebabKey(row.pp_name)) : null;
  if (existing) {
    return { decision: 'map_to', canonical_key: existing, confidence: 'check', reason: `Duplicate library entries with this name fold into ${existing}; references map there. ${notes}` };
  }
  return { decision: row.proposed_action, confidence: 'check', reason: notes };
}

function decidedReason(row) {
  if (row.match_tier === 'reviewed') return 'Paired in review.';
  if (row.proposed_action === 'merge') return 'Same name in both apps.';
  if (row.proposed_action === 'keep_pp') return 'Only in Project Partner; nothing similar in Toolio.';
  return 'Decided in an earlier review.';
}

function plural(label) {
  return label === 'category' ? 'categories' : `${label}s`;
}

function freeKey(base) {
  let key = base;
  for (let n = 2; usedKeys.has(key); n += 1) key = `${base}-${n}`;
  usedKeys.add(key);
  return key;
}
