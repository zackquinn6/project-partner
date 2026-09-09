/**
 * Template families bound AI help + catalog focus.
 * Knowledge scope for chat is family-only (e.g. all tile flooring topics).
 */

export type TemplateFamily =
  | 'tile'
  | 'painting'
  | 'flooring'
  | 'carpentry'
  | 'other';

const FLAGSHIP_FAMILIES: TemplateFamily[] = ['tile', 'painting', 'flooring', 'carpentry'];

export function isFlagshipFamily(family: TemplateFamily): boolean {
  return FLAGSHIP_FAMILIES.includes(family);
}

/** Map a project template name (+ optional categories) to a family. */
export function resolveTemplateFamily(
  projectName: string | null | undefined,
  categories?: string[] | null
): TemplateFamily {
  const name = (projectName || '').trim().toLowerCase();
  const cats = (categories || []).map((c) => c.toLowerCase());

  if (
    name.includes('tile') ||
    cats.includes('tile')
  ) {
    return 'tile';
  }

  if (
    name.includes('paint') ||
    name.includes('staining') ||
    name.includes('stain') ||
    cats.includes('painting & finishing')
  ) {
    return 'painting';
  }

  if (
    name.includes('self-leveler') ||
    name.includes('self leveler') ||
    name.includes('subfloor') ||
    name.includes('radiant floor') ||
    (cats.includes('flooring') && !name.includes('tile'))
  ) {
    return 'flooring';
  }

  if (
    name.includes('baseboard') ||
    name.includes('trim') ||
    name.includes('carpentry') ||
    cats.includes('interior carpentry') ||
    cats.includes('exterior carpentry')
  ) {
    return 'carpentry';
  }

  return 'other';
}

/** Catalog / marketing: projects that stay startable (not Coming Soon). */
export function isFlagshipCatalogName(projectName: string): boolean {
  const n = projectName.trim().toLowerCase();
  if (n.startsWith('tile flooring') || n.startsWith('tile demo') || n.startsWith('tile demolition')) {
    return true;
  }
  if (n.startsWith('interior painting') || n.startsWith('interior paint') || n.startsWith('interior wood staining')) {
    return true;
  }
  if (n.startsWith('self-leveler') || n.startsWith('self leveler') || n.startsWith('subfloor')) {
    return true;
  }
  if (n.startsWith('baseboard')) {
    return true;
  }
  if (n.startsWith('door') && n.includes('trim')) {
    return true;
  }
  return false;
}
