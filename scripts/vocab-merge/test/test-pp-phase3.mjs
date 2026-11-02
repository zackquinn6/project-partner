#!/usr/bin/env node
/**
 * Local rehearsal of the phase 3 migration against a stand-in Project Partner schema.
 *
 *   node scripts/vocab-merge/test/test-pp-phase3.mjs --archive <export folder>
 *
 * Needs PostgreSQL client and server binaries on PATH (scoop install postgresql). Uses a private
 * cluster under VOCAB_MERGE_ARCHIVE_DIR on port 54329. Seeds the stand-in with the export's
 * library and projects plus synthetic steps, project copies, a run, and owned tools built from
 * every reference group, applies the generated migration, then exercises keys, guards, and
 * two-sided removal. Exit code 1 on any failure. The real migration file is not touched.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { archiveDir, archiveRoot, parseArgs, readJson, readPayload, tableRows } from '../lib.mjs';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const PORT = '54329';
const args = parseArgs();
const source = archiveDir(args.archive);
const work = join(archiveRoot(), `${args.archive}-pgtest`);
mkdirSync(work, { recursive: true });
for (const file of readdirSync(source)) {
  if (/\.(json|csv)$/.test(file) && !file.startsWith('toolio-4-')) copyFileSync(join(source, file), join(work, file));
}
mkdirSync(join(work, 'extract'), { recursive: true });
for (const file of readdirSync(join(source, 'extract'))) copyFileSync(join(source, 'extract', file), join(work, 'extract', file));

const definition = [
  'CREATE OR REPLACE FUNCTION public.inventory_item_name_comparison_key(p_name text)',
  ' RETURNS text',
  ' LANGUAGE sql',
  ' STABLE',
  "AS $function$ SELECT name_key FROM public._test_name_keys WHERE name = p_name $function$",
].join('\n');
writeFileSync(
  join(work, 'toolio-4-name-key-function.json'),
  JSON.stringify({ query: 'toolio-4-name-key-function', version: 1, exported_at: new Date().toISOString(), definition }),
);

const migrationPath = join(work, 'migration.sql');
run('node', [fileURLToPath(new URL('../build-pp-load.mjs', import.meta.url)), '--archive', `${args.archive}-pgtest`, '--out', migrationPath]);

// ---------- Seed ----------

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v) => (v === null || v === undefined ? 'NULL' : `ARRAY[${v.map(q).join(',')}]::text[]`);
const lib = readPayload(source, 'pp-1-library');
const projects = tableRows(readPayload(source, 'pp-2-projects'), 'projects');
const refs = readJson(join(source, 'extract', 'pp_references.json'));
const nameKeys = readPayload(source, 'toolio-3-name-keys').keys;
const seed = [];

for (const [name, key] of Object.entries(nameKeys)) seed.push(`INSERT INTO public._test_name_keys VALUES (${q(name)}, ${q(key)});`);
seed.push(`INSERT INTO public._test_name_keys VALUES ('Test Gizmo', 'test gizmo'), ('Test Widget', 'test widget'), ('Another Widget', 'another widget'), ('Test Widget 2', 'test widget 2');`);
for (const t of tableRows(lib, 'tools')) {
  seed.push(`INSERT INTO public.tools (id, name, description, category, alternates, specialty_scale) VALUES (${q(t.id)}, ${q(t.name)}, ${q(t.description)}, ${q(t.category)}, ${q(t.alternates)}, 2);`);
}
for (const m of tableRows(lib, 'materials')) {
  seed.push(`INSERT INTO public.materials (id, name, description, category, alternates) VALUES (${q(m.id)}, ${q(m.name)}, ${q(m.description)}, ${q(m.category)}, ${q(m.alternates)});`);
}
for (const v of tableRows(lib, 'tool_variations')) seed.push(`INSERT INTO public.tool_variations VALUES (${q(v.id)}, ${q(v.core_item_id)}, ${q(v.name)}, ${q(v.sku)});`);
for (const v of tableRows(lib, 'materials_variants')) seed.push(`INSERT INTO public.materials_variants VALUES (${q(v.id)}, ${q(v.material_id)}, ${q(v.name)}, ${q(v.sku)});`);
const ordered = [...projects.filter((p) => !p.parent_project_id), ...projects.filter((p) => p.parent_project_id)];
for (const p of ordered) {
  seed.push(
    `INSERT INTO public.projects (id, parent_project_id, name, description, category, tags, publish_status, visibility_status, is_foundational, is_standard, item_type, user_id, foundation_project_id, revision_number, updated_at) VALUES (${[
      q(p.id), q(p.parent_project_id), q(p.name), q(p.description), arr(p.category), arr(p.tags), q(p.publish_status), q(p.visibility_status),
      p.is_foundational ? 'true' : 'false', p.is_standard ? 'true' : 'false', q(p.item_type), q(p.user_id), q(p.foundation_project_id),
      p.revision_number ?? 'NULL', q(p.updated_at),
    ].join(', ')});`,
  );
}

const entryFor = (ref) =>
  ref.shape === 'library_selection'
    ? { item: ref.name, coreItemId: ref.stored_library_id, isPrime: true, quantity: 1, attributes: {} }
    : { id: `${ref.kind}-${randomUUID()}`, name: ref.name, description: '', category: '', alternates: [], quantity: 1 };
const host = projects.find((p) => p.publish_status === 'published' && !p.is_standard);
const phaseId = randomUUID();
const opId = randomUUID();
seed.push(`INSERT INTO public.project_phases (id, project_id, name) VALUES (${q(phaseId)}, ${q(host.id)}, 'Test phase');`);
seed.push(`INSERT INTO public.phase_operations (id, phase_id, operation_name) VALUES (${q(opId)}, ${q(phaseId)}, 'Test operation');`);
const stepsOf = (source) => refs.filter((r) => r.source === source && r.kind !== 'unknown');
for (const ref of stepsOf('operation_steps')) {
  const tools = ref.kind === 'tool' ? [entryFor(ref)] : [];
  const materials = ref.kind === 'material' ? [entryFor(ref)] : [];
  seed.push(`INSERT INTO public.operation_steps (operation_id, step_title, tools, materials) VALUES (${q(opId)}, 'Step', ${j(tools)}, ${j(materials)});`);
}
const phasesJson = (source) => [{
  id: randomUUID(),
  name: 'Phase',
  operations: [{
    id: randomUUID(),
    name: 'Operation',
    steps: [{
      id: randomUUID(),
      step: 'Step',
      tools: stepsOf(source).filter((r) => r.kind === 'tool').map(entryFor),
      materials: stepsOf(source).filter((r) => r.kind === 'material').map(entryFor),
    }],
  }],
}];
seed.push(`UPDATE public.projects SET phases = ${j(phasesJson('projects.phases'))} WHERE id = ${q(host.id)};`);
const userId = randomUUID();
seed.push(`INSERT INTO public.project_runs (user_id, project_id, name, phases) VALUES (${q(userId)}, ${q(host.id)}, 'Run', to_jsonb(${q(JSON.stringify(phasesJson('project_runs.phases')))}::text));`);
const owned = refs.filter((r) => r.source === 'user_profiles.owned_tools').map((r) => ({ id: randomUUID(), tool_id: r.stored_library_id, name: r.name, item: r.name }));
seed.push(`INSERT INTO public.user_profiles VALUES (${q(userId)}, ${j(owned)});`);
for (const r of refs.filter((r) => r.source === 'user_tools')) seed.push(`INSERT INTO public.user_tools (user_id, tool_id, name) VALUES (${q(userId)}, ${q(r.stored_library_id)}, ${q(r.name)});`);
for (const r of refs.filter((r) => r.source === 'user_materials')) seed.push(`INSERT INTO public.user_materials (user_id, material_id, name) VALUES (${q(userId)}, ${q(r.stored_library_id)}, ${q(r.name)});`);
writeFileSync(join(work, 'seed.sql'), `${seed.join('\n')}\n`);

// ---------- Run ----------

const cluster = join(work, 'cluster');
if (!existsSync(join(cluster, 'PG_VERSION'))) run('initdb', ['-D', cluster, '-U', 'postgres', '-A', 'trust', '--no-instructions']);
// The server inherits pg_ctl's handles, so start it with them detached or the call never returns.
const started = spawnSync('pg_ctl', ['-D', cluster, '-o', `-p ${PORT}`, '-l', join(work, 'pg.log'), '-w', 'start'], { stdio: 'ignore' });
if (started.error || started.status !== 0) throw new Error(`pg_ctl start failed; see ${join(work, 'pg.log')}`);
let failed = false;
try {
  psql('postgres', ['-c', 'DROP DATABASE IF EXISTS vocab_test', '-c', 'CREATE DATABASE vocab_test']);
  psql('vocab_test', ['-f', join(HERE, 'pp-stub-schema.sql')]);
  psql('vocab_test', ['-f', join(work, 'seed.sql')]);
  psql('vocab_test', ['-f', migrationPath]);
  const out = psql('vocab_test', ['-f', join(HERE, 'pp-phase3-checks.sql')]);
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
