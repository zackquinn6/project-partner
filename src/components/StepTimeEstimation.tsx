import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Timer, Pause } from 'lucide-react';
import { WorkflowStep } from '@/interfaces/Project';

interface StepTimeEstimationProps {
  step: WorkflowStep;
  scalingUnit?: string;
  onChange: (timeEstimation: WorkflowStep['timeEstimation']) => void;
}

export const StepTimeEstimation: React.FC<StepTimeEstimationProps> = ({
  step,
  scalingUnit = 'per item',
  onChange
}) => {
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

  const handleLagTimeChange = (level: 'low' | 'medium' | 'high', value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...step.timeEstimation,
      lagTime: {
        ...step.timeEstimation?.lagTime,
        [level]: numValue
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Time Estimation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Variable Time */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <Label className="text-base font-semibold">Work Time (hours {scalingUnit})</Label>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="variable-low" className="text-sm font-medium text-green-700">
                Best Case
              </Label>
              <Input
                id="variable-low"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.variableTime?.low || ''}
                onChange={(e) => handleVariableTimeChange('low', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="variable-medium" className="text-sm font-medium text-blue-700">
                Typical
              </Label>
              <Input
                id="variable-medium"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.variableTime?.medium || ''}
                onChange={(e) => handleVariableTimeChange('medium', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="variable-high" className="text-sm font-medium text-red-700">
                Worst Case
              </Label>
              <Input
                id="variable-high"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.variableTime?.high || ''}
                onChange={(e) => handleVariableTimeChange('high', e.target.value)}
              />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Active work time required per {getScalingUnitDisplay()}
          </p>
        </div>

        {/* Lag Time */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pause className="w-4 h-4 text-primary" />
            <Label className="text-base font-semibold">Wait Time (hours total)</Label>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lag-low" className="text-sm font-medium text-green-700">
                Best Case
              </Label>
              <Input
                id="lag-low"
                type="number"
                step="0.5"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.lagTime?.low || ''}
                onChange={(e) => handleLagTimeChange('low', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lag-medium" className="text-sm font-medium text-blue-700">
                Typical
              </Label>
              <Input
                id="lag-medium"
                type="number"
                step="0.5"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.lagTime?.medium || ''}
                onChange={(e) => handleLagTimeChange('medium', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lag-high" className="text-sm font-medium text-red-700">
                Worst Case
              </Label>
              <Input
                id="lag-high"
                type="number"
                step="0.5"
                min="0"
                placeholder="0.0"
                value={step.timeEstimation?.lagTime?.high || ''}
                onChange={(e) => handleLagTimeChange('high', e.target.value)}
              />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Wait time (drying, curing, delivery, etc.) - independent of project size
          </p>
        </div>
      </CardContent>
    </Card>
  );
};