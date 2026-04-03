import { useEffect, useState } from 'react';
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
  stepHasVisibleInstructionContent,
  getVisibleInstructionSectionIds,
  filterToolsByVisibleSections,
  filterMaterialsByVisibleSections,
  getInstructionSectionsForStep,
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

const emptyState: WorkflowMicroDecisionsState = {
  loading: false,
  catalog: [],
  choices: {},
  instructionSectionsByStepId: new Map(),
  shouldApply: false,
};

export function useWorkflowMicroDecisions(
  projectRunId: string | undefined,
  templateProjectId: string | undefined,
  instructionLevel: 'beginner' | 'intermediate' | 'advanced',
  phases: Phase[] | undefined,
  customizationDecisionsRaw: unknown
): WorkflowMicroDecisionsState {
  const [state, setState] = useState<WorkflowMicroDecisionsState>({
    ...emptyState,
    loading: Boolean(projectRunId && templateProjectId),
  });

  useEffect(() => {
    if (!projectRunId || !templateProjectId) {
      setState(emptyState);
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

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

        const allDecisions = parseGeneralProjectDecisionsFromPrerequisites(
          projRes.data?.scheduling_prerequisites
        );
        const catalog = filterGeneralDecisionsForPhases(allDecisions, phases);

        const parsed = parseCustomizationDecisions(customizationDecisionsRaw);
        const rawChoices = parsed[CHOICES_KEY];
        const choices: GeneralProjectChoicesMap =
          rawChoices && typeof rawChoices === 'object' && !Array.isArray(rawChoices)
            ? Object.fromEntries(
                Object.entries(rawChoices as Record<string, unknown>).filter(
                  ([k, v]) => typeof k === 'string' && k.length > 0 && typeof v === 'string' && v.length > 0
                )
              )
            : {};

        const instructionSectionsByStepId = new Map<string, InstructionSectionLike[]>();
        for (const row of instrRes.data || []) {
          const sid = row.template_step_id as string;
          if (!sid) continue;
          const sections = parseInstructionSectionsFromContentJson(row.content);
          instructionSectionsByStepId.set(sid, sections);
        }

        const shouldApply = catalog.length > 0 && Object.keys(choices).length > 0;

        setState({
          loading: false,
          catalog,
          choices,
          instructionSectionsByStepId,
          shouldApply,
        });
      } catch (e) {
        console.error('useWorkflowMicroDecisions', e);
        if (!cancelled) {
          setState({ ...emptyState, loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectRunId, templateProjectId, instructionLevel, customizationDecisionsRaw, phases]);

  return state;
}
