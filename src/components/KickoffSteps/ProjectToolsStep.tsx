import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
  { id: 'detailed_instructions', label: 'Detailed Instructions', benefit: 'Step-by-step when you need it' },
  { id: 'quality_control', label: 'Quality Control', benefit: 'Document results for future inspections' },
  { id: 'expert_support', label: 'Expert Support', benefit: 'Get help when you\'re stuck' }
];

export type PlanningToolId = (typeof PLANNING_TOOL_IDS)[number];

const DEFAULT_SELECTED: PlanningToolId[] = ['scope', 'risk'];

interface ProjectToolsStepProps {
  onComplete: () => void;
  isCompleted: boolean;
  initialSelected?: PlanningToolId[];
  onSelectionChange?: (selected: PlanningToolId[]) => void;
}

export const ProjectToolsStep: React.FC<ProjectToolsStepProps> = ({
  onComplete,
  isCompleted,
  initialSelected = [],
  onSelectionChange
}) => {
  const [selected, setSelected] = useState<Set<PlanningToolId>>(() => {
    const initial = initialSelected.length > 0 ? initialSelected : DEFAULT_SELECTED;
    return new Set(initial as PlanningToolId[]);
  });

  useEffect(() => {
    const initial = initialSelected.length > 0 ? initialSelected : DEFAULT_SELECTED;
    setSelected(new Set(initial as PlanningToolId[]));
    if (initialSelected.length === 0) {
      onSelectionChange?.(DEFAULT_SELECTED);
    }
  }, [initialSelected.join(',')]);

  const notifySelection = (next: Set<PlanningToolId>) => {
    const withScope = new Set(next);
    withScope.add('scope');
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
    const all = new Set(PLANNING_TOOL_IDS);
    setSelected(all);
    notifySelection(all);
  };

  const handleClearAll = () => {
    const next = new Set<PlanningToolId>(['scope']);
    setSelected(next);
    notifySelection(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {PLANNING_TOOLS.map(({ id, label, benefit }) => {
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
