import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Calculator, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';

interface ProjectTimeEstimatorProps {
  project: Project;
  projectRun?: ProjectRun;
  scenario?: 'low' | 'medium' | 'high';
}

interface TimeEstimate {
  workTime: number; // in hours
  total: string; // formatted string
}

interface PhaseEstimate {
  phaseName: string;
  workTime: number;
  stepCount: number;
}

export const ProjectTimeEstimator: React.FC<ProjectTimeEstimatorProps> = ({
  project,
  projectRun,
  scenario = 'medium'
}) => {
  const projectSize = parseFloat(projectRun?.projectSize || '1') || 1;
  const scalingFactor = projectRun?.scalingFactor || 1;
  const skillMultiplier = projectRun?.skillLevelMultiplier || 1;
  const scalingUnit = project.scalingUnit || 'per item';

  const timeEstimates = useMemo(() => {
    const phases: PhaseEstimate[] = [];
    let totalWorkTime = 0;

    project.phases.forEach(phase => {
      let phaseWorkTime = 0;
      let stepCount = 0;

      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          stepCount++;
          
          // Get time estimates for this scenario
          const workTime = step.timeEstimation?.variableTime?.[scenario] || 0;

          // Calculate scaled work time (work time scales with project size)
          const scaledWorkTime = workTime * projectSize * scalingFactor * skillMultiplier;
          
          phaseWorkTime += scaledWorkTime;
        });
      });

      phases.push({
        phaseName: phase.name,
        workTime: phaseWorkTime,
        stepCount
      });

      totalWorkTime += phaseWorkTime;
    });

    return {
      phases,
      totalWorkTime,
      totalProjectTime: totalWorkTime
    };
  }, [project, projectSize, scalingFactor, skillMultiplier, scenario]);

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const getScenarioLabel = (scenario: string) => {
    switch (scenario) {
      case 'low': return 'Best Case';
      case 'medium': return 'Typical';
      case 'high': return 'Worst Case';
      default: return 'Estimate';
    }
  };

  const getScenarioColor = (scenario: string) => {
    switch (scenario) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getScalingUnitDisplay = () => {
    switch (scalingUnit) {
      case 'per square foot': return 'sq ft';
      case 'per 10x10 room': return 'rooms';
      case 'per linear foot': return 'lin ft';
      case 'per cubic yard': return 'cu yd';
      case 'per item': return 'items';
      default: return 'units';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Project Time Estimation
          <Badge className={getScenarioColor(scenario)}>
            {getScenarioLabel(scenario)}
          </Badge>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
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
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Project Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Project Size</p>
            <p className="font-semibold">{projectSize} {getScalingUnitDisplay()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Complexity</p>
            <p className="font-semibold">{scalingFactor}x</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Skill Level</p>
            <p className="font-semibold">{skillMultiplier}x</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Steps</p>
            <p className="font-semibold">
              {timeEstimates.phases.reduce((acc, phase) => acc + phase.stepCount, 0)}
            </p>
          </div>
        </div>

        {/* Total Time Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Work Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatTime(timeEstimates.totalWorkTime)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Calculator className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold text-primary">
                {formatTime(timeEstimates.totalProjectTime)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Phase Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Phase Breakdown
          </h3>
          
          <div className="space-y-3">
            {timeEstimates.phases.map((phase, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{phase.phaseName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {phase.stepCount} steps
                  </p>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Work Time</p>
                    <p className="font-semibold text-blue-600">
                      {formatTime(phase.workTime)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning Recommendations */}
        {projectRun && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Planning Recommendations
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>
                • Based on {projectRun.availableHoursPerDay || 4} hours/day, {projectRun.workingDaysPerWeek || 2} days/week
              </p>
              <p>
                • Estimated calendar time: ~{Math.ceil(timeEstimates.totalWorkTime / ((projectRun.availableHoursPerDay || 4) * (projectRun.workingDaysPerWeek || 2)))} weeks
              </p>
              <p>
                • Consider scheduling wait times during off-work periods
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};