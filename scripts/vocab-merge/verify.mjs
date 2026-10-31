#!/usr/bin/env node
/**
 * Merge step 6: accounting checks against an export archive.
 *
 *   node scripts/vocab-merge/verify.mjs --archive <export folder> [--check <name>]...
 *
 * Checks (all run when no --check is given):
 *   archive          files match the manifest; row counts and per-row hashes recompute
 *   toolio-content   archived Toolio catalog and project rows are unchanged live
 *   toolio-orders    past-order project slugs and line inventory ids still resolve live
 *
 * Exit code 1 when any check fails.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR, plus TOOLIO_SUPABASE_URL and TOOLIO_SERVICE_ROLE_KEY for the
 *      toolio-* checks.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveDir, fetchAll, parseArgs, readJson, rowHash, sha256, toolioClient } from './lib.mjs';
import { TOOLIO_CONTENT_IGNORED_COLUMNS, TOOLIO_CONTENT_TABLES, TOOLIO_TABLES } from './tables.mjs';

const CHECKS = { archive: checkArchive, 'toolio-content': checkToolioContent, 'toolio-orders': checkToolioOrders };

const args = parseArgs();
const dir = archiveDir(args);
const manifest = readJson(join(dir, 'manifest.json'));
const selected = args.check.length ? args.check : Object.keys(CHECKS);
for (const name of selected) {
  if (!CHECKS[name]) throw new Error(`Unknown check ${name}. Known: ${Object.keys(CHECKS).join(', ')}`);
}

let failed = false;
for (const name of selected) {
  const problems = await CHECKS[name]();
  if (problems.length === 0) {
    console.log(`PASS ${name}`);
  } else {
    failed = true;
    console.log(`FAIL ${name} (${problems.length})`);
    problems.forEach((p) => console.log(`  - ${p}`));
  }
}
process.exit(failed ? 1 : 0);

async function checkArchive() {
  const problems = [];
  for (const entry of manifest.tables) {
    const path = join(dir, entry.db, `${entry.table}.json`);
    const raw = readFileSync(path);
    if (sha256(raw) !== entry.file_sha256) problems.push(`${entry.db}.${entry.table}: file hash differs from manifest`);
    const file = JSON.parse(raw);
    if (file.rows.length !== entry.row_count) problems.push(`${entry.db}.${entry.table}: ${file.rows.length} rows, manifest says ${entry.row_count}`);
    for (const row of file.rows) {
      if (rowHash(row) !== file.row_hashes[row[entry.pk]]) {
        problems.push(`${entry.db}.${entry.table}: row ${row[entry.pk]} hash mismatch`);
      }
    }
  }
  for (const [db, dump] of Object.entries(manifest.pg_dump)) {
    if (dump.status !== 'ok') {
      problems.push(`${db}: no pg_dump (${dump.reason}); phase 3 and 4 rehearsals need it`);
      continue;
    }
    if (sha256(readFileSync(join(dir, dump.file))) !== dump.file_sha256) problems.push(`${db}: pg_dump file hash differs from manifest`);
  }
  return problems;
}

async function checkToolioContent() {
  const client = toolioClient();
  const problems = [];
  for (const table of TOOLIO_CONTENT_TABLES) {
    const spec = TOOLIO_TABLES.find((s) => s.table === table);
    const archived = readJson(join(dir, 'toolio', `${table}.json`)).rows;
    const live = new Map((await fetchAll(client, spec)).map((row) => [row[spec.pk], row]));
    for (const row of archived) {
      const current = live.get(row[spec.pk]);
      if (!current) {
        problems.push(`${table}: ${row[spec.pk]} was removed`);
        continue;
      }
      const archivedColumns = Object.fromEntries(Object.keys(row).map((c) => [c, current[c]]));
      if (rowHash(row, TOOLIO_CONTENT_IGNORED_COLUMNS) !== rowHash(archivedColumns, TOOLIO_CONTENT_IGNORED_COLUMNS)) {
        const changed = Object.keys(row).filter(
          (c) => !TOOLIO_CONTENT_IGNORED_COLUMNS.includes(c) && JSON.stringify(row[c]) !== JSON.stringify(current[c]),
        );
        problems.push(`${table}: ${row[spec.pk]} changed (${changed.join(', ')})`);
      }
    }
  }
  return problems;
}

async function checkToolioOrders() {
  const client = toolioClient();
  const spec = (table) => TOOLIO_TABLES.find((s) => s.table === table);
  const archivedUnresolved = unresolvedOrderRefs(
    readJson(join(dir, 'toolio', 'orders.json')).rows,
    readJson(join(dir, 'toolio', 'order_line_pricing.json')).rows,
    readJson(join(dir, 'toolio', 'projects.json')).rows,
    readJson(join(dir, 'toolio', 'inventory_items.json')).rows,
  );
  const liveUnresolved = unresolvedOrderRefs(
    await fetchAll(client, spec('orders')),
    await fetchAll(client, spec('order_line_pricing')),
    await fetchAll(client, { table: 'projects', select: 'id, slug', pk: 'id' }),
    await fetchAll(client, { table: 'inventory_items', select: 'id', pk: 'id' }),
  );
  return [...liveUnresolved].filter((ref) => !archivedUnresolved.has(ref)).map((ref) => `newly unresolved: ${ref}`);
}

function unresolvedOrderRefs(orders, lines, projects, items) {
  const slugs = new Set(projects.map((p) => p.slug));
  const itemIds = new Set(items.map((i) => i.id));
  const out = new Set();
  for (const order of orders) {
    if (order.project_slug !== null && !slugs.has(order.project_slug)) out.add(`order ${order.order_number} project_slug ${order.project_slug}`);
  }
  for (const line of lines) {
    if (line.inventory_item_id !== null && !itemIds.has(line.inventory_item_id)) {
      out.add(`order line ${line.line_id} inventory_item_id ${line.inventory_item_id}`);
    }
  }
  return out;
}
