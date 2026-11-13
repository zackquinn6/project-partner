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
 *   toolio-rebuild   project rebuild parity: content unchanged, projects differ only in name and slug,
 *                    past orders still resolve; lists each rename (needs toolio-2-checks version 2)
 *
 * toolio-content, toolio-orders, and toolio-rebuild need --against: a fresh export taken after the change.
 * Exit code 1 when any check fails.
 *
 * Env: VOCAB_MERGE_ARCHIVE_DIR.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveDir, exportDir, hashMap, parseArgs, readJson, readPayload, sha256 } from './lib.mjs';

const CHECKS = {
  archive: checkArchive,
  'toolio-content': checkToolioContent,
  'toolio-orders': checkToolioOrders,
  'toolio-rebuild': checkToolioRebuild,
};
const NEEDS_AGAINST = ['toolio-content', 'toolio-orders', 'toolio-rebuild'];

const args = parseArgs();
const dir = archiveDir(args.archive);
// The later export only needs the toolio-2-checks result (on its own or inside toolio-export).
const laterDir = args.against ? exportDir(args.against) : null;
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

/**
 * Project rebuild parity: every guided-project content row is unchanged (sections, items, packages,
 * quantities, customization, overrides, inventory), project rows differ only in name and slug, and no
 * past order stopped resolving. The identity changes are listed for the report.
 */
function checkToolioRebuild() {
  const before = readPayload(dir, 'toolio-2-checks');
  const after = readPayload(laterDir, 'toolio-2-checks');
  for (const [label, payload] of [['baseline', before], ['later', after]]) {
    if (!payload.projects_without_identity || !payload.project_identity) {
      throw new Error(`${label} toolio-2-checks is version ${payload.version}; re-export with version 2 or later`);
    }
  }
  const problems = [];
  for (const table of Object.keys(before.content_hashes).filter((t) => t !== 'projects')) {
    const was = hashMap(before, table);
    const now = hashMap(after, table);
    for (const [id, hash] of Object.entries(was)) {
      if (!(id in now)) problems.push(`${table}: ${id} was removed`);
      else if (now[id] !== hash) problems.push(`${table}: ${id} changed`);
    }
  }
  for (const [id, hash] of Object.entries(before.projects_without_identity)) {
    if (!(id in after.projects_without_identity)) problems.push(`projects: ${id} was removed`);
    else if (after.projects_without_identity[id] !== hash) problems.push(`projects: ${id} changed beyond name and slug`);
  }
  const newlyUnresolved = new Set(before.unresolved_order_refs ?? []);
  for (const ref of after.unresolved_order_refs ?? []) {
    if (!newlyUnresolved.has(ref)) problems.push(`newly unresolved: ${ref}`);
  }
  for (const [id, was] of Object.entries(before.project_identity)) {
    const now = after.project_identity[id];
    if (now && (now.name !== was.name || now.slug !== was.slug)) {
      console.log(`  renamed ${was.name} (${was.slug}) -> ${now.name} (${now.slug})`);
    }
  }
  return problems;
}

function checkToolioOrders() {
  const before = new Set(readPayload(dir, 'toolio-2-checks').unresolved_order_refs ?? []);
  const after = readPayload(laterDir, 'toolio-2-checks').unresolved_order_refs ?? [];
  return after.filter((ref) => !before.has(ref)).map((ref) => `newly unresolved: ${ref}`);
}
