#!/usr/bin/env node
/**
 * Merge step 0: validate a hand-run export and write its manifest.
 *
 *   node scripts/vocab-merge/validate-export.mjs --archive <export folder>
 *
 * The folder (under VOCAB_MERGE_ARCHIVE_DIR) holds the saved results of the five queries in
 * scripts/vocab-merge/sql/. Each result carries its own row counts from the same statement, so
 * a truncated or partial copy fails here.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { EXPORT_QUERIES, exportDir, hashMap, parseArgs, payloadSource, readPayload, sha256, tableRows, writeJson } from './lib.mjs';

const args = parseArgs();
const dir = exportDir(args.archive);
const manifest = { validated_at: new Date().toISOString(), files: [], counts: {} };

for (const query of EXPORT_QUERIES) {
  const payload = readPayload(dir, query);
  const path = payloadSource(dir, query);
  const counts = {};
  for (const table of Object.keys(payload.tables ?? {})) counts[table] = tableRows(payload, table).length;
  for (const table of Object.keys(payload.content_hashes ?? {})) counts[`${table} fingerprints`] = Object.keys(hashMap(payload, table)).length;
  if (query === 'pp-3-references') {
    const groups = payload.references ?? [];
    const total = groups.reduce((sum, g) => sum + g.count, 0);
    if (total !== payload.counts.references) {
      throw new Error(`pp-3-references: groups add up to ${total}, count ${payload.counts.references}`);
    }
    counts.references = total;
    counts['reference groups'] = groups.length;
  }
  if (query === 'toolio-2-checks') {
    counts.orders = payload.counts.orders;
    counts.order_line_pricing = payload.counts.order_line_pricing;
    counts['unresolved order refs'] = (payload.unresolved_order_refs ?? []).length;
  }
  manifest.files.push({ query, file: basename(path), sha256: sha256(readFileSync(path)), exported_at: payload.exported_at });
  manifest.counts[query] = counts;
}

const exportedAt = manifest.files.map((f) => Date.parse(f.exported_at));
const spreadMinutes = Math.round((Math.max(...exportedAt) - Math.min(...exportedAt)) / 60000);
manifest.export_spread_minutes = spreadMinutes;

writeJson(join(dir, 'manifest.json'), manifest);
for (const [query, counts] of Object.entries(manifest.counts)) {
  console.log(query);
  for (const [name, count] of Object.entries(counts)) console.log(`  ${name}: ${count}`);
}
console.log(`Queries ran over ${spreadMinutes} minutes.`);
console.log(`Next: node scripts/vocab-merge/extract.mjs --archive ${args.archive}`);
