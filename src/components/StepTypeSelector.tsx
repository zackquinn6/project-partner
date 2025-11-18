import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CheckCircle, RotateCcw, Search } from 'lucide-react';

interface StepTypeSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const stepTypes = [
  {
    value: 'prime',
    label: 'Prime',
    icon: CheckCircle,
    color: 'bg-green-500',
    description: 'Occurs once and is not scaled'
  },
  {
    value: 'scaled',
    label: 'Scaled', 
    icon: RotateCcw,
    color: 'bg-blue-500',
    description: 'Time estimates scale with project sizing and intermediate progress can be reported'
  },
  {
    value: 'quality_control',
    label: 'Quality Check',
    icon: Search,
    color: 'bg-orange-500', 
    description: 'A non-work step that evaluates previously completed work'
  }
];

export const StepTypeSelector: React.FC<StepTypeSelectorProps> = ({ 
  value, 
  onValueChange, 
  disabled = false 
}) => {
  const selectedType = stepTypes.find(type => type.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="step-type">Step Type</Label>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select step type">
            {selectedType && (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${selectedType.color}`} />
                <selectedType.icon className="w-4 h-4" />
                <span>{selectedType.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {stepTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex items-center gap-2 py-1">
                <div className={`w-3 h-3 rounded-full ${type.color}`} />
                <type.icon className="w-4 h-4" />
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground max-w-xs">{type.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedType && (
        <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
          <strong>{selectedType.label}:</strong> {selectedType.description}
        </div>
      )}
    </div>
  );
};

export const getStepTypeIcon = (stepType?: string) => {
  const type = stepTypes.find(t => t.value === stepType);
  return type ? { icon: type.icon, color: type.color, label: type.label } : null;
};
