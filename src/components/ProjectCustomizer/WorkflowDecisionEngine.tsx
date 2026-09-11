import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { Operation } from '../../interfaces/Project';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
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

type AlternateGroup = {
  prompt: string;
  detailedSummary?: string;
  operations: Operation[];
};

type DecisionDetailTarget = {
  phaseName: string;
  prompt: string;
  detailedSummary?: string;
  operations: Operation[];
};

function opFlowType(operation: Operation): string {
  return operation.flowType || (operation as { flowType?: string }).flowType || 'prime';
}

function opAlternateGroup(operation: Operation): string {
  return operation.alternateGroup || (operation as { alternateGroup?: string }).alternateGroup || 'choice-group';
}

export const WorkflowDecisionEngine: React.FC<WorkflowDecisionEngineProps> = ({
  projectRun,
  onStandardDecision,
  onIfNecessaryWork,
  customizationState
}) => {
  const isMobile = useIsMobile();
  const [detailTarget, setDetailTarget] = useState<DecisionDetailTarget | null>(null);

  const phasesWithDecisions = useMemo(() => {
    return projectRun.phases?.map(phase => {
      const alternateGroups = new Map<string, AlternateGroup>();
      const ifNecessaryOps: Operation[] = [];

      phase.operations.forEach(operation => {
        const flowType = opFlowType(operation);

        if (flowType === 'alternate') {
          const groupKey = opAlternateGroup(operation);
          if (!alternateGroups.has(groupKey)) {
            alternateGroups.set(groupKey, {
              prompt: operation.userPrompt || 'Choose an option:',
              detailedSummary: operation.decisionDetailedSummary,
              operations: []
            });
          }
          const group = alternateGroups.get(groupKey)!;
          if (!group.detailedSummary && operation.decisionDetailedSummary) {
            group.detailedSummary = operation.decisionDetailedSummary;
          }
          if ((!group.prompt || group.prompt === 'Choose an option:') && operation.userPrompt) {
            group.prompt = operation.userPrompt;
          }
          group.operations.push(operation);
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

  const openDecisionDetail = (
    phaseName: string,
    group: AlternateGroup
  ) => {
    setDetailTarget({
      phaseName,
      prompt: group.prompt,
      detailedSummary: group.detailedSummary,
      operations: group.operations,
    });
  };

  return (
    <>
      <ScrollArea className="h-full">
        <div className={`space-y-6 ${isMobile ? 'px-1' : 'p-6'}`}>
          <div className="mb-6 text-center">
            <h3 className="mb-2 text-base font-semibold">Workflow Decision Points</h3>
          </div>

          {phasesWithDecisions?.map(({ phase, alternateGroups, ifNecessaryOps }) => (
            <Card key={phase.id} className="w-full">
              <CardHeader className={isMobile ? 'pb-3' : ''}>
                <CardTitle className="text-sm font-semibold">{phase.name}</CardTitle>
                {phase.description && <p className="text-sm text-muted-foreground">{phase.description}</p>}
              </CardHeader>
              <CardContent className="space-y-6">
                {alternateGroups.map(([groupKey, group]) => {
                  const isAnswered = Boolean(getSelectedAlternative(phase.id, groupKey));
                  const hasDetail =
                    Boolean(group.detailedSummary?.trim()) ||
                    group.operations.some(
                      (op) =>
                        Boolean(op.optionDetailedDescription?.trim()) ||
                        Boolean(op.optionImageUrl?.trim())
                    );
                  return (
                  <div
                    key={groupKey}
                    className={`rounded-lg border ${isMobile ? 'p-3' : 'p-4'} ${
                      isAnswered ? 'border-green-300 bg-green-50/40' : ''
                    }`}
                  >
                    <div className={`mb-3 flex items-start gap-3 ${isMobile ? 'flex-col sm:flex-row' : ''}`}>
                      <div className={`${isMobile ? 'self-start' : 'mt-0.5'}`}>
                        {isAnswered ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-500" aria-hidden />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="flex flex-col gap-2 text-sm font-medium sm:flex-row sm:items-center">
                          <span className="flex flex-1 items-start gap-1.5">
                            <span className="flex-1">{group.prompt}</span>
                            {hasDetail ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Open decision details"
                                onClick={() => openDecisionDetail(phase.name, group)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </span>
                          {isAnswered ? (
                            <Badge variant="secondary" className="bg-green-100 text-xs text-green-800">
                              Done
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </h4>
                      </div>
                    </div>

                    <RadioGroup
                      value={getSelectedAlternative(phase.id, groupKey) || ''}
                      onValueChange={(value) => handleAlternativeSelection(phase.id, groupKey, value)}
                      className={`space-y-3 ${isMobile ? 'ml-0 pl-0' : 'ml-8'}`}
                    >
                      {group.operations.map((operation) => (
                        <div
                          key={operation.id}
                          className={`flex items-start space-x-3 ${isMobile ? 'rounded-lg bg-muted/30 p-3' : ''}`}
                        >
                          <RadioGroupItem
                            value={operation.id}
                            id={operation.id}
                            className={`mt-1 ${isMobile ? 'scale-110' : ''}`}
                          />
                          <Label
                            htmlFor={operation.id}
                            className={`flex flex-1 cursor-pointer gap-3 font-normal ${isMobile ? 'text-sm leading-relaxed' : 'text-sm'}`}
                          >
                            {operation.optionImageUrl ? (
                              <img
                                src={operation.optionImageUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-md border object-cover"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{operation.name}</p>
                              {operation.description && (
                                <p className="mt-1 text-muted-foreground">{operation.description}</p>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  );
                })}

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
                            className={`flex flex-1 cursor-pointer gap-3 font-normal ${isMobile ? 'text-sm leading-relaxed' : 'text-sm'}`}
                          >
                            {operation.optionImageUrl ? (
                              <img
                                src={operation.optionImageUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 rounded-md border object-cover"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{operation.name}</p>
                              {operation.description && (
                                <p className="text-muted-foreground mt-1">{operation.description}</p>
                              )}
                              {operation.userPrompt && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {operation.userPrompt}
                                </p>
                              )}
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
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <h3 className="mb-2 text-lg font-semibold">No Decisions Required</h3>
                <p className="text-muted-foreground">
                  This project has a straightforward workflow with no alternate paths or optional work.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <Dialog open={Boolean(detailTarget)} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-xl">
          {detailTarget ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left text-base sm:text-lg">
                  {detailTarget.prompt}
                </DialogTitle>
                <DialogDescription className="text-left text-xs text-muted-foreground">
                  {detailTarget.phaseName}
                </DialogDescription>
              </DialogHeader>

              {detailTarget.detailedSummary ? (
                <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision detail
                  </p>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {detailTarget.detailedSummary}
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options
                </p>
                {detailTarget.operations.map((op) => (
                  <div key={op.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      {op.optionImageUrl ? (
                        <img
                          src={op.optionImageUrl}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-md border object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{op.name}</p>
                        {op.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{op.description}</p>
                        ) : null}
                      </div>
                    </div>
                    {op.optionDetailedDescription ? (
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {op.optionDetailedDescription}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
