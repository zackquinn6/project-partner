import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Plus, Settings2, Trash2 } from 'lucide-react';
import { Phase, Operation } from '@/interfaces/Project';
import { toast } from 'sonner';

interface AdminWorkflowEditorProps {
  phases: Phase[];
  onBack: () => void;
  onSave: (phases: Phase[]) => void;
}

const STEP_TYPES = [
  { value: 'prime', label: 'One-time', color: 'bg-green-500' },
  { value: 'repeat', label: 'Per Unit', color: 'bg-blue-500' },
  { value: 'inspection', label: 'Quality Check', color: 'bg-orange-500' }
] as const;

const FLOW_TYPES = [
  { value: 'alternate', label: 'Alternate', color: 'bg-orange-500' },
  { value: 'if-necessary', label: 'If Necessary', color: 'bg-gray-500' }
] as const;

export const AdminWorkflowEditor: React.FC<AdminWorkflowEditorProps> = ({
  phases,
  onBack,
  onSave
}) => {
  const [editingPhases, setEditingPhases] = useState<Phase[]>(phases);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [editingOperation, setEditingOperation] = useState<{ phaseId: string; operationId: string } | null>(null);
  const [stepDetailLevels, setStepDetailLevels] = useState<Record<string, 'quick' | 'detailed' | 'contractor'>>({});

  const updateOperationFlowType = (phaseId: string, operationId: string, flowType: string) => {
    setEditingPhases(prev => prev.map(phase => {
      if (phase.id !== phaseId) return phase;
      
      return {
        ...phase,
        operations: phase.operations.map(op => {
          if (op.id !== operationId) return op;
          
          return {
            ...op,
            steps: op.steps.map(step => ({
              ...step,
              flowType: flowType as any
            }))
          };
        })
      };
    }));
  };

  const updateOperationPrompt = (phaseId: string, operationId: string, prompt: string) => {
    setEditingPhases(prev => prev.map(phase => {
      if (phase.id !== phaseId) return phase;
      
      return {
        ...phase,
        operations: phase.operations.map(op => {
          if (op.id !== operationId) return op;
          
          return {
            ...op,
            userPrompt: prompt
          };
        })
      };
    }));
  };

  const handleSave = () => {
    onSave(editingPhases);
    toast.success('Workflow structure saved successfully');
  };

  const getOperationStepType = (operation: Operation): string => {
    // Get step type from first step (they should all be the same for an operation)
    return operation.steps[0]?.flowType || 'prime';
  };

  const getStepTypeColor = (stepType: string) => {
    return STEP_TYPES.find(st => st.value === stepType)?.color || 'bg-gray-300';
  };

  const getOperationFlowType = (operation: Operation): string | null => {
    const stepType = getOperationStepType(operation);
    // Only return flow type if it's alternate or if-necessary
    if (stepType === 'alternate' || stepType === 'if-necessary') {
      return stepType;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Workflow Structure Editor</h2>
              <p className="text-muted-foreground">Configure operation types and decision prompts</p>
            </div>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="border-b bg-muted/30 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <span className="font-semibold">Step Types:</span>
            {STEP_TYPES.map(type => (
              <div key={type.value} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${type.color}`}></div>
                <span>{type.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <span className="font-semibold">Flow Types:</span>
            {FLOW_TYPES.map(type => (
              <div key={type.value} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${type.color}`}></div>
                <span>{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {editingPhases.map(phase => (
            <Card key={phase.id}>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}>
                <CardTitle className="flex items-center justify-between">
                  <span>{phase.name}</span>
                  <Badge variant="outline">{phase.operations.length} operations</Badge>
                </CardTitle>
              </CardHeader>
              
              {expandedPhase === phase.id && (
                <CardContent className="space-y-4">
                  {phase.operations.map(operation => {
                    const stepType = getOperationStepType(operation);
                    const flowType = getOperationFlowType(operation);
                    const isEditing = editingOperation?.phaseId === phase.id && editingOperation?.operationId === operation.id;
                    
                    return (
                      <Card key={operation.id} className={`border-l-4 border-l-${getStepTypeColor(stepType).replace('bg-', '')}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{operation.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{operation.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOperation(isEditing ? null : { phaseId: phase.id, operationId: operation.id })}
                            >
                              <Settings2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        
                        {isEditing && (
                          <CardContent className="space-y-4 pt-0">
                            <div className="space-y-2">
                              <Label>Step Type</Label>
                              <Select
                                value={stepType}
                                onValueChange={(value) => updateOperationFlowType(phase.id, operation.id, value)}
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  {STEP_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded ${type.color}`}></div>
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {flowType && (
                              <div className="space-y-2">
                                <Label>Flow Type</Label>
                                <div className="p-2 bg-muted rounded-md">
                                  {flowType === 'alternate' && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded bg-orange-500"></div>
                                      <span className="text-sm">Alternate - Decision point in workflow</span>
                                    </div>
                                  )}
                                  {flowType === 'if-necessary' && (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded bg-gray-500"></div>
                                      <span className="text-sm">If Necessary - Conditional operation</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {(stepType === 'alternate' || stepType === 'if-necessary') && (
                              <div className="space-y-2">
                                <Label>User Decision Prompt</Label>
                                <Textarea
                                  placeholder={
                                    flowType === 'alternate' 
                                      ? "e.g., Is your subfloor concrete or wood?"
                                      : "e.g., Do you have a toilet in the installation area?"
                                  }
                                  value={(operation as any).userPrompt || ''}
                                  onChange={(e) => updateOperationPrompt(phase.id, operation.id, e.target.value)}
                                  rows={2}
                                />
                                <p className="text-xs text-muted-foreground">
                                  This question will help users decide whether this operation is needed
                                </p>
                              </div>
                            )}

                            <div className="space-y-3 pt-3 border-t">
                              <div>
                                <Label className="text-sm font-semibold">Step Content</Label>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Configure instruction content for each detail level. Each step can have different content for Quick, Detailed, and New User levels.
                                </p>
                              </div>
                              
                              {operation.steps.map((step, stepIndex) => {
                                const detailLevel = stepDetailLevels[step.id] || 'detailed';
                                return (
                                  <Card key={step.id} className="p-3 bg-muted/50">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-sm">
                                          Step {stepIndex + 1}: {step.step}
                                        </div>
                                        <Select 
                                          value={detailLevel} 
                                          onValueChange={(value: any) => setStepDetailLevels(prev => ({ ...prev, [step.id]: value }))}
                                        >
                                          <SelectTrigger className="w-[140px] h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="quick">Quick</SelectItem>
                                            <SelectItem value="detailed">Detailed</SelectItem>
                                            <SelectItem value="contractor">Contractor</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Alert className="py-2">
                                        <AlertDescription className="text-xs">
                                          <strong>{detailLevel.charAt(0).toUpperCase() + detailLevel.slice(1)}</strong> level instructions 
                                          are stored in the <strong>step_instructions</strong> table with instruction_level='{detailLevel}'. 
                                          Use the Step Content Editor or database to manage content for this level.
                                        </AlertDescription>
                                      </Alert>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Badge className={getStepTypeColor(stepType)}>
                                {STEP_TYPES.find(st => st.value === stepType)?.label}
                              </Badge>
                              {flowType && (
                                <Badge className="bg-orange-500/10 text-orange-700 border border-orange-500/20">
                                  {FLOW_TYPES.find(ft => ft.value === flowType)?.label}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {operation.steps.length} steps
                              </span>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
