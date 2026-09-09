/**
 * Achievement catalog (no public.achievements table). Unlocks use user_achievements.achievement_id.
 * IDs are stable UUIDs so existing rows keep matching after deploys.
 *
 * Craft model (Strava/Garmin-inspired):
 * - Volume: lifetime completed project runs
 * - Trade: category mastery (Local Legend rail)
 * - Peak: High-effort / Advanced / Professional finishes
 * - Cadence: busy month / year
 * - Evidence: photos on finished jobs (not raw upload counts)
 * - Stewardship: home maintenance + punch-list discipline
 *
 * XP model (summary):
 * - Milestone achievements grant base_xp (and points) once when unlocked.
 * - Project completion also grants variable XP via calculateXPForProject
 *   plus a repeat-completion bonus for every finished project.
 */

export type AchievementShelf =
  | 'volume'
  | 'trade'
  | 'peak'
  | 'cadence'
  | 'evidence'
  | 'stewardship';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementShelf;
  icon: string;
  points: number;
  base_xp: number;
  scales_with_project_size: boolean;
  criteria: Record<string, unknown>;
}

/** Aggregates loaded for non–project-run criteria (evidence, tasks, maintenance). */
export interface UserAchievementStats {
  documentedFinishes: number;
  beforeAfterFinishes: number;
  tasksClosed: number;
  maintenanceCompletions: number;
}

