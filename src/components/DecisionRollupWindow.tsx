import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Clock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Phase, WorkflowStep, DecisionPoint } from '@/interfaces/Project';

interface DecisionRollupWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phases: Phase[];
  onPhasesUpdate: (phases: Phase[]) => void;
  mode: 'initial-plan' | 'final-plan' | 'unplanned-work';
  title?: string;
}

interface DecisionItem {
  id: string;
  question: string;
  description?: string;
  stepName: string;
  phaseName: string;
  operationName: string;
  stage: string;
  options: Array<{
    id: string;
    label: string;
    value: string;
    nextStepId?: string;
    alternateStepId?: string;
  }>;
  selectedValue?: string;
  status: 'pending' | 'answered' | 'requires-attention';
}

export const DecisionRollupWindow: React.FC<DecisionRollupWindowProps> = ({
  open,
  onOpenChange,
  phases,
  onPhasesUpdate,
  mode,
  title
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Extract all decision points from phases
  useEffect(() => {
    if (!phases || phases.length === 0) return;

    const extractedDecisions: DecisionItem[] = [];
    
    phases.forEach((phase) => {
      phase.operations.forEach((operation) => {
        operation.steps.forEach((step) => {
          if (step.isDecisionPoint && step.decisionPoint) {
            const decision: DecisionItem = {
              id: step.id,
              question: step.decisionPoint.question,
              description: step.decisionPoint.description,
              stepName: step.step,
              phaseName: phase.name,
              operationName: operation.name,
              stage: step.decisionPoint.stage || 'planning',
              options: step.decisionPoint.options || [],
              selectedValue: undefined, // Will be set from stored data
              status: 'pending' // Will be updated based on stored data
            };
            extractedDecisions.push(decision);
          }
        });
      });
    });

    setDecisions(extractedDecisions);

    // Initialize answers from project run data if available
    const initialAnswers: Record<string, string> = {};
    // Since DecisionPoint interface doesn't have selectedValue, we'll manage state separately
    setAnswers(initialAnswers);
  }, [phases]);

  const handleAnswerChange = (decisionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [decisionId]: value
    }));

    // Update decision status
    setDecisions(prev => prev.map(decision => 
      decision.id === decisionId 
        ? { ...decision, selectedValue: value, status: 'answered' }
        : decision
    ));
  };

  const applyDecisions = async () => {
    setLoading(true);
    
    try {
      // Update phases with decision answers
      const updatedPhases = phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => {
            if (step.isDecisionPoint && step.decisionPoint && answers[step.id]) {
              const selectedOption = step.decisionPoint.options.find(
                option => option.value === answers[step.id]
              );
              
              return {
                ...step,
                decisionPoint: {
                  ...step.decisionPoint,
                  // Store selected value in a custom property since interface doesn't have it
                  selectedValue: answers[step.id] as any,
                  appliedAt: new Date().toISOString() as any,
                  appliedInStage: mode as any
                }
              };
            }
            return step;
          })
        }))
      }));

      // Apply workflow changes based on decisions
      const finalPhases = applyWorkflowChanges(updatedPhases);

      onPhasesUpdate(finalPhases);
      toast.success('Decisions applied and workflow updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying decisions:', error);
      toast.error('Failed to apply decisions');
    } finally {
      setLoading(false);
    }
  };

  const applyWorkflowChanges = (phases: Phase[]): Phase[] => {
    // Logic to modify workflow based on decision answers
    // This would update step flows, enable/disable steps, etc.
    return phases.map(phase => ({
      ...phase,
      operations: phase.operations.map(operation => ({
        ...operation,
        steps: operation.steps.map(step => {
          // Apply decision logic to modify step behavior
          if (step.isDecisionPoint && step.decisionPoint && (step.decisionPoint as any).selectedValue) {
            const selectedOption = step.decisionPoint.options.find(
              option => option.value === (step.decisionPoint as any).selectedValue
            );

            if (selectedOption) {
              // Update step flow based on selected option
              return {
                ...step,
                nextStepId: selectedOption.nextStepId,
                alternateStepId: selectedOption.alternateStepId
              };
            }
          }
          return step;
        })
      }))
    }));
  };

  const getStatusIcon = (status: DecisionItem['status']) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'requires-attention':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'kickoff':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'planning':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'execution':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'completion':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const pendingCount = decisions.filter(d => d.status === 'pending').length;
  const answeredCount = decisions.filter(d => d.status === 'answered').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            {title || `Project Decisions - ${mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Decision Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Answered: {answeredCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Pending: {pendingCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Total: {decisions.length}</span>
                </div>
              </div>
              {mode === 'initial-plan' && (
                <p className="text-sm text-muted-foreground mt-2">
                  All decisions must be answered before proceeding to the next phase.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Decisions List */}
          <div className="space-y-4">
            {decisions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No decision points found in this project.</p>
                </CardContent>
              </Card>
            ) : (
              decisions.map((decision) => (
                <Card key={decision.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {getStatusIcon(decision.status)}
                          {decision.question}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {decision.phaseName} → {decision.operationName}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStageColor(decision.stage)}`}
                          >
                            {decision.stage}
                          </Badge>
                        </div>
                        {decision.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {decision.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Choose an option:</Label>
                      <RadioGroup
                        value={answers[decision.id] || ''}
                        onValueChange={(value) => handleAnswerChange(decision.id, value)}
                        className="space-y-2"
                      >
                        {decision.options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${decision.id}-${option.id}`} />
                            <Label 
                              htmlFor={`${decision.id}-${option.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      {answers[decision.id] && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-800">
                            ✓ Selected: {decision.options.find(opt => opt.value === answers[decision.id])?.label}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {mode === 'initial-plan' && pendingCount > 0 && (
                <span className="text-orange-600 font-medium">
                  {pendingCount} decision(s) still need to be answered
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {mode === 'initial-plan' && pendingCount > 0 ? 'Save Draft' : 'Cancel'}
              </Button>
              <Button 
                onClick={applyDecisions} 
                disabled={loading || (mode === 'initial-plan' && pendingCount > 0)}
              >
                {loading ? 'Applying...' : 'Apply Decisions & Update Workflow'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};