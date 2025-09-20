import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Save } from 'lucide-react';
import { Output, StepInput } from '@/interfaces/Project';

// Extend Output interface to include allowances field
interface ExtendedOutput extends Output {
  allowances?: string;
}

interface OutputEditFormProps {
  output: ExtendedOutput;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOutput: ExtendedOutput) => void;
  stepInputs?: StepInput[];
  onAddStepInput?: (inputName: string) => void;
}

export const OutputEditForm: React.FC<OutputEditFormProps> = ({
  output,
  isOpen,
  onClose,
  onSave,
  stepInputs = [],
  onAddStepInput
}) => {
  const [formData, setFormData] = useState<ExtendedOutput>({ ...output });
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [customInputName, setCustomInputName] = useState('');

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const addKeyInputFromSelect = () => {
    if (selectedInput && selectedInput !== 'custom') {
      const inputName = stepInputs.find(input => input.id === selectedInput)?.name || selectedInput;
      if (!formData.keyInputs?.includes(inputName)) {
        setFormData(prev => ({
          ...prev,
          keyInputs: [...(prev.keyInputs || []), inputName]
        }));
      }
      setSelectedInput('');
    }
  };

  const addCustomKeyInput = () => {
    if (customInputName.trim()) {
      // Add to key inputs
      setFormData(prev => ({
        ...prev,
        keyInputs: [...(prev.keyInputs || []), customInputName.trim()]
      }));
      
      // Add to step inputs if callback provided
      if (onAddStepInput) {
        onAddStepInput(customInputName.trim());
      }
      
      setCustomInputName('');
    }
  };

  const removeKeyInput = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyInputs: (prev.keyInputs || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Output Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Output Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Primed Surfaces"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Output Type</Label>
                  <Select value={formData.type} onValueChange={(value: Output['type']) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="performance-durability">Performance & Durability</SelectItem>
                      <SelectItem value="major-aesthetics">Major Aesthetics</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the output"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Requirements</h3>
              
              <div>
                <Label htmlFor="requirement">Requirements</Label>
                <Textarea
                  id="requirement"
                  value={formData.requirement || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                  placeholder="e.g., All surfaces evenly coated with primer..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="allowances">Allowances</Label>
                <Textarea
                  id="allowances"
                  value={formData.allowances || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowances: e.target.value }))}
                  placeholder="Acceptable variations or tolerances..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Potential Effects */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Potential Effects</h3>
              
              <div>
                <Label htmlFor="potentialEffects">Potential Effects of Error</Label>
                <Textarea
                  id="potentialEffects"
                  value={formData.potentialEffects || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, potentialEffects: e.target.value }))}
                  placeholder="Describe what happens if this output is done incorrectly"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="photosOfEffects">Photos of Potential Effects</Label>
                <Input
                  id="photosOfEffects"
                  value={formData.photosOfEffects || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, photosOfEffects: e.target.value }))}
                  placeholder="URL or description of reference photos"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quality Control Checks */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Quality Control Checks</h3>
              
              <div>
                <Label htmlFor="qualityChecks">Quality Check Methods</Label>
                <Textarea
                  id="qualityChecks"
                  value={formData.qualityChecks || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualityChecks: e.target.value }))}
                  placeholder="How to measure and verify this output"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Key Inputs */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Key Inputs</h3>
              <p className="text-sm text-muted-foreground">Important variables that affect this output</p>
              
              <div className="space-y-3">
                {formData.keyInputs?.map((input, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="flex-1 justify-between">
                      {input}
                      <button
                        onClick={() => removeKeyInput(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  </div>
                ))}
                
                {/* Select from existing step inputs */}
                <div className="space-y-2">
                  <Label>Select from Process Variables</Label>
                  <div className="flex gap-2">
                    <Select value={selectedInput} onValueChange={setSelectedInput}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose from step variables..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stepInputs.map((input) => (
                          <SelectItem key={input.id} value={input.id}>
                            {input.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add New Variable</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={addKeyInputFromSelect} 
                      size="sm"
                      disabled={!selectedInput || selectedInput === 'custom'}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Add custom input */}
                {selectedInput === 'custom' && (
                  <div className="space-y-2">
                    <Label>New Process Variable</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customInputName}
                        onChange={(e) => setCustomInputName(e.target.value)}
                        placeholder="Enter new variable name..."
                        onKeyPress={(e) => e.key === 'Enter' && addCustomKeyInput()}
                        className="flex-1"
                      />
                      <Button onClick={addCustomKeyInput} size="sm" disabled={!customInputName.trim()}>
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} size="icon">
              <X className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave} size="icon" variant="outline">
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};