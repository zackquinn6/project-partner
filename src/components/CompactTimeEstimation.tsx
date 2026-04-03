import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Timer, Info, Users, GraduationCap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkflowStep } from '@/interfaces/Project';

function getScalingUnitDisplay(scalingUnit: string | undefined): string {
  switch (scalingUnit) {
    case 'per square feet':
    case 'per square foot':
      return 'square foot';
    case 'per 10x10 room':
      return '10x10 room';
    case 'per linear feet':
    case 'per linear foot':
      return 'linear foot';
    case 'per cubic yard':
      return 'cubic yard';
    case 'per item':
      return 'item';
    default:
      return 'unit';
  }
}

function formatStepTypeLabel(stepType: WorkflowStep['stepType'] | undefined): string {
  if (stepType === 'prime') return 'Prime';
  if (stepType === 'scaled') return 'Scaled';
  if (stepType === 'quality_control_non_scaled') return 'Quality control (non-scaled)';
  if (stepType === 'quality_control_scaled') return 'Quality control (scaled)';
  return '—';
}

function formatHoursCell(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—';
  return String(value);
}

interface CompactTimeEstimationProps {
  step: WorkflowStep;
  scalingUnit?: string;
  typicalProjectSize?: number;
  onChange: (timeEstimation: WorkflowStep['timeEstimation']) => void;
  onWorkersChange?: (workersNeeded: number) => void;
  onSkillLevelChange?: (skillLevel: WorkflowStep['skillLevel']) => void;
}

export function CompactTimeEstimation({
  step,
  scalingUnit = 'per item',
  typicalProjectSize,
  onChange,
  onWorkersChange,
  onSkillLevelChange
}: CompactTimeEstimationProps) {
  const getScalingUnitDisplay = () => {
    switch (scalingUnit) {
      case 'per square feet':
      case 'per square foot': return 'square foot';
      case 'per 10x10 room': return '10x10 room';
      case 'per linear feet':
      case 'per linear foot': return 'linear foot';
      case 'per cubic yard': return 'cubic yard';
      case 'per item': return 'item';
      default: return 'unit';
    }
  };

  const stepType = step.stepType === 'prime' ? 'prime' : 'scaled';
  const unit = getScalingUnitDisplay();
  const primeSize = typeof typicalProjectSize === 'number' && typicalProjectSize > 0 ? typicalProjectSize : null;
  const unitPlural = primeSize === 1 ? unit : `${unit}s`;
  const scaleLabel =
    stepType === 'prime'
      ? primeSize != null
        ? `${primeSize} ${unitPlural}`
        : `Typical project size (${unitPlural})`
      : `1 ${unit}`;

  const handleVariableTimeChange = (level: 'low' | 'medium' | 'high', value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...step.timeEstimation,
      variableTime: {
        ...step.timeEstimation?.variableTime,
        [level]: numValue
      }
    });
  };

  return (
    <div className="space-y-4 border rounded-md p-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Time Estimation
      </h3>

      {/* Work Time Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Timer className="w-3 h-3 text-primary" />
          <Label className="text-xs font-medium">Work Time Estimations (hours)</Label>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <div className="space-y-1">
                  <p><strong>Low:</strong> 10th percentile (fastest 10% of jobs)</p>
                  <p><strong>Expected:</strong> typical / average duration</p>
                  <p><strong>High:</strong> 90th percentile (slowest 10% of jobs)</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Low</th>
                <th className="px-2 py-1 text-left font-medium">Expected</th>
                <th className="px-2 py-1 text-left font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={step.timeEstimation?.variableTime?.low || ''}
                    onChange={(e) => handleVariableTimeChange('low', e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={step.timeEstimation?.variableTime?.medium || ''}
                    onChange={(e) => handleVariableTimeChange('medium', e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={step.timeEstimation?.variableTime?.high || ''}
                    onChange={(e) => handleVariableTimeChange('high', e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {stepType === 'prime' ? `Prime basis: ${scaleLabel}` : `Scaled basis: ${scaleLabel}`}
        </p>
      </div>

      {/* Workers Needed Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-primary" />
          <Label className="text-xs font-medium">Workers Needed</Label>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <div className="space-y-1">
                  <p className="font-semibold">Worker Requirements:</p>
                  <p>• Number of workers needed for this step (0-10)</p>
                  <p>• 0 = step still requires duration, but workers can be assigned elsewhere</p>
                  <p>• Scheduler will allocate resources based on worker requirements</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Select
          value={String(step.workersNeeded ?? 1)}
          onValueChange={(value) => {
            const workersNeeded = parseInt(value, 10);
            if (onWorkersChange) {
              onWorkersChange(workersNeeded);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select workers" />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <SelectItem key={num} value={String(num)}>
                {num === 0 ? '0 (No workers required)' : `${num} worker${num > 1 ? 's' : ''}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skill Level Section */}
      {onSkillLevelChange && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3 h-3 text-primary" />
            <Label className="text-xs font-medium">Skill Level</Label>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">Skill Level Required:</p>
                    <p>• <strong>Beginner</strong> - Basic DIY skills</p>
                    <p>• <strong>Intermediate</strong> - Some experience</p>
                    <p>• <strong>Advanced</strong> - Experienced DIYer</p>
                    <p>• <strong>Professional</strong> - Professional contractor</p>
                    <p className="mt-2 text-muted-foreground">Set explicitly for this step.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Select
            value={step.skillLevel || 'Intermediate'}
            onValueChange={(value) => {
              onSkillLevelChange(value as WorkflowStep['skillLevel']);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select skill level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export interface CompactTimeEstimationReadOnlyProps {
  step: WorkflowStep;
  scalingUnit?: string;
  typicalProjectSize?: number;
}

/** Read-only summary for workflow preview (no inputs). */
export function CompactTimeEstimationReadOnly({
  step,
  scalingUnit,
  typicalProjectSize,
}: CompactTimeEstimationReadOnlyProps) {
  const stepType = step.stepType === 'prime' ? 'prime' : 'scaled';
  const unit = getScalingUnitDisplay(scalingUnit);
  const primeSize = typeof typicalProjectSize === 'number' && typicalProjectSize > 0 ? typicalProjectSize : null;
  const unitPlural = primeSize === 1 ? unit : `${unit}s`;
  const scaleLabel =
    stepType === 'prime'
      ? primeSize != null
        ? `${primeSize} ${unitPlural}`
        : `Typical project size (${unitPlural})`
      : `1 ${unit}`;

  const vt = step.timeEstimation?.variableTime;

  return (
    <div className="space-y-4">
      <div className="text-xs space-y-1">
        <div>
          <span className="text-muted-foreground">Step type: </span>
          <span className="font-medium">{formatStepTypeLabel(step.stepType)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Timer className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium">Work time (hours)</span>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Low</th>
                <th className="px-2 py-1 text-left font-medium">Expected</th>
                <th className="px-2 py-1 text-left font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">{formatHoursCell(vt?.low)}</td>
                <td className="p-2">{formatHoursCell(vt?.medium)}</td>
                <td className="p-2">{formatHoursCell(vt?.high)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {stepType === 'prime' ? `Prime basis: ${scaleLabel}` : `Scaled basis: ${scaleLabel}`}
        </p>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-primary" />
          <span className="font-medium">Workers needed</span>
        </div>
        <p>{step.workersNeeded === undefined ? '—' : String(step.workersNeeded)}</p>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-3 h-3 text-primary" />
          <span className="font-medium">Skill level</span>
        </div>
        <p>{step.skillLevel ?? '—'}</p>
      </div>
    </div>
  );
}