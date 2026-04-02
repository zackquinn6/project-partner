import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface AlternateItem {
  type: "single" | "group";
  name: string;
  items?: string[];
  /** Library tool reference when alternate was chosen from tools / tool_variations. */
  core_tool_id?: string | null;
  variation_id?: string | null;
}

function parseAlternates(jsonString: string): AlternateItem[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    const out: AlternateItem[] = [];
    for (const raw of parsed) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      if (typeof o.name !== "string") continue;
      const type = o.type === "group" ? "group" : "single";
      const items = Array.isArray(o.items)
        ? o.items.filter((i): i is string => typeof i === "string")
        : undefined;
      const entry: AlternateItem = { type, name: o.name, items };
      if (typeof o.core_tool_id === "string") entry.core_tool_id = o.core_tool_id;
      if (typeof o.variation_id === "string") entry.variation_id = o.variation_id;
      out.push(entry);
    }
    return out;
  } catch {
    return [];
  }
}

function ToolLibraryAlternatesPicker({
  value,
  onChange,
  excludeCoreToolId,
}: {
  value: string;
  onChange: (value: string) => void;
  excludeCoreToolId?: string | null;
}) {
  const [alternates, setAlternates] = useState<AlternateItem[]>(() => parseAlternates(value));
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [tools, setTools] = useState<{ id: string; name: string }[]>([]);
  const [variations, setVariations] = useState<{ id: string; name: string; core_item_id: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setAlternates(parseAlternates(value));
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, vRes] = await Promise.all([
          supabase.from("tools").select("id, name").order("name"),
          supabase.from("tool_variations").select("id, name, core_item_id").order("name"),
        ]);
        if (cancelled) return;
        if (tRes.error) throw tRes.error;
        if (vRes.error) throw vRes.error;
        setTools((tRes.data as { id: string; name: string }[]) ?? []);
        setVariations((vRes.data as { id: string; name: string; core_item_id: string }[]) ?? []);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Failed to load tools list");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toolNameById = useMemo(() => new Map(tools.map((t) => [t.id, t.name])), [tools]);

  const pickerOptions = useMemo(() => {
    const ex = excludeCoreToolId || undefined;
    const list: { value: string; label: string }[] = [];
    for (const t of tools) {
      if (ex && t.id === ex) continue;
      list.push({ value: `core:${t.id}`, label: `${t.name} (core)` });
    }
    for (const v of variations) {
      if (ex && v.core_item_id === ex) continue;
      const cn = toolNameById.get(v.core_item_id) ?? "Tool";
      list.push({ value: `var:${v.id}`, label: `${cn}: ${v.name}` });
    }
    list.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return list;
  }, [tools, variations, excludeCoreToolId, toolNameById]);

  const updateAlternates = (next: AlternateItem[]) => {
    setAlternates(next);
    onChange(JSON.stringify(next));
  };

  const isDuplicate = (coreId: string, varId: string | null) =>
    alternates.some(
      (a) =>
        a.type === "single" &&
        a.core_tool_id === coreId &&
        (a.variation_id ?? null) === (varId ?? null)
    );

  const handleAdd = () => {
    if (!selectedKey) return;
    if (selectedKey.startsWith("core:")) {
      const id = selectedKey.slice(5);
      const nm = tools.find((t) => t.id === id)?.name;
      if (!nm) return;
      if (isDuplicate(id, null)) return;
      updateAlternates([
        ...alternates,
        {
          type: "single",
          name: `${nm} (core)`,
          core_tool_id: id,
          variation_id: null,
        },
      ]);
    } else if (selectedKey.startsWith("var:")) {
      const vid = selectedKey.slice(4);
      const v = variations.find((x) => x.id === vid);
      if (!v) return;
      if (isDuplicate(v.core_item_id, v.id)) return;
      const coreName = toolNameById.get(v.core_item_id) ?? "Tool";
      updateAlternates([
        ...alternates,
        {
          type: "single",
          name: `${coreName}: ${v.name}`,
          core_tool_id: v.core_item_id,
          variation_id: v.id,
        },
      ]);
    }
    setSelectedKey("");
  };

  const handleRemove = (index: number) => {
    updateAlternates(alternates.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Label>Alternates</Label>
      <p className="text-xs text-muted-foreground">
        Select a core tool or a variant from the library, then add it to the list.
        {excludeCoreToolId
          ? " This tool and its own variants are omitted so you cannot alternate a tool with itself."
          : null}
      </p>
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      {alternates.length > 0 ? (
        <div className="space-y-2">
          {alternates.map((alt, index) => (
            <Card key={index} className="bg-muted/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {alt.type === "group" ? (
                      <Badge variant="secondary" className="text-xs">
                        Group (legacy)
                      </Badge>
                    ) : alt.core_tool_id ? (
                      <Badge variant="default" className="text-xs">
                        Library
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Legacy
                      </Badge>
                    )}
                    <span className="text-sm font-medium">{alt.name}</span>
                  </div>
                  {alt.type === "group" && alt.items && alt.items.length > 0 ? (
                    <div className="ml-2 mt-1 text-xs text-muted-foreground">
                      Includes: {alt.items.filter((i) => i.trim()).join(", ")}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0 text-destructive"
                  onClick={() => handleRemove(index)}
                  aria-label="Remove alternate"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="space-y-3 p-4">
        <Label className="text-sm">Add alternate from library</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="tool-alt-picker" className="text-xs text-muted-foreground">
              Core tool or variant
            </Label>
            <Select value={selectedKey || undefined} onValueChange={setSelectedKey}>
              <SelectTrigger id="tool-alt-picker" className="w-full">
                <SelectValue placeholder="Select a tool or variant…" />
              </SelectTrigger>
              <SelectContent className="z-[1000] max-h-[min(280px,50vh)]">
                {pickerOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleAdd} disabled={!selectedKey} className="shrink-0 sm:mb-0.5">
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>

      {alternates.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No alternates yet. Choose a tool or variant above and click Add.
        </p>
      ) : null}
    </div>
  );
}

interface AlternatesEditorProps {
  value: string;
  onChange: (value: string) => void;
  itemType: "tool" | "material";
  /** When set (tools only), alternates are chosen from library cores / variants — no free-text names. */
  libraryToolPicker?: { excludeCoreToolId?: string | null };
}

export function AlternatesEditor({ value, onChange, itemType, libraryToolPicker }: AlternatesEditorProps) {
  if (itemType === "tool" && libraryToolPicker) {
    return (
      <ToolLibraryAlternatesPicker
        value={value}
        onChange={onChange}
        excludeCoreToolId={libraryToolPicker.excludeCoreToolId}
      />
    );
  }

  const [alternates, setAlternates] = useState<AlternateItem[]>(() => parseAlternates(value));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempAlternate, setTempAlternate] = useState<AlternateItem>({ type: "single", name: "", items: [] });

  useEffect(() => {
    setAlternates(parseAlternates(value));
  }, [value]);

  const updateAlternates = (newAlternates: AlternateItem[]) => {
    setAlternates(newAlternates);
    onChange(JSON.stringify(newAlternates));
  };

  const handleAddAlternate = () => {
    if (!tempAlternate.name.trim()) return;

    if (tempAlternate.type === "group" && (!tempAlternate.items || tempAlternate.items.length === 0)) {
      return;
    }

    if (editingIndex !== null) {
      const updated = [...alternates];
      updated[editingIndex] = tempAlternate;
      updateAlternates(updated);
      setEditingIndex(null);
    } else {
      updateAlternates([...alternates, tempAlternate]);
    }

    setTempAlternate({ type: "single", name: "", items: [] });
  };

  const handleRemoveAlternate = (index: number) => {
    updateAlternates(alternates.filter((_, i) => i !== index));
  };

  const handleEditAlternate = (index: number) => {
    setEditingIndex(index);
    setTempAlternate({ ...alternates[index] });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setTempAlternate({ type: "single", name: "", items: [] });
  };

  const handleAddGroupItem = () => {
    setTempAlternate({
      ...tempAlternate,
      items: [...(tempAlternate.items || []), ""],
    });
  };

  const handleUpdateGroupItem = (index: number, v: string) => {
    const newItems = [...(tempAlternate.items || [])];
    newItems[index] = v;
    setTempAlternate({ ...tempAlternate, items: newItems });
  };

  const handleRemoveGroupItem = (index: number) => {
    setTempAlternate({
      ...tempAlternate,
      items: (tempAlternate.items || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <Label>Alternates</Label>

      {alternates.length > 0 ? (
        <div className="space-y-2">
          {alternates.map((alt, index) => (
            <Card key={index} className="bg-muted/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={alt.type === "single" ? "default" : "secondary"} className="text-xs">
                      {alt.type === "single" ? "Single" : "Group"}
                    </Badge>
                    <span className="text-sm font-medium">{alt.name}</span>
                  </div>
                  {alt.type === "group" && alt.items && alt.items.length > 0 ? (
                    <div className="ml-2 mt-1 text-xs text-muted-foreground">
                      Includes: {alt.items.filter((i) => i.trim()).join(", ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEditAlternate(index)}
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => handleRemoveAlternate(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label className="text-sm">{editingIndex !== null ? "Edit Alternate" : "Add New Alternate"}</Label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="alt-type" className="text-xs">
                Type
              </Label>
              <Select
                value={tempAlternate.type}
                onValueChange={(v: "single" | "group") =>
                  setTempAlternate({ ...tempAlternate, type: v, items: v === "group" ? [""] : [] })
                }
              >
                <SelectTrigger id="alt-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single {itemType}</SelectItem>
                  <SelectItem value="group">Group of {itemType}s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alt-name" className="text-xs">
                {tempAlternate.type === "single" ? `${itemType} Name` : "Group Name"}
              </Label>
              <Input
                id="alt-name"
                value={tempAlternate.name}
                onChange={(e) => setTempAlternate({ ...tempAlternate, name: e.target.value })}
                placeholder={
                  tempAlternate.type === "single" ? `e.g., Claw hammer` : `e.g., Manual alternative`
                }
              />
            </div>
          </div>

          {tempAlternate.type === "group" ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Items in Group</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddGroupItem} className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>

              {(tempAlternate.items || []).map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleUpdateGroupItem(idx, e.target.value)}
                    placeholder={`${itemType} ${idx + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGroupItem(idx)}
                    className="h-10 w-10 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleAddAlternate}
            disabled={
              !tempAlternate.name.trim() ||
              (tempAlternate.type === "group" &&
                (!tempAlternate.items || tempAlternate.items.filter((i) => i.trim()).length === 0))
            }
            className="flex-1"
          >
            {editingIndex !== null ? "Update" : "Add"} Alternate
          </Button>
          {editingIndex !== null ? (
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      {alternates.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No alternates added yet. Add alternates to suggest equivalent {itemType}s or groups of {itemType}s.
        </p>
      ) : null}
    </div>
  );
}
