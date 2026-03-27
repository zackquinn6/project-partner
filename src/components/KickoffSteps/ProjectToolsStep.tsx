import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePartnerAppSettings } from '@/hooks/usePartnerAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FolderKanban, PiggyBank, Award, Calendar } from 'lucide-react';

export const PLANNING_TOOL_IDS = [
  'scope',
  'schedule',
  'risk',
  'budget',
  'shopping_list',
  'tool_rentals',
  'waste_removal',
  'quality_control',
  'expert_support'
] as const;

export const PLANNING_TOOLS: { id: (typeof PLANNING_TOOL_IDS)[number]; label: string; benefit: string }[] = [
  { id: 'scope', label: 'Customize', benefit: 'Shape the work to fit your situation' },
  { id: 'schedule', label: 'Schedule', benefit: 'Set a realistic timeline' },
  { id: 'risk', label: 'Risk-Less', benefit: 'Proactively avoid issues' },
  { id: 'budget', label: 'Budget', benefit: 'Spend what you want' },
  { id: 'shopping_list', label: 'Shopping', benefit: 'Track tool & material shopping' },
  { id: 'tool_rentals', label: 'Tool Rental', benefit: 'Plan what to borrow or rent with rental options matched to your area' },
  { id: 'waste_removal', label: 'Waste Removal', benefit: 'Plan disposal and debris handling during the project' },
  { id: 'quality_control', label: 'Quality', benefit: 'Document results for future inspections' },
  { id: 'expert_support', label: 'Support', benefit: 'Setup on-call expert support for when you need help' }
];

export type PlanningToolId = (typeof PLANNING_TOOL_IDS)[number];

/** Kickoff step 4 grid: budget & tool rentals last; partner-gated tools still omitted when disabled. */
const KICKOFF_TOOLS_GRID_ORDER: PlanningToolId[] = [
  'scope',
  'schedule',
  'risk',
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
  schedule: ['scope', 'schedule', 'risk'],
};

interface ProjectToolsStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  initialSelected?: PlanningToolId[];
  onSelectionChange?: (selected: PlanningToolId[]) => void;
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
  onSelectionChange
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
    // planning wizard shows "no tools selected".
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

  const isAlignedToPreference = (buttonKey: 'all_three' | 'savings' | 'quality' | 'schedule') => {
    if (projectFocus == null) return false;
    return projectFocus === buttonKey;
  };

  return (
    <div className="space-y-4">
      {/* Select all - best for optimized project */}
      <div className="space-y-1">
        {isAlignedToPreference('all_three') && (
          <p className="text-xs font-medium text-muted-foreground">Aligned to your preference</p>
        )}
        <div className={isAlignedToPreference('all_three') ? 'rounded-lg border-2 border-dashed border-primary p-1' : undefined}>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 justify-center text-center gap-2 border-blue-600 text-blue-700 bg-blue-50/60 hover:bg-blue-100/80 hover:text-blue-800 dark:border-blue-500 dark:text-blue-300 dark:bg-blue-950/35 dark:hover:bg-blue-950/55 dark:hover:text-blue-200"
            onClick={handleSelectAll}
          >
            <FolderKanban className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Select all – best for optimized project</span>
          </Button>
        </div>
      </div>

      {/* Best for cost / quality / schedule focus */}
      <div className="flex flex-col sm:flex-row gap-2">
        {[
          { key: 'savings' as const, label: 'Best for cost-focus', icon: PiggyBank },
          { key: 'quality' as const, label: 'Best for quality-focus', icon: Award },
          { key: 'schedule' as const, label: 'Best for schedule focus', icon: Calendar },
        ].map(({ key, label, icon: Icon }) => {
          const aligned = isAlignedToPreference(key);
          return (
            <div key={key} className={aligned ? 'rounded-lg border-2 border-dashed border-primary p-1 flex-1 space-y-1' : 'flex-1 space-y-1'}>
              {aligned && <p className="text-xs font-medium text-muted-foreground">Aligned to your preference</p>}
              <Button
                type="button"
                variant="outline"
                size="default"
                className="w-full justify-center text-center gap-2"
                onClick={() => handleFocusPreset(key)}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{label}</span>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {toolsToShow.map(({ id, label, benefit }) => {
          const isScope = id === 'scope';
          const isChecked = selected.has(id);
          return (
            <Card
              key={id}
              className={
                isScope
                  ? 'border-primary bg-primary/5 cursor-default'
                  : `cursor-pointer transition-colors hover:bg-muted/50 ${isChecked ? 'border-primary bg-primary/5' : ''}`
              }
              onClick={isScope ? undefined : () => handleToggle(id)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={isChecked}
                    onCheckedChange={isScope ? undefined : () => handleToggle(id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5"
                    disabled={isScope}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <CardTitle className="text-base font-medium whitespace-normal">{label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{benefit}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {selected.size > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
