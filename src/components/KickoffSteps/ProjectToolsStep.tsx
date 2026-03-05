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
  'detailed_instructions',
  'quality_control',
  'expert_support'
] as const;

export const PLANNING_TOOLS: { id: (typeof PLANNING_TOOL_IDS)[number]; label: string; benefit: string }[] = [
  { id: 'scope', label: 'Project Customizer (Scope)', benefit: 'Shape the work to fit your situation' },
  { id: 'schedule', label: 'Schedule', benefit: 'Set a realistic timeline' },
  { id: 'risk', label: 'Risk/Uncertainty', benefit: 'Proactively avoid issues' },
  { id: 'budget', label: 'Budget', benefit: 'Spend what you want' },
  { id: 'shopping_list', label: 'Shopping List', benefit: 'Track tool & material shopping' },
  { id: 'detailed_instructions', label: 'Learning preferences', benefit: 'Step-by-step when you need it' },
  { id: 'quality_control', label: 'Quality Control', benefit: 'Document results for future inspections' },
  { id: 'expert_support', label: 'Expert Support', benefit: 'Get help when you\'re stuck' }
];

export type PlanningToolId = (typeof PLANNING_TOOL_IDS)[number];

const DEFAULT_SELECTED: PlanningToolId[] = ['scope', 'risk'];

/** Preset tool sets by project focus. Scope is always included. */
const FOCUS_PRESETS: Record<string, PlanningToolId[]> = {
  savings: ['scope', 'budget', 'shopping_list', 'risk'],
  quality: ['scope', 'quality_control', 'detailed_instructions', 'risk'],
  schedule: ['scope', 'schedule', 'risk'],
};

interface ProjectToolsStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  initialSelected?: PlanningToolId[];
  onSelectionChange?: (selected: PlanningToolId[]) => void;
}

function filterByExpertSupport(ids: PlanningToolId[], expertSupportEnabled: boolean): PlanningToolId[] {
  return expertSupportEnabled ? ids : ids.filter(id => id !== 'expert_support');
}

export const ProjectToolsStep: React.FC<ProjectToolsStepProps> = ({
  onComplete,
  isCompleted,
  initialSelected = [],
  onSelectionChange
}) => {
  const { user } = useAuth();
  const { expertSupportEnabled } = usePartnerAppSettings();
  const [projectFocus, setProjectFocus] = useState<string | null>(null);

  const toolsToShow = React.useMemo(
    () => expertSupportEnabled ? PLANNING_TOOLS : PLANNING_TOOLS.filter(t => t.id !== 'expert_support'),
    [expertSupportEnabled]
  );

  const [selected, setSelected] = useState<Set<PlanningToolId>>(() => {
    const initial = initialSelected.length > 0 ? initialSelected : DEFAULT_SELECTED;
    const filtered = expertSupportEnabled ? initial : initial.filter(id => id !== 'expert_support');
    return new Set(filtered as PlanningToolId[]);
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('project_focus')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data?.project_focus != null) setProjectFocus(data.project_focus);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let initial = initialSelected.length > 0 ? initialSelected : DEFAULT_SELECTED;
    if (!expertSupportEnabled) initial = initial.filter(id => id !== 'expert_support');
    setSelected(new Set(initial as PlanningToolId[]));
    if (initialSelected.length === 0) {
      const defaultFiltered = expertSupportEnabled ? DEFAULT_SELECTED : DEFAULT_SELECTED.filter(id => id !== 'expert_support');
      onSelectionChange?.(defaultFiltered as PlanningToolId[]);
    }
  }, [initialSelected.join(','), expertSupportEnabled]);

  const notifySelection = (next: Set<PlanningToolId>) => {
    const withScope = new Set(next);
    withScope.add('scope');
    if (!expertSupportEnabled) withScope.delete('expert_support');
    onSelectionChange?.(Array.from(withScope));
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
    const all = new Set(PLANNING_TOOL_IDS.filter(id => id !== 'expert_support' || expertSupportEnabled));
    setSelected(all);
    notifySelection(all);
  };

  const handleFocusPreset = (focusKey: 'savings' | 'quality' | 'schedule') => {
    const ids = filterByExpertSupport(FOCUS_PRESETS[focusKey], expertSupportEnabled);
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
            className="w-full justify-start gap-3 h-12 text-left"
            onClick={handleSelectAll}
          >
            <FolderKanban className="h-5 w-5 shrink-0 text-muted-foreground" />
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
                className="w-full justify-start gap-2"
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
                    <CardTitle className="text-base font-medium">{label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{benefit}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          Select all
        </Button>
        {selected.size > 1 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
