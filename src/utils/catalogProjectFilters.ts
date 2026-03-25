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
  return typeof ps === 'string' ? ps : '';
}

/**
 * Which templates appear in the project catalog grid (`publishedProjects` in ProjectCatalog.tsx).
 * Pass `isAdminMode: true` to include non-published rows that catalog shows to admins.
 */
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
        revision_number?: number;
        revisionNumber?: number;
      };
      const rootId = p.parent_project_id || p.parentProjectId || project.id;
      const revisionNumber = p.revision_number ?? p.revisionNumber ?? 0;
      const existing = byFamily.get(rootId);
      if (!existing) {
        byFamily.set(rootId, project);
      } else {
        const ex = existing as unknown as { revision_number?: number; revisionNumber?: number };
        const existingRev = ex.revision_number ?? ex.revisionNumber ?? 0;
        if (revisionNumber > existingRev) {
          byFamily.set(rootId, project);
        }
      }
    }
    finalProjects = Array.from(byFamily.values());
  }

  return [...finalProjects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
