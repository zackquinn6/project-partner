import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Package, ListPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StepMaterial {
  id: string;
  name: string;
  description?: string;
  category?: string;
  alternates?: string[];
  parentId?: string;
  quantity?: number;
  purpose?: string;
  unit?: string;
}

interface CompactMaterialsTableProps {
  materials: StepMaterial[];
  onMaterialsChange: (materials: StepMaterial[]) => void;
  onAddMaterial: () => void;
  onAddAlternate?: (parentMaterialId: string) => void;
  title?: string;
  addButtonLabel?: string;
}

function buildMaterialRows(materials: StepMaterial[]): { material: StepMaterial; depth: 0 | 1 }[] {
  const safe = materials || [];
  const indexOrder = new Map(safe.map((m, i) => [m.id, i]));
  const primaries = safe.filter((m) => !m.parentId);
  const rows: { material: StepMaterial; depth: 0 | 1 }[] = [];
  for (const p of primaries) {
    rows.push({ material: p, depth: 0 });
    const children = safe
      .filter((m) => m.parentId === p.id)
      .sort((a, b) => (indexOrder.get(a.id) ?? 0) - (indexOrder.get(b.id) ?? 0));
    for (const c of children) {
      rows.push({ material: c, depth: 1 });
    }
  }
  return rows;
}

export function CompactMaterialsTable({
  materials,
  onMaterialsChange,
  onAddMaterial,
  onAddAlternate,
  title = 'Materials',
  addButtonLabel = 'Add Material',
}: CompactMaterialsTableProps) {
  const safeMaterials = materials || [];
  const orderedRows = useMemo(() => buildMaterialRows(safeMaterials), [safeMaterials]);

  const handleMaterialChange = (materialId: string, field: keyof StepMaterial, value: unknown) => {
    onMaterialsChange(safeMaterials.map((m) => (m.id === materialId ? { ...m, [field]: value } : m)));
  };

  const handleRemoveMaterial = (materialId: string) => {
    const target = safeMaterials.find((m) => m.id === materialId);
    if (!target) return;
    const toRemove = new Set<string>([materialId]);
    if (!target.parentId) {
      safeMaterials.filter((m) => m.parentId === materialId).forEach((m) => toRemove.add(m.id));
    }
    onMaterialsChange(safeMaterials.filter((m) => !toRemove.has(m.id)));
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            {title} ({safeMaterials.filter((m) => !m.parentId).length})
          </h3>
          <Button size="sm" variant="outline" onClick={onAddMaterial}>
            <Plus className="w-3 h-3 mr-1" />
            {addButtonLabel}
          </Button>
        </div>

        {orderedRows.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs py-2">Material</TableHead>
                  <TableHead className="text-xs py-2 w-16">Qty</TableHead>
                  <TableHead className="text-xs py-2">Purpose</TableHead>
                  <TableHead className="text-xs py-2 w-10 text-center" aria-label="Substitutes" />
                  <TableHead className="text-xs py-2 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedRows.map(({ material, depth }) => (
                  <TableRow
                    key={material.id}
                    className={
                      depth === 1
                        ? 'text-xs bg-muted/15 border-l-2 border-l-primary/20'
                        : 'text-xs'
                    }
                  >
                    <TableCell className={`py-2 ${depth === 1 ? 'pl-4' : ''}`}>
                      <div>
                        <div
                          className={`font-medium text-xs ${depth === 1 ? 'text-muted-foreground' : ''}`}
                        >
                          {material.name}
                        </div>
                        {material.category && depth === 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                            {material.category}
                          </Badge>
                        )}
                        {material.description && (
                          <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {material.description}
                          </div>
                        )}
                        {depth === 0 &&
                          material.alternates &&
                          material.alternates.length > 0 &&
                          !safeMaterials.some((m) => m.parentId === material.id) && (
                            <div className="text-[10px] text-muted-foreground/80 mt-1">
                              {material.alternates.join(' · ')}
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
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value, 10) || 1;
                            handleMaterialChange(material.id, 'quantity', newValue);
                          }}
                          className="w-16 h-7 text-xs"
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
                        onChange={(e) => handleMaterialChange(material.id, 'purpose', e.target.value)}
                        placeholder="Usage..."
                        className="text-xs h-6"
                      />
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      {depth === 0 && onAddAlternate ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Add substitute from library"
                              onClick={() => onAddAlternate(material.id)}
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Add substitute from library
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="inline-block w-7" />
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMaterial(material.id)}
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

        {orderedRows.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
            No materials added yet
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
