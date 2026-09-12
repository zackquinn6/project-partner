import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FolderKanban, PiggyBank, Award, Calendar } from 'lucide-react';

export const PLANNING_TOOL_IDS = [
  'scope',
  'schedule',
  'communication_plan',
  'risk',
  'budget',
  'shopping_list',
  'tool_rentals',
  'waste_removal',
  'quality_control',
  'expert_support'
] as const;

export const PLANNING_TOOLS: {
  id: (typeof PLANNING_TOOL_IDS)[number];
  label: string;
  benefit: string;
  /** One-line Definition of Done for the Planning Studio step. */
  doneWhen: string;
  /** Short label for the Planning Studio step strip (icons); defaults to `label`. */
  trackerLabel?: string;
}[] = [
  {
    id: 'scope',
    label: 'Customize',
    benefit: 'Shape the work to fit your situation',
    doneWhen: 'Scope choices are saved for this run',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    benefit: 'Set a realistic timeline',
    doneWhen: 'A working schedule is set',
  },
  {
    id: 'communication_plan',
    label: 'Communication Plan',
    trackerLabel: 'Comms',
    benefit: 'Decide who gets updates and how you will share progress',
    doneWhen: 'Who gets updates and how is decided',
  },
  {
    id: 'risk',
    label: 'Risk Radar',
    benefit: 'Proactively avoid issues',
    doneWhen: 'Key risks are reviewed and addressed',
  },
  {
    id: 'budget',
    label: 'Budget',
    benefit: 'Set a spending target you can track',
    doneWhen: 'Budget targets are set',
  },
  {
    id: 'shopping_list',
    label: 'Shopping',
    benefit: 'Track tool & material shopping',
    doneWhen: 'Shopping list is ready to use',
  },
  {
    id: 'tool_rentals',
    label: 'Tool Rental',
    benefit: 'Plan what to borrow or rent with rental options matched to your area',
    doneWhen: 'Rental needs are planned',
  },
  {
    id: 'waste_removal',
    label: 'Waste Removal',
    benefit: 'Plan disposal and debris handling during the project',
    doneWhen: 'Disposal plan is in place',
  },
  {
    id: 'quality_control',
    label: 'Quality',
    benefit: 'Document results for future inspections',
    doneWhen: 'Quality checks are configured',
  },
  {
    id: 'expert_support',
    label: 'Support',
    benefit: 'Setup on-call expert support for when you need help',
    doneWhen: 'Support preferences are set',
  },
];

export type PlanningToolId = (typeof PLANNING_TOOL_IDS)[number];

/** Kickoff step 4 grid: budget & tool rentals last; partner-gated tools still omitted when disabled. */
const KICKOFF_TOOLS_GRID_ORDER: PlanningToolId[] = [
  'scope',
  'risk',
  'schedule',
  'communication_plan',
  'shopping_list',
  'quality_control',
  'budget',
  'tool_rentals',
  'waste_removal',
  'expert_support',
];

export const DEFAULT_PLANNING_TOOLS_SELECTION: PlanningToolId[] = ['scope', 'risk'];

/** Preset tool sets by project focus. Scope is always included. */
const FOCUS_PRESETS: Record<string, PlanningToolId[]> = {
  savings: ['scope', 'budget', 'shopping_list', 'tool_rentals', 'waste_removal', 'risk'],
  quality: ['scope', 'quality_control', 'risk'],
  schedule: ['scope', 'schedule', 'communication_plan', 'risk'],
};

interface ProjectToolsStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  initialSelected?: PlanningToolId[];
  onSelectionChange?: (selected: PlanningToolId[]) => void;
  /** Kickoff step 4: smaller type and spacing so more fits in the viewport */
  compact?: boolean;
}

/** Exported for kickoff step 4 save when parent state has not received onSelectionChange yet. */
export function filterByPartnerAvailability(
  ids: PlanningToolId[],
  partnerAppsEnabled: boolean,
  expertSupportEnabled: boolean,
  toolRentalsEnabled: boolean,
  wasteRemovalEnabled: boolean
): PlanningToolId[] {
  return ids.filter(id => {
    if (!partnerAppsEnabled && (id === 'expert_support' || id === 'tool_rentals' || id === 'waste_removal')) return false;
    if (id === 'expert_support' && !expertSupportEnabled) return false;
    if (id === 'tool_rentals' && !toolRentalsEnabled) return false;
    if (id === 'waste_removal' && !wasteRemovalEnabled) return false;
    return true;
  });
}

