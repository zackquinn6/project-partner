#!/usr/bin/env node
/**
 * Builds the one-query-per-app exports from the part queries in scripts/vocab-merge/sql/.
 *
 *   node scripts/vocab-merge/export-sql.mjs --app pp --out <file>
 *   node scripts/vocab-merge/export-sql.mjs --app toolio --archive <export folder> --out <file>
 *
 * Run order: the Project Partner query first, saved as pp-export.json (or .csv) in the export
 * folder; then the Toolio query, generated from it, because Toolio's name normalization also
 * keys every Project Partner name. Save that result as toolio-export.json (or .csv).
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR (Toolio only).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAME_KEYS_QUERY, alternateNames, exportDir, parseArgs, readJson, readPayload, tableRows } from './lib.mjs';

const SQL_DIR = fileURLToPath(new URL('./sql/', import.meta.url));
const args = parseArgs();
if (!args.out) throw new Error('Pass --out <file>');

/** A part query as a scalar subquery: comments dropped, the final ::text AS payload removed. */
function part(name) {
  const body = readFileSync(join(SQL_DIR, `${name}.sql`), 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .trim();
  const suffix = '::text AS payload;';
  if (!body.endsWith(suffix)) throw new Error(`sql/${name}.sql must end with ${suffix}`);
  return `(\n${body.slice(0, -suffix.length)}\n)`;
}

function combined(query, header, parts) {
  return [
    ...header.map((line) => `-- ${line}`),
    'SELECT jsonb_build_object(',
    `  'query', '${query}',`,
    "  'version', 1,",
    "  'exported_at', now(),",
    "  'parts', jsonb_build_object(",
    parts.map(([name, sql]) => `    '${name}', ${sql}`).join(',\n'),
    '  )',
    ')::text AS payload;',
    '',
  ].join('\n');
}

if (args.app === 'pp') {
  const sql = combined(
    'pp-export',
    [
      'Vocab merge export: Project Partner, one query (read-only).',
      "Run in Project Partner's Supabase SQL editor. Save the single payload cell as pp-export.json",
      '(or the downloaded result as pp-export.csv) in the export folder.',
    ],
    ['pp-1-library', 'pp-2-projects', 'pp-3-references'].map((name) => [name, part(name)]),
  );
  writeFileSync(args.out, sql);
  console.log(`Wrote ${args.out}`);
} else if (args.app === 'toolio') {
  const dir = exportDir(args.archive);
  const names = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.trim()) names.add(value);
  };
  const library = readPayload(dir, 'pp-1-library');
  for (const row of [...tableRows(library, 'tools'), ...tableRows(library, 'materials')]) {
    add(row.name);
    alternateNames(row.alternates).forEach(add);
  }
  for (const row of [...tableRows(library, 'tool_variations'), ...tableRows(library, 'materials_variants')]) add(row.name);
  for (const row of tableRows(readPayload(dir, 'pp-2-projects'), 'projects')) {
    add(row.name);
    (row.category ?? []).forEach(add);
  }
  for (const ref of readPayload(dir, 'pp-3-references').references ?? []) add(ref.name);
  readJson(fileURLToPath(new URL('./pp-code-categories.json', import.meta.url))).names.forEach(add);

  const list = JSON.stringify([...names].sort());
  const tag = '$vocab_names$';
  if (list.includes(tag)) throw new Error(`A name contains ${tag}; pick another dollar-quote tag`);
  const nameKeys = [
    '(',
    'WITH names AS (',
    '  SELECT name AS n FROM public.inventory_items WHERE parent_inventory_item_id IS NULL',
    '  UNION SELECT unnest(discovery_tags) FROM public.inventory_items WHERE parent_inventory_item_id IS NULL',
    '  UNION SELECT name FROM public.projects',
    '  UNION SELECT unnest(discovery_tags) FROM public.projects',
    `  UNION SELECT jsonb_array_elements_text(${tag}${list}${tag}::jsonb)`,
    ')',
    'SELECT jsonb_build_object(',
    `  'query', '${NAME_KEYS_QUERY}',`,
    "  'version', 1,",
    "  'exported_at', now(),",
    "  'keys', (SELECT jsonb_object_agg(n, public.inventory_item_name_comparison_key(n)) FROM names WHERE n IS NOT NULL AND btrim(n) <> '')",
    ')',
    ')',
  ].join('\n');
  const sql = combined(
    'toolio-export',
    [
      'Vocab merge export: Toolio, one query (read-only), generated from this export folder\'s pp-export.',
      "Run in Toolio's SQL editor (Lovable). Save the single payload cell as toolio-export.json",
      '(or the downloaded result as toolio-export.csv) in the same export folder.',
    ],
    [
      ['toolio-1-catalog', part('toolio-1-catalog')],
      ['toolio-2-checks', part('toolio-2-checks')],
      [NAME_KEYS_QUERY, nameKeys],
      ['toolio-4-name-key-function', part('toolio-4-name-key-function')],
    ],
  );
  writeFileSync(args.out, sql);
  console.log(`Wrote ${args.out} (${names.size} Project Partner names)`);
} else {
  throw new Error('Pass --app pp or --app toolio');
}
