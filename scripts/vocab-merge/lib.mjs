import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

/** Read-only export queries in scripts/vocab-merge/sql/, run by hand in each app's SQL editor. */
export const EXPORT_QUERIES = ['toolio-1-catalog', 'toolio-2-checks', 'pp-1-library', 'pp-2-projects', 'pp-3-references'];
export const NAME_KEYS_QUERY = 'toolio-3-name-keys';
const PAYLOAD_VERSIONS = {
  'toolio-1-catalog': 1,
  'toolio-2-checks': 2,
  'pp-1-library': 1,
  'pp-2-projects': 1,
  'pp-3-references': 2,
  [NAME_KEYS_QUERY]: 1,
  'toolio-4-name-key-function': 1,
  'pp-export': 1,
  'toolio-export': 1,
  'pp-snapshot': 1,
};

/** One query per app: each combined result carries the parts below under `parts`. */
export const COMBINED_EXPORTS = {
  'pp-export': ['pp-1-library', 'pp-2-projects', 'pp-3-references'],
  'toolio-export': ['toolio-1-catalog', 'toolio-2-checks', NAME_KEYS_QUERY, 'toolio-4-name-key-function'],
};

export const CROSSWALK_COLUMNS = [
  'entity',
  'toolio_id',
  'toolio_key',
  'toolio_name',
  'pp_id',
  'pp_name',
  'match_tier',
  'proposed_action',
  'canonical_key',
  'canonical_name',
  'pair_with',
  'unpaired_from',
  'notes',
  'decision',
];

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value.trim();
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { dryRun: false, archive: null, against: null, carry: null, out: null, app: null, check: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--app') args.app = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--archive') args.archive = argv[++i];
    else if (arg === '--against') args.against = argv[++i];
    else if (arg === '--carry') args.carry = argv[++i];
    else if (arg === '--check') args.check.push(argv[++i]);
    else throw new Error(`Unknown argument ${arg}`);
  }
  return args;
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

export function exportDir(name) {
  if (!name) throw new Error('Pass --archive <export folder name> (a folder under VOCAB_MERGE_ARCHIVE_DIR)');
  const dir = join(archiveRoot(), name);
  if (!existsSync(dir)) throw new Error(`Export folder not found: ${dir}`);
  return dir;
}

/** An export folder that validate-export.mjs has already checked. */
export function archiveDir(name) {
  const dir = exportDir(name);
  if (!existsSync(join(dir, 'manifest.json'))) {
    throw new Error(`${dir} has no manifest.json; run validate-export.mjs --archive ${name} first`);
  }
  return dir;
}

export function payloadPath(dir, query) {
  const json = join(dir, `${query}.json`);
  const csv = join(dir, `${query}.csv`);
  if (existsSync(json) && existsSync(csv)) throw new Error(`${dir} has both ${query}.json and ${query}.csv; keep one`);
  if (existsSync(json)) return json;
  if (existsSync(csv)) return csv;
  return null;
}

function combinedFor(query) {
  return Object.keys(COMBINED_EXPORTS).find((name) => COMBINED_EXPORTS[name].includes(query)) ?? null;
}

/** The saved file holding a query's result: its own file, else the app's combined export. */
export function payloadSource(dir, query) {
  const own = payloadPath(dir, query);
  if (own) return own;
  const combined = combinedFor(query);
  return combined ? payloadPath(dir, combined) : null;
}

/**
 * Reads a saved query result, from its own file or from the app's combined export. A file is
 * either the copied `payload` cell (.json) or the editor's CSV download with one `payload` column.
 */
export function readPayload(dir, query) {
  if (payloadPath(dir, query)) return readPayloadFile(payloadPath(dir, query), query);
  const combined = combinedFor(query);
  const path = combined ? payloadPath(dir, combined) : null;
  if (!path) throw new Error(`Missing ${query}.json (or .csv)${combined ? ` and ${combined}.json (or .csv)` : ''} in ${dir}`);
  const part = readPayloadFile(path, combined).parts?.[query];
  if (!part) throw new Error(`${path} has no ${query} part`);
  if (part.query !== query) throw new Error(`${path}: part ${query} holds ${part.query}`);
  if (part.version !== PAYLOAD_VERSIONS[query]) {
    throw new Error(`${path}: ${query} version ${part.version}, expected ${PAYLOAD_VERSIONS[query]}; regenerate the export query`);
  }
  return part;
}

function readPayloadFile(path, query) {
  let text;
  if (path.endsWith('.csv')) {
    const rows = readCsv(path);
    if (rows.length !== 1 || !('payload' in rows[0])) {
      throw new Error(`${path}: expected one row with a payload column, found ${rows.length} rows`);
    }
    text = rows[0].payload;
  } else {
    text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not complete JSON (${error.message}); copy the whole payload cell again`);
  }
  if (payload.query !== query) throw new Error(`${path} holds the result of ${payload.query}, not ${query}`);
  if (payload.version !== PAYLOAD_VERSIONS[query]) {
    throw new Error(`${path}: query version ${payload.version}, expected ${PAYLOAD_VERSIONS[query]}; re-run the current sql/${query}.sql`);
  }
  return payload;
}

/** jsonb_agg returns null for an empty table; that is only valid when the count is zero. */
export function tableRows(payload, table) {
  const rows = payload.tables?.[table];
  const count = payload.counts?.[table];
  if (!Number.isInteger(count)) throw new Error(`${payload.query}: no count for ${table}`);
  if (rows === null) {
    if (count !== 0) throw new Error(`${payload.query}: ${table} has no rows but count ${count}`);
    return [];
  }
  if (!Array.isArray(rows)) throw new Error(`${payload.query}: ${table} is missing`);
  if (rows.length !== count) throw new Error(`${payload.query}: ${table} has ${rows.length} rows, count ${count}`);
  return rows;
}

/** jsonb_object_agg returns null for an empty table; that is only valid when the count is zero. */
export function hashMap(payload, table) {
  const hashes = payload.content_hashes?.[table];
  const count = payload.counts?.[table];
  if (!Number.isInteger(count)) throw new Error(`${payload.query}: no count for ${table}`);
  if (hashes === null) {
    if (count !== 0) throw new Error(`${payload.query}: ${table} has no fingerprints but count ${count}`);
    return {};
  }
  if (!hashes || typeof hashes !== 'object') throw new Error(`${payload.query}: ${table} fingerprints missing`);
  if (Object.keys(hashes).length !== count) {
    throw new Error(`${payload.query}: ${table} has ${Object.keys(hashes).length} fingerprints, count ${count}`);
  }
  return hashes;
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
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
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
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

/** Same parsing as the app's expandToolAlternateKeys: JSON array of names/objects, else one name. */
export function alternateNames(alternates) {
  if (alternates === null || alternates === undefined) return [];
  let value = alternates;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((alt) => (typeof alt === 'string' ? alt : alt?.name || alt?.item || alt?.label))
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());
}

export function kebabKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
