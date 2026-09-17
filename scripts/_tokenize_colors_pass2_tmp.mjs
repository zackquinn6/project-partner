// Pass 2 of the one-off colour codemod: shades pass 1 did not cover.
// Not part of the build; delete after the refactor lands.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SKIP = new Set([
  'src/components/MaintenancePdfPrinter.tsx',
  'src/components/QualityControlPdfPrinter.tsx',
  'src/components/CompletionCertificate.tsx',
  'src/components/ProjectCertificate.tsx',
]);

const STATUS = {
  red: 'destructive-soft',
  rose: 'destructive-soft',
  green: 'success',
  emerald: 'success',
  teal: 'success',
  yellow: 'warning-soft',
  amber: 'warning-soft',
  orange: 'warning-soft',
  blue: 'info',
  sky: 'info',
  cyan: 'info',
  indigo: 'category-1',
  violet: 'category-3',
  purple: 'category-3',
  fuchsia: 'category-5',
  pink: 'category-5',
};

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: 'utf8' })
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean)
  .filter(f => !f.startsWith('src/components/ui/'))
  .filter(f => !SKIP.has(f))
  .filter(f => existsSync(f));

const fams = Object.keys(STATUS).join('|');
const neut = 'gray|slate|zinc|neutral|stone';
let changed = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let text = original;

  // Very light text sits on a solid token background: use that token's foreground.
  text = text.replace(
    new RegExp(`\\b(hover:|focus:|group-hover:)?text-(${fams})-(50|100|200)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam) => `${prefix}text-${STATUS[fam]}-foreground`
  );

  // Dark same-hue dividers on solid headers.
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?border-(${fams})-(600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam) => `${prefix}border-${STATUS[fam]}-foreground/25`
  );

  // Neutral mid tones read as the muted foreground.
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?bg-(${neut})-(400|500|600)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', _fam, _shade, alpha = '') => `${prefix}bg-muted-foreground${alpha}`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?bg-(${neut})-(700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', _fam, _shade, alpha = '') => `${prefix}bg-foreground${alpha}`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?text-(${neut})-(50|100|200|300)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}text-muted-foreground`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?border-(${neut})-(500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}border-border`
  );
  text = text.replace(
    new RegExp(`\\b(focus:|focus-visible:)?ring-(${fams})-(700|800|900)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam) => `${prefix}ring-${STATUS[fam]}`
  );
  text = text.replace(
    new RegExp(`\\b(from|to|via)-(${fams})-(300|400|500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, dir, fam) => `${dir}-${STATUS[fam]}`
  );
  text = text.replace(
    new RegExp(`\\b(from|to|via)-(${neut})-(300|400|500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, dir) => `${dir}-muted`
  );

  if (text !== original) {
    writeFileSync(file, text);
    changed += 1;
    console.log(`updated ${file}`);
  }
}

console.log(`\n${changed} files updated`);
