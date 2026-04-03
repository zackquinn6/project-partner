import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Shield, ListPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StepTool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  alternates?: string[];
  parentId?: string;
  quantity?: number;
  purpose?: string;
  linkedContentSectionIds?: string[];
}

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
  linkedContentSectionIds?: string[];
}

function PpeSectionLinkCell({
  allOptions,
  linkedIds,
  onChange,
}: {
  allOptions: { id: string; label: string }[];
  linkedIds: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
}) {
  if (allOptions.length === 0) return <span className="inline-block w-8" aria-hidden />;
  const allIds = allOptions.map((o) => o.id);
  const effective =
    !linkedIds || linkedIds.length === 0
      ? new Set(allIds)
      : new Set(linkedIds.filter((id) => allIds.includes(id)));
  const isAll = effective.size === allIds.length;

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(effective);
    if (checked) next.add(id);
    else next.delete(id);
    if (next.size === 0 || next.size === allIds.length) {
      onChange(undefined);
      return;
    }
    onChange(allIds.filter((i) => next.has(i)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] px-2 max-w-[7rem] truncate">
          {isAll ? 'All sections' : `${effective.size} sections`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="text-xs font-medium mb-2">Instruction sections</div>
        <p className="text-[10px] text-muted-foreground mb-2">
          Default: all sections. Clear any to limit this PPE row to specific blocks.
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allOptions.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={effective.has(o.id)}
                onCheckedChange={(v) => toggle(o.id, v === true)}
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type PpeRow =
  | { kind: 'tool'; tool: StepTool; depth: 0 | 1 }
  | { kind: 'material'; material: StepMaterial; depth: 0 | 1 };

function buildToolRows(tools: StepTool[]): { tool: StepTool; depth: 0 | 1 }[] {
  const safe = tools || [];
  const indexOrder = new Map(safe.map((t, i) => [t.id, i]));
  const primaries = safe.filter((t) => !t.parentId);
  const rows: { tool: StepTool; depth: 0 | 1 }[] = [];
  for (const p of primaries) {
    rows.push({ tool: p, depth: 0 });
    const children = safe
      .filter((t) => t.parentId === p.id)
      .sort((a, b) => (indexOrder.get(a.id) ?? 0) - (indexOrder.get(b.id) ?? 0));
    for (const c of children) {
      rows.push({ tool: c, depth: 1 });
    }
  }
  return rows;
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

export interface CompactPpeTableProps {
  ppeTools: StepTool[];
  ppeMaterials: StepMaterial[];
  onPpeToolsChange: (tools: StepTool[]) => void;
  onPpeMaterialsChange: (materials: StepMaterial[]) => void;
  onAddPpe: () => void;
  onAddAlternatePpeTool?: (parentToolId: string) => void;
  onAddAlternatePpeMaterial?: (parentMaterialId: string) => void;
  contentSectionOptions?: { id: string; label: string }[];
}

export function CompactPpeTable({
  ppeTools,
  ppeMaterials,
  onPpeToolsChange,
  onPpeMaterialsChange,
  onAddPpe,
  onAddAlternatePpeTool,
  onAddAlternatePpeMaterial,
  contentSectionOptions = [],
}: CompactPpeTableProps) {
  const safePpeTools = ppeTools || [];
  const safePpeMaterials = ppeMaterials || [];
  const sectionOpts = contentSectionOptions || [];

  const orderedRows: PpeRow[] = useMemo(() => {
    const toolRows = buildToolRows(safePpeTools).map((r) => ({ kind: 'tool' as const, ...r }));
    const matRows = buildMaterialRows(safePpeMaterials).map((r) => ({
      kind: 'material' as const,
      ...r,
    }));
    return [...toolRows, ...matRows];
  }, [safePpeTools, safePpeMaterials]);

  const primaryCount =
    safePpeTools.filter((t) => !t.parentId).length + safePpeMaterials.filter((m) => !m.parentId).length;

  const handleToolChange = (toolId: string, field: keyof StepTool, value: unknown) => {
    onPpeToolsChange(safePpeTools.map((t) => (t.id === toolId ? { ...t, [field]: value } : t)));
  };

  const handleMaterialChange = (materialId: string, field: keyof StepMaterial, value: unknown) => {
    onPpeMaterialsChange(
      safePpeMaterials.map((m) => (m.id === materialId ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveTool = (toolId: string) => {
    const target = safePpeTools.find((t) => t.id === toolId);
    if (!target) return;
    const toRemove = new Set<string>([toolId]);
    if (!target.parentId) {
      safePpeTools.filter((t) => t.parentId === toolId).forEach((t) => toRemove.add(t.id));
    }
    onPpeToolsChange(safePpeTools.filter((t) => !toRemove.has(t.id)));
  };

  const handleRemoveMaterial = (materialId: string) => {
    const target = safePpeMaterials.find((m) => m.id === materialId);
    if (!target) return;
    const toRemove = new Set<string>([materialId]);
    if (!target.parentId) {
      safePpeMaterials.filter((m) => m.parentId === materialId).forEach((m) => toRemove.add(m.id));
    }
    onPpeMaterialsChange(safePpeMaterials.filter((m) => !toRemove.has(m.id)));
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Personal protective equipment ({primaryCount})
          </h3>
          <Button size="sm" variant="outline" onClick={onAddPpe}>
            <Plus className="w-3 h-3 mr-1" />
            Add PPE
          </Button>
        </div>

        {orderedRows.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs py-2">PPE item</TableHead>
                  <TableHead className="text-xs py-2 w-16">Qty</TableHead>
                  <TableHead className="text-xs py-2">Purpose</TableHead>
                  {sectionOpts.length > 0 ? (
                    <TableHead className="text-xs py-2 w-[7.5rem]">Sections</TableHead>
                  ) : null}
                  <TableHead className="text-xs py-2 w-10 text-center" aria-label="Substitutes" />
                  <TableHead className="text-xs py-2 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedRows.map((row) =>
                  row.kind === 'tool' ? (
                    <TableRow
                      key={`t-${row.tool.id}`}
                      className={
                        row.depth === 1
                          ? 'text-xs bg-muted/15 border-l-2 border-l-primary/20'
                          : 'text-xs'
                      }
                    >
                      <TableCell className={`py-2 ${row.depth === 1 ? 'pl-4' : ''}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-medium text-xs ${row.depth === 1 ? 'text-muted-foreground' : ''}`}
                            >
                              {row.tool.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Tool
                            </Badge>
                          </div>
                          {row.tool.category && row.depth === 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                              {row.tool.category}
                            </Badge>
                          )}
                          {row.tool.description && (
                            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                              {row.tool.description}
                            </div>
                          )}
                          {row.depth === 0 &&
                            row.tool.alternates &&
                            row.tool.alternates.length > 0 &&
                            !safePpeTools.some((t) => t.parentId === row.tool.id) && (
                              <div className="text-[10px] text-muted-foreground/80 mt-1">
                                {row.tool.alternates.join(' · ')}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="1"
                          value={row.tool.quantity || 1}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value, 10) || 1;
                            handleToolChange(row.tool.id, 'quantity', newValue);
                          }}
                          className="w-16 h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={row.tool.purpose || ''}
                          onChange={(e) => handleToolChange(row.tool.id, 'purpose', e.target.value)}
                          placeholder="Usage..."
                          className="text-xs h-6"
                        />
                      </TableCell>
                      {sectionOpts.length > 0 ? (
                        <TableCell className="py-2">
                          {row.depth === 0 ? (
                            <PpeSectionLinkCell
                              allOptions={sectionOpts}
                              linkedIds={row.tool.linkedContentSectionIds}
                              onChange={(next) =>
                                handleToolChange(row.tool.id, 'linkedContentSectionIds', next)
                              }
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-2 text-center">
                        {row.depth === 0 && onAddAlternatePpeTool ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label="Add substitute from library"
                                onClick={() => onAddAlternatePpeTool(row.tool.id)}
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
                          onClick={() => handleRemoveTool(row.tool.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      key={`m-${row.material.id}`}
                      className={
                        row.depth === 1
                          ? 'text-xs bg-muted/15 border-l-2 border-l-primary/20'
                          : 'text-xs'
                      }
                    >
                      <TableCell className={`py-2 ${row.depth === 1 ? 'pl-4' : ''}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-medium text-xs ${row.depth === 1 ? 'text-muted-foreground' : ''}`}
                            >
                              {row.material.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Material
                            </Badge>
                          </div>
                          {row.material.category && row.depth === 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                              {row.material.category}
                            </Badge>
                          )}
                          {row.material.description && (
                            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                              {row.material.description}
                            </div>
                          )}
                          {row.depth === 0 &&
                            row.material.alternates &&
                            row.material.alternates.length > 0 &&
                            !safePpeMaterials.some((m) => m.parentId === row.material.id) && (
                              <div className="text-[10px] text-muted-foreground/80 mt-1">
                                {row.material.alternates.join(' · ')}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            value={row.material.quantity || 1}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value, 10) || 1;
                              handleMaterialChange(row.material.id, 'quantity', newValue);
                            }}
                            className="w-16 h-7 text-xs"
                          />
                          {row.material.unit && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {row.material.unit}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={row.material.purpose || ''}
                          onChange={(e) =>
                            handleMaterialChange(row.material.id, 'purpose', e.target.value)
                          }
                          placeholder="Usage..."
                          className="text-xs h-6"
                        />
                      </TableCell>
                      {sectionOpts.length > 0 ? (
                        <TableCell className="py-2">
                          {row.depth === 0 ? (
                            <PpeSectionLinkCell
                              allOptions={sectionOpts}
                              linkedIds={row.material.linkedContentSectionIds}
                              onChange={(next) =>
                                handleMaterialChange(row.material.id, 'linkedContentSectionIds', next)
                              }
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-2 text-center">
                        {row.depth === 0 && onAddAlternatePpeMaterial ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label="Add substitute from library"
                                onClick={() => onAddAlternatePpeMaterial(row.material.id)}
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
                          onClick={() => handleRemoveMaterial(row.material.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {orderedRows.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
            No ppe added to this step.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
