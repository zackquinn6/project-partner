import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Package } from 'lucide-react';
import { WorkflowStep } from '@/interfaces/Project';

interface StepMaterial {
  id: string;
  name: string;
  description?: string;
  category?: string;
  alternates?: string[];
  quantity?: number;
  purpose?: string;
  unit?: string;
}

interface CompactMaterialsTableProps {
  materials: StepMaterial[];
  onMaterialsChange: (materials: StepMaterial[]) => void;
  onAddMaterial: () => void;
}

export function CompactMaterialsTable({ materials, onMaterialsChange, onAddMaterial }: CompactMaterialsTableProps) {
  // Ensure materials is always an array to prevent undefined errors
  const safeMaterials = materials || [];
  
  const handleMaterialChange = (index: number, field: keyof StepMaterial, value: any) => {
    console.log('🔧 Material change:', { index, field, value });
    const updatedMaterials = [...safeMaterials];
    updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
    console.log('  Updated materials:', updatedMaterials);
    onMaterialsChange(updatedMaterials);
  };

  const handleRemoveMaterial = (index: number) => {
    const updatedMaterials = safeMaterials.filter((_, i) => i !== index);
    onMaterialsChange(updatedMaterials);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4" />
          Materials ({safeMaterials.length})
        </h3>
        <Button size="sm" variant="outline" onClick={onAddMaterial}>
          <Plus className="w-3 h-3 mr-1" />
          Add Material
        </Button>
      </div>

      {safeMaterials.length > 0 && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs py-2">Material</TableHead>
                <TableHead className="text-xs py-2 w-16">Qty</TableHead>
                <TableHead className="text-xs py-2">Purpose</TableHead>
                <TableHead className="text-xs py-2 w-32">Alternates</TableHead>
                <TableHead className="text-xs py-2 w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeMaterials.map((material, index) => (
                <TableRow key={material.id} className="text-xs">
                  <TableCell className="py-2">
                    <div>
                      <div className="font-medium text-xs">{material.name}</div>
                      {material.category && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                          {material.category}
                        </Badge>
                      )}
                      {material.description && (
                        <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {material.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        value={material.quantity || 1}
                        onChange={(e) => handleMaterialChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-12 h-6 text-xs"
                      />
                      {material.unit && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {material.unit}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      value={material.purpose || ''}
                      onChange={(e) => handleMaterialChange(index, 'purpose', e.target.value)}
                      placeholder="Usage..."
                      className="text-xs h-6"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    {material.alternates && material.alternates.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {material.alternates.map((alt, altIdx) => (
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
                      onClick={() => handleRemoveMaterial(index)}
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

      {safeMaterials.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
          No materials added yet
        </div>
      )}
    </div>
  );
}