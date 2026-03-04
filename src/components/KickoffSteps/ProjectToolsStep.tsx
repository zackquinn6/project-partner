import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export const PLANNING_TOOL_IDS = [
  'scope',
  'schedule',
  'risk',
  'budget',
  'detailed_instructions',
  'quality_control',
  'expert_support'
] as const;

export const PLANNING_TOOLS: { id: (typeof PLANNING_TOOL_IDS)[number]; label: string; benefit: string }[] = [
  { id: 'scope', label: 'Project Customizer (Scope)', benefit: 'Shape the work to fit your situation' },
  { id: 'schedule', label: 'Schedule', benefit: 'Set a realistic timeline' },
  { id: 'risk', label: 'Risk/Uncertainty', benefit: 'Proactively avoid issues' },
  { id: 'budget', label: 'Budget', benefit: 'Spend what you want' },
  { id: 'detailed_instructions', label: 'Detailed Instructions', benefit: 'Step-by-step when you need it' },
  { id: 'quality_control', label: 'Quality Control', benefit: 'Checkpoints that keep results on track' },
  { id: 'expert_support', label: 'Expert Support', benefit: 'Get help when you\'re stuck' }
];

export type PlanningToolId = (typeof PLANNING_TOOL_IDS)[number];

const PRESET_LITE: PlanningToolId[] = ['risk'];
const PRESET_STANDARD: PlanningToolId[] = ['risk', 'schedule', 'detailed_instructions'];
const PRESET_PRO: PlanningToolId[] = [...PLANNING_TOOL_IDS];

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
  const [selected, setSelected] = useState<Set<PlanningToolId>>(() => new Set(initialSelected));

  useEffect(() => {
    if (initialSelected.length > 0) {
      setSelected(new Set(initialSelected as PlanningToolId[]));
    }
  }, [initialSelected.join(',')]);

  const handleToggle = (id: PlanningToolId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(PLANNING_TOOL_IDS);
    setSelected(all);
    onSelectionChange?.(Array.from(all));
  };

  const handleClearAll = () => {
    setSelected(new Set());
    onSelectionChange?.([]);
  };

  const applyPreset = (preset: PlanningToolId[]) => {
    const next = new Set(preset);
    setSelected(next);
    onSelectionChange?.(preset);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Workflow Setup</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which planning tools you want to use for this project.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset(PRESET_LITE)}
          className={selected.size === PRESET_LITE.length && PRESET_LITE.every(id => selected.has(id)) ? 'border-primary bg-primary/5' : ''}
        >
          Lite
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset(PRESET_STANDARD)}
          className={selected.size === PRESET_STANDARD.length && PRESET_STANDARD.every(id => selected.has(id)) ? 'border-primary bg-primary/5' : ''}
        >
          Standard
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyPreset(PRESET_PRO)}
          className={selected.size === PRESET_PRO.length ? 'border-primary bg-primary/5' : ''}
        >
          Pro
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Lite: Risk only · Standard: Risk, Schedule, Instructions · Pro: All tools (incl. Budget, Quality Control)
      </p>

      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {PLANNING_TOOLS.map(({ id, label, benefit }) => (
          <Card
            key={id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              selected.has(id) ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => handleToggle(id)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={id}
                  checked={selected.has(id)}
                  onCheckedChange={() => handleToggle(id)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5"
                />
                <div className="space-y-0.5 min-w-0">
                  <CardTitle className="text-base font-medium">{label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{benefit}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          Select all
        </Button>
        {selected.size > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">You can change this later.</p>

      <button
        type="button"
        onClick={onComplete}
        className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
};