function sortToolsForKickoffGrid(
  tools: (typeof PLANNING_TOOLS)[number][]
): (typeof PLANNING_TOOLS)[number][] {
  const order = new Map(KICKOFF_TOOLS_GRID_ORDER.map((id, i) => [id, i]));
  return [...tools].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export const ProjectToolsStep: React.FC<ProjectToolsStepProps> = ({
  onComplete,
  isCompleted,
  initialSelected = [],
  onSelectionChange,
  compact = false,
}) => {
  const { user } = useAuth();
  const { partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled } = usePartnerAppSettings();
  const [projectFocus, setProjectFocus] = useState<string | null>(null);

  const toolsToShow = React.useMemo(() => {
    const filtered = PLANNING_TOOLS.filter(t => {
      if (!partnerAppsEnabled && (t.id === 'expert_support' || t.id === 'tool_rentals' || t.id === 'waste_removal')) return false;
      if (t.id === 'expert_support' && !expertSupportEnabled) return false;
      if (t.id === 'tool_rentals' && !toolRentalsEnabled) return false;
      if (t.id === 'waste_removal' && !wasteRemovalEnabled) return false;
      return true;
    });
    return sortToolsForKickoffGrid(filtered);
  }, [partnerAppsEnabled, expertSupportEnabled, toolRentalsEnabled, wasteRemovalEnabled]);

  const [selected, setSelected] = useState<Set<PlanningToolId>>(() => {
    const initial = initialSelected.length > 0 ? initialSelected : DEFAULT_PLANNING_TOOLS_SELECTION;
    const filtered = filterByPartnerAvailability(
      initial,
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );
    return new Set(filtered as PlanningToolId[]);
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('project_focus')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data?.project_focus != null) setProjectFocus(data.project_focus);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const fromPersisted =
      initialSelected.length > 0 ? initialSelected : DEFAULT_PLANNING_TOOLS_SELECTION;
    const next = filterByPartnerAvailability(
      fromPersisted as PlanningToolId[],
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );
    setSelected(new Set(next));
    // Keep KickoffWorkflow.selectedPlanningTools aligned with what the user sees (defaults
    // included). Otherwise step 4 complete can save selected_planning_tools: [] and the
    // Planning Studio shows "no tools selected".
    onSelectionChange?.(next);
  }, [
    initialSelected.join(','),
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled,
    onSelectionChange,
  ]);

  const notifySelection = (next: Set<PlanningToolId>) => {
    const validToolIds = new Set(PLANNING_TOOL_IDS as unknown as string[]);
    const withScope = new Set(next);
    withScope.add('scope');
    if (!partnerAppsEnabled) {
      withScope.delete('expert_support');
      withScope.delete('tool_rentals');
      withScope.delete('waste_removal');
    } else {
      if (!expertSupportEnabled) withScope.delete('expert_support');
      if (!toolRentalsEnabled) withScope.delete('tool_rentals');
      if (!wasteRemovalEnabled) withScope.delete('waste_removal');
    }
    const cleaned = Array.from(withScope).filter(id => validToolIds.has(id as any)) as PlanningToolId[];
    onSelectionChange?.(cleaned);
  };

  const handleToggle = (id: PlanningToolId) => {
    if (id === 'scope') return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      notifySelection(next);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(
      PLANNING_TOOL_IDS.filter(id => {
        if (!partnerAppsEnabled && (id === 'expert_support' || id === 'tool_rentals' || id === 'waste_removal')) return false;
        if (id === 'expert_support' && !expertSupportEnabled) return false;
        if (id === 'tool_rentals' && !toolRentalsEnabled) return false;
        if (id === 'waste_removal' && !wasteRemovalEnabled) return false;
        return true;
      })
    );
    setSelected(all);
    notifySelection(all);
  };

  const handleFocusPreset = (focusKey: 'savings' | 'quality' | 'schedule') => {
    const ids = filterByPartnerAvailability(
      FOCUS_PRESETS[focusKey],
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled
      ,
      wasteRemovalEnabled
    );
    const next = new Set(ids as PlanningToolId[]);
    setSelected(next);
    notifySelection(next);
  };

  const handleClearAll = () => {
    const next = new Set<PlanningToolId>(['scope']);
    setSelected(next);
    notifySelection(next);
  };

  const recommendedIds = React.useMemo(() => {
    if (projectFocus === 'savings' || projectFocus === 'quality' || projectFocus === 'schedule') {
      return filterByPartnerAvailability(
        FOCUS_PRESETS[projectFocus],
        partnerAppsEnabled,
        expertSupportEnabled,
        toolRentalsEnabled,
        wasteRemovalEnabled
      );
    }
    return filterByPartnerAvailability(
      [...DEFAULT_PLANNING_TOOLS_SELECTION],
      partnerAppsEnabled,
      expertSupportEnabled,
      toolRentalsEnabled,
      wasteRemovalEnabled
    );
  }, [
    projectFocus,
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled,
  ]);

  const recommendedLabel =
    projectFocus === 'savings'
      ? 'Recommended for cost focus'
      : projectFocus === 'quality'
        ? 'Recommended for quality focus'
        : projectFocus === 'schedule'
          ? 'Recommended for schedule focus'
          : 'Recommended starter set';

  const recommendedToolNames = recommendedIds
    .map((id) => PLANNING_TOOLS.find((t) => t.id === id)?.label)
    .filter((name): name is string => Boolean(name));

  const handleUseRecommended = () => {
    const next = new Set(recommendedIds as PlanningToolId[]);
    setSelected(next);
    notifySelection(next);
  };

  const isAlignedToPreference = (buttonKey: 'all_three' | 'savings' | 'quality' | 'schedule') => {
    if (projectFocus == null) return false;
    return projectFocus === buttonKey;
  };

  const [showCustomize, setShowCustomize] = useState(false);

  const inner = (
    <>
      <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{recommendedLabel}</p>
            <p className="text-xs text-muted-foreground">
              {recommendedToolNames.join(' · ')}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            onClick={handleUseRecommended}
          >
            Use recommended
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {selected.size} tool{selected.size !== 1 ? 's' : ''} selected — these open next in Plan.
        </p>
      </div>

      <div className={compact ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col sm:flex-row gap-2'}>
        {[
          { key: 'savings' as const, label: 'Best for cost-focus', icon: PiggyBank },
          { key: 'quality' as const, label: 'Best for quality-focus', icon: Award },
          { key: 'schedule' as const, label: 'Best for schedule focus', icon: Calendar },
        ].map(({ key, label, icon: Icon }) => {
          const aligned = isAlignedToPreference(key);
          return (
            <div
              key={key}
              className={
                aligned
                  ? compact
                    ? 'flex-1 space-y-1 rounded-md border-2 border-dashed border-primary p-0.5'
                    : 'rounded-lg border-2 border-dashed border-primary p-1 flex-1 space-y-1'
                  : 'flex-1 space-y-1'
              }
            >
              {aligned && (
                <p className="text-xs font-medium text-muted-foreground">Aligned to your preference</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="default"
                className={
                  compact
                    ? 'h-10 min-h-10 w-full justify-center gap-2 px-3 text-sm leading-tight'
                    : 'w-full justify-center gap-2 text-center'
                }
                onClick={() => handleFocusPreset(key)}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{label}</span>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setShowCustomize((v) => !v)}
        >
          {showCustomize ? 'Hide full list' : 'Customize selection'}
        </Button>
        {selected.size > 1 ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearAll}>
            Clear to Customize only
          </Button>
        ) : null}
      </div>

      {showCustomize ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full justify-center gap-2 text-xs text-muted-foreground"
            onClick={handleSelectAll}
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0" />
            Select all tools
          </Button>

          <div
            className={
              compact ? 'grid gap-2 sm:grid-cols-1 md:grid-cols-2' : 'grid gap-3 sm:grid-cols-1 md:grid-cols-2'
            }
          >
            {toolsToShow.map(({ id, label, benefit }) => {
              const isScope = id === 'scope';
              const isChecked = selected.has(id);
              return (
                <Card
                  key={id}
                  className={
                    isScope
                      ? 'cursor-default border-primary bg-primary/5'
                      : `cursor-pointer transition-colors hover:bg-muted/50 ${isChecked ? 'border-primary bg-primary/5' : ''}`
                  }
                  onClick={isScope ? undefined : () => handleToggle(id)}
                >
                  <CardHeader className={compact ? 'p-2 sm:p-3' : 'p-4 pb-2'}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        onCheckedChange={isScope ? undefined : () => handleToggle(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                        disabled={isScope}
                      />
                      <div className="min-w-0 space-y-0">
                        <CardTitle
                          className={
                            compact
                              ? 'whitespace-normal text-sm font-medium sm:text-base'
                              : 'whitespace-normal text-base font-medium'
                          }
                        >
                          {label}
                        </CardTitle>
                        <p
                          className={
                            compact
                              ? 'text-xs leading-snug text-muted-foreground sm:text-sm'
                              : 'text-sm text-muted-foreground'
                          }
                        >
                          {benefit}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Using {selected.size} tool{selected.size !== 1 ? 's' : ''}. Open Customize selection to add or remove
          tools.
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="text-sm sm:text-base">Plan tools</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Choose what to plan next — these tools become your Plan backlog
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:space-y-3 sm:p-3">{inner}</CardContent>
      </Card>
    );
  }

  return <div className="space-y-4">{inner}</div>;
};
