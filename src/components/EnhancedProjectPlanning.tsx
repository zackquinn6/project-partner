import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectSizingQuestionnaire } from './ProjectSizingQuestionnaire';
import { ProjectTimeEstimator } from './ProjectTimeEstimator';
import { ProjectCalendarPlanning } from './ProjectCalendarPlanning';
import { useProject } from '@/contexts/ProjectContext';
import { Calculator, Clock, CalendarIcon, CheckCircle } from 'lucide-react';

interface EnhancedProjectPlanningProps {
  onComplete: () => void;
  isCompleted: boolean;
}

export const EnhancedProjectPlanning: React.FC<EnhancedProjectPlanningProps> = ({
  onComplete,
  isCompleted
}) => {
  const { currentProject, currentProjectRun } = useProject();
  const [sizingComplete, setSizingComplete] = useState(false);
  const [calendarPlanningComplete, setCalendarPlanningComplete] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'low' | 'medium' | 'high'>('medium');
  
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
                Project Sizing
                {sizingComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="estimation" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Estimation
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendar Planning
                {calendarPlanningComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sizing" className="space-y-4">
              <ProjectSizingQuestionnaire
                onComplete={() => setSizingComplete(true)}
                isCompleted={sizingComplete || isCompleted}
              />
            </TabsContent>
            
            <TabsContent value="estimation" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Time Estimation Scenarios</h3>
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
    </div>
  );
};