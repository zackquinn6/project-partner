#!/usr/bin/env node
/**
 * Merge step 6: accounting checks, offline, from validated exports.
 *
 *   node scripts/vocab-merge/verify.mjs --archive <baseline export> [--against <later export>] [--check <name>]...
 *
 * Checks (all that apply run when no --check is given):
 *   archive          saved query results still match the baseline manifest
 *   toolio-content   every baseline Toolio content row exists unchanged in the later export
 *                    (fingerprints skip updated_at and the integration's link columns)
 *   toolio-orders    no past-order project slug or line inventory id stopped resolving
 *
 * toolio-content and toolio-orders need --against: a fresh export taken after the change.
 * Exit code 1 when any check fails.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveDir, hashMap, parseArgs, readJson, readPayload, sha256 } from './lib.mjs';

const CHECKS = { archive: checkArchive, 'toolio-content': checkToolioContent, 'toolio-orders': checkToolioOrders };
const NEEDS_AGAINST = ['toolio-content', 'toolio-orders'];

const args = parseArgs();
const dir = archiveDir(args.archive);
const laterDir = args.against ? archiveDir(args.against) : null;
const selected = args.check.length ? args.check : Object.keys(CHECKS).filter((c) => laterDir || !NEEDS_AGAINST.includes(c));
for (const name of selected) {
  if (!CHECKS[name]) throw new Error(`Unknown check ${name}. Known: ${Object.keys(CHECKS).join(', ')}`);
  if (NEEDS_AGAINST.includes(name) && !laterDir) throw new Error(`${name} needs --against <later export>`);
}

let failed = false;
for (const name of selected) {
  const problems = CHECKS[name]();
  if (problems.length === 0) {
    console.log(`PASS ${name}`);
  } else {
    failed = true;
    console.log(`FAIL ${name} (${problems.length})`);
    problems.forEach((p) => console.log(`  - ${p}`));
  }
}
process.exit(failed ? 1 : 0);

function checkArchive() {
  const manifest = readJson(join(dir, 'manifest.json'));
  return manifest.files
    .filter((entry) => sha256(readFileSync(join(dir, entry.file))) !== entry.sha256)
    .map((entry) => `${entry.file} changed since validation`);
}

function checkToolioContent() {
  const before = readPayload(dir, 'toolio-2-checks');
  const after = readPayload(laterDir, 'toolio-2-checks');
  const problems = [];
  for (const table of Object.keys(before.content_hashes)) {
    const was = hashMap(before, table);
    const now = hashMap(after, table);
    for (const [id, hash] of Object.entries(was)) {
      if (!(id in now)) problems.push(`${table}: ${id} was removed`);
      else if (now[id] !== hash) problems.push(`${table}: ${id} changed`);
    }
  }
  return problems;
}

function checkToolioOrders() {
  const before = new Set(readPayload(dir, 'toolio-2-checks').unresolved_order_refs ?? []);
  const after = readPayload(laterDir, 'toolio-2-checks').unresolved_order_refs ?? [];
  return after.filter((ref) => !before.has(ref)).map((ref) => `newly unresolved: ${ref}`);
}
