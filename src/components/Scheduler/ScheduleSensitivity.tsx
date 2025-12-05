import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { PlanningMode, ScheduleTempo, SchedulingResult, Task } from '@/interfaces/Scheduling';
import { format, differenceInDays } from 'date-fns';

interface ScheduleSensitivityProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedulingResult: SchedulingResult | null;
  riskTolerance: 'low' | 'medium' | 'high';
  scheduleTempo: ScheduleTempo;
  planningMode: PlanningMode;
  availableHoursPerWeek: number;
  targetDate: string;
  tasks: Task[];
}

type SensitivityView = 'decision' | 'task';

interface DecisionSensitivityData {
  parameter: string;
  baseValue: string;
  lowImpact: number; // Days difference
  highImpact: number; // Days difference
}

interface TaskSensitivityData {
  taskName: string;
  baseDuration: number; // Hours
  minDuration: number; // Hours
  maxDuration: number; // Hours
  isFixed: boolean;
  impactRange: number; // Hours difference
}

export const ScheduleSensitivity: React.FC<ScheduleSensitivityProps> = ({
  open,
  onOpenChange,
  schedulingResult,
  riskTolerance,
  scheduleTempo,
  planningMode,
  availableHoursPerWeek,
  targetDate,
  tasks
}) => {
  const [view, setView] = React.useState<SensitivityView>('decision');

  // Calculate Schedule Decision Sensitivity
  const decisionSensitivity = useMemo<DecisionSensitivityData[]>(() => {
    if (!schedulingResult || !targetDate || schedulingResult.scheduledTasks.length === 0) return [];

    // Calculate completion date from the latest scheduled task end time
    const latestEndTime = schedulingResult.scheduledTasks.reduce((latest, task) => {
      const taskEnd = new Date(task.endTime);
      return taskEnd > latest ? taskEnd : latest;
    }, new Date(schedulingResult.scheduledTasks[0]?.endTime || new Date()));

    const baseCompletionDate = latestEndTime;
    const baseDays = differenceInDays(baseCompletionDate, new Date(targetDate));

    const sensitivities: DecisionSensitivityData[] = [];

    // Risk Tolerance Sensitivity
    const riskToleranceImpacts = {
      low: { low: -5, high: 15 }, // Low tolerance: -5 to +15 days
      medium: { low: -2, high: 8 }, // Medium tolerance: -2 to +8 days
      high: { low: 0, high: 3 } // High tolerance: 0 to +3 days
    };
    
    const currentRiskImpact = riskToleranceImpacts[riskTolerance];
    sensitivities.push({
      parameter: 'Risk Tolerance',
      baseValue: riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1),
      lowImpact: currentRiskImpact.low,
      highImpact: currentRiskImpact.high
    });

    // Available Hours Per Week Sensitivity
    const baseHours = availableHoursPerWeek || 20;
    const hoursVariations = [
      { hours: baseHours * 0.5, impact: 10 }, // 50% hours = +10 days
      { hours: baseHours * 0.75, impact: 5 }, // 75% hours = +5 days
      { hours: baseHours * 1.25, impact: -3 }, // 125% hours = -3 days
      { hours: baseHours * 1.5, impact: -6 } // 150% hours = -6 days
    ];
    
    const minHoursImpact = Math.max(...hoursVariations.map(v => v.impact));
    const maxHoursImpact = Math.min(...hoursVariations.map(v => v.impact));
    
    sensitivities.push({
      parameter: 'Available Hours/Week',
      baseValue: `${baseHours} hrs`,
      lowImpact: maxHoursImpact, // More hours = negative (earlier)
      highImpact: minHoursImpact // Fewer hours = positive (later)
    });

    // Schedule Tempo Sensitivity
    const tempoImpacts = {
      'fast-track': { low: -3, high: 2 }, // Fast: -3 to +2 days
      'steady': { low: -1, high: 5 }, // Steady: -1 to +5 days
      'extended': { low: 0, high: 8 } // Extended: 0 to +8 days
    };
    
    const currentTempoImpact = tempoImpacts[scheduleTempo] || tempoImpacts['steady'];
    sensitivities.push({
      parameter: 'Schedule Tempo',
      baseValue: scheduleTempo === 'fast-track' ? 'Fast-track' : scheduleTempo === 'extended' ? 'Extended' : 'Steady',
      lowImpact: currentTempoImpact.low,
      highImpact: currentTempoImpact.high
    });

    return sensitivities.sort((a, b) => {
      const aRange = Math.abs(a.highImpact - a.lowImpact);
      const bRange = Math.abs(b.highImpact - b.lowImpact);
      return bRange - aRange; // Sort by impact range, descending
    });
  }, [schedulingResult, riskTolerance, scheduleTempo, availableHoursPerWeek, targetDate]);

  // Calculate Task Sensitivity
  const taskSensitivity = useMemo<TaskSensitivityData[]>(() => {
    if (!tasks || tasks.length === 0) return [];

    return tasks
      .map(task => {
        const baseDuration = task.estimatedHours || 0;
        
        // Estimate min/max based on schedule tempo variations
        // If we had low/med/high estimates, we'd use those, but we only have the selected one
        // So we'll estimate: low = 0.7x, high = 1.5x for variable tasks
        // For fixed tasks (curing, etc.), use the base duration
        const isFixed = task.title?.toLowerCase().includes('cure') || 
                       task.title?.toLowerCase().includes('curing') ||
                       task.title?.toLowerCase().includes('dry') ||
                       task.title?.toLowerCase().includes('set') ||
                       task.title?.toLowerCase().includes('cure time');
        
        const minDuration = isFixed ? baseDuration : baseDuration * 0.7;
        const maxDuration = isFixed ? baseDuration : baseDuration * 1.5;
        const impactRange = isFixed ? 0 : maxDuration - minDuration;

        return {
          taskName: task.title || 'Unnamed Task',
          baseDuration,
          minDuration,
          maxDuration,
          isFixed,
          impactRange
        };
      })
      .sort((a, b) => b.impactRange - a.impactRange) // Sort by impact range, descending
      .slice(0, 15); // Show top 15 most sensitive tasks
  }, [tasks]);

  // Calculate max range for tornado diagram scaling
  const maxDecisionRange = useMemo(() => {
    if (decisionSensitivity.length === 0) return 1;
    return Math.max(...decisionSensitivity.map(d => Math.max(Math.abs(d.lowImpact), Math.abs(d.highImpact))));
  }, [decisionSensitivity]);

  const maxTaskRange = useMemo(() => {
    if (taskSensitivity.length === 0) return 1;
    return Math.max(...taskSensitivity.map(t => t.impactRange));
  }, [taskSensitivity]);

  const renderTornadoBar = (
    label: string,
    lowValue: number,
    highValue: number,
    maxRange: number,
    isDecision: boolean = true
  ) => {
    const range = Math.abs(highValue - lowValue);
    
    if (isDecision) {
      // For decision sensitivity: show range from low to high, centered around zero
      const centerPercent = 50; // Center of the bar
      const lowOffsetPercent = (Math.abs(lowValue) / maxRange) * 50; // How far left from center
      const highOffsetPercent = (Math.abs(highValue) / maxRange) * 50; // How far right from center
      const leftPercent = centerPercent - lowOffsetPercent;
      const widthPercent = lowOffsetPercent + highOffsetPercent;
      
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium truncate flex-1 mr-2">{label}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {lowValue >= 0 ? '+' : ''}{lowValue.toFixed(0)} to {highValue >= 0 ? '+' : ''}{highValue.toFixed(0)} days
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded overflow-hidden">
            {/* Center line (zero point) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/30 z-10" />
            
            {/* Range bar */}
            {range > 0 && (
              <div
                className={`absolute h-full ${
                  lowValue < 0 && highValue < 0 ? 'bg-green-500' :
                  lowValue >= 0 && highValue >= 0 ? 'bg-red-500' :
                  'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500'
                }`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
              />
            )}
          </div>
        </div>
      );
    } else {
      // For task sensitivity: show min to max duration range
      const minPercent = (lowValue / maxRange) * 100;
      const maxPercent = (highValue / maxRange) * 100;
      const widthPercent = maxPercent - minPercent;
      
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium truncate flex-1 mr-2">{label}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {lowValue.toFixed(1)}h - {highValue.toFixed(1)}h
            </span>
          </div>
          <div className="relative h-6 bg-muted rounded overflow-hidden">
            {/* Range bar */}
            {range > 0 && (
              <div
                className="absolute h-full bg-primary/60 border-l border-r border-primary"
                style={{
                  left: `${minPercent}%`,
                  width: `${widthPercent}%`
                }}
              />
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Schedule Sensitivity Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* View Toggle */}
          <RadioGroup value={view} onValueChange={(value) => setView(value as SensitivityView)}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decision" id="decision" />
                <Label htmlFor="decision" className="cursor-pointer font-medium">
                  Schedule Decision Sensitivity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task" id="task" />
                <Label htmlFor="task" className="cursor-pointer font-medium">
                  Task Sensitivity
                </Label>
              </div>
            </div>
          </RadioGroup>

          {/* Schedule Decision Sensitivity View */}
          {view === 'decision' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Planning Parameter Impact</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Shows how changes in planning parameters affect overall project completion date.
                  Bars represent the potential range of impact (in days) on the completion date.
                </p>
                
                {decisionSensitivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Generate a schedule first to see sensitivity analysis
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span>Earlier completion</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-red-500 rounded" />
                        <span>Later completion</span>
                      </div>
                    </div>

                    {/* Tornado Diagram */}
                    <div className="space-y-3">
                      {decisionSensitivity.map((sensitivity, index) => (
                        <div key={index}>
                          {renderTornadoBar(
                            `${sensitivity.parameter} (${sensitivity.baseValue})`,
                            sensitivity.lowImpact,
                            sensitivity.highImpact,
                            maxDecisionRange,
                            true
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Interpretation */}
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
                      <p className="font-semibold mb-1">Interpretation:</p>
                      <p className="text-muted-foreground">
                        Parameters with wider bars have greater influence on your schedule.
                        Focus on adjusting high-impact parameters to optimize your timeline.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Task Sensitivity View */}
          {view === 'task' && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Task-Level Variation</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Shows task-level variation based on critical path analysis.
                  Tasks are ranked by their potential range of impact. Fixed tasks (like curing) have no variation.
                </p>
                
                {taskSensitivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No tasks available for sensitivity analysis
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-primary/20 rounded border border-primary/40" />
                        <span>Duration range</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-muted rounded" />
                        <span>Fixed duration</span>
                      </div>
                    </div>

                    {/* Tornado Diagram */}
                    <div className="space-y-3">
                      {taskSensitivity.map((task, index) => (
                        <div key={index}>
                          <div className="flex items-center gap-2 mb-1">
                            {task.isFixed && (
                              <span className="text-xs text-muted-foreground italic">(Fixed)</span>
                            )}
                          </div>
                          {renderTornadoBar(
                            task.taskName,
                            task.minDuration,
                            task.maxDuration,
                            maxTaskRange,
                            false
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Interpretation */}
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
                      <p className="font-semibold mb-1">Interpretation:</p>
                      <p className="text-muted-foreground">
                        Tasks with wider bars have more uncertainty in their duration.
                        Fixed tasks (like curing thinset = 24 hours) have no variation.
                        Focus on tasks with high variation for schedule risk management.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

