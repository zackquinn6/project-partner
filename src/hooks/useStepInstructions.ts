import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** DB row: content is JSONB array of { id, type, title, content } */
export interface StepInstructionRow {
  id: string;
  template_step_id: string;
  instruction_level: 'beginner' | 'intermediate' | 'advanced';
  content: unknown;
  created_at: string;
  updated_at: string;
}

/** Normalized shape for UI: sections array plus optional text/photos/videos/links */
export interface StepInstruction {
  id: string;
  template_step_id: string;
  instruction_level: 'beginner' | 'intermediate' | 'advanced';
  content: {
    text: string;
    sections: Array<{
      title: string;
      content: string;
      type?: 'warning' | 'tip' | 'standard';
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
  created_at: string;
  updated_at: string;
}

function normalizeContent(row: StepInstructionRow | null): StepInstruction | null {
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
    empty.sections = raw.map((s: { title?: string; content?: string; type?: string }) => ({
      title: s.title ?? '',
      content: s.content ?? '',
      type: (s.type as 'warning' | 'tip' | 'standard') || 'standard',
    }));
  } else if (raw && typeof raw === 'object' && 'sections' in (raw as object)) {
    const obj = raw as StepInstruction['content'];
    return {
      ...row,
      instruction_level: row.instruction_level as StepInstruction['instruction_level'],
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
    ...row,
    instruction_level: row.instruction_level as StepInstruction['instruction_level'],
    content: empty,
  };
}

export function useStepInstructions(stepId: string, instructionLevel: 'beginner' | 'intermediate' | 'advanced') {
  const [instruction, setInstruction] = useState<StepInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchInstruction() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('step_instructions')
          .select('*')
          .eq('template_step_id', stepId)
          .eq('instruction_level', instructionLevel)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setInstruction(normalizeContent(data as StepInstructionRow | null));
      } catch (err) {
        console.error('Error fetching step instruction:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch instruction'));
      } finally {
        setLoading(false);
      }
    }

    if (stepId) {
      fetchInstruction();
    }
  }, [stepId, instructionLevel]);

  return { instruction, loading, error };
}
