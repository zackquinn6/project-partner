import type { Project } from '@/interfaces/Project';
import type { Task } from '@/interfaces/Scheduling';

export type SchedulingTask = Task & {
  stepId?: string;
  metadata?: { spaceId?: string };
};

function spacePart(t: SchedulingTask): string {
  const sid = t.metadata?.spaceId;
  if (typeof sid === 'string' && sid.length > 0) return sid;
  return '__single__';
}

function classifyEntityId(project: Project, id: string): 'phase' | 'operation' | 'step' | null {
  for (const ph of project.phases) {
    if (ph.id === id) return 'phase';
    for (const op of ph.operations) {
      if (op.id === id) return 'operation';
      for (const st of op.steps) {
        if (st.id === id) return 'step';
      }
    }
  }
  return null;
}

function parsePrerequisites(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (ids.length > 0) out[k] = ids;
  }
  return out;
}

export { parsePrerequisites };

/**
 * When the decision-tree prerequisite map is empty, only within-operation (and space-flow)
 * edges exist — the engine may order work across operations/phases for efficiency.
 * When prerequisites are set, adds dependency edges so the scheduling engine's topological
 * sort enforces them (same space / single-space task ids).
 */
export function applySchedulingPrerequisiteDependencies(
  tasks: SchedulingTask[],
  prerequisites: Record<string, string[]>,
  project: Project
): SchedulingTask[] {
  if (Object.keys(prerequisites).length === 0) return tasks;

  const existingIds = new Set(tasks.map((t) => t.id));

  const stepToTaskId = new Map<string, string>();
  for (const t of tasks) {
    if (!t.stepId) continue;
    stepToTaskId.set(`${t.stepId}::${spacePart(t)}`, t.id);
  }

  const opToLastTaskId = new Map<string, string>();
  const opSpaceGroups = new Map<string, SchedulingTask[]>();
  for (const t of tasks) {
    if (!t.operationId) continue;
    const k = `${t.operationId}::${spacePart(t)}`;
    if (!opSpaceGroups.has(k)) opSpaceGroups.set(k, []);
    opSpaceGroups.get(k)!.push(t);
  }
  for (const [, list] of opSpaceGroups) {
    const opId = list[0].operationId;
    const op = project.phases.flatMap((p) => p.operations).find((o) => o.id === opId);
    if (!op || op.steps.length === 0) continue;
    let best: SchedulingTask | null = null;
    let bestIdx = -1;
    for (const t of list) {
      if (!t.stepId) continue;
      const idx = op.steps.findIndex((s) => s.id === t.stepId);
      if (idx > bestIdx) {
        bestIdx = idx;
        best = t;
      }
    }
    if (best) {
      const k = `${opId}::${spacePart(best)}`;
      opToLastTaskId.set(k, best.id);
    }
  }

  const phaseToLastTaskId = new Map<string, string>();
  const phaseSpaceGroups = new Map<string, SchedulingTask[]>();
  for (const t of tasks) {
    if (!t.phaseId) continue;
    const k = `${t.phaseId}::${spacePart(t)}`;
    if (!phaseSpaceGroups.has(k)) phaseSpaceGroups.set(k, []);
    phaseSpaceGroups.get(k)!.push(t);
  }
  for (const [, list] of phaseSpaceGroups) {
    const phaseId = list[0].phaseId;
    const phase = project.phases.find((p) => p.id === phaseId);
    if (!phase) continue;
    let best: SchedulingTask | null = null;
    let bestRank = -1;
    const rankOf = (t: SchedulingTask): number => {
      const opi = phase.operations.findIndex((o) => o.id === t.operationId);
      if (opi < 0) return -1;
      const op = phase.operations[opi];
      if (!t.stepId) return -1;
      const si = op.steps.findIndex((s) => s.id === t.stepId);
      if (si < 0) return -1;
      return opi * 1_000_000 + si;
    };
    for (const t of list) {
      const r = rankOf(t);
      if (r > bestRank) {
        bestRank = r;
        best = t;
      }
    }
    if (best) {
      phaseToLastTaskId.set(`${phaseId}::${spacePart(best)}`, best.id);
    }
  }

  const resolve = (predId: string, forTask: SchedulingTask): string | null => {
    const sk = spacePart(forTask);
    const kind = classifyEntityId(project, predId);
    if (kind === 'step') {
      const id = stepToTaskId.get(`${predId}::${sk}`);
      return id && existingIds.has(id) ? id : null;
    }
    if (kind === 'operation') {
      let id = opToLastTaskId.get(`${predId}::${sk}`);
      if (!id && sk !== '__single__') {
        id = opToLastTaskId.get(`${predId}::__single__`);
      }
      return id && existingIds.has(id) ? id : null;
    }
    if (kind === 'phase') {
      let id = phaseToLastTaskId.get(`${predId}::${sk}`);
      if (!id && sk !== '__single__') {
        id = phaseToLastTaskId.get(`${predId}::__single__`);
      }
      return id && existingIds.has(id) ? id : null;
    }
    return null;
  };

  const collectPredsForTask = (t: SchedulingTask): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    const entityKeys: (string | undefined)[] = [t.stepId, t.operationId, t.phaseId];
    for (const ent of entityKeys) {
      if (!ent) continue;
      const preds = prerequisites[ent];
      if (!preds || preds.length === 0) continue;
      for (const predId of preds) {
        const tid = resolve(predId, t);
        if (tid && tid !== t.id && !seen.has(tid)) {
          seen.add(tid);
          out.push(tid);
        }
      }
    }
    return out;
  };

  return tasks.map((t) => {
    const extra = collectPredsForTask(t);
    if (extra.length === 0) return t;
    const merged = [...t.dependencies];
    for (const d of extra) {
      if (!merged.includes(d)) merged.push(d);
    }
    return { ...t, dependencies: merged };
  });
}
