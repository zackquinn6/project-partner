import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Plus, Wrench, ListPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StepTool {
  id: string;
  name: string;
  description?: string;
  category?: string;
  alternates?: string[];
  /** When set, this row is an optional substitute linked to the primary row with this id */
  parentId?: string;
  quantity?: number;
  purpose?: string;
}

interface CompactToolsTableProps {
  tools: StepTool[];
  onToolsChange: (tools: StepTool[]) => void;
  onAddTool: () => void;
  onAddAlternate?: (parentToolId: string) => void;
  title?: string;
  addButtonLabel?: string;
  contentSectionOptions?: { id: string; label: string }[];
}

function ToolSectionLinkCell({
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
          Default: all sections. Clear any to limit this tool to specific blocks.
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

export function CompactToolsTable({
  tools,
  onToolsChange,
  onAddTool,
  onAddAlternate,
  title = 'Tools',
  addButtonLabel = 'Add Tool',
  contentSectionOptions = [],
}: CompactToolsTableProps) {
  const safeTools = tools || [];
  const sectionOpts = contentSectionOptions || [];

  const orderedRows = useMemo(() => buildToolRows(safeTools), [safeTools]);

  const handleToolChange = (toolId: string, field: keyof StepTool, value: unknown) => {
    onToolsChange(safeTools.map((t) => (t.id === toolId ? { ...t, [field]: value } : t)));
  };

  const handleRemoveTool = (toolId: string) => {
    const target = safeTools.find((t) => t.id === toolId);
    if (!target) return;
    const toRemove = new Set<string>([toolId]);
    if (!target.parentId) {
      safeTools.filter((t) => t.parentId === toolId).forEach((t) => toRemove.add(t.id));
    }
    onToolsChange(safeTools.filter((t) => !toRemove.has(t.id)));
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            {title} ({safeTools.filter((t) => !t.parentId).length})
          </h3>
          <Button size="sm" variant="outline" onClick={onAddTool}>
            <Plus className="w-3 h-3 mr-1" />
            {addButtonLabel}
          </Button>
        </div>

        {orderedRows.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs py-2">Tool</TableHead>
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
                {orderedRows.map(({ tool, depth }) => (
                  <TableRow
                    key={tool.id}
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
                          {tool.name}
                        </div>
                        {tool.category && depth === 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                            {tool.category}
                          </Badge>
                        )}
                        {tool.description && (
                          <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {tool.description}
                          </div>
                        )}
                        {depth === 0 &&
                          tool.alternates &&
                          tool.alternates.length > 0 &&
                          !safeTools.some((t) => t.parentId === tool.id) && (
                            <div className="text-[10px] text-muted-foreground/80 mt-1">
                              {tool.alternates.join(' · ')}
                            </div>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min="1"
                        value={tool.quantity || 1}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value, 10) || 1;
                          handleToolChange(tool.id, 'quantity', newValue);
                        }}
                        className="w-16 h-7 text-xs"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={tool.purpose || ''}
                        onChange={(e) => handleToolChange(tool.id, 'purpose', e.target.value)}
                        placeholder="Usage..."
                        className="text-xs h-6"
                      />
                    </TableCell>
                    {sectionOpts.length > 0 ? (
                      <TableCell className="py-2">
                        {depth === 0 ? (
                          <ToolSectionLinkCell
                            allOptions={sectionOpts}
                            linkedIds={tool.linkedContentSectionIds}
                            onChange={(next) => handleToolChange(tool.id, 'linkedContentSectionIds', next)}
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
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
                              onClick={() => onAddAlternate(tool.id)}
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
                        onClick={() => handleRemoveTool(tool.id)}
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
            No tools added yet
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
