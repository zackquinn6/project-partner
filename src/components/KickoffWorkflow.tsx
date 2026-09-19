import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { DIYProfileStep } from './KickoffSteps/DIYProfileStep';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';
import { ProjectProfileStep } from './KickoffSteps/ProjectProfileStep';
import {
  ProjectToolsStep,
  type PlanningToolId,
  normalizePlanningToolsSelection,
  DEFAULT_PLANNING_TOOLS_SELECTION,
} from './KickoffSteps/ProjectToolsStep';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { parseCustomizationDecisions } from '@/utils/customizationDecisions';
import { ProjectPlanningCountdownBanner } from '@/components/ProjectPlanningCountdownBanner';
import { PlanningJourneyHeader } from '@/components/PlanningJourneyHeader';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { reportUserFacingError } from '@/utils/errorReporting';
import { computeProjectMatchExplanation } from '@/utils/projectMatchRecommendation';
import { cn } from '@/lib/utils';

/** Passed when finishing kickoff on step 4 so UserView does not use a stale customization_decisions closure. */
export type KickoffCompletePersist = {
  customization_decisions: ProjectRun['customization_decisions'];
};

/** continue-planning = full Plan backlog; skip-to-workflow = Scope-only Planning Studio (workflow blocked until Scope done). */
export type KickoffCompleteMode = 'continue-planning' | 'skip-to-workflow';

export type KickoffCompletePayload = {
  mode: KickoffCompleteMode;
  persist?: KickoffCompletePersist;
};

const KICKOFF_STEP_DEFINITIONS: {
  id: string;
  title: string;
  shortLabel: string;
  promise: string;
}[] = [
  {
    id: 'kickoff-step-1',
    title: 'Project Match',
    shortLabel: 'Match',
    promise: "Get a feel for the work and decide if it's a fit for you",
  },
  {
    id: 'kickoff-step-2',
    title: 'Profile',
    shortLabel: 'Profile',
    promise: 'Setup your profile and currently owned tools',
  },
  {
    id: 'kickoff-step-3',
    title: 'Goals',
    shortLabel: 'Goals',
    promise: "Size it, date it, budget it. We'll shape the plan around this.",
  },
  {
    id: 'kickoff-step-4',
    title: 'Plan Setup',
    shortLabel: 'Plan Setup',
    promise: "Pick the steps you'll run next in the planning studio.",
  },
];