export const ACHIEVEMENT_SHELF_LABELS: Record<AchievementShelf, string> = {
  volume: 'Volume',
  trade: 'Trade',
  peak: 'Peak',
  cadence: 'Cadence',
  evidence: 'Evidence',
  stewardship: 'Upkeep',
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // —— Shop volume (completion ladder) ——
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'First Finish',
    description: 'Complete your first home improvement project run.',
    category: 'volume',
    icon: 'Trophy',
    points: 50,
    base_xp: 120,
    scales_with_project_size: false,
    criteria: { project_count: 1 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Hat Trick',
    description: 'Complete three project runs.',
    category: 'volume',
    icon: 'Medal',
    points: 100,
    base_xp: 220,
    scales_with_project_size: false,
    criteria: { project_count: 3 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Shop Rhythm',
    description: 'Complete five project runs.',
    category: 'volume',
    icon: 'Repeat',
    points: 160,
    base_xp: 320,
    scales_with_project_size: false,
    criteria: { project_count: 5 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    name: 'Decade in the Shop',
    description: 'Complete ten home improvement project runs.',
    category: 'volume',
    icon: 'Award',
    points: 240,
    base_xp: 480,
    scales_with_project_size: false,
    criteria: { project_count: 10 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000002',
    name: 'Quarter-Century Shop',
    description: 'Complete twenty-five project runs.',
    category: 'volume',
    icon: 'Trophy',
    points: 400,
    base_xp: 800,
    scales_with_project_size: false,
    criteria: { project_count: 25 },
  },

  // —— Trade mastery ——
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Trade Repeat',
    description: 'Complete two runs in the same project category.',
    category: 'trade',
    icon: 'Layers',
    points: 90,
    base_xp: 170,
    scales_with_project_size: false,
    criteria: { category_repeat: 2 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    name: 'Multi-Trade',
    description: 'Complete runs in at least three different categories.',
    category: 'trade',
    icon: 'Grid3x3',
    points: 140,
    base_xp: 280,
    scales_with_project_size: false,
    criteria: { category_breadth: 3 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    name: 'Shop Regular',
    description: 'Complete five or more runs in a single category.',
    category: 'trade',
    icon: 'TrendingUp',
    points: 200,
    base_xp: 400,
    scales_with_project_size: true,
    criteria: { category_depth: 5 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    name: 'Brush Hand',
    description: 'Complete two Painting & Finishing project runs.',
    category: 'trade',
    icon: 'Paintbrush',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'Painting & Finishing', project_count: 2 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001c',
    name: 'Tile Setter',
    description: 'Complete two Tile project runs.',
    category: 'trade',
    icon: 'Grid3x3',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'Tile', project_count: 2 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001d',
    name: 'Pipe Fit',
    description: 'Complete two Plumbing project runs.',
    category: 'trade',
    icon: 'Droplet',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'Plumbing', project_count: 2 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001e',
    name: 'Circuit Sense',
    description: 'Complete two Electrical project runs.',
    category: 'trade',
    icon: 'Zap',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'Electrical', project_count: 2 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001f',
    name: 'Plumb Line',
    description: 'Complete two Interior Carpentry project runs.',
    category: 'trade',
    icon: 'Hammer',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'Interior Carpentry', project_count: 2 },
  },

  // —— Hard effort & skill (peak) ——
  {
    id: 'b1000000-0000-4000-8000-000000000003',
    name: 'Heavy Lift',
    description: 'Complete a High-effort project run.',
    category: 'peak',
    icon: 'Zap',
    points: 75,
    base_xp: 160,
    scales_with_project_size: false,
    criteria: { effort_completions: { minCount: 1, level: 'High' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000004',
    name: 'Three Heavy Lifts',
    description: 'Complete three High-effort project runs.',
    category: 'peak',
    icon: 'Zap',
    points: 180,
    base_xp: 360,
    scales_with_project_size: false,
    criteria: { effort_completions: { minCount: 3, level: 'High' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000005',
    name: 'Advanced Ticket',
    description: 'Complete an Advanced-skill project run.',
    category: 'peak',
    icon: 'TrendingUp',
    points: 80,
    base_xp: 170,
    scales_with_project_size: false,
    criteria: { skill_completions: { minCount: 1, level: 'Advanced' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000006',
    name: 'Pro Ticket',
    description: 'Complete a Professional-skill project run.',
    category: 'peak',
    icon: 'Star',
    points: 95,
    base_xp: 200,
    scales_with_project_size: false,
    criteria: { skill_completions: { minCount: 1, level: 'Professional' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000020',
    name: 'Pro Bench',
    description: 'Complete three Professional-skill project runs.',
    category: 'peak',
    icon: 'Star',
    points: 220,
    base_xp: 450,
    scales_with_project_size: false,
    criteria: { skill_completions: { minCount: 3, level: 'Professional' } },
  },

  // —— Cadence ——
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    name: 'Hot Month',
    description: 'Complete two or more runs in the last 30 days.',
    category: 'cadence',
    icon: 'Calendar',
    points: 110,
    base_xp: 200,
    scales_with_project_size: false,
    criteria: { projects_in_month: 2 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    name: 'Seasoned Year',
    description: 'Complete six or more runs in the last year.',
    category: 'cadence',
    icon: 'Star',
    points: 220,
    base_xp: 460,
    scales_with_project_size: false,
    criteria: { projects_in_year: 6 },
  },

  // —— Jobsite evidence ——
  {
    id: 'b1000000-0000-4000-8000-000000000007',
    name: 'Documented Finish',
    description: 'Complete a project run with at least one jobsite photo.',
    category: 'evidence',
    icon: 'Camera',
    points: 55,
    base_xp: 115,
    scales_with_project_size: false,
    criteria: { documented_finishes: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000008',
    name: 'Before & After',
    description: 'Complete a project run with both before and after photos.',
    category: 'evidence',
    icon: 'Camera',
    points: 90,
    base_xp: 190,
    scales_with_project_size: false,
    criteria: { before_after_finishes: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000009',
    name: 'Portfolio Builder',
    description: 'Complete five documented project finishes.',
    category: 'evidence',
    icon: 'Camera',
    points: 180,
    base_xp: 360,
    scales_with_project_size: false,
    criteria: { documented_finishes: 5 },
  },

  // —— Home stewardship ——
  {
    id: 'b1000000-0000-4000-8000-000000000019',
    name: 'Upkeep',
    description: 'Complete your first home maintenance check-off.',
    category: 'stewardship',
    icon: 'Droplet',
    points: 30,
    base_xp: 65,
    scales_with_project_size: false,
    criteria: { maintenance_completions: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001a',
    name: 'Preventive Cadence',
    description: 'Complete 10 home maintenance check-offs.',
    category: 'stewardship',
    icon: 'Droplet',
    points: 90,
    base_xp: 185,
    scales_with_project_size: false,
    criteria: { maintenance_completions: 10 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001b',
    name: 'Year-Round Steward',
    description: 'Complete 25 home maintenance check-offs.',
    category: 'stewardship',
    icon: 'Home',
    points: 160,
    base_xp: 320,
    scales_with_project_size: false,
    criteria: { maintenance_completions: 25 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000010',
    name: 'Punch List Cleared',
    description: 'Close 25 home tasks.',
    category: 'stewardship',
    icon: 'ClipboardList',
    points: 95,
    base_xp: 195,
    scales_with_project_size: false,
    criteria: { tasks_closed: 25 },
  },
];

const byId = new Map(ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a]));

const SHELF_ORDER: AchievementShelf[] = [
  'volume',
  'trade',
  'peak',
  'cadence',
  'evidence',
  'stewardship',
];

/** Aliases so older run category strings still match trade badges. */
const CATEGORY_ALIASES: Record<string, string[]> = {
  'painting & finishing': ['painting & finishing', 'painting', 'paint'],
  tile: ['tile', 'tiling'],
  plumbing: ['plumbing'],
  electrical: ['electrical', 'lighting & electrical'],
  'interior carpentry': ['interior carpentry', 'carpentry'],
};

function normalizeCategoryKey(raw: string): string {
  return raw.trim().toLowerCase();
}

function categoryKeysForProject(p: Record<string, unknown>): string[] {
  const c = p.category;
  if (typeof c === 'string') return [normalizeCategoryKey(c)];
  if (Array.isArray(c)) return c.map((x) => normalizeCategoryKey(String(x)));
  return [];
}

function projectMatchesCategory(p: Record<string, unknown>, want: string): boolean {
  const wantKey = normalizeCategoryKey(want);
  const aliases = CATEGORY_ALIASES[wantKey] ?? [wantKey];
  const projectKeys = categoryKeysForProject(p);
  return projectKeys.some((pk) => aliases.some((a) => pk === a || pk.includes(a)));
}

export function achievementDefinitionById(id: string): AchievementDefinition | undefined {
  return byId.get(id);
}

export function achievementDefinitionsSorted(): AchievementDefinition[] {
  return [...ACHIEVEMENT_DEFINITIONS].sort((a, b) => {
    const ai = SHELF_ORDER.indexOf(a.category);
    const bi = SHELF_ORDER.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.points - b.points || a.name.localeCompare(b.name);
  });
}

function rowEffortLevel(p: Record<string, unknown>): string {
  const v = p.effort_level;
  return typeof v === 'string' ? v : '';
}

function rowSkillLevel(p: Record<string, unknown>): string {
  const v = p.skill_level;
  return typeof v === 'string' ? v : '';
}

function endDate(p: Record<string, unknown>): Date | null {
  const raw = p.actual_end_date ?? p.end_date;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stagePhotoCount(photos: unknown, stage: 'before' | 'during' | 'after'): number {
  if (!photos || typeof photos !== 'object') return 0;
  const arr = (photos as Record<string, unknown>)[stage];
  return Array.isArray(arr) ? arr.length : 0;
}

/** Whether a completed run has any jobsite photo evidence. */
export function runHasDocumentation(p: Record<string, unknown>): boolean {
  const gallery = p.project_photos;
  if (stagePhotoCount(gallery, 'before') > 0) return true;
  if (stagePhotoCount(gallery, 'during') > 0) return true;
  if (stagePhotoCount(gallery, 'after') > 0) return true;
  const n = p._photo_count;
  return typeof n === 'number' && n > 0;
}

export function runHasBeforeAndAfter(p: Record<string, unknown>): boolean {
  const gallery = p.project_photos;
  return stagePhotoCount(gallery, 'before') > 0 && stagePhotoCount(gallery, 'after') > 0;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

/** Partial progress toward a ladder badge (for achievements UI). */
export function achievementProgress(
  criteria: Record<string, unknown>,
  completedProjects: Record<string, unknown>[],
  stats: UserAchievementStats | null
): AchievementProgress | null {
  if (criteria.documented_finishes !== undefined) {
    const target = Number(criteria.documented_finishes);
    return { current: stats?.documentedFinishes ?? 0, target };
  }
  if (criteria.before_after_finishes !== undefined) {
    const target = Number(criteria.before_after_finishes);
    return { current: stats?.beforeAfterFinishes ?? 0, target };
  }
  if (criteria.tasks_closed !== undefined) {
    const target = Number(criteria.tasks_closed);
    return { current: stats?.tasksClosed ?? 0, target };
  }
  if (criteria.maintenance_completions !== undefined) {
    const target = Number(criteria.maintenance_completions);
    return { current: stats?.maintenanceCompletions ?? 0, target };
  }
  if (criteria.effort_completions !== undefined && typeof criteria.effort_completions === 'object') {
    const ec = criteria.effort_completions as { minCount?: number; level?: string };
    const target = typeof ec.minCount === 'number' ? ec.minCount : 1;
    const level = typeof ec.level === 'string' ? ec.level : '';
    const current = completedProjects.filter(
      (p) => rowEffortLevel(p).toLowerCase() === level.toLowerCase()
    ).length;
    return { current, target };
  }
  if (criteria.skill_completions !== undefined && typeof criteria.skill_completions === 'object') {
    const sc = criteria.skill_completions as { minCount?: number; level?: string };
    const target = typeof sc.minCount === 'number' ? sc.minCount : 1;
    const level = typeof sc.level === 'string' ? sc.level : '';
    const current = completedProjects.filter(
      (p) => rowSkillLevel(p).toLowerCase() === level.toLowerCase()
    ).length;
    return { current, target };
  }
  if (criteria.category && criteria.project_count !== undefined && typeof criteria.project_count === 'number') {
    const target = criteria.project_count;
    const current = completedProjects.filter((p) => projectMatchesCategory(p, String(criteria.category))).length;
    return { current, target };
  }
  if (
    criteria.project_count !== undefined &&
    typeof criteria.project_count === 'number' &&
    !criteria.category
  ) {
    return { current: completedProjects.length, target: criteria.project_count };
  }
  if (criteria.projects_in_month !== undefined && typeof criteria.projects_in_month === 'number') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const current = completedProjects.filter((p) => {
      const d = endDate(p);
      return d !== null && d >= oneMonthAgo;
    }).length;
    return { current, target: criteria.projects_in_month };
  }
  if (criteria.projects_in_year !== undefined && typeof criteria.projects_in_year === 'number') {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const current = completedProjects.filter((p) => {
      const d = endDate(p);
      return d !== null && d >= oneYearAgo;
    }).length;
    return { current, target: criteria.projects_in_year };
  }
  if (criteria.category_repeat !== undefined && typeof criteria.category_repeat === 'number') {
    const categoryCounts = countByCategory(completedProjects);
    const best = Math.max(0, ...Object.values(categoryCounts));
    return { current: best, target: criteria.category_repeat };
  }
  if (criteria.category_depth !== undefined && typeof criteria.category_depth === 'number') {
    const categoryCounts = countByCategory(completedProjects);
    const best = Math.max(0, ...Object.values(categoryCounts));
    return { current: best, target: criteria.category_depth };
  }
  if (criteria.category_breadth !== undefined && typeof criteria.category_breadth === 'number') {
    const unique = new Set<string>();
    for (const p of completedProjects) {
      for (const k of categoryKeysForProject(p)) unique.add(k);
    }
    return { current: unique.size, target: criteria.category_breadth };
  }
  return null;
}

function countByCategory(completedProjects: Record<string, unknown>[]): Record<string, number> {
  return completedProjects.reduce<Record<string, number>>((acc, p) => {
    for (const k of categoryKeysForProject(p)) {
      acc[k] = (acc[k] || 0) + 1;
    }
    return acc;
  }, {});
}

/** Whether the user satisfies this achievement's criteria. */
export function achievementCriteriaMet(
  criteria: Record<string, unknown>,
  completedProjects: Record<string, unknown>[],
  stats: UserAchievementStats | null
): boolean {
  const progress = achievementProgress(criteria, completedProjects, stats);
  if (progress) {
    return progress.current >= progress.target;
  }
  return false;
}
