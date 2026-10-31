#!/usr/bin/env node
/**
 * Merge step 0: archive both databases.
 *
 *   node scripts/vocab-merge/export.mjs --print-toolio-count-sql
 *   node scripts/vocab-merge/export.mjs --dry-run
 *   node scripts/vocab-merge/export.mjs --toolio-counts <file> [--skip-dump toolio] [--skip-dump pp]
 *
 * Toolio is read as a signed-in admin (row security applies), so the export only succeeds when
 * every Toolio table's row count equals the true count from --toolio-counts: the JSON produced
 * by the --print-toolio-count-sql query, run in Toolio's SQL editor right before the export.
 *
 * Env: TOOLIO_SUPABASE_URL, TOOLIO_PUBLISHABLE_KEY, TOOLIO_ACCESS_TOKEN, PP_SUPABASE_URL,
 *      PP_SERVICE_ROLE_KEY, VOCAB_MERGE_ARCHIVE_DIR, and for each database not skipped,
 *      TOOLIO_DB_URL / PP_DB_URL with pg_dump on PATH.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

if (args.printCountSql) {
  const fields = TOOLIO_TABLES.map((spec) => `  '${spec.table}', (SELECT count(*) FROM public.${spec.table})`);
  console.log(`SELECT json_build_object(\n${fields.join(',\n')}\n)::text AS toolio_row_counts;`);
  process.exit(0);
}

for (const db of args.skipDump) {
  if (!['toolio', 'pp'].includes(db)) throw new Error(`--skip-dump takes toolio or pp, got ${db}`);
}

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

const expectedToolioCounts = readToolioCounts(args.toolioCounts);
const root = archiveRoot();
const name = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join(root, name);
const manifest = { created_at: new Date().toISOString(), pg_dump: {}, tables: [] };

for (const { db, client, tables, dbUrlEnv } of databases) {
  for (const spec of tables) {
    const rows = await fetchAll(client, spec);
    if (db === 'toolio' && rows.length !== expectedToolioCounts[spec.table]) {
      throw new Error(
        `toolio.${spec.table}: read ${rows.length} rows, true count is ${expectedToolioCounts[spec.table]}. ` +
          'Either row security hides rows from the admin login, or the table changed after the count query; re-run the count query, then the export.',
      );
    }
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

  if (args.skipDump.includes(db)) {
    manifest.pg_dump[db] = { status: 'skipped', reason: `--skip-dump ${db}` };
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

function readToolioCounts(path) {
  if (!path) throw new Error('Pass --toolio-counts <file> with the output of the --print-toolio-count-sql query');
  const full = resolve(path);
  if (!existsSync(full)) throw new Error(`--toolio-counts file not found: ${full}`);
  const counts = JSON.parse(readFileSync(full, 'utf8'));
  for (const spec of TOOLIO_TABLES) {
    if (!Number.isInteger(counts[spec.table])) throw new Error(`--toolio-counts has no count for ${spec.table}`);
  }
  return counts;
}
