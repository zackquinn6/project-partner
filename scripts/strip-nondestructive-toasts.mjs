/**
 * Removes toast({ ... }) calls that do not include variant: "destructive" (or 'destructive').
 * Skips hooks/use-toast.ts (implementation). Skips *.backup.* files.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.includes(".backup."))
      acc.push(p);
  }
  return acc;
}

function stripFile(filePath) {
  if (filePath.endsWith(`${path.sep}use-toast.ts`)) return 0;
  const s = fs.readFileSync(filePath, "utf8");
  let removed = 0;
  let out = "";
  let i = 0;

  while (i < s.length) {
    const idx = s.indexOf("toast({", i);
    if (idx < 0) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, idx);

    const braceStart = idx + 6; // first '{' of the object literal
    if (s[braceStart] !== "{") {
      out += s.slice(idx, idx + 6);
      i = idx + 6;
      continue;
    }

    let depth = 0;
    let j = braceStart;
    for (; j < s.length; j++) {
      const c = s[j];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }

    let end = j;
    while (end < s.length && /\s/.test(s[end])) end++;
    if (end >= s.length || s[end] !== ")") {
      // malformed; keep verbatim
      out += s.slice(idx, idx + 6);
      i = idx + 6;
      continue;
    }
    end++;

    let semEnd = end;
    if (semEnd < s.length && s[semEnd] === ";") semEnd++;

    const fullCall = s.slice(idx, semEnd);
    const objText = s.slice(braceStart, j);

    const keep = /variant\s*:\s*['"]destructive['"]/.test(objText);

    if (keep) {
      out += fullCall;
    } else {
      removed++;
    }

    // Skip trailing newline once if we removed (avoid double blank lines — optional)
    let skip = semEnd;
    if (!keep && skip < s.length && s[skip] === "\r") skip++;
    if (!keep && skip < s.length && s[skip] === "\n") skip++;

    i = skip;
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, out, "utf8");
  }
  return removed;
}

let total = 0;
for (const f of walk(root)) {
  const n = stripFile(f);
  if (n) {
    console.log(`${f}: removed ${n}`);
    total += n;
  }
}
console.log(`Total removed: ${total}`);
