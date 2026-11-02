#!/usr/bin/env node
/**
 * Local rehearsal of Toolio's phase 4 migration against a stand-in Toolio schema.
 *
 *   node scripts/vocab-merge/test/test-toolio-phase4.mjs --archive <export folder> --out <migration file>
 *
 * Seeds the stand-in with the export's inventory items and projects, applies the given
 * migration, then exercises change events (upsert, removal request, remove), the removal guard,
 * and a snapshot reload. Needs PostgreSQL binaries on PATH; uses the private cluster under
 * VOCAB_MERGE_ARCHIVE_DIR (port 54329). Exit code 1 on any failure.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveDir, archiveRoot, parseArgs, readPayload, tableRows } from '../lib.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const PORT = '54329';
const args = parseArgs();
if (!args.out) throw new Error('Pass --out <generated Toolio migration>');
const source = archiveDir(args.archive);
const work = join(archiveRoot(), `${args.archive}-toolio-pgtest`);
mkdirSync(work, { recursive: true });

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const catalog = readPayload(source, 'toolio-1-catalog');
const seed = [];
for (const i of tableRows(catalog, 'inventory_items')) {
  seed.push(`INSERT INTO public.inventory_items (id, sku, name, parent_inventory_item_id, product_type) VALUES (${q(i.id)}, ${q(i.sku)}, ${q(i.name)}, ${q(i.parent_inventory_item_id)}, ${q(i.product_type)});`);
}
for (const p of tableRows(catalog, 'projects')) {
  seed.push(`INSERT INTO public.projects (id, slug, name, project_kind) VALUES (${q(p.id)}, ${q(p.slug)}, ${q(p.name)}, ${q(p.project_kind)});`);
}
writeFileSync(join(work, 'seed.sql'), `${seed.join('\n')}\n`);

const cluster = join(work, 'cluster');
if (!existsSync(join(cluster, 'PG_VERSION'))) run('initdb', ['-D', cluster, '-U', 'postgres', '-A', 'trust', '--no-instructions']);
const started = spawnSync('pg_ctl', ['-D', cluster, '-o', `-p ${PORT}`, '-l', join(work, 'pg.log'), '-w', 'start'], { stdio: 'ignore' });
if (started.error || started.status !== 0) throw new Error(`pg_ctl start failed; see ${join(work, 'pg.log')}`);
let failed = false;
try {
  psql('postgres', ['-c', 'DROP DATABASE IF EXISTS toolio_p4', '-c', 'CREATE DATABASE toolio_p4']);
  psql('toolio_p4', ['-f', join(HERE, 'toolio-stub-schema.sql')]);
  psql('toolio_p4', ['-f', join(work, 'seed.sql')]);
  psql('toolio_p4', ['-f', args.out]);
  const out = psql('toolio_p4', ['-f', join(HERE, 'toolio-phase4-checks.sql')]);
  failed = /FAIL/.test(out);
} catch (error) {
  console.error(error.message);
  failed = true;
} finally {
  run('pg_ctl', ['-D', cluster, '-w', 'stop']);
}
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);

function run(cmd, cmdArgs) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  if (result.error) throw new Error(`${cmd}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function psql(db, extra) {
  const out = run('psql', ['-h', 'localhost', '-p', PORT, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', ...extra]);
  if (out.trim()) console.log(out.trim());
  return out;
}
