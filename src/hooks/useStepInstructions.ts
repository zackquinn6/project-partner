import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** DB row: content is JSONB array of { id, type, title, content } */
export interface StepInstructionRow {
  content: unknown;
}

/** Normalized shape for UI: sections array plus optional text/photos/videos/links */
export interface StepInstruction {
  instruction_level: 'beginner' | 'intermediate' | 'advanced';
  content: {
    text: string;
    sections: Array<{
      title: string;
      content: string;
      type?: 'text' | 'image' | 'video' | 'link' | 'button' | 'safety-warning' | 'warning' | 'tip' | 'standard';
      width?: 'full' | 'half' | 'third' | 'two-thirds';
      alignment?: 'left' | 'center' | 'right';
      display_order?: number;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    }>;
    photos: Array<{
      url: string;
      caption: string;
      alt: string;
    }>;
    videos: Array<{
      url: string;
      title: string;
      embed?: string;
    }>;
    links: Array<{
      url: string;
      title: string;
      description?: string;
    }>;
  };
  id?: string;
  step_id?: string;
  created_at?: string;
  updated_at?: string;
}

function normalizeContent(row: StepInstructionRow | null, instructionLevel: StepInstruction['instruction_level']): StepInstruction | null {
  if (!row) return null;
  const raw = row.content;
  const empty = {
    text: '',
    sections: [] as StepInstruction['content']['sections'],
    photos: [] as StepInstruction['content']['photos'],
    videos: [] as StepInstruction['content']['videos'],
    links: [] as StepInstruction['content']['links'],
  };
  if (Array.isArray(raw) && raw.length > 0) {
    empty.sections = raw.map((s: { title?: string; content?: string; type?: string; width?: string; alignment?: string; display_order?: number; severity?: string }) => ({
      title: s.title ?? '',
      content: s.content ?? '',
      type: s.type as StepInstruction['content']['sections'][number]['type'],
      width: s.width as StepInstruction['content']['sections'][number]['width'],
      alignment: s.alignment as StepInstruction['content']['sections'][number]['alignment'],
      display_order: typeof s.display_order === 'number' ? s.display_order : undefined,
      severity: s.severity as StepInstruction['content']['sections'][number]['severity'],
    }))
    .sort((a, b) => {
      const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  } else if (raw && typeof raw === 'object' && 'sections' in (raw as object)) {
    const obj = raw as StepInstruction['content'];
    return {
      instruction_level: instructionLevel,
      content: {
        text: obj.text ?? '',
        sections: obj.sections ?? [],
        photos: obj.photos ?? [],
        videos: obj.videos ?? [],
        links: obj.links ?? [],
      },
    };
  }
  return {
    instruction_level: instructionLevel,
    content: empty,
  };
}

/**
 * When projectRunId is set, reads immutable snapshot from project_run_step_instructions
 * (template_step_id matches step ids embedded in project_runs.phases).
 */
export function useStepInstructions(
  stepId: string,
  instructionLevel: 'beginner' | 'intermediate' | 'advanced',
  projectRunId?: string | null
) {
  const [instruction, setInstruction] = useState<StepInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    async function fetchInstruction() {
      try {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        const fromRunSnapshot = Boolean(projectRunId);
        const { data, error: fetchError } = fromRunSnapshot
          ? await supabase
              .from('project_run_step_instructions')
              .select('content')
              .eq('project_run_id', projectRunId as string)
              .eq('template_step_id', stepId)
              .eq('instruction_level', instructionLevel)
              .maybeSingle()
          : await supabase
              .from('step_instructions')
              .select('content')
              .eq('step_id', stepId)
              .eq('instruction_level', instructionLevel)
              .maybeSingle();

        if (fetchError) throw fetchError;

        // Ignore stale responses (stepId/level may have changed while request was in flight)
        if (requestId !== requestIdRef.current) return;

        setInstruction(normalizeContent(data as StepInstructionRow | null, instructionLevel));
      } catch (err) {
        if (requestIdRef.current === 0) return;
        console.error('Error fetching step instruction:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch instruction'));
      } finally {
        // Only end loading state for the latest request
        setLoading(false);
      }
    }

    if (stepId) {
      fetchInstruction();
    }
  }, [stepId, instructionLevel, projectRunId]);

  return { instruction, loading, error };
}
