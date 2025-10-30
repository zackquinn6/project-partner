import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AlternateItem {
  type: 'single' | 'group';
  name: string;
  items?: string[]; // For group type, the individual items in the group
}

interface AlternatesEditorProps {
  value: string; // JSON string of AlternateItem[]
  onChange: (value: string) => void;
  itemType: 'tool' | 'material';
}

export function AlternatesEditor({ value, onChange, itemType }: AlternatesEditorProps) {
  const parseAlternates = (jsonString: string): AlternateItem[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [alternates, setAlternates] = useState<AlternateItem[]>(parseAlternates(value));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempAlternate, setTempAlternate] = useState<AlternateItem>({ type: 'single', name: '', items: [] });

  const updateAlternates = (newAlternates: AlternateItem[]) => {
    setAlternates(newAlternates);
    onChange(JSON.stringify(newAlternates));
  };

  const handleAddAlternate = () => {
    if (!tempAlternate.name.trim()) return;
    
    if (tempAlternate.type === 'group' && (!tempAlternate.items || tempAlternate.items.length === 0)) {
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
    
    setTempAlternate({ type: 'single', name: '', items: [] });
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
    setTempAlternate({ type: 'single', name: '', items: [] });
  };

  const handleAddGroupItem = () => {
    setTempAlternate({
      ...tempAlternate,
      items: [...(tempAlternate.items || []), '']
    });
  };

  const handleUpdateGroupItem = (index: number, value: string) => {
    const newItems = [...(tempAlternate.items || [])];
    newItems[index] = value;
    setTempAlternate({ ...tempAlternate, items: newItems });
  };

  const handleRemoveGroupItem = (index: number) => {
    setTempAlternate({
      ...tempAlternate,
      items: (tempAlternate.items || []).filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <Label>Alternates</Label>
      
      {/* Display existing alternates */}
      {alternates.length > 0 && (
        <div className="space-y-2">
          {alternates.map((alt, index) => (
            <Card key={index} className="p-3 bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={alt.type === 'single' ? 'default' : 'secondary'} className="text-xs">
                      {alt.type === 'single' ? 'Single' : 'Group'}
                    </Badge>
                    <span className="font-medium text-sm">{alt.name}</span>
                  </div>
                  {alt.type === 'group' && alt.items && alt.items.length > 0 && (
                    <div className="ml-2 mt-1 text-xs text-muted-foreground">
                      Includes: {alt.items.filter(i => i.trim()).join(', ')}
                    </div>
                  )}
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
      )}

      {/* Add/Edit form */}
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">
            {editingIndex !== null ? 'Edit Alternate' : 'Add New Alternate'}
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="alt-type" className="text-xs">Type</Label>
              <Select
                value={tempAlternate.type}
                onValueChange={(value: 'single' | 'group') => 
                  setTempAlternate({ ...tempAlternate, type: value, items: value === 'group' ? [''] : [] })
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
                {tempAlternate.type === 'single' ? `${itemType} Name` : 'Group Name'}
              </Label>
              <Input
                id="alt-name"
                value={tempAlternate.name}
                onChange={(e) => setTempAlternate({ ...tempAlternate, name: e.target.value })}
                placeholder={tempAlternate.type === 'single' ? `e.g., Claw hammer` : `e.g., Manual alternative`}
              />
            </div>
          </div>

          {tempAlternate.type === 'group' && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Items in Group</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroupItem}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
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
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleAddAlternate}
            disabled={!tempAlternate.name.trim() || (tempAlternate.type === 'group' && (!tempAlternate.items || tempAlternate.items.filter(i => i.trim()).length === 0))}
            className="flex-1"
          >
            {editingIndex !== null ? 'Update' : 'Add'} Alternate
          </Button>
          {editingIndex !== null && (
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {alternates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No alternates added yet. Add alternates to suggest equivalent {itemType}s or groups of {itemType}s.
        </p>
      )}
    </div>
  );
}
