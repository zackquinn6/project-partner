import React, { useState } from 'react';
import { DecisionPoint, DecisionOption, WorkflowStep } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DecisionPointEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: WorkflowStep;
  availableSteps: { id: string; name: string; phaseId: string; operationId: string }[];
  onSave: (updatedStep: WorkflowStep) => void;
}

export const DecisionPointEditor: React.FC<DecisionPointEditorProps> = ({
  open,
  onOpenChange,
  step,
  availableSteps,
  onSave,
}) => {
  const [editedStep, setEditedStep] = useState<WorkflowStep>({ ...step });
  const [decisionPoint, setDecisionPoint] = useState<DecisionPoint>(
    step.decisionPoint || {
      id: `decision-${Date.now()}`,
      question: '',
      description: '',
      options: [],
      allowFreeText: false,
      stage: 'execution',
    }
  );

  const addOption = () => {
    const newOption: DecisionOption = {
      id: `option-${Date.now()}`,
      label: '',
      value: '',
    };
    setDecisionPoint({
      ...decisionPoint,
      options: [...decisionPoint.options, newOption],
    });
  };

  const updateOption = (index: number, field: keyof DecisionOption, value: string) => {
    const updatedOptions = [...decisionPoint.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setDecisionPoint({ ...decisionPoint, options: updatedOptions });
  };

  const removeOption = (index: number) => {
    const updatedOptions = decisionPoint.options.filter((_, i) => i !== index);
    setDecisionPoint({ ...decisionPoint, options: updatedOptions });
  };

  const handleSave = () => {
    if (!decisionPoint.question.trim()) {
      toast.error('Decision question is required');
      return;
    }

    if (decisionPoint.options.length === 0) {
      toast.error('At least one option is required');
      return;
    }

    const hasEmptyOptions = decisionPoint.options.some(option => !option.label.trim() || !option.value.trim());
    if (hasEmptyOptions) {
      toast.error('All options must have both label and value');
      return;
    }

    const updatedStep: WorkflowStep = {
      ...editedStep,
      isDecisionPoint: true,
      decisionPoint,
    };

    onSave(updatedStep);
    onOpenChange(false);
    toast.success('Decision point saved successfully');
  };

  const handleToggleDecisionPoint = (enabled: boolean) => {
    if (enabled) {
      setEditedStep({ ...editedStep, isDecisionPoint: true });
    } else {
      setEditedStep({ 
        ...editedStep, 
        isDecisionPoint: false,
        decisionPoint: undefined 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Decision Point: {step.step}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable Decision Point Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Decision Point Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-decision"
                  checked={editedStep.isDecisionPoint || false}
                  onCheckedChange={handleToggleDecisionPoint}
                />
                <Label htmlFor="enable-decision">Enable decision point for this step</Label>
              </div>

              {editedStep.isDecisionPoint && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="decision-question">Decision Question *</Label>
                      <Input
                        id="decision-question"
                        placeholder="What needs to be decided?"
                        value={decisionPoint.question}
                        onChange={(e) => setDecisionPoint({ ...decisionPoint, question: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decision-stage">Decision Stage</Label>
                      <Select
                        value={decisionPoint.stage}
                        onValueChange={(value: any) => setDecisionPoint({ ...decisionPoint, stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="initial-planning">Initial Planning</SelectItem>
                          <SelectItem value="final-planning">Final Planning</SelectItem>
                          <SelectItem value="execution">Execution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="decision-description">Description</Label>
                    <Textarea
                      id="decision-description"
                      placeholder="Provide context for the decision..."
                      value={decisionPoint.description}
                      onChange={(e) => setDecisionPoint({ ...decisionPoint, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow-freetext"
                      checked={decisionPoint.allowFreeText || false}
                      onCheckedChange={(checked) => setDecisionPoint({ ...decisionPoint, allowFreeText: checked })}
                    />
                    <Label htmlFor="allow-freetext">Allow free-text rationale input</Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Decision Options */}
          {editedStep.isDecisionPoint && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Decision Options</CardTitle>
                  <Button onClick={addOption} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {decisionPoint.options.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No options defined. Click "Add Option" to create decision choices.
                  </p>
                )}

                {decisionPoint.options.map((option, index) => (
                  <Card key={option.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Option {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Option Label *</Label>
                          <Input
                            placeholder="Display text for this option"
                            value={option.label}
                            onChange={(e) => updateOption(index, 'label', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Option Value *</Label>
                          <Input
                            placeholder="Internal value (e.g., option-a)"
                            value={option.value}
                            onChange={(e) => updateOption(index, 'value', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Next Step (Primary Path)</Label>
                          <Select
                            value={option.nextStepId || ''}
                            onValueChange={(value) => updateOption(index, 'nextStepId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select next step..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No specific next step</SelectItem>
                              {availableSteps.map((availableStep) => (
                                <SelectItem key={availableStep.id} value={availableStep.id}>
                                  {availableStep.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Alternate Step</Label>
                          <Select
                            value={option.alternateStepId || ''}
                            onValueChange={(value) => updateOption(index, 'alternateStepId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select alternate step..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No alternate step</SelectItem>
                              {availableSteps.map((availableStep) => (
                                <SelectItem key={availableStep.id} value={availableStep.id}>
                                  {availableStep.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step Flow Type */}
          {editedStep.flowType === 'alternate' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alternate Step Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Primary Alternative To</Label>
                  <Select
                    value={editedStep.alternateStepId || ''}
                    onValueChange={(value) => setEditedStep({ ...editedStep, alternateStepId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary step this alternates..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSteps.map((availableStep) => (
                        <SelectItem key={availableStep.id} value={availableStep.id}>
                          {availableStep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Decision Point
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};