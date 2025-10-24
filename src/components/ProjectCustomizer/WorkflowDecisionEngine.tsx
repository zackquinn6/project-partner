import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Operation } from '../../interfaces/Project';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface WorkflowDecisionEngineProps {
  projectRun: ProjectRun;
  onStandardDecision: (phaseId: string, alternatives: string[]) => void;
  onIfNecessaryWork: (phaseId: string, optionalWork: string[]) => void;
  customizationState: {
    standardDecisions: Record<string, string[]>;
    ifNecessaryWork: Record<string, string[]>;
  };
}

export const WorkflowDecisionEngine: React.FC<WorkflowDecisionEngineProps> = ({
  projectRun,
  onStandardDecision,
  onIfNecessaryWork,
  customizationState
}) => {
  const isMobile = useIsMobile();

  // Extract decision points from actual operations - reading directly from database flow_type metadata
  const phasesWithDecisions = useMemo(() => {
    return projectRun.phases?.map(phase => {
      const alternateGroups = new Map<string, { prompt: string; operations: Operation[] }>();
      const ifNecessaryOps: Operation[] = [];

      phase.operations.forEach(operation => {
        // Read flow_type from operation metadata (set by DecisionTreeManager and rebuild_phases_json_from_templates)
        const flowType = (operation as any).flowType || 'prime';
        
        if (flowType === 'alternate') {
          // Group alternates by their alternate_group field
          const groupKey = (operation as any).alternateGroup || 'choice-group';
          if (!alternateGroups.has(groupKey)) {
            alternateGroups.set(groupKey, {
              // Use user_prompt from DecisionTreeManager as the decision prompt
              prompt: (operation as any).userPrompt || 'Choose an option:',
              operations: []
            });
          }
          alternateGroups.get(groupKey)!.operations.push(operation);
        } else if (flowType === 'if-necessary') {
          ifNecessaryOps.push(operation);
        }
      });

      return {
        phase,
        alternateGroups: Array.from(alternateGroups.entries()),
        ifNecessaryOps
      };
    }).filter(p => p.alternateGroups.length > 0 || p.ifNecessaryOps.length > 0);
  }, [projectRun.phases]);

  const handleAlternativeSelection = (phaseId: string, groupKey: string, operationId: string) => {
    const currentDecisions = customizationState.standardDecisions[phaseId] || [];
    const updatedDecisions = currentDecisions.filter(d => !d.startsWith(groupKey + ':'));
    updatedDecisions.push(`${groupKey}:${operationId}`);
    onStandardDecision(phaseId, updatedDecisions);
  };

  const handleIfNecessarySelection = (phaseId: string, operationId: string, checked: boolean) => {
    const currentWork = customizationState.ifNecessaryWork[phaseId] || [];
    
    let updatedWork;
    if (checked) {
      updatedWork = [...currentWork, operationId];
    } else {
      updatedWork = currentWork.filter(w => w !== operationId);
    }
    
    onIfNecessaryWork(phaseId, updatedWork);
  };

  const getSelectedAlternative = (phaseId: string, groupKey: string): string | null => {
    const decisions = customizationState.standardDecisions[phaseId] || [];
    const decision = decisions.find(d => d.startsWith(groupKey + ':'));
    return decision ? decision.split(':')[1] : null;
  };

  const isIfNecessarySelected = (phaseId: string, operationId: string): boolean => {
    const work = customizationState.ifNecessaryWork[phaseId] || [];
    return work.includes(operationId);
  };

  return (
    <ScrollArea className="h-full">
      <div className={`space-y-6 ${isMobile ? 'px-1' : 'p-6'}`}>
        <div className="text-center mb-6">
          <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>Workflow Decision Points</h3>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-sm'}`}>
            Make choices about how you want to execute each phase of your project.
            <strong className="text-primary"> Required decisions</strong> must be made, 
            <em className="text-muted-foreground"> optional work</em> can be added if needed.
          </p>
        </div>

        {phasesWithDecisions?.map(({ phase, alternateGroups, ifNecessaryOps }) => (
          <Card key={phase.id} className="w-full">
            <CardHeader className={isMobile ? 'pb-3' : ''}>
              <CardTitle className={`flex flex-col sm:flex-row sm:items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <span className="flex-1">{phase.name}</span>
                <Badge variant="outline" className="self-start sm:self-center text-xs">
                  {phase.operations?.length || 0} operations
                </Badge>
              </CardTitle>
              {phase.description && <p className="text-sm text-muted-foreground">{phase.description}</p>}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alternate Choices */}
              {alternateGroups.map(([groupKey, group]) => (
                <div key={groupKey} className={`border rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className={`flex items-start gap-3 mb-3 ${isMobile ? 'flex-col sm:flex-row' : ''}`}>
                    <div className={`${isMobile ? 'self-start' : 'mt-0.5'}`}>
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium flex flex-col sm:flex-row sm:items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                        <span className="flex-1">{group.prompt}</span>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </h4>
                    </div>
                  </div>

                  <RadioGroup
                    value={getSelectedAlternative(phase.id, groupKey) || ''}
                    onValueChange={(value) => handleAlternativeSelection(phase.id, groupKey, value)}
                    className={`space-y-3 ${isMobile ? 'ml-0 pl-0' : 'ml-8'}`}
                  >
                    {group.operations.map((operation) => (
                      <div key={operation.id} className={`flex items-start space-x-3 ${isMobile ? 'p-3 bg-muted/30 rounded-lg' : ''}`}>
                        <RadioGroupItem 
                          value={operation.id} 
                          id={operation.id}
                          className={`mt-1 ${isMobile ? 'scale-110' : ''}`}
                        />
                        <Label 
                          htmlFor={operation.id}
                          className={`font-normal cursor-pointer flex-1 ${isMobile ? 'text-sm leading-relaxed' : 'text-sm'}`}
                        >
                          <div>
                            <p className="font-medium">{operation.name}</p>
                            {operation.description && (
                              <p className="text-muted-foreground mt-1">{operation.description}</p>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}

              {/* If Necessary Options */}
              {ifNecessaryOps.map((operation) => (
                <div key={operation.id} className={`border rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className={`flex items-start gap-3 ${isMobile ? 'flex-col sm:flex-row' : ''}`}>
                    <div className={`${isMobile ? 'self-start' : 'mt-0.5'}`}>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={operation.id}
                          checked={isIfNecessarySelected(phase.id, operation.id)}
                          onCheckedChange={(checked) => 
                            handleIfNecessarySelection(phase.id, operation.id, checked as boolean)
                          }
                          className={`mt-1 ${isMobile ? 'scale-110' : ''}`}
                        />
                        <Label 
                          htmlFor={operation.id}
                          className={`font-normal cursor-pointer flex-1 ${isMobile ? 'text-sm leading-relaxed' : 'text-sm'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{operation.name}</p>
                              {operation.description && (
                                <p className="text-muted-foreground mt-1">{operation.description}</p>
                              )}
                              {(operation as any).userPrompt && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                                  {(operation as any).userPrompt}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs self-start">Optional</Badge>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {(!phasesWithDecisions || phasesWithDecisions.length === 0) && (
          <Card>
            <CardContent className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
              <CheckCircle2 className={`text-green-500 mx-auto mb-4 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`} />
              <h3 className={`font-semibold mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>No Decisions Required</h3>
              <p className="text-muted-foreground text-sm">
                This project workflow has been pre-configured with optimal settings. 
                You can add custom work in the other tabs if needed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
};