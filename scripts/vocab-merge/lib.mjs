import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value.trim();
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    dryRun: false,
    printCountSql: false,
    skipDump: [],
    toolioCounts: null,
    archive: null,
    carry: null,
    check: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--print-toolio-count-sql') args.printCountSql = true;
    else if (arg === '--skip-dump') args.skipDump.push(argv[++i]);
    else if (arg === '--toolio-counts') args.toolioCounts = argv[++i];
    else if (arg === '--archive') args.archive = argv[++i];
    else if (arg === '--carry') args.carry = argv[++i];
    else if (arg === '--check') args.check.push(argv[++i]);
    else throw new Error(`Unknown argument ${arg}`);
  }
  return args;
}

const TOKEN_MIN_REMAINING_MS = 10 * 60 * 1000;

/**
 * Toolio runs on Lovable Cloud, which exposes no service-role key, so scripts read Toolio as a
 * signed-in catalog admin. Export proves completeness against true row counts (see export.mjs).
 */
export function toolioClient() {
  const url = requireEnv('TOOLIO_SUPABASE_URL');
  const token = requireEnv('TOOLIO_ACCESS_TOKEN');
  const segments = token.split('.');
  if (segments.length !== 3) throw new Error('TOOLIO_ACCESS_TOKEN is not a JWT');
  const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
  if (claims.role !== 'authenticated') {
    throw new Error(`TOOLIO_ACCESS_TOKEN has role "${claims.role}"; copy a signed-in admin's access token, not the publishable key`);
  }
  if (typeof claims.iss !== 'string' || !claims.iss.startsWith(url)) {
    throw new Error(`TOOLIO_ACCESS_TOKEN was issued by ${claims.iss}, not ${url}`);
  }
  const remainingMs = claims.exp * 1000 - Date.now();
  if (remainingMs < TOKEN_MIN_REMAINING_MS) {
    throw new Error('TOOLIO_ACCESS_TOKEN expires in under 10 minutes; copy a fresh one');
  }
  return createClient(url, requireEnv('TOOLIO_PUBLISHABLE_KEY'), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function ppClient() {
  return createClient(requireEnv('PP_SUPABASE_URL'), requireEnv('PP_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Archive holds production user data, so it must live outside every git work tree. */
export function archiveRoot() {
  const root = requireEnv('VOCAB_MERGE_ARCHIVE_DIR');
  if (!isAbsolute(root)) {
    throw new Error('VOCAB_MERGE_ARCHIVE_DIR must be an absolute path');
  }
  let dir = resolve(root);
  while (true) {
    if (existsSync(join(dir, '.git'))) {
      throw new Error(`VOCAB_MERGE_ARCHIVE_DIR is inside the git work tree at ${dir}`);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(root);
}

export function archiveDir(args) {
  if (!args.archive) {
    throw new Error('Pass --archive <export folder name> (a folder under VOCAB_MERGE_ARCHIVE_DIR)');
  }
  const dir = join(archiveRoot(), args.archive);
  if (!existsSync(join(dir, 'manifest.json'))) {
    throw new Error(`No manifest.json in ${dir}`);
  }
  return dir;
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function rowHash(row, omitColumns = []) {
  if (omitColumns.length === 0) return sha256(stableStringify(row));
  const copy = { ...row };
  for (const column of omitColumns) delete copy[column];
  return sha256(stableStringify(copy));
}

export async function liveCount(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  if (count === null) throw new Error(`count ${table}: no count returned`);
  return count;
}

/** Reads every row ordered by primary key; fails when the row count moves during the read. */
export async function fetchAll(client, spec) {
  const before = await liveCount(client, spec.table);
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(spec.table)
      .select(spec.select)
      .order(spec.pk, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`read ${spec.table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  const after = await liveCount(client, spec.table);
  if (before !== after || rows.length !== after) {
    throw new Error(
      `${spec.table}: live count changed during export (before ${before}, read ${rows.length}, after ${after}). Re-run the export.`,
    );
  }
  const seen = new Set();
  for (const row of rows) {
    const key = row[spec.pk];
    if (key === null || key === undefined) throw new Error(`${spec.table}: row without ${spec.pk}`);
    if (seen.has(key)) throw new Error(`${spec.table}: duplicate ${spec.pk} ${key}`);
    seen.add(key);
  }
  return rows;
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readArchiveTable(dir, db, table) {
  const path = join(dir, db, `${table}.json`);
  if (!existsSync(path)) throw new Error(`Archive is missing ${db}/${table}.json`);
  return readJson(path).rows;
}

const CSV_SPECIAL = /[",\r\n]/;

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return CSV_SPECIAL.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function writeCsv(path, columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(','));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
}

export function readCsv(path) {
  const text = readFileSync(path, 'utf8');
  const records = [];
  let field = '';
  let record = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      field = '';
      if (record.length > 1 || record[0] !== '') records.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  const [header, ...body] = records;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
}

export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function kebabKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
