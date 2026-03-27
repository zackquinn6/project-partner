import type { Project } from '@/interfaces/Project';

export type CatalogVisibility = 'default' | 'coming-soon' | 'hidden';

/** Same resolution as ProjectCatalog for `visibility_status` / `visibilityStatus`. */
export function getProjectCatalogVisibility(project: Project): CatalogVisibility {
  const v =
    (project as unknown as { visibilityStatus?: string }).visibilityStatus ??
    (project as unknown as { visibility_status?: string }).visibility_status ??
    'default';
  if (v === 'coming-soon' || v === 'hidden') return v;
  return 'default';
}

export function getProjectCatalogPublishStatus(project: Project): string {
  const ps = project.publishStatus ?? (project as unknown as { publish_status?: string }).publish_status;
  return typeof ps === 'string' ? ps.trim().toLowerCase() : '';
}

/**
 * Which templates appear in the project catalog grid (`publishedProjects` in ProjectCatalog.tsx).
 * Pass `isAdminMode: true` to include non-published rows that catalog shows to admins.
 */
/** When two revision rows tie on revision_number, prefer the more "released" row (published over draft). */
function pickCatalogFamilyWinner(a: Project, b: Project): Project {
  const rev = (p: Project) => {
    const x = p as unknown as { revision_number?: number; revisionNumber?: number };
    return x.revision_number ?? x.revisionNumber ?? 0;
  };
  const ra = rev(a);
  const rb = rev(b);
  if (ra !== rb) return ra > rb ? a : b;

  const tier = (p: Project) => {
    const ps = getProjectCatalogPublishStatus(p);
    if (ps === 'published') return 3;
    if (ps === 'beta-testing') return 2;
    if (ps === 'draft') return 1;
    if (ps === 'archived') return 0;
    return 0;
  };
  const ta = tier(a);
  const tb = tier(b);
  if (ta !== tb) return ta > tb ? a : b;

  const t = (p: Project) => (p.updatedAt instanceof Date ? p.updatedAt.getTime() : 0);
  return t(a) >= t(b) ? a : b;
}

export function filterProjectsForCatalog(projects: Project[], isAdminMode: boolean): Project[] {
  const filteredFromDb = projects.filter((project) => {
    const publishStatus = getProjectCatalogPublishStatus(project);
    const visibility = getProjectCatalogVisibility(project);
    const isComingSoon = visibility === 'coming-soon';
    const isHidden = visibility === 'hidden';
    const isPublishVisible = publishStatus === 'published' || publishStatus === 'beta-testing';
    const isValidStatus = !isHidden && (isComingSoon || isPublishVisible || isAdminMode);

    const isNotManualTemplate = project.id !== '00000000-0000-0000-0000-000000000000';

    const p = project as unknown as { is_standard?: boolean; name?: string };
    const isStandardByFlag = !!p.is_standard;
    const isStandardById = project.id === '00000000-0000-0000-0000-000000000001';
    const isStandardByName =
      typeof p.name === 'string' && p.name.trim().toLowerCase() === 'standard project foundation';
    const isNotStandardFoundation = !(isStandardByFlag || isStandardById || isStandardByName);

    return isValidStatus && isNotManualTemplate && isNotStandardFoundation;
  });

  let finalProjects: Project[] = filteredFromDb;

  if (!isAdminMode) {
    const byFamily = new Map<string, Project>();
    for (const project of filteredFromDb) {
      const p = project as unknown as {
        parent_project_id?: string | null;
        parentProjectId?: string | null;
      };
      const rootId = p.parent_project_id || p.parentProjectId || project.id;
      const existing = byFamily.get(rootId);
      if (!existing) {
        byFamily.set(rootId, project);
      } else {
        const winner = pickCatalogFamilyWinner(existing, project);
        byFamily.set(rootId, winner);
      }
    }
    finalProjects = Array.from(byFamily.values());
  }

  return [...finalProjects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
