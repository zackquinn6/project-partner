import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus } from "lucide-react";
import { LibraryTool, LibraryMaterial } from "@/interfaces/Project";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SelectedItem {
  id: string;
  item: string;
  quantity: number;
  description?: string | null;
}

interface MultiSelectLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tools' | 'materials';
  onSelect: (items: SelectedItem[]) => void;
}

export function MultiSelectLibraryDialog({
  open,
  onOpenChange,
  type,
  onSelect
}: MultiSelectLibraryDialogProps) {
  const [items, setItems] = useState<(LibraryTool | LibraryMaterial)[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, type]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .order('item');
      
      if (error) throw error;
      
      setItems(data || []);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`Failed to load ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleItemToggle = (item: LibraryTool | LibraryMaterial, checked: boolean) => {
    const newSelected = new Map(selectedItems);
    
    if (checked) {
      newSelected.set(item.id, {
        id: item.id,
        item: item.item,
        quantity: 1,
        description: item.description
      });
    } else {
      newSelected.delete(item.id);
    }
    
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    
    const newSelected = new Map(selectedItems);
    const existing = newSelected.get(itemId);
    if (existing) {
      newSelected.set(itemId, { ...existing, quantity });
      setSelectedItems(newSelected);
    }
  };

  const handleConfirm = () => {
    const selectedArray = Array.from(selectedItems.values());
    onSelect(selectedArray);
    setSelectedItems(new Map());
    setSearchTerm("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedItems(new Map());
    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background/95 backdrop-blur-sm border border-border/50">
        <DialogHeader>
          <DialogTitle>Select {type === 'tools' ? 'Tools' : 'Materials'} from Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${type}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedItems.size > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Selected Items ({selectedItems.size})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {Array.from(selectedItems.values()).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded">
                      <span className="text-sm font-medium">{item.item}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {type} found{searchTerm && ` matching "${searchTerm}"`}
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedItems.has(item.id);
                return (
                  <Card key={item.id} className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleItemToggle(item, checked as boolean)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`item-${item.id}`} className="font-medium cursor-pointer">
                            {item.item}
                          </Label>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                          {'example_models' in item && item.example_models && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Examples: {item.example_models}
                            </Badge>
                          )}
                          {'unit_size' in item && item.unit_size && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Unit: {item.unit_size}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedItems.size === 0}
          >
            Add {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}