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
import { Calculator, Clock, CalendarIcon, CheckCircle, Info, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TOOLIO_PROJECT_STRUCTURE_STANDARD } from '@/utils/projectStructureStandard';

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
            <TabsList className="grid w-full grid-cols-4">
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
              <TabsTrigger value="structure" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Project structure guide
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

            <TabsContent value="structure" className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">TOOLIO Project structure — quick reference standard</h3>
                <p className="text-sm text-muted-foreground">
                  {TOOLIO_PROJECT_STRUCTURE_STANDARD.summary}
                </p>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {TOOLIO_PROJECT_STRUCTURE_STANDARD.hierarchy.map((line) => (
                    <p key={line} className="font-medium">
                      {line}
                    </p>
                  ))}
                  <p className="text-sm text-muted-foreground">
                    Phases &amp; operations = project management. Steps = instructions. Actions = micro instructions.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">1. Phase</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="font-medium">{TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.description}</p>
                    <p><span className="font-semibold">Purpose:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.purpose}</p>
                    <p><span className="font-semibold">Contains:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.contains}</p>
                    <div>
                      <p className="font-semibold mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Duration: {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.durationMax}</li>
                        <li>Count: Unlimited (typical: 2–5)</li>
                        {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.mustRules.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.examples && (
                      <div>
                        <p className="font-semibold mb-1">Examples</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.phase.examples.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">2. Operation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="font-medium">{TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.description}</p>
                    <p><span className="font-semibold">Purpose:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.purpose}</p>
                    <p><span className="font-semibold">Contains:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.contains}</p>
                    <div>
                      <p className="font-semibold mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Duration: up to 4 hours</li>
                        <li>Count: Max 10 operations per phase</li>
                        {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.mustRules.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.examples && (
                      <div>
                        <p className="font-semibold mb-1">Examples</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.operation.examples.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">3. Step</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="font-medium">{TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.step.description}</p>
                    <p><span className="font-semibold">Purpose:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.step.purpose}</p>
                    <p><span className="font-semibold">Contains:</span> {TOOLIO_PROJECT_STRUCTURE_STANDARD.levels.step.contains}</p>
                    <div>
                      <p className="font-semibold mb-1">Rules</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Standard step: 5–60 minutes</li>
                        <li>Scaled step (repetitive/surface area): up to 1 hour</li>
                        <li>Max 10 steps per operation</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">4. Actions inside each step</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="font-medium">Every step must include:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      {TOOLIO_PROJECT_STRUCTURE_STANDARD.stepRequirements.map((req) => (
                        <li key={req}>{req}</li>
                      ))}
                    </ol>
                    <div>
                      <p className="font-semibold mb-1">Action examples</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Turn wrench ¼ turn</li>
                        <li>Feather brush outward</li>
                        <li>Press evenly</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">5. Time standards summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="py-2 pr-4">Level</th>
                          <th className="py-2 pr-4">Typical duration</th>
                          <th className="py-2 pr-4">Max duration</th>
                          <th className="py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TOOLIO_PROJECT_STRUCTURE_STANDARD.timeStandards.map((row) => (
                          <tr key={row.level} className="border-b last:border-0">
                            <td className="py-2 pr-4 capitalize">{row.level}</td>
                            <td className="py-2 pr-4">{row.typicalDuration}</td>
                            <td className="py-2 pr-4">{row.maxDuration}</td>
                            <td className="py-2">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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