/**
 * Achievement catalog (no public.achievements table). Unlocks use user_achievements.achievement_id.
 * IDs are stable UUIDs so existing rows keep matching after deploys.
 *
 * XP model (summary):
 * - Milestone achievements grant base_xp (and points) once when unlocked.
 * - Project completion also grants variable XP via calculateXPForProject (steps, size, difficulty)
 *   plus a repeat-completion bonus for every finished project, even when no new badge unlocks.
 * - Home task completion grants XP per close (diy level & priority), separate from this catalog.
 */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  base_xp: number;
  scales_with_project_size: boolean;
  criteria: Record<string, unknown>;
}

/** Aggregates loaded for non–project-run criteria (photos, profile, tasks, etc.). */
export interface UserAchievementStats {
  photoCount: number;
  toolsInLibrary: number;
  tasksClosed: number;
  homesCount: number;
  risksLogged: number;
  linkedTasksCount: number;
  maintenanceCompletions: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // —— Core project completion ladder (IDs a100…001–009 preserved) ——
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'First Finish',
    description: 'Complete your first home improvement project run.',
    category: 'foundational',
    icon: 'Trophy',
    points: 50,
    base_xp: 120,
    scales_with_project_size: false,
    criteria: { project_count: 1 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Triple Threat',
    description: 'Complete three project runs.',
    category: 'frequency',
    icon: 'Medal',
    points: 100,
    base_xp: 220,
    scales_with_project_size: false,
    criteria: { project_count: 3 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Steady Builder',
    description: 'Complete five project runs.',
    category: 'frequency',
    icon: 'Repeat',
    points: 160,
    base_xp: 320,
    scales_with_project_size: false,
    criteria: { project_count: 5 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Category Focus',
    description: 'Complete two runs in the same project category.',
    category: 'overlapping',
    icon: 'Layers',
    points: 90,
    base_xp: 170,
    scales_with_project_size: false,
    criteria: { category_repeat: 2 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    name: 'Well Rounded',
    description: 'Complete runs in at least three different categories.',
    category: 'skill',
    icon: 'Grid3x3',
    points: 140,
    base_xp: 280,
    scales_with_project_size: false,
    criteria: { category_breadth: 3 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    name: 'Go Deep',
    description: 'Complete three or more runs in a single category.',
    category: 'scale',
    icon: 'TrendingUp',
    points: 165,
    base_xp: 340,
    scales_with_project_size: true,
    criteria: { category_depth: 3 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    name: 'Paint Pro',
    description: 'Complete two painting-category runs.',
    category: 'legacy',
    icon: 'Paintbrush',
    points: 85,
    base_xp: 150,
    scales_with_project_size: false,
    criteria: { category: 'painting', project_count: 2 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    name: 'Busy Month',
    description: 'Complete two or more runs in the last 30 days.',
    category: 'frequency',
    icon: 'Calendar',
    points: 110,
    base_xp: 200,
    scales_with_project_size: false,
    criteria: { projects_in_month: 2 },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    name: 'Year of Projects',
    description: 'Complete four or more runs in the last year.',
    category: 'legacy',
    icon: 'Star',
    points: 200,
    base_xp: 420,
    scales_with_project_size: false,
    criteria: { projects_in_year: 4 },
  },

  // —— Extended project volume ——
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    name: 'Ten & Counting',
    description: 'Complete ten home improvement project runs.',
    category: 'frequency',
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
    category: 'frequency',
    icon: 'Trophy',
    points: 400,
    base_xp: 800,
    scales_with_project_size: false,
    criteria: { project_count: 25 },
  },

  // —— Effort & skill (maps to project_runs.effort_level / skill_level) ——
  {
    id: 'b1000000-0000-4000-8000-000000000003',
    name: 'Heavy Hitter',
    description: 'Complete your first High-effort project run.',
    category: 'skill',
    icon: 'Zap',
    points: 75,
    base_xp: 160,
    scales_with_project_size: false,
    criteria: { effort_completions: { minCount: 1, level: 'High' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000004',
    name: 'Triple Heavy',
    description: 'Complete three High-effort project runs.',
    category: 'scale',
    icon: 'Zap',
    points: 180,
    base_xp: 360,
    scales_with_project_size: false,
    criteria: { effort_completions: { minCount: 3, level: 'High' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000005',
    name: 'Advanced Debut',
    description: 'Complete your first Advanced-skill project run.',
    category: 'skill',
    icon: 'TrendingUp',
    points: 80,
    base_xp: 170,
    scales_with_project_size: false,
    criteria: { skill_completions: { minCount: 1, level: 'Advanced' } },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000006',
    name: 'Pro Debut',
    description: 'Complete your first Professional-skill project run.',
    category: 'skill',
    icon: 'Star',
    points: 95,
    base_xp: 200,
    scales_with_project_size: false,
    criteria: { skill_completions: { minCount: 1, level: 'Professional' } },
  },

  // —— Documentation & photos (project_photos) ——
  {
    id: 'b1000000-0000-4000-8000-000000000007',
    name: 'First Snapshot',
    description: 'Upload your first project photo.',
    category: 'documentation',
    icon: 'Camera',
    points: 30,
    base_xp: 65,
    scales_with_project_size: false,
    criteria: { photos_total: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000008',
    name: 'Growing Album',
    description: 'Capture 5 project photos.',
    category: 'documentation',
    icon: 'Camera',
    points: 45,
    base_xp: 95,
    scales_with_project_size: false,
    criteria: { photos_total: 5 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000009',
    name: 'Jobsite Journalist',
    description: 'Capture 25 project photos.',
    category: 'documentation',
    icon: 'Camera',
    points: 90,
    base_xp: 190,
    scales_with_project_size: false,
    criteria: { photos_total: 25 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000000a',
    name: 'Century Frame',
    description: 'Capture 100 project photos.',
    category: 'documentation',
    icon: 'Camera',
    points: 220,
    base_xp: 450,
    scales_with_project_size: false,
    criteria: { photos_total: 100 },
  },

  // —— Tool library (user_profiles.owned_tools) ——
  {
    id: 'b1000000-0000-4000-8000-00000000000b',
    name: 'Tool Rookie',
    description: 'Add 10 tools to your library.',
    category: 'planning',
    icon: 'Wrench',
    points: 40,
    base_xp: 85,
    scales_with_project_size: false,
    criteria: { tools_in_library: 10 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000000c',
    name: 'Well Equipped',
    description: 'Add 25 tools to your library.',
    category: 'planning',
    icon: 'Wrench',
    points: 70,
    base_xp: 140,
    scales_with_project_size: false,
    criteria: { tools_in_library: 25 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000000d',
    name: 'Full Shed',
    description: 'Add 100 tools to your library.',
    category: 'planning',
    icon: 'Wrench',
    points: 200,
    base_xp: 400,
    scales_with_project_size: false,
    criteria: { tools_in_library: 100 },
  },

  // —— Home tasks ——
  {
    id: 'b1000000-0000-4000-8000-00000000000e',
    name: 'Task Checked Off',
    description: 'Complete your first home task.',
    category: 'homelab',
    icon: 'ClipboardList',
    points: 25,
    base_xp: 55,
    scales_with_project_size: false,
    criteria: { tasks_closed: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000000f',
    name: 'Honey-Do Flow',
    description: 'Complete 10 home tasks.',
    category: 'homelab',
    icon: 'ClipboardList',
    points: 55,
    base_xp: 115,
    scales_with_project_size: false,
    criteria: { tasks_closed: 10 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000010',
    name: 'Household Operator',
    description: 'Complete 25 home tasks.',
    category: 'homelab',
    icon: 'ClipboardList',
    points: 95,
    base_xp: 195,
    scales_with_project_size: false,
    criteria: { tasks_closed: 25 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000011',
    name: 'Closing Machine',
    description: 'Complete 100 home tasks.',
    category: 'homelab',
    icon: 'ClipboardList',
    points: 250,
    base_xp: 500,
    scales_with_project_size: false,
    criteria: { tasks_closed: 100 },
  },

  // —— Homes & linking ——
  {
    id: 'b1000000-0000-4000-8000-000000000012',
    name: 'Two Roofs',
    description: 'Add a second home to your workspace.',
    category: 'homelab',
    icon: 'Home',
    points: 60,
    base_xp: 125,
    scales_with_project_size: false,
    criteria: { homes_count: 2 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000013',
    name: 'Project Linker',
    description: 'Link at least one home task to a project run.',
    category: 'planning',
    icon: 'Link2',
    points: 45,
    base_xp: 95,
    scales_with_project_size: false,
    criteria: { linked_tasks: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000014',
    name: 'Orchestrator',
    description: 'Keep 5 or more tasks linked to projects.',
    category: 'planning',
    icon: 'Network',
    points: 100,
    base_xp: 210,
    scales_with_project_size: false,
    criteria: { linked_tasks: 5 },
  },

  // —— Risk register ——
  {
    id: 'b1000000-0000-4000-8000-000000000015',
    name: 'Risk Planner',
    description: 'Log your first risk on a project run.',
    category: 'risk',
    icon: 'Shield',
    points: 35,
    base_xp: 75,
    scales_with_project_size: false,
    criteria: { risks_logged: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000016',
    name: 'What-If Vault',
    description: 'Log 10 risks across your projects.',
    category: 'risk',
    icon: 'Shield',
    points: 85,
    base_xp: 175,
    scales_with_project_size: false,
    criteria: { risks_logged: 10 },
  },
  {
    id: 'b1000000-0000-4000-8000-000000000017',
    name: 'Risk Archivist',
    description: 'Log 50 risks across your projects.',
    category: 'risk',
    icon: 'Shield',
    points: 200,
    base_xp: 400,
    scales_with_project_size: false,
    criteria: { risks_logged: 50 },
  },

  // —— Budget ——
  {
    id: 'b1000000-0000-4000-8000-000000000018',
    name: 'Budget Minded',
    description: 'Complete a run that used a budget with line items.',
    category: 'planning',
    icon: 'PiggyBank',
    points: 55,
    base_xp: 115,
    scales_with_project_size: false,
    criteria: { budgeted_project_completions: 1 },
  },

  // —— Maintenance ——
  {
    id: 'b1000000-0000-4000-8000-000000000019',
    name: 'Upkeep Starter',
    description: 'Complete your first home maintenance task check-off.',
    category: 'homelab',
    icon: 'Droplet',
    points: 30,
    base_xp: 65,
    scales_with_project_size: false,
    criteria: { maintenance_completions: 1 },
  },
  {
    id: 'b1000000-0000-4000-8000-00000000001a',
    name: 'Preventive Streak',
    description: 'Complete 10 home maintenance task check-offs.',
    category: 'homelab',
    icon: 'Droplet',
    points: 90,
    base_xp: 185,
    scales_with_project_size: false,
    criteria: { maintenance_completions: 10 },
  },
];

const byId = new Map(ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a]));

export function achievementDefinitionById(id: string): AchievementDefinition | undefined {
  return byId.get(id);
}

export function achievementDefinitionsSorted(): AchievementDefinition[] {
  return [...ACHIEVEMENT_DEFINITIONS].sort((a, b) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    return a.name.localeCompare(b.name);
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

function budgetHasLineItems(p: Record<string, unknown>): boolean {
  const raw = p.budget_data;
  if (!raw || typeof raw !== 'object') return false;
  const lineItems = (raw as { lineItems?: unknown }).lineItems;
  return Array.isArray(lineItems) && lineItems.length > 0;
}

/** Whether the user satisfies this achievement's criteria. */
export function achievementCriteriaMet(
  criteria: Record<string, unknown>,
  completedProjects: Record<string, unknown>[],
  stats: UserAchievementStats | null
): boolean {
  if (criteria.photos_total !== undefined) {
    const n = Number(criteria.photos_total);
    return stats !== null && stats.photoCount >= n;
  }
  if (criteria.tools_in_library !== undefined) {
    const n = Number(criteria.tools_in_library);
    return stats !== null && stats.toolsInLibrary >= n;
  }
  if (criteria.tasks_closed !== undefined) {
    const n = Number(criteria.tasks_closed);
    return stats !== null && stats.tasksClosed >= n;
  }
  if (criteria.homes_count !== undefined) {
    const n = Number(criteria.homes_count);
    return stats !== null && stats.homesCount >= n;
  }
  if (criteria.risks_logged !== undefined) {
    const n = Number(criteria.risks_logged);
    return stats !== null && stats.risksLogged >= n;
  }
  if (criteria.linked_tasks !== undefined) {
    const n = Number(criteria.linked_tasks);
    return stats !== null && stats.linkedTasksCount >= n;
  }
  if (criteria.maintenance_completions !== undefined) {
    const n = Number(criteria.maintenance_completions);
    return stats !== null && stats.maintenanceCompletions >= n;
  }

  if (criteria.effort_completions !== undefined && typeof criteria.effort_completions === 'object') {
    const ec = criteria.effort_completions as { minCount?: number; level?: string };
    const minCount = typeof ec.minCount === 'number' ? ec.minCount : 1;
    const level = typeof ec.level === 'string' ? ec.level : '';
    const n = completedProjects.filter(
      (p) => rowEffortLevel(p).toLowerCase() === level.toLowerCase()
    ).length;
    return n >= minCount;
  }

  if (criteria.skill_completions !== undefined && typeof criteria.skill_completions === 'object') {
    const sc = criteria.skill_completions as { minCount?: number; level?: string };
    const minCount = typeof sc.minCount === 'number' ? sc.minCount : 1;
    const level = typeof sc.level === 'string' ? sc.level : '';
    const n = completedProjects.filter(
      (p) => rowSkillLevel(p).toLowerCase() === level.toLowerCase()
    ).length;
    return n >= minCount;
  }

  if (criteria.budgeted_project_completions !== undefined) {
    const n = Number(criteria.budgeted_project_completions);
    return completedProjects.filter((p) => budgetHasLineItems(p)).length >= n;
  }

  if (criteria.category && criteria.project_count !== undefined && typeof criteria.project_count === 'number') {
    const cat = String(criteria.category);
    const need = criteria.project_count;
    const categoryProjects = completedProjects.filter((p) => {
      const c = p.category;
      if (typeof c === 'string') return c.toLowerCase() === cat.toLowerCase();
      if (Array.isArray(c)) return c.some((x) => String(x).toLowerCase() === cat.toLowerCase());
      return false;
    });
    return categoryProjects.length >= need;
  }

  if (
    criteria.project_count !== undefined &&
    typeof criteria.project_count === 'number' &&
    !criteria.category
  ) {
    return completedProjects.length >= criteria.project_count;
  }

  if (criteria.difficulty !== undefined) {
    const want = String(criteria.difficulty);
    const min =
      typeof criteria.difficulty_count === 'number' && criteria.difficulty_count > 0
        ? criteria.difficulty_count
        : 1;
    const n = completedProjects.filter((p) => {
      if (rowSkillLevel(p) === want) return true;
      if (rowEffortLevel(p) === want) return true;
      return false;
    }).length;
    return n >= min;
  }

  if (criteria.projects_in_month !== undefined && typeof criteria.projects_in_month === 'number') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recentProjects = completedProjects.filter((p) => {
      const d = endDate(p);
      return d !== null && d >= oneMonthAgo;
    });
    return recentProjects.length >= criteria.projects_in_month;
  }

  if (criteria.projects_in_year !== undefined && typeof criteria.projects_in_year === 'number') {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearProjects = completedProjects.filter((p) => {
      const d = endDate(p);
      return d !== null && d >= oneYearAgo;
    });
    return yearProjects.length >= criteria.projects_in_year;
  }

  if (criteria.category_repeat !== undefined && typeof criteria.category_repeat === 'number') {
    const categoryCounts = completedProjects.reduce<Record<string, number>>((acc, p) => {
      const c = p.category;
      if (typeof c === 'string') {
        acc[c] = (acc[c] || 0) + 1;
      } else if (Array.isArray(c)) {
        for (const x of c) {
          const k = String(x);
          acc[k] = (acc[k] || 0) + 1;
        }
      }
      return acc;
    }, {});
    return Object.values(categoryCounts).some((count) => count >= criteria.category_repeat);
  }

  if (criteria.category_depth !== undefined && typeof criteria.category_depth === 'number') {
    const categoryCounts = completedProjects.reduce<Record<string, number>>((acc, p) => {
      const c = p.category;
      if (typeof c === 'string') {
        acc[c] = (acc[c] || 0) + 1;
      } else if (Array.isArray(c)) {
        for (const x of c) {
          const k = String(x);
          acc[k] = (acc[k] || 0) + 1;
        }
      }
      return acc;
    }, {});
    return Object.values(categoryCounts).some((count) => count >= criteria.category_depth);
  }

  if (criteria.category_breadth !== undefined && typeof criteria.category_breadth === 'number') {
    const unique = new Set<string>();
    for (const p of completedProjects) {
      const c = p.category;
      if (typeof c === 'string') unique.add(c);
      else if (Array.isArray(c)) for (const x of c) unique.add(String(x));
    }
    return unique.size >= criteria.category_breadth;
  }

  return false;
}
