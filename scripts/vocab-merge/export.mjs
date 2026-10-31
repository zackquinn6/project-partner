#!/usr/bin/env node
/**
 * Merge step 0: archive both databases.
 *
 *   node scripts/vocab-merge/export.mjs [--dry-run] [--json-only]
 *
 * Env: TOOLIO_SUPABASE_URL, TOOLIO_SERVICE_ROLE_KEY, PP_SUPABASE_URL, PP_SERVICE_ROLE_KEY,
 *      VOCAB_MERGE_ARCHIVE_DIR, and (unless --json-only) TOOLIO_DB_URL, PP_DB_URL with
 *      pg_dump on PATH.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  archiveRoot,
  fetchAll,
  liveCount,
  parseArgs,
  ppClient,
  requireEnv,
  rowHash,
  sha256,
  toolioClient,
  writeJson,
} from './lib.mjs';
import { PP_TABLES, TOOLIO_TABLES } from './tables.mjs';

const args = parseArgs();
const databases = [
  { db: 'toolio', client: toolioClient(), tables: TOOLIO_TABLES, dbUrlEnv: 'TOOLIO_DB_URL' },
  { db: 'pp', client: ppClient(), tables: PP_TABLES, dbUrlEnv: 'PP_DB_URL' },
];

if (args.dryRun) {
  for (const { db, client, tables } of databases) {
    for (const spec of tables) {
      console.log(`${db}.${spec.table}: ${await liveCount(client, spec.table)} rows`);
    }
  }
  process.exit(0);
}

const root = archiveRoot();
const name = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join(root, name);
const manifest = { created_at: new Date().toISOString(), pg_dump: {}, tables: [] };

for (const { db, client, tables, dbUrlEnv } of databases) {
  for (const spec of tables) {
    const rows = await fetchAll(client, spec);
    const rowHashes = Object.fromEntries(rows.map((row) => [row[spec.pk], rowHash(row)]));
    const file = join(dir, db, `${spec.table}.json`);
    writeJson(file, { table: spec.table, pk: spec.pk, select: spec.select, row_count: rows.length, rows, row_hashes: rowHashes });
    manifest.tables.push({
      db,
      table: spec.table,
      pk: spec.pk,
      row_count: rows.length,
      file_sha256: sha256(readFileSync(file)),
    });
    console.log(`${db}.${spec.table}: ${rows.length} rows`);
  }

  if (args.jsonOnly) {
    manifest.pg_dump[db] = { status: 'skipped', reason: '--json-only' };
    continue;
  }
  const dumpFile = join(dir, `${db}.dump`);
  const result = spawnSync(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-privileges', `--file=${dumpFile}`, requireEnv(dbUrlEnv)],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (result.error) throw new Error(`pg_dump ${db}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`pg_dump ${db} exited with ${result.status}`);
  manifest.pg_dump[db] = { status: 'ok', file: `${db}.dump`, file_sha256: sha256(readFileSync(dumpFile)) };
  console.log(`${db}: pg_dump written`);
}

writeJson(join(dir, 'manifest.json'), manifest);
console.log(`Archive: ${dir}`);
console.log(`Next: node scripts/vocab-merge/extract.mjs --archive ${name}`);
