// One-off codemod: rewrite hardcoded Tailwind palette utilities to semantic tokens.
// Not part of the build; delete after the refactor lands.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SKIP = new Set([
  'src/components/MaintenancePdfPrinter.tsx',
  'src/components/QualityControlPdfPrinter.tsx',
  'src/components/CompletionCertificate.tsx',
  'src/components/ProjectCertificate.tsx',
]);

// family -> token
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

const NEUTRAL = ['gray', 'slate', 'zinc', 'neutral', 'stone'];

const SHADE_BG = { 50: '/10', 100: '/15', 150: '/20', 200: '/25', 300: '/35' };
const SHADE_HOVER = { 50: '/15', 100: '/20', 150: '/25', 200: '/30', 300: '/40' };

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: 'utf8' })
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean)
  .filter(f => !f.startsWith('src/components/ui/'))
  .filter(f => !SKIP.has(f))
  .filter(f => existsSync(f));

let changedFiles = 0;
let totalEdits = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let text = original;

  const fams = Object.keys(STATUS).join('|');
  const neut = NEUTRAL.join('|');

  // Drop dark: variants of palette colors - tokens already resolve per mode.
  text = text.replace(
    new RegExp(`\\s*dark:(hover:|focus:|group-hover:)?(bg|text|border|ring|from|to|via)-(${fams}|${neut})-\\d{2,3}(\\/\\d{1,3})?`, 'g'),
    ''
  );

  // Backgrounds: light tints become a token wash.
  text = text.replace(
    new RegExp(`\\bbg-(${fams})-(50|100|150|200|300)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, fam, shade) => `bg-${STATUS[fam]}${SHADE_BG[shade]}`
  );
  text = text.replace(
    new RegExp(`\\bhover:bg-(${fams})-(50|100|150|200|300)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, fam, shade) => `hover:bg-${STATUS[fam]}${SHADE_HOVER[shade]}`
  );
  text = text.replace(
    new RegExp(`\\bfocus:bg-(${fams})-(50|100|150|200|300)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, fam) => `focus:bg-${STATUS[fam]}/15`
  );

  // Solid mid/dark backgrounds keep full saturation.
  text = text.replace(
    new RegExp(`\\b(hover:|focus:|group-hover:)?bg-(${fams})-(400|500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam, _shade, alpha = '') => `${prefix}bg-${STATUS[fam]}${alpha}`
  );

  // Text and border.
  text = text.replace(
    new RegExp(`\\b(hover:|focus:|group-hover:)?text-(${fams})-(300|400|500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam, _shade, alpha = '') => `${prefix}text-${STATUS[fam]}${alpha}`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?border-(${fams})-(100|200|300|400|500|600|700|800|900)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam) => `${prefix}border-${STATUS[fam]}/40`
  );
  text = text.replace(
    new RegExp(`\\b(focus:|focus-visible:)?ring-(${fams})-(200|300|400|500|600)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '', fam) => `${prefix}ring-${STATUS[fam]}`
  );
  text = text.replace(
    new RegExp(`\\b(from|to|via)-(${fams})-(50|100|150|200)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, dir, fam, shade) => `${dir}-${STATUS[fam]}${SHADE_BG[shade]}`
  );

  // Neutrals map to surface tokens.
  text = text.replace(new RegExp(`\\bbg-white(\\/\\d{1,3})?\\b`, 'g'), (_m, alpha = '') => `bg-card${alpha}`);
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?bg-(${neut})-(50|100|200)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}bg-muted`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?text-(${neut})-(400|500|600|700)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}text-muted-foreground`
  );
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?text-(${neut})-(800|900|950)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}text-foreground`
  );
  text = text.replace(new RegExp(`\\btext-black\\b`, 'g'), 'text-foreground');
  text = text.replace(
    new RegExp(`\\b(hover:|focus:)?border-(${neut})-(100|200|300|400)(\\/\\d{1,3})?\\b`, 'g'),
    (_m, prefix = '') => `${prefix}border-border`
  );

  // Collapse duplicate spaces introduced by dropped dark: variants.
  text = text.replace(/(className=(?:"|'|`))([^"'`]*?)((?:"|'|`))/g, (m, open, body, close) =>
    `${open}${body.replace(/ {2,}/g, ' ').replace(/ +(?=$)/, '')}${close}`
  );

  if (text !== original) {
    writeFileSync(file, text);
    changedFiles += 1;
    totalEdits += 1;
    console.log(`updated ${file}`);
  }
}

console.log(`\n${changedFiles} files updated`);
