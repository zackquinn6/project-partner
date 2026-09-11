import { useEffect, useMemo, useState } from 'react';
import type { GeneralProjectDecision, Phase } from '@/interfaces/Project';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import {
  parseGeneralProjectDecisionsFromPrerequisites,
  filterGeneralDecisionsForPhases,
  type GeneralProjectChoicesMap,
} from '@/utils/generalProjectDecisions';
import {
  parseInstructionSectionsFromContentJson,
  type InstructionSectionLike,
} from '@/utils/microDecisionVisibility';
import { supabase } from '@/integrations/supabase/client';

const CHOICES_KEY = 'generalProjectChoices';

export interface WorkflowMicroDecisionsState {
  loading: boolean;
  /** Decisions relevant to the current run's phases (incorporated / filtered). */
  catalog: GeneralProjectDecision[];
  /** User selections from customization_decisions. */
  choices: GeneralProjectChoicesMap;
  /** template_step_id -> instruction sections meta from project_run_step_instructions */
  instructionSectionsByStepId: Map<string, InstructionSectionLike[]>;
  /** True when we should filter steps/tools/sections for the runner. */
  shouldApply: boolean;
}

function customizationDecisionsKey(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function choicesAreEmpty(choices: GeneralProjectChoicesMap): boolean {
  return Object.keys(choices).length === 0;
}

export function useWorkflowMicroDecisions(
  projectRunId: string | undefined,
  templateProjectId: string | undefined,
  instructionLevel: 'beginner' | 'intermediate' | 'advanced',
  phases: Phase[] | undefined,
  customizationDecisionsRaw: unknown
): WorkflowMicroDecisionsState {
  const hasIds = Boolean(projectRunId && templateProjectId);
  const [loading, setLoading] = useState(hasIds);
  const [allDecisions, setAllDecisions] = useState<GeneralProjectDecision[]>([]);
  const [choices, setChoices] = useState<GeneralProjectChoicesMap>({});
  const [instructionSectionsByStepId, setInstructionSectionsByStepId] = useState(
    () => new Map<string, InstructionSectionLike[]>()
  );

  // Object identity of customization_decisions / phases must not retrigger fetches.
  const decisionsKey = customizationDecisionsKey(customizationDecisionsRaw);

  useEffect(() => {
    if (!projectRunId || !templateProjectId) {
      // Only reset when something is actually populated — new [] / {} / Map() every
      // time would schedule a re-render and can amplify parent open/close races into
      // "Maximum update depth exceeded".
      setLoading((prev) => (prev ? false : prev));
      setAllDecisions((prev) => (prev.length === 0 ? prev : []));
      setChoices((prev) => (choicesAreEmpty(prev) ? prev : {}));
      setInstructionSectionsByStepId((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }

    let cancelled = false;
    setLoading((prev) => (prev ? prev : true));

    void (async () => {
      try {
        const [projRes, instrRes] = await Promise.all([
          supabase
            .from('projects')
            .select('scheduling_prerequisites')
            .eq('id', templateProjectId)
            .maybeSingle(),
          supabase
            .from('project_run_step_instructions')
            .select('template_step_id, content')
            .eq('project_run_id', projectRunId)
            .eq('instruction_level', instructionLevel),
        ]);

        if (cancelled) return;

        const decisions = parseGeneralProjectDecisionsFromPrerequisites(
          projRes.data?.scheduling_prerequisites
        );

        const parsed = parseCustomizationDecisions(customizationDecisionsRaw);
        const rawChoices = parsed[CHOICES_KEY];
        const nextChoices: GeneralProjectChoicesMap =
          rawChoices && typeof rawChoices === 'object' && !Array.isArray(rawChoices)
            ? (Object.fromEntries(
                Object.entries(rawChoices as Record<string, unknown>).filter(
                  ([k, v]) => typeof k === 'string' && k.length > 0 && typeof v === 'string' && v.length > 0
                )
              ) as GeneralProjectChoicesMap)
            : {};

        const sectionsByStepId = new Map<string, InstructionSectionLike[]>();
        for (const row of instrRes.data || []) {
          const sid = row.template_step_id as string;
          if (!sid) continue;
          sectionsByStepId.set(sid, parseInstructionSectionsFromContentJson(row.content));
        }

        setAllDecisions(decisions);
        setChoices(nextChoices);
        setInstructionSectionsByStepId(sectionsByStepId);
        setLoading(false);
      } catch (e) {
        console.error('useWorkflowMicroDecisions', e);
        if (!cancelled) {
          setAllDecisions((prev) => (prev.length === 0 ? prev : []));
          setChoices((prev) => (choicesAreEmpty(prev) ? prev : {}));
          setInstructionSectionsByStepId((prev) => (prev.size === 0 ? prev : new Map()));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // customizationDecisionsRaw is read inside; decisionsKey is the stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decisionsKey stands in for customizationDecisionsRaw
  }, [projectRunId, templateProjectId, instructionLevel, decisionsKey]);

  const catalog = useMemo(
    () => filterGeneralDecisionsForPhases(allDecisions, phases),
    [allDecisions, phases]
  );

  const shouldApply = catalog.length > 0 && Object.keys(choices).length > 0;

  return {
    loading,
    catalog,
    choices,
    instructionSectionsByStepId,
    shouldApply,
  };
}
