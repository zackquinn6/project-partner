#!/usr/bin/env node
/**
 * Local rehearsal of Toolio's phase 5 migration on top of the phase 4 rehearsal database.
 *
 *   node scripts/vocab-merge/test/test-toolio-phase5.mjs --archive <export folder> --out <phase 5 migration file>
 *
 * Run test-toolio-phase4.mjs first. Seeds the guided wiring (sections, items, overrides,
 * composites) from the export, applies the migration, checks automatic linking, waiting items,
 * proposal events, and that pp_vocab_project_core_ids matches the merge extract for every project.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveDir, archiveRoot, parseArgs, readPayload, tableRows } from '../lib.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const PORT = '54329';
const args = parseArgs();
if (!args.out) throw new Error('Pass --out <phase 5 Toolio migration>');
const source = archiveDir(args.archive);
const work = join(archiveRoot(), `${args.archive}-toolio-pgtest`);
const catalog = readPayload(source, 'toolio-1-catalog');

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const tables = {
  project_composite_members: ['id', 'composite_project_id', 'member_project_id', 'sort_order'],
  ordering_sections: ['id', 'project_id', 'slug', 'is_visible', 'standard_section_id'],
  section_items: ['id', 'section_id', 'inventory_item_id', 'package_type', 'is_sales_item', 'is_visible'],
  standard_section_items: ['id', 'standard_section_id', 'inventory_item_id', 'package_type', 'is_sales_item', 'is_visible'],
  project_section_overrides: ['id', 'project_id', 'ordering_section_id', 'is_visible'],
  project_section_item_overrides: ['id', 'project_id', 'section_item_id', 'standard_section_item_id', 'is_visible', 'package_type'],
};
const seed = [`TRUNCATE ${Object.keys(tables).map((t) => `public.${t}`).join(', ')};`];
seed.push(...tableRows(catalog, 'projects').map((p) =>
  `UPDATE public.projects SET content_foundation_project_id = ${q(p.content_foundation_project_id)} WHERE id = ${q(p.id)};`));
for (const [table, columns] of Object.entries(tables)) {
  for (const row of tableRows(catalog, table)) {
    seed.push(`INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${columns.map((c) => q(row[c])).join(', ')});`);
  }
}
writeFileSync(join(work, 'seed-phase5.sql'), `${seed.join('\n')}\n`);

const cluster = join(work, 'cluster');
const started = spawnSync('pg_ctl', ['-D', cluster, '-o', `-p ${PORT}`, '-l', join(work, 'pg.log'), '-w', 'start'], { stdio: 'ignore' });
if (started.error || started.status !== 0) throw new Error(`pg_ctl start failed; see ${join(work, 'pg.log')}`);
let failed = false;
try {
  psql(['-f', join(work, 'seed-phase5.sql')]);
  psql(['-f', args.out]);
  psql(['-f', args.out]);
  const out = psql(['-f', join(HERE, 'toolio-phase5-checks.sql')]);
  failed = /FAIL/.test(out);

  const extract = JSON.parse(readFileSync(join(source, 'extract', 'toolio_projects.json'), 'utf8'));
  let mismatches = 0;
  for (const project of extract) {
    const expected = new Set(project.lines.filter((l) => l.visible).map((l) => l.core_id));
    const actual = new Set(psql(['-At', '-c', `SELECT core_id FROM public.pp_vocab_project_core_ids('${project.id}')`]).split(/\r?\n/).filter(Boolean));
    const same = expected.size === actual.size && [...expected].every((id) => actual.has(id));
    if (!same) {
      mismatches += 1;
      console.log(`FAIL coverage cores differ for ${project.slug}: extract ${expected.size}, SQL ${actual.size}`);
    }
  }
  console.log(mismatches === 0 ? `PASS project core lists match the extract for all ${extract.length} projects` : `FAIL ${mismatches} projects differ`);
  failed = failed || mismatches > 0;
} catch (error) {
  console.error(error.message);
  failed = true;
} finally {
  spawnSync('pg_ctl', ['-D', cluster, '-w', 'stop'], { stdio: 'ignore' });
}
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);

function psql(extra) {
  const result = spawnSync('psql', ['-h', 'localhost', '-p', PORT, '-U', 'postgres', '-d', 'toolio_p4', '-v', 'ON_ERROR_STOP=1', '-q', ...extra], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`psql failed:\n${result.stdout}\n${result.stderr}`);
  if (!extra.includes('-At') && result.stdout.trim()) console.log(result.stdout.trim());
  return result.stdout;
}