interface KickoffWorkflowProps {
  onKickoffComplete: (payload: KickoffCompletePayload) => void | Promise<void>;
  onExit?: () => void; // Add optional exit handler
  /**
   * Called synchronously immediately before the final DB save that marks all kickoff steps complete.
   * Use this to open Planning Studio so a render never sees kickoff-complete with the studio still closed.
   * Only invoked for continue-planning (not skip).
   */
  onBeforeFinalKickoffPersistence?: () => void;
  /** Return from Discover to Planning Studio (Plan) when kickoff was already finished. */
  onReturnToPlanningStudio?: () => void;
}
export const KickoffWorkflow: React.FC<KickoffWorkflowProps> = ({
  onKickoffComplete,
  onExit,
  onBeforeFinalKickoffPersistence,
  onReturnToPlanningStudio,
}) => {
  const {
    currentProjectRun,
    updateProjectRun,
  } = useProject();
  const { user, loading: authLoading } = useAuth();
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled } = usePartnerAppSettings();
  const [kickoffOrderResolved, setKickoffOrderResolved] = useState(false);
  const [kickoffStepOrder, setKickoffStepOrder] = useState<'profile_first' | 'match_first'>('match_first');
  const [currentKickoffStep, setCurrentKickoffStep] = useState(0);
  /** Highest step index the user has entered sequentially (inclusive). */
  const [maxReachedKickoffStep, setMaxReachedKickoffStep] = useState(0);
  const [completedKickoffSteps, setCompletedKickoffSteps] = useState<Set<number>>(new Set());
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  const [selectedPlanningTools, setSelectedPlanningTools] = useState<PlanningToolId[]>([
    ...DEFAULT_PLANNING_TOOLS_SELECTION,
  ]);
  /** user_profiles.skill_level / physical_capability - sole source for Match "Your level". */
  const [profileSkillLevel, setProfileSkillLevel] = useState<string | null>(null);
  const [profilePhysicalCapability, setProfilePhysicalCapability] = useState<string | null>(null);
  const [profileReloadToken, setProfileReloadToken] = useState(0);
  const [matchProjectMeta, setMatchProjectMeta] = useState<{
    skillLevel: string | null;
    effortLevel: string | null;
    challenges: string | null;
  }>({ skillLevel: null, effortLevel: null, challenges: null });
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);
  /** Tracks which run id we last hydrated completion UI for (avoid wiping checks on remount churn). */
  const hydratedCompletionRunIdRef = useRef<string | null>(null);

  const kickoffSteps = useMemo(() => {
    const copy = KICKOFF_STEP_DEFINITIONS.map((s) => ({ ...s }));
    if (kickoffStepOrder === 'profile_first') {
      return [copy[1], copy[0], copy[2], copy[3]];
    }
    return copy;
  }, [kickoffStepOrder]);

  useEffect(() => {
    if (!currentProjectRun?.id) {
      setKickoffOrderResolved(true);
      setKickoffStepOrder('match_first');
      return;
    }
    if (!user?.id) {
      setKickoffOrderResolved(true);
      setKickoffStepOrder('match_first');
      return;
    }
    let cancelled = false;
    setKickoffOrderResolved(false);
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('survey_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        await reportUserFacingError({
          source: 'kickoff',
          operation: 'load_step_order_profile',
          userId: user.id,
          projectRunId: currentProjectRun.id,
          error,
          userMessage: 'Failed to load kickoff setup.',
          notificationTitle: 'Kickoff profile load failed',
        });
        setKickoffStepOrder('match_first');
        setKickoffOrderResolved(true);
        return;
      }
      const profileDone = Boolean(data?.survey_completed_at);
      setKickoffStepOrder(profileDone ? 'match_first' : 'profile_first');
      setKickoffOrderResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectRun?.id, user?.id]);

  // Load Match "Your level" fields only from user_profiles (no run/template fallbacks).
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setProfileSkillLevel(null);
      setProfilePhysicalCapability(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('skill_level, physical_capability')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        await reportUserFacingError({
          source: 'kickoff',
          operation: 'load_match_user_profile',
          userId: user.id,
          projectRunId: currentProjectRun?.id,
          error,
          userMessage: 'Failed to load your profile skill and effort levels.',
          notificationTitle: 'Kickoff profile load failed',
        });
        setProfileSkillLevel(null);
        setProfilePhysicalCapability(null);
        return;
      }
      const skill =
        typeof data?.skill_level === 'string' && data.skill_level.trim() !== ''
          ? data.skill_level.trim()
          : null;
      const capability =
        typeof data?.physical_capability === 'string' && data.physical_capability.trim() !== ''
          ? data.physical_capability.trim()
          : null;
      setProfileSkillLevel(skill);
      setProfilePhysicalCapability(capability);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, profileReloadToken, currentProjectRun?.id]);

  useEffect(() => {
    const onProfileUpdated = () => setProfileReloadToken((t) => t + 1);
    window.addEventListener('user-profile-updated', onProfileUpdated);
    return () => window.removeEventListener('user-profile-updated', onProfileUpdated);
  }, []);

  // Load project skill/effort/challenges for shell-level fit summary (same inputs as Match step).
  useEffect(() => {
    const projectId = currentProjectRun?.projectId;
    if (!projectId) {
      setMatchProjectMeta({ skillLevel: null, effortLevel: null, challenges: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('skill_level, effort_level, project_challenges')
        .eq('id', projectId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setMatchProjectMeta({ skillLevel: null, effortLevel: null, challenges: null });
        return;
      }
      setMatchProjectMeta({
        skillLevel:
          typeof data?.skill_level === 'string' && data.skill_level.trim() !== ''
            ? data.skill_level.trim()
            : null,
        effortLevel:
          typeof data?.effort_level === 'string' && data.effort_level.trim() !== ''
            ? data.effort_level.trim()
            : null,
        challenges:
          typeof data?.project_challenges === 'string' && data.project_challenges.trim() !== ''
            ? data.project_challenges.trim()
            : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectRun?.projectId]);

  // Initialize completed steps from project run data when project or step order changes
  useEffect(() => {
    if (!kickoffOrderResolved || !currentProjectRun?.id) return;
    if (isCompletingStepRef.current) return;

    const runId = currentProjectRun.id;
    const isNewHydration = hydratedCompletionRunIdRef.current !== runId;
    if (isNewHydration) {
      hydratedCompletionRunIdRef.current = runId;
    }

    const completedIndices = new Set<number>();
    const persisted = currentProjectRun.completedSteps || [];
    kickoffSteps.forEach((step, index) => {
      if (persisted.includes(step.id)) {
        completedIndices.add(index);
      }
    });

    if (isNewHydration) {
      setCompletedKickoffSteps(completedIndices);
      const completedMax =
        completedIndices.size > 0 ? Math.max(...Array.from(completedIndices)) : -1;
      if (completedIndices.size < kickoffSteps.length) {
        const firstIncomplete = kickoffSteps.findIndex((_, index) => !completedIndices.has(index));
        if (firstIncomplete !== -1) {
          setCurrentKickoffStep(firstIncomplete);
          setMaxReachedKickoffStep(Math.max(firstIncomplete, completedMax, 0));
        } else {
          setMaxReachedKickoffStep(Math.max(completedMax, 0));
        }
      } else {
        setMaxReachedKickoffStep(Math.max(kickoffSteps.length - 1, completedMax, 0));
      }
      return;
    }

    // Same run: only add completions from persistence - never remove local checkmarks
    setCompletedKickoffSteps((prev) => {
      let changed = false;
      const next = new Set(prev);
      completedIndices.forEach((idx) => {
        if (!next.has(idx)) {
          next.add(idx);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [currentProjectRun?.id, currentProjectRun?.completedSteps, kickoffOrderResolved, kickoffSteps, kickoffStepOrder]);

  const handleStepComplete = async (stepIndex: number, selectedTools?: PlanningToolId[]) => {
    if (!currentProjectRun) {
      console.error("❌ handleStepComplete: currentProjectRun is null/undefined!");
      return;
    }

    // Set flag to prevent useEffect from overwriting during completion
    isCompletingStepRef.current = true;
    try {
      const stepId = kickoffSteps[stepIndex].id;

      // Resolve workflow step by stable kickoff id (display order may swap steps 1 and 2)
      const kickoffPhase = currentProjectRun.phases.find(p => p.name === 'Kickoff');
      let actualStepId = stepId;
      if (kickoffPhase?.operations?.length) {
        const allKickoffSteps = kickoffPhase.operations.flatMap(op => op.steps || []);
        const matched = allKickoffSteps.find(s => s.id === stepId);
        if (matched) {
          actualStepId = matched.id;
        }
      }

      // Merge completions from DB + context + local UI so a stale snapshot cannot drop prior steps
      const { data: freshRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('completed_steps, initial_budget, initial_timeline, initial_sizing, initial_quality_goal')
        .eq('id', currentProjectRun.id)
        .single();

      if (fetchError) {
        console.error('Error fetching project run before kickoff step complete:', fetchError);
      }

      const parseCompleted = (raw: unknown): string[] => {
        if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === 'string');
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const fromDb = parseCompleted(freshRun?.completed_steps);
      const fromContext = Array.isArray(currentProjectRun.completedSteps)
        ? currentProjectRun.completedSteps.filter((id): id is string => typeof id === 'string')
        : [];
      const fromLocalUi = [...completedKickoffSteps]
        .map((idx) => kickoffSteps[idx]?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      const newCompletedSteps = [
        ...new Set([...fromDb, ...fromContext, ...fromLocalUi, stepId, actualStepId]),
      ];

      // Derive UI completion from the list we are about to persist - not from React state, which can be stale
      // when users advance quickly and would otherwise leave finishingEntireKickoff false after the last step.
      const pendingCompletedIds = new Set(newCompletedSteps);
      const newCompletedKickoffSteps = new Set<number>();
      kickoffSteps.forEach((s, idx) => {
        if (pendingCompletedIds.has(s.id)) {
          newCompletedKickoffSteps.add(idx);
        }
      });
      setCompletedKickoffSteps(newCompletedKickoffSteps);

      const preservedBudget = freshRun?.initial_budget ?? (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
      const preservedTimeline = freshRun?.initial_timeline ?? (currentProjectRun as any)?.initial_timeline ?? (currentProjectRun as any)?.initialTimeline ?? null;
      const preservedSizing = freshRun?.initial_sizing ?? (currentProjectRun as any)?.initial_sizing ?? (currentProjectRun as any)?.initialSizing ?? null;
      const preservedQualityGoal =
        freshRun?.initial_quality_goal ??
        (currentProjectRun as any)?.initial_quality_goal ??
        null;

      // Step 4: persist planning tools the user sees (parent state can be [] until ProjectToolsStep syncs).
      const existingDecisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
      let customization_decisions: typeof currentProjectRun.customization_decisions =
        currentProjectRun.customization_decisions;
      if (stepId === 'kickoff-step-4') {
        let tools: PlanningToolId[] | undefined = Array.isArray(selectedTools) ? selectedTools : undefined;
        if (!tools || tools.length === 0) {
          const persisted = existingDecisions.selected_planning_tools;
          if (Array.isArray(persisted) && persisted.length > 0) {
            tools = persisted as PlanningToolId[];
          } else {
            tools = [...DEFAULT_PLANNING_TOOLS_SELECTION];
          }
        }
        const normalized = normalizePlanningToolsSelection(
          tools,
          partnerAppsEnabled,
          expertSupportEnabled,
          toolRentalsEnabled,
          wasteRemovalEnabled
        );
        customization_decisions = { ...existingDecisions, selected_planning_tools: normalized } as any;
      }

      // Update project run with completed step - WAIT for completion
      const totalStepsForProgress = getTotalStepsCount();
      const updatedProjectRun = {
        ...currentProjectRun,
        // Resuming after "Not a fit" returns the run to an active kickoff status
        status: currentProjectRun.status === 'not-a-fit' ? 'not-started' : currentProjectRun.status,
        completedSteps: newCompletedSteps,
        progress:
          totalStepsForProgress > 0
            ? Math.round((newCompletedSteps.length / totalStepsForProgress) * 100)
            : currentProjectRun.progress,
        // CRITICAL: Always include initial_budget, initial_timeline, initial_sizing, initial_quality_goal (even if null)
        initial_budget: preservedBudget,
        initial_timeline: preservedTimeline,
        initial_sizing: preservedSizing,
        initial_quality_goal: preservedQualityGoal,
        ...(customization_decisions !== undefined && { customization_decisions }),
        updatedAt: new Date()
      };

      const finishingEntireKickoff = newCompletedKickoffSteps.size === kickoffSteps.length;
      const kickoffUiIds = [
        'kickoff-step-1',
        'kickoff-step-2',
        'kickoff-step-3',
        'kickoff-step-4',
      ] as const;
      const allKickoffUiPresent = kickoffUiIds.every((id) => newCompletedSteps.includes(id));

      // Optimistic context write first so Planning Studio never mounts with empty tools,
      // then open the studio before awaiting the network round-trip.
      const savePromise = updateProjectRun(updatedProjectRun);
      if (finishingEntireKickoff && allKickoffUiPresent) {
        onBeforeFinalKickoffPersistence?.();
      }
      await savePromise;

      // Check if all kickoff steps are complete
      if (newCompletedKickoffSteps.size === kickoffSteps.length) {
        // DEFENSIVE CHECK: Verify all 4 UI kickoff step IDs are in database
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
        const allIdsPresent = kickoffStepIds.every(id => newCompletedSteps.includes(id));
        if (!allIdsPresent) {
          console.error('❌ Not all kickoff step IDs present in database:', {
            expected: kickoffStepIds,
            actual: newCompletedSteps.filter(id => kickoffStepIds.includes(id))
          });
          toast.error('Error: Kickoff steps not properly saved');
          isCompletingStepRef.current = false;
          return;
        }

        await Promise.resolve(
          onKickoffComplete({
            mode: 'continue-planning',
            persist:
              stepId === 'kickoff-step-4'
                ? {
                    customization_decisions: customization_decisions as ProjectRun['customization_decisions'],
                  }
                : undefined,
          })
        );
        isCompletingStepRef.current = false;
      } else {
        // Move to next step if not already there
        if (stepIndex === currentKickoffStep && stepIndex < kickoffSteps.length - 1) {
          setCurrentKickoffStep(stepIndex + 1);
        }
        // Clear flag after short delay
        setTimeout(() => {
          isCompletingStepRef.current = false;
        }, 200);
      }
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'complete_kickoff_step',
        userId: user?.id,
        projectRunId: currentProjectRun.id,
        stepId: kickoffSteps[stepIndex]?.id ?? null,
        error,
        userMessage: 'Failed to save kickoff progress.',
        notificationTitle: 'Kickoff step save failed',
      });
      // Clear flag on error
      isCompletingStepRef.current = false;
    }
  };
  const persistSelectedPlanningTools = async (): Promise<PlanningToolId[]> => {
    if (!currentProjectRun) {
      return selectedPlanningTools;
    }

    const existingDecisions = parseCustomizationDecisions(currentProjectRun.customization_decisions);
    const persisted = existingDecisions.selected_planning_tools;
    const sourceTools: PlanningToolId[] =
      selectedPlanningTools.length > 0
        ? selectedPlanningTools
        : Array.isArray(persisted) && persisted.length > 0
          ? (persisted as PlanningToolId[])
          : [...DEFAULT_PLANNING_TOOLS_SELECTION];

    const normalized = normalizePlanningToolsSelection(
      sourceTools,
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );

    const customization_decisions = {
      ...existingDecisions,
      selected_planning_tools: normalized,
    } as typeof currentProjectRun.customization_decisions;

    // Skip write when nothing changed - still return the effective list for callers.
    const prev = Array.isArray(persisted) ? [...(persisted as string[])].sort().join(',') : '';
    const next = [...normalized].sort().join(',');
    if (prev !== next) {
      await updateProjectRun({
        ...currentProjectRun,
        customization_decisions,
        updatedAt: new Date(),
      });
    }

    setSelectedPlanningTools(normalized);
    return normalized;
  };

  const handleReturnToPlanningStudio = async () => {
    if (!onReturnToPlanningStudio) return;
    try {
      await persistSelectedPlanningTools();
      onReturnToPlanningStudio();
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'persist_planning_tools_before_studio',
        userId: user?.id,
        projectRunId: currentProjectRun?.id,
        stepId: 'kickoff-step-4',
        error,
        userMessage: 'Failed to save Planning Studio tools.',
        notificationTitle: 'Planning tools save failed',
      });
    }
  };

  const getTotalStepsCount = () => {
    if (!currentProjectRun) return kickoffSteps.length;
    const phases = Array.isArray(currentProjectRun.phases) ? currentProjectRun.phases : [];
    return phases.reduce((total, phase) => {
      return total + (phase.operations ?? []).reduce((opTotal, operation) => {
        return opTotal + (operation.steps ?? []).length;
      }, 0);
    }, 0);
  };

  /** Mark run Not a fit, clear kickoff progress, leave kickoff for catalog/dashboard. */
  const handleNotAMatch = async () => {
    if (!currentProjectRun) return;
    if (!user?.id) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'mark_not_a_fit',
        projectRunId: currentProjectRun.id,
        stepId: 'kickoff-step-1',
        error: new Error('Not signed in'),
        userMessage: 'You must be signed in to leave this project.',
        notificationTitle: 'Not a fit failed',
      });
      return;
    }

    try {
      const strippedSteps = (currentProjectRun.completedSteps || []).filter(
        (id) => !String(id).startsWith('kickoff-')
      );

      // Persist first so completed_steps replace is not re-merged from stale kickoff ids
      const { error } = await supabase
        .from('project_runs')
        .update({
          status: 'not-a-fit',
          completed_steps: strippedSteps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentProjectRun.id)
        .eq('user_id', user.id);

      if (error) throw error;

      try {
        await updateProjectRun({
          ...currentProjectRun,
          status: 'not-a-fit',
          completedSteps: strippedSteps,
          updatedAt: new Date(),
        });
      } finally {
        // Always leave kickoff after DB write; listing effect also clears not-a-fit.
        onExit?.();
      }
    } catch (error) {
      await reportUserFacingError({
        source: 'kickoff',
        operation: 'mark_not_a_fit',
        userId: user.id,
        projectRunId: currentProjectRun.id,
        stepId: 'kickoff-step-1',
        error,
        userMessage: 'Failed to mark project as Not a fit.',
        notificationTitle: 'Not a fit failed',
      });
    }
  };

  const currentStepId = kickoffSteps[currentKickoffStep]?.id;
  const currentStepPromise = kickoffSteps[currentKickoffStep]?.promise ?? '';

  const isStepCompleted = (stepIndex: number) => completedKickoffSteps.has(stepIndex);

  /** Allow any step already entered in sequence; block jumping past the frontier. */
  const canVisitKickoffStep = (index: number) => {
    if (index < 0 || index >= kickoffSteps.length) return false;
    return index <= maxReachedKickoffStep;
  };

  const goToKickoffStep = (index: number) => {
    if (!canVisitKickoffStep(index)) {
      toast.message('Finish the current step to continue');
      return;
    }
    setCurrentKickoffStep(index);
  };

  useEffect(() => {
    setMaxReachedKickoffStep((prev) => Math.max(prev, currentKickoffStep));
  }, [currentKickoffStep]);

  const matchExplanation = useMemo(
    () =>
      computeProjectMatchExplanation({
        projectSkillLevel: matchProjectMeta.skillLevel,
        userSkillLevel: profileSkillLevel,
        projectEffortLevel: matchProjectMeta.effortLevel,
        userPhysicalCapability: profilePhysicalCapability,
        projectChallengesText: matchProjectMeta.challenges,
      }),
    [
      matchProjectMeta.skillLevel,
      matchProjectMeta.effortLevel,
      matchProjectMeta.challenges,
      profileSkillLevel,
      profilePhysicalCapability,
    ]
  );

  const personalizeBlocked =
    currentStepId === 'kickoff-step-2' &&
    kickoffStepOrder === 'profile_first' &&
    !profileSkillLevel;
  const handleOutputToggle = (stepId: string, outputId: string) => {
    setCheckedOutputs(prev => {
      const stepOutputs = new Set(prev[stepId] || []);
      if (stepOutputs.has(outputId)) {
        stepOutputs.delete(outputId);
      } else {
        stepOutputs.add(outputId);
      }
      return {
        ...prev,
        [stepId]: stepOutputs
      };
    });
  };
  const renderCurrentStep = () => {
    const stepIndex = currentKickoffStep;
    const stepProps = {
      onComplete: () => {
        handleStepComplete(stepIndex);
      },
      isCompleted: isStepCompleted(currentKickoffStep),
      checkedOutputs: checkedOutputs[kickoffSteps[currentKickoffStep].id] || new Set(),
      onOutputToggle: (outputId: string) => handleOutputToggle(kickoffSteps[currentKickoffStep].id, outputId)
    };
    const existingDecisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
    const initialTools = (existingDecisions.selected_planning_tools as PlanningToolId[] | undefined) || [];

    switch (kickoffSteps[currentKickoffStep]?.id) {
      case 'kickoff-step-1':
        return (
          <ProjectOverviewStep
            {...stepProps}
            profileSkillLevel={profileSkillLevel}
            profilePhysicalCapability={profilePhysicalCapability}
            matchExplanationOverride={matchExplanation}
          />
        );
      case 'kickoff-step-2':
        return (
          <DIYProfileStep
            {...stepProps}
            onProfileSaved={() => setProfileReloadToken((t) => t + 1)}
          />
        );
      case 'kickoff-step-3':
        return <ProjectProfileStep {...stepProps} />;
      case 'kickoff-step-4':
        return (
          <ProjectToolsStep
            {...stepProps}
            compact
            onComplete={() => handleStepComplete(currentKickoffStep, selectedPlanningTools)}
            initialSelected={initialTools}
            onSelectionChange={setSelectedPlanningTools}
          />
        );
      default:
        return null;
    }
  };

  if (!currentProjectRun) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No project selected</CardContent>
        </Card>
      </div>
    );
  }

  if (!kickoffOrderResolved) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading kickoff…</CardContent>
        </Card>
      </div>
    );
  }

  const handlePrimaryContinue = async () => {
    if (personalizeBlocked) {
      toast.message('Complete your DIY profile to continue');
      return;
    }

    if (currentStepId === 'kickoff-step-3' && (window as any).__projectProfileStepSave) {
      try {
        await (window as any).__projectProfileStepSave();
        await new Promise((resolve) => setTimeout(resolve, 100));
        await handleStepComplete(currentKickoffStep);
        return;
      } catch (error) {
        await reportUserFacingError({
          source: 'kickoff',
          operation: 'save_project_profile_step',
          userId: user?.id,
          projectRunId: currentProjectRun?.id,
          stepId: currentStepId,
          error,
          userMessage: 'Failed to save project profile.',
          notificationTitle: 'Kickoff project profile save failed',
        });
        return;
      }
    }

    if (currentStepId === 'kickoff-step-4') {
      await handleStepComplete(currentKickoffStep, selectedPlanningTools);
      return;
    }

    await handleStepComplete(currentKickoffStep);
  };

  const continueLabel =
    currentStepId === 'kickoff-step-1'
      ? 'This fits - continue'
      : currentStepId === 'kickoff-step-2'
        ? 'Looks right - continue'
        : currentStepId === 'kickoff-step-3'
          ? 'Set - continue'
          : 'Start planning';

  /** Step 1 leaves the project entirely; later steps keep the run and jump to Scope. */
  const exitLabel =
    currentStepId === 'kickoff-step-1'
      ? 'Not a match - take me back to the catalog'
      : 'Skip to Scope Planning';

  const renderPrimaryActions = () => {
    /** Same-row exit (30%) + continue (70%). */
    const primaryButtonClass =
      'font-display h-14 min-h-14 max-h-14 w-full shrink-0 rounded-xl px-3 text-sm font-semibold leading-none';
    const exitButtonClass =
      'font-display h-14 min-h-14 max-h-14 w-full shrink-0 whitespace-normal rounded-xl px-2 text-center text-[11px] font-semibold leading-tight sm:text-xs';

    const handleExit = () => {
      if (currentStepId === 'kickoff-step-1') {
        void handleNotAMatch();
        return;
      }
      // Steps 2-4: leave Discover and open Scope in Planning Studio.
      onBeforeFinalKickoffPersistence?.();
      const existingDecisions = parseCustomizationDecisions(currentProjectRun?.customization_decisions);
      onKickoffComplete({
        mode: 'skip-to-workflow',
        persist: {
          customization_decisions: {
            ...existingDecisions,
            selected_planning_tools: ['scope'],
          } as ProjectRun['customization_decisions'],
        },
      });
    };

    let primary: React.ReactNode;

    if (!isStepCompleted(currentKickoffStep)) {
      primary = (
        <Button
          onClick={() => {
            void handlePrimaryContinue();
          }}
          disabled={personalizeBlocked}
          className={primaryButtonClass}
        >
          {continueLabel}
        </Button>
      );
    } else if (currentStepId === 'kickoff-step-4' && onReturnToPlanningStudio) {
      primary = (
        <Button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            void handleReturnToPlanningStudio();
          }}
        >
          Save tools & Open Planning Studio
        </Button>
      );
    } else {
      primary = (
        <button
          type="button"
          onClick={() => goToKickoffStep(currentKickoffStep)}
          className="flex h-14 min-h-14 max-h-14 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-success/30 bg-success/10 px-3 text-sm font-semibold leading-none text-success"
        >
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Step complete
        </button>
      );
    }

    return (
      <div className="grid h-14 w-full grid-cols-[3fr_7fr] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className={exitButtonClass}
          onClick={handleExit}
        >
          {exitLabel}
        </Button>
        <div className="min-w-0">{primary}</div>
      </div>
    );
  };

  const projectDisplayName =
    (typeof currentProjectRun.customProjectName === 'string' &&
      currentProjectRun.customProjectName.trim() !== ''
      ? currentProjectRun.customProjectName.trim()
      : null) ??
    (typeof currentProjectRun.name === 'string' && currentProjectRun.name.trim() !== ''
      ? currentProjectRun.name.trim()
      : 'Project');

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
      <div className="flex shrink-0 items-start justify-between gap-2">
        <Card className="min-w-0 flex-1">
          <CardContent className="space-y-2 p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <PlanningJourneyHeader
                activeStage="discover"
                className="min-w-0 flex-1"
                onPlanClick={
                  onReturnToPlanningStudio
                    ? () => {
                        void handleReturnToPlanningStudio();
                      }
                    : undefined
                }
              />
              <ProjectPlanningCountdownBanner
                minimal
                projectCreatedAt={currentProjectRun.createdAt}
                className="shrink-0"
              />
            </div>

            <h2 className="font-display truncate text-lg font-semibold leading-tight">
              {projectDisplayName}
            </h2>

            <div className="space-y-1.5" role="navigation" aria-label="Kickoff steps">
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                {kickoffSteps.map((step, index) => {
                  const isCurrent = index === currentKickoffStep;
                  const isDone = isStepCompleted(index);
                  const visitable = canVisitKickoffStep(index);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToKickoffStep(index)}
                      disabled={!visitable}
                      aria-label={`${step.title}, step ${index + 1}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'flex flex-col items-stretch gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        !visitable && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <span
                        className={cn(
                          'h-2.5 w-full rounded-full sm:h-3',
                          isDone && 'bg-primary',
                          isCurrent && !isDone && 'animate-pulse bg-primary/60',
                          !isDone && !isCurrent && 'bg-muted'
                        )}
                      />
                      <span
                        className={cn(
                          'inline-flex items-center justify-center gap-1 text-center text-xs leading-tight sm:text-sm',
                          isCurrent ? 'font-semibold text-primary' : isDone ? 'font-medium text-muted-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                        {step.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Fixed promise slot so step copy length does not shift the shell. */}
              <p className="min-h-10 text-sm leading-snug text-muted-foreground">
                {currentStepPromise ?? '\u00a0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="flex min-h-full flex-col">{renderCurrentStep()}</div>
        </div>
      </div>

      <Card className="z-10 h-[5.5rem] shrink-0 border-t bg-background">
        <CardContent className="flex h-full items-center p-3">{renderPrimaryActions()}</CardContent>
      </Card>
    </div>
  );
};
