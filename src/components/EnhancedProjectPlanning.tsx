import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectSizingQuestionnaire } from './ProjectSizingQuestionnaire';
import { ProjectTimeEstimator } from './ProjectTimeEstimator';
import { ProjectCalendarPlanning } from './ProjectCalendarPlanning';
import { DecisionTreeFlowchart } from './DecisionTreeFlowchart';
import { useProject } from '@/contexts/ProjectContext';
import { Calculator, Clock, CalendarIcon, CheckCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EnhancedProjectPlanningProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const EnhancedProjectPlanning: React.FC<EnhancedProjectPlanningProps> = ({
  onComplete,
  isCompleted
}) => {
  const { currentProject, currentProjectRun, updateProjectRun } = useProject();
  const [sizingComplete, setSizingComplete] = useState(false);
  const [calendarPlanningComplete, setCalendarPlanningComplete] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'low' | 'medium' | 'high'>('medium');
  const [showDecisionTreeView, setShowDecisionTreeView] = useState(false);
  
  // Check if all planning steps are complete and call onComplete
  useEffect(() => {
    if (sizingComplete && calendarPlanningComplete) {
      onComplete();
    }
  }, [sizingComplete, calendarPlanningComplete, onComplete]);

  if (!currentProject || !currentProjectRun) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No project selected for planning</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Enhanced Project Planning
            {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="sizing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sizing" className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Work Scope
                {sizingComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="estimation" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Estimation
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Project Scheduling
                {calendarPlanningComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sizing" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Project Work Scope</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowDecisionTreeView(true)}
                  className="flex items-center gap-2"
                >
                  🔀 Decision Tree
                </Button>
              </div>
              
              <ProjectSizingQuestionnaire
                onComplete={() => setSizingComplete(true)}
                isCompleted={sizingComplete || isCompleted}
              />
            </TabsContent>
            
            <TabsContent value="estimation" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Time Estimation Scenarios</h3>
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
                  </div>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((scenario) => (
                      <Button
                        key={scenario}
                        variant={selectedScenario === scenario ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedScenario(scenario)}
                        className={
                          scenario === 'low' ? 'border-green-300 text-green-700' :
                          scenario === 'medium' ? 'border-blue-300 text-blue-700' :
                          'border-red-300 text-red-700'
                        }
                      >
                        {scenario === 'low' ? 'Best Case' : 
                         scenario === 'medium' ? 'Typical' : 'Worst Case'}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <ProjectTimeEstimator
                  project={currentProject}
                  projectRun={currentProjectRun}
                  scenario={selectedScenario}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="space-y-4">
              {currentProject && currentProjectRun ? (
                <ProjectCalendarPlanning
                  project={currentProject}
                  projectRun={currentProjectRun}
                  scenario={selectedScenario}
                  onComplete={() => setCalendarPlanningComplete(true)}
                  isCompleted={calendarPlanningComplete || isCompleted}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No project selected for calendar planning
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Decision Tree Modal */}
      {showDecisionTreeView && currentProject && currentProjectRun && (
        <div className="fixed inset-0 z-50 bg-background">
          <DecisionTreeFlowchart
            phases={currentProjectRun.phases}
            onBack={() => setShowDecisionTreeView(false)}
            onUpdatePhases={async (updatedPhases) => {
              await updateProjectRun({
                ...currentProjectRun,
                phases: updatedPhases,
                updatedAt: new Date()
              });
            }}
          />
        </div>
      )}
    </div>
  );
};