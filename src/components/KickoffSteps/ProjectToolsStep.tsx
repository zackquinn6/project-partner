import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
    label: 'Scope',
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

/** Kickoff selection card artwork under /public/planning-tools. */
export const PLANNING_TOOL_GRAPHICS: Record<PlanningToolId, string> = {
  scope: '/planning-tools/scope.png',
  schedule: '/planning-tools/schedule.png',
  communication_plan: '/planning-tools/communication_plan.png',
  risk: '/planning-tools/risk.png',
  budget: '/planning-tools/budget.png',
  shopping_list: '/planning-tools/shopping_list.png',
  tool_rentals: '/planning-tools/tool_rentals.png',
  waste_removal: '/planning-tools/waste_removal.png',
  quality_control: '/planning-tools/quality_control.png',
  expert_support: '/planning-tools/expert_support.png',
};

/** Shared display/walk-through order for Discover step 4 and Planning Studio. */
export const PLANNING_TOOLS_DISPLAY_ORDER: PlanningToolId[] = [
  'scope',
  'risk',
  'schedule',
  'budget',
  'shopping_list',
  'quality_control',
  'communication_plan',
  'tool_rentals',
  'waste_removal',
  'expert_support',
];

/** @deprecated Prefer PLANNING_TOOLS_DISPLAY_ORDER - same sequence. */
const KICKOFF_TOOLS_GRID_ORDER = PLANNING_TOOLS_DISPLAY_ORDER;

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

/**
 * Product invariant: Planning Studio always includes Scope (project customizer).
 * Partner-gated tools are filtered; empty input becomes scope-only.
 */
export function normalizePlanningToolsSelection(
  ids: PlanningToolId[],
  partnerAppsEnabled: boolean,
  expertSupportEnabled: boolean,
  toolRentalsEnabled: boolean,
  wasteRemovalEnabled: boolean
): PlanningToolId[] {
  const filtered = filterByPartnerAvailability(
    ids,
    partnerAppsEnabled,
    expertSupportEnabled,
    toolRentalsEnabled,
    wasteRemovalEnabled
  );
  if (filtered.includes('scope')) return filtered;
  return ['scope', ...filtered];
}

function sortToolsForKickoffGrid(
  tools: (typeof PLANNING_TOOLS)[number][]
): (typeof PLANNING_TOOLS)[number][] {
  const order = new Map(KICKOFF_TOOLS_GRID_ORDER.map((id, i) => [id, i]));
  return [...tools].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export const ProjectToolsStep: React.FC<ProjectToolsStepProps> = ({
  onComplete: _onComplete,
  isCompleted: _isCompleted,
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
    const next = normalizePlanningToolsSelection(
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

  const handleDeselectAll = () => {
    const next = new Set<PlanningToolId>(['scope']);
    setSelected(next);
    notifySelection(next);
  };

  const allSelectableIds = React.useMemo(
    () => toolsToShow.map((t) => t.id),
    [toolsToShow]
  );

  const allSelected =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.has(id));

  const handleToggleSelectAll = () => {
    if (allSelected) handleDeselectAll();
    else handleSelectAll();
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

  const handleUseRecommended = () => {
    const next = new Set(recommendedIds as PlanningToolId[]);
    setSelected(next);
    notifySelection(next);
  };

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9"
          onClick={handleUseRecommended}
        >
          Apply Recommended Planning Tools
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={handleToggleSelectAll}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </Button>
      </div>

      <div
        className={
          compact
            ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4'
            : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
        }
      >
        {toolsToShow.map(({ id, label, benefit }) => {
          const isScope = id === 'scope';
          const isChecked = selected.has(id);
          const blurb = isScope ? 'Make key decisions' : benefit;
          return (
            <button
              key={id}
              type="button"
              disabled={isScope}
              aria-pressed={isChecked}
              aria-label={`${label}${isChecked ? ', selected' : ''}`}
              onClick={isScope ? undefined : () => handleToggle(id)}
              className={cn(
                'group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isChecked
                  ? 'border-primary ring-2 ring-primary/30 shadow-sm'
                  : 'border-border hover:border-primary/40 hover:shadow-sm',
                isScope && 'cursor-default'
              )}
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-muted/40">
                <img
                  src={PLANNING_TOOL_GRAPHICS[id]}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
                <span
                  className={cn(
                    'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors',
                    isChecked
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/80 bg-background/90 text-transparent'
                  )}
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </div>
              <div className={cn('flex min-h-0 flex-1 flex-col gap-0.5', compact ? 'p-2.5' : 'p-3')}>
                <span
                  className={cn(
                    'font-display font-semibold leading-tight text-foreground',
                    compact ? 'text-sm' : 'text-base'
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'line-clamp-2 text-muted-foreground',
                    compact ? 'text-[11px] leading-snug' : 'text-xs leading-snug'
                  )}
                >
                  {blurb}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  if (compact) {
    return (
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="font-display text-xl font-semibold">Your plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-2 sm:space-y-3 sm:p-3">{inner}</CardContent>
      </Card>
    );
  }

  return <div className="space-y-4">{inner}</div>;
};
