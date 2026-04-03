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

const files = walk(root);
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  let i = 0;
  while (true) {
    const start = s.indexOf("toast({", i);
    if (start < 0) break;
    let depth = 0;
    let j = start + 6;
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
    const block = s.slice(start, j);
    if (!/variant\s*:\s*['"]destructive['"]/.test(block)) {
      const line = s.slice(0, start).split("\n").length;
      console.log(`${f}:${line}`);
    }
    i = j;
  }
}
