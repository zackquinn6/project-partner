import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Phase, Operation, WorkflowStep } from '../../interfaces/Project';
import { AlertTriangle, Plus, Trash2, Save, X, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface SimplifiedCustomWorkManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCustomWork: (phase: Phase) => void;
}

export const SimplifiedCustomWorkManager: React.FC<SimplifiedCustomWorkManagerProps> = ({
  open,
  onOpenChange,
  onCreateCustomWork
}) => {
  const [phaseName, setPhaseName] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customOperations, setCustomOperations] = useState<Array<{
    name: string;
    description: string;
    estimatedTime: string;
    steps: Array<{
      step: string;
      description: string;
      content: string;
    }>;
  }>>([]);
  const isMobile = useIsMobile();

  const resetForm = () => {
    setPhaseName('');
    setPhaseDescription('');
    setShowAdvancedOptions(false);
    setCustomOperations([]);
  };

  const addOperation = () => {
    setCustomOperations(prev => [...prev, {
      name: '',
      description: '',
      estimatedTime: '',
      steps: [{
        step: '',
        description: '',
        content: ''
      }]
    }]);
  };

  const removeOperation = (index: number) => {
    setCustomOperations(prev => prev.filter((_, i) => i !== index));
  };

  const updateOperation = (index: number, field: string, value: any) => {
    setCustomOperations(prev => prev.map((op, i) => 
      i === index ? { ...op, [field]: value } : op
    ));
  };

  const addStep = (operationIndex: number) => {
    setCustomOperations(prev => prev.map((op, i) => 
      i === operationIndex 
        ? {
            ...op,
            steps: [...op.steps, { step: '', description: '', content: '' }]
          }
        : op
    ));
  };

  const removeStep = (operationIndex: number, stepIndex: number) => {
    setCustomOperations(prev => prev.map((op, i) => 
      i === operationIndex 
        ? {
            ...op,
            steps: op.steps.filter((_, si) => si !== stepIndex)
          }
        : op
    ));
  };

  const updateStep = (operationIndex: number, stepIndex: number, field: string, value: string) => {
    setCustomOperations(prev => prev.map((op, i) => 
      i === operationIndex 
        ? {
            ...op,
            steps: op.steps.map((step, si) => 
              si === stepIndex ? { ...step, [field]: value } : step
            )
          }
        : op
    ));
  };

  const handleCreatePhase = () => {
    if (!phaseName.trim()) return;

    // Create default structure or use custom operations
    const operations = showAdvancedOptions && customOperations.length > 0 
      ? customOperations.map((op, opIndex) => ({
          id: `op-${opIndex}`,
          name: op.name || `Operation ${opIndex + 1}`,
          description: op.description,
          estimatedTime: op.estimatedTime,
          steps: op.steps.map((step, stepIndex) => ({
            id: `step-${opIndex}-${stepIndex}`,
            step: step.step || `Step ${stepIndex + 1}`,
            description: step.description,
            contentType: 'text' as const,
            content: step.content,
            materials: [],
            tools: [],
            outputs: [],
            phaseName: phaseName,
            operationName: op.name || `Operation ${opIndex + 1}`
          }))
        }))
      : [{
          id: 'op-0',
          name: 'Operation 1',
          description: '',
          estimatedTime: '',
          steps: [{
            id: 'step-0-0',
            step: 'Step 1',
            description: '',
            contentType: 'text' as const,
            content: '',
            materials: [],
            tools: [],
            outputs: [],
            phaseName: phaseName,
            operationName: 'Operation 1'
          }]
        }];

    const customPhase: Phase = {
      id: `custom-unplanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: phaseName,
      description: phaseDescription,
      operations
    };

    onCreateCustomWork(customPhase);
    resetForm();
    onOpenChange(false);
  };

  const isFormValid = () => {
    return phaseName.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[90vw] !h-[90vh] !max-w-[90vw] !max-h-[90vh] p-0 [&>button]:hidden overflow-hidden flex flex-col !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="w-5 h-5 text-primary" />
                Add Workflow Step
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Create a phase for unexpected work that wasn't planned originally.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="ml-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
            {/* Warning */}
            <Alert className="border-orange-200 bg-orange-50/50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-xs leading-relaxed">
                <strong className="font-medium">Note:</strong> Custom work may affect project guarantees. 
                Verify safety and building code requirements before proceeding.
              </AlertDescription>
            </Alert>

            {/* Phase Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Phase Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="phase-name" className="text-xs font-medium text-muted-foreground">Phase Name *</Label>
                  <Input
                    id="phase-name"
                    value={phaseName}
                    onChange={(e) => setPhaseName(e.target.value)}
                    placeholder="e.g., 'Fix Unexpected Plumbing Issue'"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phase-description" className="text-xs font-medium text-muted-foreground">Phase Description</Label>
                  <Textarea
                    id="phase-description"
                    value={phaseDescription}
                    onChange={(e) => setPhaseDescription(e.target.value)}
                    placeholder="Brief description of what this phase accomplishes..."
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default Structure Info */}
            <Card className="bg-muted/20 border-dashed">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium mb-1">Quick Start</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Includes "Operation 1" with "Step 1" by default.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="h-7 text-xs"
                    >
                      {showAdvancedOptions ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Hide Advanced
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          Add Custom Operations
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Options */}
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
              <CollapsibleContent>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Custom Operations</CardTitle>
                      <Button onClick={addOperation} variant="outline" size="sm" className="h-8 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Operation
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customOperations.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-xs">No custom operations yet.</p>
                        <p className="text-xs mt-1 opacity-70">Click "Add Operation" to create detailed steps.</p>
                      </div>
                    ) : (
                      customOperations.map((operation, opIndex) => (
                        <Card key={opIndex} className="border-l-2 border-l-primary">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-medium">
                                Operation {opIndex + 1} {operation.name && `- ${operation.name}`}
                              </h4>
                              <Button 
                                onClick={() => removeOperation(opIndex)}
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground">Operation Name</Label>
                                <Input
                                  value={operation.name}
                                  onChange={(e) => updateOperation(opIndex, 'name', e.target.value)}
                                  placeholder={`Operation ${opIndex + 1}`}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground">Est. Time</Label>
                                <Input
                                  value={operation.estimatedTime}
                                  onChange={(e) => updateOperation(opIndex, 'estimatedTime', e.target.value)}
                                  placeholder="e.g., 2-3 hours"
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                              <Textarea
                                value={operation.description}
                                onChange={(e) => updateOperation(opIndex, 'description', e.target.value)}
                                placeholder="Brief description..."
                                rows={2}
                                className="mt-1 text-sm"
                              />
                            </div>

                            {/* Steps */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-medium text-muted-foreground">Steps</Label>
                                <Button 
                                  onClick={() => addStep(opIndex)}
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Step
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {operation.steps.map((step, stepIndex) => (
                                  <Card key={stepIndex} className="bg-muted/20 border">
                                    <CardContent className="space-y-2 p-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">Step {stepIndex + 1}</span>
                                        {operation.steps.length > 1 && (
                                          <Button 
                                            onClick={() => removeStep(opIndex, stepIndex)}
                                            variant="ghost" 
                                            size="sm"
                                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </Button>
                                        )}
                                      </div>

                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Step Name</Label>
                                        <Input
                                          value={step.step}
                                          onChange={(e) => updateStep(opIndex, stepIndex, 'step', e.target.value)}
                                          placeholder={`Step ${stepIndex + 1}`}
                                          className="text-xs mt-1 h-7"
                                        />
                                      </div>

                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                                        <Input
                                          value={step.description}
                                          onChange={(e) => updateStep(opIndex, stepIndex, 'description', e.target.value)}
                                          placeholder="Brief description"
                                          className="text-xs mt-1 h-7"
                                        />
                                      </div>

                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Instructions</Label>
                                        <Textarea
                                          value={step.content}
                                          onChange={(e) => updateStep(opIndex, stepIndex, 'content', e.target.value)}
                                          placeholder="Detailed instructions..."
                                          rows={2}
                                          className="text-xs mt-1"
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Action Bar */}
        <div className="border-t px-6 py-4 flex-shrink-0 bg-muted/20">
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={resetForm} size="sm" className="h-9 text-sm">
              Clear Form
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="h-9 text-sm">
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePhase}
              disabled={!isFormValid()}
              size="sm"
              className="h-9 text-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Create Phase
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};