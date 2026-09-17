// One-off audit: find token pairings that cannot be legible in both modes.
// Not part of the build; delete after the refactor lands.
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// muted/card/popover/destructive are excluded: their -foreground tokens are designed to sit on a
// wash of themselves, so flagging them is noise.
const TOKENS = [
  'destructive-soft', 'success', 'warning-soft', 'info',
  'category-1', 'category-2', 'category-3', 'category-4', 'category-5', 'category-6',
];

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: 'utf8' })
  .split('\n').map(f => f.trim()).filter(Boolean).filter(existsSync);

const findings = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const t of TOKENS) {
      // A washed background cannot carry that token's foreground: the foreground is
      // near-white in light mode and would sit on a near-white wash.
      // Only alphas below 50% are a real problem; 50%+ of a saturated token still carries it.
      const washWithFg = new RegExp(`bg-${t}\\/[1-4]?\\d(?!\\d)\\b[^"'\`]*\\btext-${t}-foreground\\b|text-${t}-foreground\\b[^"'\`]*\\bbg-${t}\\/[1-4]?\\d(?!\\d)\\b`);
      if (washWithFg.test(line)) findings.push(['wash+foreground', file, i + 1, t, line.trim()]);

      // Solid background with same-token text is the same colour twice.
      const solidWithSame = new RegExp(`bg-${t}(?![-\\/\\w])[^"'\`]*\\btext-${t}(?![-\\w])|text-${t}(?![-\\w])[^"'\`]*\\bbg-${t}(?![-\\/\\w])`);
      if (solidWithSame.test(line)) findings.push(['solid+same-token-text', file, i + 1, t, line.trim()]);
    }

    // Literal white/black text left on a token background.
    if (/\btext-white\b/.test(line) && /\bbg-(success|warning-soft|destructive-soft|info|category-\d|muted|card|primary|accent)\b/.test(line)) {
      findings.push(['text-white on token bg', file, i + 1, '-', line.trim()]);
    }
  });
}

for (const [kind, file, line, token, src] of findings) {
  console.log(`[${kind}] ${file}:${line} (${token})\n    ${src.slice(0, 190)}`);
}
console.log(`\n${findings.length} findings`);
