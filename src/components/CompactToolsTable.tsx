import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Wrench } from 'lucide-react';
import { WorkflowStep } from '@/interfaces/Project';

interface StepTool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  alternates?: string[];
  quantity?: number;
  purpose?: string;
}

interface CompactToolsTableProps {
  tools: StepTool[];
  onToolsChange: (tools: StepTool[]) => void;
  onAddTool: () => void;
}

export function CompactToolsTable({ tools, onToolsChange, onAddTool }: CompactToolsTableProps) {
  // Ensure tools is always an array to prevent undefined errors
  const safeTools = tools || [];
  
  const handleToolChange = (index: number, field: keyof StepTool, value: any) => {
    console.log('🔧 Tool change:', { index, field, value });
    const updatedTools = [...safeTools];
    updatedTools[index] = { ...updatedTools[index], [field]: value };
    console.log('  Updated tools:', updatedTools);
    onToolsChange(updatedTools);
  };

  const handleRemoveTool = (index: number) => {
    const updatedTools = safeTools.filter((_, i) => i !== index);
    onToolsChange(updatedTools);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Tools ({safeTools.length})
        </h3>
        <Button size="sm" variant="outline" onClick={onAddTool}>
          <Plus className="w-3 h-3 mr-1" />
          Add Tool
        </Button>
      </div>

      {safeTools.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs py-2">Tool</TableHead>
                <TableHead className="text-xs py-2 w-16">Qty</TableHead>
                <TableHead className="text-xs py-2">Purpose</TableHead>
                <TableHead className="text-xs py-2 w-32">Alternates</TableHead>
                <TableHead className="text-xs py-2 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeTools.map((tool, index) => (
                <TableRow key={tool.id} className="text-xs">
                  <TableCell className="py-2">
                    <div>
                      <div className="font-medium text-xs">{tool.name}</div>
                      {tool.category && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                          {tool.category}
                        </Badge>
                      )}
                      {tool.description && (
                        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      min="1"
                      value={tool.quantity || 1}
                      onChange={(e) => handleToolChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-12 h-6 text-xs"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      value={tool.purpose || ''}
                      onChange={(e) => handleToolChange(index, 'purpose', e.target.value)}
                      placeholder="Usage..."
                      className="text-xs h-6"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    {tool.alternates && tool.alternates.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tool.alternates.map((alt, altIdx) => (
                          <Badge key={altIdx} variant="outline" className="text-[10px] px-1 py-0">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">None</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTool(index)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
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

      {safeTools.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
          No tools added yet
        </div>
      )}
    </div>
  );
}