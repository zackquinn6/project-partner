import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Settings, ArrowUp } from 'lucide-react';
import { StepInput } from '@/interfaces/Project';

interface CompactProcessVariablesTableProps {
  variables: StepInput[];
  onVariablesChange: (variables: StepInput[]) => void;
  onAddVariable: () => void;
}

export function CompactProcessVariablesTable({ variables, onVariablesChange, onAddVariable }: CompactProcessVariablesTableProps) {
  // Ensure variables is always an array to prevent undefined errors
  const safeVariables = variables || [];
  
  const handleVariableChange = (index: number, field: keyof StepInput, value: any) => {
    const updatedVariables = [...safeVariables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    onVariablesChange(updatedVariables);
  };

  const handleRemoveVariable = (index: number) => {
    const updatedVariables = safeVariables.filter((_, i) => i !== index);
    onVariablesChange(updatedVariables);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Process Variables ({safeVariables.length})
        </h3>
        <Button size="sm" variant="outline" onClick={onAddVariable}>
          <Plus className="w-3 h-3 mr-1" />
          Add Variable
        </Button>
      </div>

      {safeVariables.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs py-2">Variable Name</TableHead>
                <TableHead className="text-xs py-2 w-24">Type</TableHead>
                <TableHead className="text-xs py-2">Details</TableHead>
                <TableHead className="text-xs py-2 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeVariables.map((variable, index) => (
                <TableRow key={variable.id} className="text-xs">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      {variable.type === 'upstream' && (
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          <ArrowUp className="w-3 h-3" />
                        </Badge>
                      )}
                      <Input
                        value={variable.name}
                        onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                        placeholder="Variable name"
                        className="text-xs h-7"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Select
                      value={variable.type}
                      onValueChange={(value) => handleVariableChange(index, 'type', value)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="measurement">Measurement</SelectItem>
                        <SelectItem value="selection">Selection</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="upstream">Upstream</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2">
                    {variable.type === 'upstream' ? (
                      <div className="space-y-1">
                        <Input
                          value={variable.sourceStepName || ''}
                          onChange={(e) => handleVariableChange(index, 'sourceStepName', e.target.value)}
                          placeholder="Source step"
                          className="text-xs h-7"
                        />
                        <Input
                          value={variable.targetValue || ''}
                          onChange={(e) => handleVariableChange(index, 'targetValue', e.target.value)}
                          placeholder="Target value/range"
                          className="text-xs h-7"
                        />
                      </div>
                    ) : variable.type === 'measurement' ? (
                      <Input
                        value={variable.unit || ''}
                        onChange={(e) => handleVariableChange(index, 'unit', e.target.value)}
                        placeholder="Unit (e.g., inches)"
                        className="text-xs h-7"
                      />
                    ) : (
                      <Input
                        value={variable.description || ''}
                        onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="text-xs h-7"
                      />
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVariable(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {safeVariables.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
          No process variables defined
        </div>
      )}
    </div>
  );
}