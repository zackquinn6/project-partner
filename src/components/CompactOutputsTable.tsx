import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, FileOutput, Edit } from 'lucide-react';
import { Output } from '@/interfaces/Project';

interface CompactOutputsTableProps {
  outputs: Output[];
  onOutputsChange: (outputs: Output[]) => void;
  onAddOutput: () => void;
  onEditOutput: (output: Output) => void;
}

export function CompactOutputsTable({ outputs, onOutputsChange, onAddOutput, onEditOutput }: CompactOutputsTableProps) {
  // Ensure outputs is always an array to prevent undefined errors
  // Filter out invalid output types (quality, condition, etc.) and normalize to 'none'
  const safeOutputs = (outputs || []).map(output => ({
    ...output,
    type: (output.type === 'quality' || output.type === 'condition' || 
           !['none', 'major-aesthetics', 'performance-durability', 'safety'].includes(output.type))
      ? 'none' as Output['type']
      : output.type
  }));
  
  const handleOutputChange = (index: number, field: keyof Output, value: any) => {
    const updatedOutputs = [...safeOutputs];
    updatedOutputs[index] = { ...updatedOutputs[index], [field]: value };
    onOutputsChange(updatedOutputs);
  };

  const handleRemoveOutput = (index: number) => {
    const updatedOutputs = safeOutputs.filter((_, i) => i !== index);
    onOutputsChange(updatedOutputs);
  };

  // Valid output types from dropdown
  const validOutputTypes: Output['type'][] = ['none', 'major-aesthetics', 'performance-durability', 'safety'];
  
  const isValidOutputType = (type: string): type is Output['type'] => {
    return validOutputTypes.includes(type as Output['type']);
  };

  const getTypeColor = (type: Output['type']) => {
    switch (type) {
      case 'major-aesthetics': return 'bg-blue-100 text-blue-800';
      case 'performance-durability': return 'bg-green-100 text-green-800';
      case 'safety': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: Output['type']) => {
    switch (type) {
      case 'major-aesthetics': return 'Aesthetics';
      case 'performance-durability': return 'Performance';
      case 'safety': return 'Safety';
      default: return 'None';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileOutput className="w-4 h-4" />
          Step Outputs ({safeOutputs.length})
        </h3>
        <Button size="sm" variant="outline" onClick={onAddOutput}>
          <Plus className="w-3 h-3 mr-1" />
          Add Output
        </Button>
      </div>

      {safeOutputs.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs py-2">Output Name</TableHead>
                <TableHead className="text-xs py-2 w-32">Type</TableHead>
                <TableHead className="text-xs py-2">Description</TableHead>
                <TableHead className="text-xs py-2 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeOutputs.map((output, index) => (
                <TableRow key={output.id} className="text-xs">
                  <TableCell className="py-2">
                    <Input
                      value={output.name}
                      onChange={(e) => handleOutputChange(index, 'name', e.target.value)}
                      placeholder="Output name"
                      className="text-xs h-6 font-medium"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Select
                      value={output.type}
                      onValueChange={(value) => handleOutputChange(index, 'type', value)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue>
                          {output.type !== 'none' && ['major-aesthetics', 'performance-durability', 'safety'].includes(output.type) ? (
                            <Badge className={`text-[10px] px-1 py-0 ${getTypeColor(output.type)}`}>
                              {getTypeLabel(output.type)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Select type</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="major-aesthetics">Major Aesthetics</SelectItem>
                        <SelectItem value="performance-durability">Performance/Durability</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      value={output.description}
                      onChange={(e) => handleOutputChange(index, 'description', e.target.value)}
                      placeholder="Description..."
                      className="text-xs h-6"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditOutput(output)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOutput(index)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {safeOutputs.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
          No outputs defined yet
        </div>
      )}
    </div>
  );
}