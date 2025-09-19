import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VariationSelector } from './VariationSelector';

interface SelectedItem {
  id: string;
  coreItemId: string;
  variationId?: string;
  item: string;
  quantity: number;
  description?: string | null;
  attributes: Record<string, string>;
  isPrime: boolean;
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
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectingVariationFor, setSelectingVariationFor] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleItemToggle = (coreItem: any) => {
    setSelectingVariationFor(coreItem.id);
  };

  const handleVariationSelect = (variation: any) => {
    const selectedId = `${variation.coreItemId}_${JSON.stringify(variation.attributes)}_${variation.isPrime}`;
    
    setSelectedItems(prev => {
      const existing = prev.find(item => item.id === selectedId);
      if (existing) {
        return prev.map(item =>
          item.id === selectedId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          id: selectedId,
          coreItemId: variation.coreItemId,
          variationId: variation.variationId,
          item: variation.name,
          quantity: 1,
          description: items.find(i => i.id === variation.coreItemId)?.description,
          attributes: variation.attributes,
          isPrime: variation.isPrime
        }];
      }
    });
    
    setSelectingVariationFor(null);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      // Remove item if quantity becomes 0
      setSelectedItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    
    setSelectedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const handleConfirm = () => {
    onSelect(selectedItems);
    setSelectedItems([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedItems([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select {type === 'tools' ? 'Tools' : 'Materials'} from Library</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${type}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedItems.length > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Selected Items ({selectedItems.length})</h4>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {selectedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.item}</span>
                            <Badge variant={item.isPrime ? "default" : "secondary"} className="text-xs">
                              {item.isPrime ? "Prime" : "Alternate"}
                            </Badge>
                          </div>
                          {Object.keys(item.attributes).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {Object.entries(item.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="text-sm min-w-[60px] text-center">
                            {item.quantity}
                            {/* Show unit size for materials */}
                            {type === 'materials' && (
                              <div className="text-xs text-muted-foreground">
                                {(() => {
                                  const coreItem = items.find(i => i.id === item.coreItemId);
                                  return coreItem?.unit_size ? `(${coreItem.unit_size})` : '';
                                })()}
                              </div>
                            )}
                          </div>
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

            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {type} found{searchTerm && ` matching "${searchTerm}"`}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const selectedForItem = selectedItems.filter(selected => selected.coreItemId === item.id);
                    
                    return (
                      <Card key={item.id} className="cursor-pointer transition-colors hover:bg-accent/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{item.item}</h4>
                                {selectedForItem.length > 0 && (
                                  <Badge variant="secondary">
                                    {selectedForItem.length} variation{selectedForItem.length !== 1 ? 's' : ''} selected
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              )}
                              {type === 'tools' && item.example_models && (
                                <p className="text-xs text-muted-foreground">Models: {item.example_models}</p>
                              )}
                              {type === 'materials' && item.unit_size && (
                                <p className="text-xs text-muted-foreground">Unit: {item.unit_size}</p>
                              )}
                              {selectedForItem.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {selectedForItem.map(selected => (
                                    <div key={selected.id} className="text-xs bg-muted p-2 rounded">
                                      <span className="font-medium">{selected.item}</span>
                                      <Badge variant={selected.isPrime ? "default" : "secondary"} className="ml-2 text-xs">
                                        {selected.isPrime ? "Prime" : "Alternate"}
                                      </Badge>
                                      <span className="ml-2 text-muted-foreground">Qty: {selected.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemToggle(item)}
                            >
                              Add Variation
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
            >
              Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variation Selection Dialog */}
      <Dialog open={!!selectingVariationFor} onOpenChange={() => setSelectingVariationFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Select Variation for {items.find(i => i.id === selectingVariationFor)?.item}
            </DialogTitle>
          </DialogHeader>
          {selectingVariationFor && (
            <VariationSelector
              coreItemId={selectingVariationFor}
              itemType={type}
              coreItemName={items.find(i => i.id === selectingVariationFor)?.item || ''}
              onVariationSelect={handleVariationSelect}
              allowPrimeToggle={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}