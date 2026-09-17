// One-off: pair literal text-white with the foreground token of the background it sits on.
// Not part of the build; delete after the refactor lands.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const INVERTING = ['destructive-soft', 'success', 'warning-soft', 'info', 'category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6'];

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: 'utf8' })
  .split('\n').map(f => f.trim()).filter(Boolean)
  .filter(f => !f.startsWith('src/components/ui/'))
  .filter(existsSync);

let changed = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  const out = original
    .split('\n')
    .map(line => {
      if (!/\btext-white\b/.test(line)) return line;
      // Use the first inverting background token named on the same line.
      const bg = INVERTING.find(t => new RegExp(`bg-${t}(?![-\\w])`).test(line));
      if (!bg) return line;
      return line.replace(/\btext-white\b/g, `text-${bg}-foreground`);
    })
    .join('\n');

  if (out !== original) {
    writeFileSync(file, out);
    changed += 1;
    console.log(`updated ${file}`);
  }
}

console.log(`\n${changed} files updated`);
