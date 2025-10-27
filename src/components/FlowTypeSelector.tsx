import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Search, GitBranch, HelpCircle } from 'lucide-react';

interface FlowTypeSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const flowTypes = [
  {
    value: 'prime',
    label: 'Prime',
    icon: CheckCircle,
    color: 'bg-green-500',
    description: 'A required step that does not scale with project size'
  },
  {
    value: 'repeat',
    label: 'Scaled', 
    icon: RotateCcw,
    color: 'bg-blue-500',
    description: 'A step that scales with project size and progress may be reported incrementally'
  },
  {
    value: 'inspection',
    label: 'Quality Check',
    icon: Search,
    color: 'bg-orange-500', 
    description: 'Quality check or verification step that ensures standards are met'
  }
];

export const FlowTypeSelector: React.FC<FlowTypeSelectorProps> = ({ 
  value, 
  onValueChange, 
  disabled = false 
}) => {
  const selectedType = flowTypes.find(type => type.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="flow-type">Step Type</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
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
        <SelectContent>
          {flowTypes.map((type) => (
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

export const getFlowTypeIcon = (flowType?: string) => {
  const type = flowTypes.find(t => t.value === flowType);
  return type ? { icon: type.icon, color: type.color, label: type.label } : null;
};

export const getFlowTypeBadge = (flowType?: string) => {
  const type = flowTypes.find(t => t.value === flowType);
  if (!type) return null;
  
  return (
    <Badge variant="outline" className="flex items-center gap-1 text-xs">
      <div className={`w-2 h-2 rounded-full ${type.color}`} />
      {type.label}
    </Badge>
  );
};