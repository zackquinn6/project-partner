import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Timer, Pause, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkflowStep } from '@/interfaces/Project';

interface CompactTimeEstimationProps {
  step: WorkflowStep;
  scalingUnit?: string;
  onChange: (timeEstimation: WorkflowStep['timeEstimation']) => void;
}

export function CompactTimeEstimation({
  step,
  scalingUnit = 'per item',
  onChange
}: CompactTimeEstimationProps) {
  const getScalingUnitDisplay = () => {
    switch (scalingUnit) {
      case 'per square foot': return 'sq ft';
      case 'per 10x10 room': return 'room';
      case 'per linear foot': return 'lin ft';
      case 'per cubic yard': return 'cu yd';
      case 'per item': return 'item';
      default: return 'unit';
    }
  };

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
          <Label className="text-xs font-medium">Work Time (hours {scalingUnit})</Label>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <div className="space-y-1">
                  <p className="font-semibold">Time Estimate Ranges:</p>
                  <p>• <strong>Medium</strong> = Expected / average time</p>
                  <p>• <strong>Low</strong> = 10th percentile (best case)</p>
                  <p>• <strong>High</strong> = 90th percentile (worst case)</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="grid grid-cols-6 gap-2 items-center text-xs">
          <Label className="text-green-700 font-medium">Best</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={step.timeEstimation?.variableTime?.low || ''}
            onChange={(e) => handleVariableTimeChange('low', e.target.value)}
            className="h-6 text-xs"
          />
          
          <Label className="text-blue-700 font-medium">Typical</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={step.timeEstimation?.variableTime?.medium || ''}
            onChange={(e) => handleVariableTimeChange('medium', e.target.value)}
            className="h-6 text-xs"
          />
          
          <Label className="text-red-700 font-medium">Worst</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={step.timeEstimation?.variableTime?.high || ''}
            onChange={(e) => handleVariableTimeChange('high', e.target.value)}
            className="h-6 text-xs"
          />
        </div>
        
        <p className="text-[10px] text-muted-foreground">
          Active work time per {getScalingUnitDisplay()}
        </p>
      </div>
    </div>
  );
}