/**
 * One-off: remove toast.success(...) calls including multiline and optional second-arg object.
 * Run from repo root: node scripts/strip-success-toasts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name) && !name.includes('.backup.')) acc.push(p);
  }
  return acc;
}

/** Skip chars inside ', ", ` strings (handles escapes for quotes). */
function skipString(src, pos, quote) {
  pos++;
  while (pos < src.length) {
    const c = src[pos];
    if (quote !== '`' && c === '\\' && pos + 1 < src.length) {
      pos += 2;
      continue;
    }
    if (c === quote) return pos + 1;
    if (quote === '`' && c === '$' && src[pos + 1] === '{') {
      pos += 2;
      let d = 1;
      while (pos < src.length && d > 0) {
        if (src[pos] === '{') d++;
        else if (src[pos] === '}') d--;
        pos++;
      }
      continue;
    }
    pos++;
  }
  return pos;
}

function stripToastSuccessCalls(src) {
  const needle = 'toast.success(';
  let out = '';
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    let pos = idx + needle.length;
    let depth = 1;
    while (pos < src.length && depth > 0) {
      const c = src[pos];
      if (c === "'" || c === '"' || c === '`') {
        pos = skipString(src, pos, c);
        continue;
      }
      if (c === '/' && src[pos + 1] === '/') {
        while (pos < src.length && src[pos] !== '\n') pos++;
        continue;
      }
      if (c === '/' && src[pos + 1] === '*') {
        pos += 2;
        while (pos + 1 < src.length && !(src[pos] === '*' && src[pos + 1] === '/')) pos++;
        pos += 2;
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') depth--;
      pos++;
    }
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (src[pos] === ';') pos++;
    while (pos < src.length && (src[pos] === '\n' || src[pos] === '\r')) pos++;
    if (src[pos] === '\n') pos++;
    i = pos;
  }
  return out;
}

const files = walk(path.join(root, 'src'));
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('toast.success(')) continue;
  const after = stripToastSuccessCalls(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed++;
    console.log('stripped:', path.relative(root, file));
  }
}
console.log('done, files changed:', changed);
