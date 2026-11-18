import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2];
let text = readFileSync(path, 'utf8').trim();
if (text.startsWith('payload')) {
  text = text.replace(/^payload\s*\r?\n/, '').trim();
}
if (text.startsWith('"') && text.endsWith('"')) {
  text = text.slice(1, -1).replace(/""/g, '"');
}
const parsed = JSON.parse(text);
const p = parsed.payload ?? parsed;
const waiting = p.waiting_variants ?? [];
const byParent = {};
for (const v of waiting) {
  byParent[v.parent_key] = (byParent[v.parent_key] ?? 0) + 1;
}
const summary = {
  status: p.status,
  linked_variants: p.linked_variants,
  pending_variants: p.pending_variants,
  mirrored_variations: p.mirrored_variations,
  waiting_variants_count: waiting.length,
  waiting_by_parent: byParent,
  sample_waiting: waiting.slice(0, 10),
};
writeFileSync(path.replace(/\.csv$/i, '') + '-summary.json', JSON.stringify(summary, null, 2));
if (waiting.length) {
  writeFileSync(
    path.replace(/\.csv$/i, '') + '-propose-body.json',
    JSON.stringify(
      waiting.map((v) => ({
        action: 'propose_term',
        entity: v.entity,
        key: v.key,
        name: v.name,
        description: v.description,
        toolio_item_kind: v.toolio_item_kind,
        toolio_item_id: v.toolio_item_id,
        parent_key: v.parent_key,
        requested_by: 'phase6-backfill@toolio',
      })),
      null,
      2,
    ),
  );
}
console.log(JSON.stringify(summary, null, 2));
