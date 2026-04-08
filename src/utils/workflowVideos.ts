import { supabase } from "@/integrations/supabase/client";
import { parseTrustedVideoEmbedSource } from "@/utils/videoEmbedSanitizer";

export type WorkflowVideoItem = {
  id: string;
  stepId: string;
  stepTitle: string;
  phaseName: string;
  operationName: string;
  instructionLevel: string;
  sectionTitle?: string;
  raw: string;
};

export function extractVideoPayloadsFromInstructionContent(
  content: unknown
): { title?: string; raw: string }[] {
  const out: { title?: string; raw: string }[] = [];
  if (!content) return out;
  if (Array.isArray(content)) {
    for (const s of content) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      if (o.type === "video" && typeof o.content === "string" && o.content.trim()) {
        out.push({
          title: typeof o.title === "string" ? o.title : undefined,
          raw: o.content.trim(),
        });
      }
    }
    return out;
  }
  if (typeof content === "object" && content !== null && "sections" in content) {
    const sec = (content as { sections?: unknown }).sections;
    if (Array.isArray(sec)) {
      return extractVideoPayloadsFromInstructionContent(sec);
    }
  }
  if (typeof content === "object" && content !== null && "videos" in content) {
    const vids = (content as { videos?: unknown }).videos;
    if (Array.isArray(vids)) {
      for (const v of vids) {
        if (!v || typeof v !== "object") continue;
        const vo = v as Record<string, unknown>;
        const embed = typeof vo.embed === "string" ? vo.embed.trim() : "";
        const url = typeof vo.url === "string" ? vo.url.trim() : "";
        const raw = embed || url;
        if (!raw) continue;
        out.push({
          title: typeof vo.title === "string" ? vo.title : undefined,
          raw,
        });
      }
    }
  }
  return out;
}

function extractEmbeddedStepVideos(step: {
  contentSections?: unknown;
  content?: unknown;
}): { title?: string; raw: string }[] {
  const out: { title?: string; raw: string }[] = [];
  if (Array.isArray(step.contentSections)) {
    out.push(...extractVideoPayloadsFromInstructionContent(step.contentSections));
  }
  if (Array.isArray(step.content)) {
    out.push(...extractVideoPayloadsFromInstructionContent(step.content));
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    r.push(arr.slice(i, i + size));
  }
  return r;
}

function levelRank(lvl: string): number {
  if (lvl === "beginner") return 0;
  if (lvl === "intermediate") return 1;
  if (lvl === "advanced") return 2;
  return 3;
}

function dedupeWorkflowVideos(items: WorkflowVideoItem[]): WorkflowVideoItem[] {
  const ranked = [...items].sort((a, b) => levelRank(a.instructionLevel) - levelRank(b.instructionLevel));
  const seen = new Set<string>();
  const out: WorkflowVideoItem[] = [];
  for (const it of ranked) {
    const parsed = parseTrustedVideoEmbedSource(it.raw);
    const key = parsed ? `${it.stepId}::${parsed.src}` : `${it.stepId}::raw::${it.raw.slice(0, 160)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export async function loadAllWorkflowVideos(
  steps: Array<{
    id: string;
    step: string;
    phaseName: string;
    operationName: string;
    contentSections?: unknown;
    content?: unknown;
  }>,
  options: { mode: "template" } | { mode: "run"; projectRunId: string }
): Promise<WorkflowVideoItem[]> {
  const items: WorkflowVideoItem[] = [];
  let nonce = 0;
  const meta = new Map(
    steps.map((s) => [
      s.id,
      { stepTitle: s.step, phaseName: s.phaseName, operationName: s.operationName },
    ])
  );

  for (const step of steps) {
    const payloads = extractEmbeddedStepVideos(step);
    for (const p of payloads) {
      items.push({
        id: `emb-${step.id}-${nonce++}`,
        stepId: step.id,
        stepTitle: step.step,
        phaseName: step.phaseName,
        operationName: step.operationName,
        instructionLevel: "step data",
        sectionTitle: p.title,
        raw: p.raw,
      });
    }
  }

  const stepIds = [...new Set(steps.map((s) => s.id))];
  if (stepIds.length === 0) {
    return dedupeWorkflowVideos(items);
  }

  for (const idChunk of chunk(stepIds, 80)) {
    const q =
      options.mode === "template"
        ? await supabase
            .from("step_instructions")
            .select("step_id, instruction_level, content")
            .in("step_id", idChunk)
        : await supabase
            .from("project_run_step_instructions")
            .select("template_step_id, instruction_level, content")
            .eq("project_run_id", options.projectRunId)
            .in("template_step_id", idChunk);

    if (q.error) {
      throw q.error;
    }

    for (const row of q.data ?? []) {
      const stepId =
        options.mode === "template"
          ? (row as { step_id: string }).step_id
          : (row as { template_step_id: string }).template_step_id;
      const instructionLevel = (row as { instruction_level: string }).instruction_level;
      const content = (row as { content: unknown }).content;
      const ctx = meta.get(stepId);
      if (!ctx) continue;
      const payloads = extractVideoPayloadsFromInstructionContent(content);
      for (const p of payloads) {
        items.push({
          id: `db-${stepId}-${instructionLevel}-${nonce++}`,
          stepId,
          stepTitle: ctx.stepTitle,
          phaseName: ctx.phaseName,
          operationName: ctx.operationName,
          instructionLevel,
          sectionTitle: p.title,
          raw: p.raw,
        });
      }
    }
  }

  return dedupeWorkflowVideos(items);
}
