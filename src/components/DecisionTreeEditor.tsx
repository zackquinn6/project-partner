import React, { useState } from 'react';
import { DecisionPoint, WorkflowStep } from '@/interfaces/Project';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface DecisionTreeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decisionPoint?: DecisionPoint;
  onSave: (decisionPoint: DecisionPoint) => void;
  availableSteps: { id: string; name: string }[];
}

export const DecisionTreeEditor: React.FC<DecisionTreeEditorProps> = ({
  open,
  onOpenChange,
  decisionPoint,
  onSave,
  availableSteps
}) => {
  const [editingDecision, setEditingDecision] = useState<DecisionPoint>(() => 
    decisionPoint || {
      id: `decision-${Date.now()}`,
      question: '',
      description: '',
      options: [
        { id: `option-${Date.now()}-1`, label: 'Yes', value: 'yes' },
        { id: `option-${Date.now()}-2`, label: 'No', value: 'no' }
      ],
      allowFreeText: false,
      stage: 'execution'
    }
  );

  const updateDecisionPoint = (field: keyof DecisionPoint, value: any) => {
    setEditingDecision(prev => ({ ...prev, [field]: value }));
  };

  const addOption = () => {
    const newOption = {
      id: `option-${Date.now()}`,
      label: 'New Option',
      value: `option-${editingDecision.options.length + 1}`
    };
    
    setEditingDecision(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }));
  };

  const updateOption = (optionId: string, field: string, value: string) => {
    setEditingDecision(prev => ({
      ...prev,
      options: prev.options.map(option =>
        option.id === optionId ? { ...option, [field]: value } : option
      )
    }));
  };

  const removeOption = (optionId: string) => {
    if (editingDecision.options.length <= 2) {
      toast.error('Decision point must have at least 2 options');
      return;
    }
    
    setEditingDecision(prev => ({
      ...prev,
      options: prev.options.filter(option => option.id !== optionId)
    }));
  };

  const handleSave = () => {
    if (!editingDecision.question.trim()) {
      toast.error('Question is required');
      return;
    }
    
    if (editingDecision.options.some(opt => !opt.label.trim())) {
      toast.error('All options must have labels');
      return;
    }
    
    onSave(editingDecision);
    onOpenChange(false);
    toast.success('Decision point saved');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background z-50">
        <DialogHeader>
          <DialogTitle>Edit Decision Point</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="question">Decision Question *</Label>
              <Input
                id="question"
                value={editingDecision.question}
                onChange={(e) => updateDecisionPoint('question', e.target.value)}
                placeholder="What decision needs to be made?"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingDecision.description || ''}
                onChange={(e) => updateDecisionPoint('description', e.target.value)}
                placeholder="Additional context for this decision..."
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="stage">Decision Stage</Label>
              <Select 
                value={editingDecision.stage} 
                onValueChange={(value) => updateDecisionPoint('stage', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="initial-planning">Initial Planning</SelectItem>
                  <SelectItem value="final-planning">Final Planning</SelectItem>
                  <SelectItem value="execution">Execution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Decision Options</Label>
              <Button onClick={addOption} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
            
            <div className="space-y-3">
              {editingDecision.options.map((option, index) => (
                <div key={option.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Option {index + 1}</Badge>
                    {editingDecision.options.length > 2 && (
                      <Button 
                        onClick={() => removeOption(option.id)} 
                        size="sm" 
                        variant="ghost"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Option Label</Label>
                      <Input
                        value={option.label}
                        onChange={(e) => updateOption(option.id, 'label', e.target.value)}
                        placeholder="e.g., Yes, No, Continue"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label>Value</Label>
                      <Input
                        value={option.value}
                        onChange={(e) => updateOption(option.id, 'value', e.target.value)}
                        placeholder="e.g., yes, no, continue"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Next Step (Primary)</Label>
                      <Select 
                        value={option.nextStepId || 'none'} 
                        onValueChange={(value) => updateOption(option.id, 'nextStepId', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select next step..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="none">No specific next step</SelectItem>
                          {availableSteps.map((step) => (
                            <SelectItem key={step.id} value={step.id}>
                              {step.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Alternate Step</Label>
                      <Select 
                        value={option.alternateStepId || 'none'} 
                        onValueChange={(value) => updateOption(option.id, 'alternateStepId', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select alternate step..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="none">No alternate step</SelectItem>
                          {availableSteps.map((step) => (
                            <SelectItem key={step.id} value={step.id}>
                              {step.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowFreeText"
                checked={editingDecision.allowFreeText}
                onChange={(e) => updateDecisionPoint('allowFreeText', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="allowFreeText">Allow free text input</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-2" />
              Save Decision Point
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};