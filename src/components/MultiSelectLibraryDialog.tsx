import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VariationSelector } from './VariationSelector';
import { useAuth } from '@/contexts/AuthContext';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';

interface SelectedItem {
  id: string;
  coreItemId: string;
  variationId?: string;
  item: string;
  sourceType?: 'tools' | 'materials';
  category?: string | null;
  quantity: number;
  description?: string | null;
  attributes: Record<string, string>;
  isPrime: boolean;
  alternateToolId?: string;
  unit?: string | null;
}

interface MultiSelectLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tools' | 'materials' | 'ppe';
  onSelect: (items: SelectedItem[]) => void;
  availableStepTools?: Array<{id: string; name: string}>;
  /** Optional library category filter (used by PPE step editor) */
  categoryInclude?: string | null;
  categoryExclude?: string | null;
  /** Overrides default "Select … from Library" title (e.g. alternate picker) */
  titleOverride?: string | null;
}

export function MultiSelectLibraryDialog({
  open,
  onOpenChange,
  type,
  onSelect,
  availableStepTools = [],
  categoryInclude = null,
  categoryExclude = null,
  titleOverride = null
}: MultiSelectLibraryDialogProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectingVariationFor, setSelectingVariationFor] = useState<string | null>(null);
  const [userOwnedItems, setUserOwnedItems] = useState<any[]>([]);
  const [itemVariations, setItemVariations] = useState<Record<string, any[]>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      console.log(`🚀 MultiSelectLibraryDialog opened for ${type}`);
      fetchItems();
      fetchUserOwnedItems();
    }
  }, [open, type, user]);

  const fetchItems = async () => {
    console.log(`📚 Fetching ${type} from library...`);
    setLoading(true);
    try {
      // Materials table uses 'name' column, tools table uses 'name' column
      // Order by 'name' for both types
      let allItems: any[] = [];

      if (type === 'ppe') {
        const [toolsRes, materialsRes] = await Promise.all([
          supabase.from('tools').select('*').eq('category', 'PPE').order('name'),
          supabase.from('materials').select('*').eq('category', 'PPE').order('name'),
        ]);

        if (toolsRes.error) {
          console.error('❌ Error fetching PPE tools:', toolsRes.error);
          throw toolsRes.error;
        }
        if (materialsRes.error) {
          console.error('❌ Error fetching PPE materials:', materialsRes.error);
          throw materialsRes.error;
        }

        const toolItems = (toolsRes.data || []).map((row: any) => ({
          ...row,
          item: row.item || row.name,
          sourceType: 'tools' as const,
        }));
        const materialItems = (materialsRes.data || []).map((row: any) => ({
          ...row,
          item: row.name,
          unit_size: row.unit,
          sourceType: 'materials' as const,
        }));

        allItems = [...toolItems, ...materialItems].sort((a, b) => a.item.localeCompare(b.item));
      } else {
        const { data, error } = await supabase
          .from(type)
          .select('*')
          .order('name');

        if (error) {
          console.error(`❌ Error fetching ${type}:`, error);
          throw error;
        }

        console.log(`✅ Fetched ${data?.length || 0} ${type} from database`);

        if (!data || data.length === 0) {
          console.warn(`⚠️ No ${type} found in library! You need to add ${type} to the library first using the "Manage ${type === 'tools' ? 'Tools' : 'Materials'} Library" button.`);
        }

        allItems = (data || []).map((row: any) => {
          if (type === 'materials') {
            return {
              ...row,
              item: row.name,
              unit_size: row.unit,
              sourceType: 'materials' as const,
            };
          }
          return {
            ...row,
            item: row.item || row.name,
            sourceType: 'tools' as const,
          };
        });
      }
      
      setItems(allItems);
      console.log(`📦 Processed ${allItems.length} items for UI:`, allItems.map(i => i.item));
      
      // Fetch variations for all items
      if (type !== 'ppe') {
        await fetchItemVariations(allItems);
      } else {
        setItemVariations({});
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOwnedItems = async () => {
    if (!user) return;
    
    try {
      const columnName = type === 'materials' ? 'owned_materials' : 'owned_tools';
      const { data, error } = await supabase
        .from('user_profiles')
        .select(columnName)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      const ownedItems = (data?.[columnName] as any[]) || [];
      console.log(`User owned ${type}:`, ownedItems);
      setUserOwnedItems(ownedItems);
    } catch (error) {
      console.error(`Error fetching user owned ${type}:`, error);
      setUserOwnedItems([]);
    }
  };

  const fetchItemVariations = async (itemsList: any[]) => {
    if (itemsList.length === 0) return;
    
    console.log(`🔄 Fetching variations for ${itemsList.length} items...`);
    const variationsMap: Record<string, any[]> = {};
    
    try {
      // PERFORMANCE: Fetch all variations in one query instead of one per item
      const itemIds = itemsList.map(i => i.id);
      const { data: allVariations, error } =
        type === 'tools'
          ? await supabase.from('tool_variations').select('*').in('core_item_id', itemIds)
          : await supabase.from('materials_variants').select('*').in('material_id', itemIds);
      
      if (error) throw error;
      
      (allVariations || []).forEach((variation: any) => {
        const parentId = type === 'tools' ? variation.core_item_id : variation.material_id;
        if (!variationsMap[parentId]) {
          variationsMap[parentId] = [];
        }
        variationsMap[parentId].push(variation);
      });
      
      // Initialize empty arrays for items with no variations
      itemsList.forEach(item => {
        if (!variationsMap[item.id]) {
          variationsMap[item.id] = [];
        }
      });
      
      console.log(`✅ Fetched variations for ${itemsList.length} items in one query`);
      setItemVariations(variationsMap);
    } catch (error) {
      console.error('Error fetching variations:', error);
    }
  };

  // For materials in edit workflow, show all items (no filtering by user ownership)
  // For tools, filter out items the user already owns
  const filteredItems = items
    .filter(item => {
      if (categoryInclude !== null && categoryInclude !== undefined) {
        if ((item as any).category !== categoryInclude) return false;
      }
      if (categoryExclude !== null && categoryExclude !== undefined) {
        if ((item as any).category === categoryExclude) return false;
      }

      const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // For materials and PPE, always show all items (no ownership filtering)
      if (type === 'materials' || type === 'ppe') {
        return true;
      }

      // For tools, filter by ownership (existing logic)
      // Get all variations for this core item
      const variations = itemVariations[item.id] || [];
      
      // If item has no variations, check if core item itself is owned
      if (variations.length === 0) {
        const coreItemOwned = userOwnedItems.some(ownedItem => ownedItem.id === item.id);
        return !coreItemOwned;
      }
      
      // If item has variations, check if ALL variations are owned
      const ownedItemIds = new Set(userOwnedItems.map(ownedItem => ownedItem.id));
      const allVariationsOwned = variations.every(variation => 
        ownedItemIds.has(variation.id)
      );
      
      // Also check if the core item itself is owned (for items that have both core and variations)
      const coreItemOwned = ownedItemIds.has(item.id);
      
      // Show item only if:
      // 1. Not all variations are owned AND
      // 2. The core item itself is not owned
      return !allVariationsOwned && !coreItemOwned;
    })
    .sort((a, b) => a.item.localeCompare(b.item));

  const addCoreItemDirect = (coreItem: any) => {
    const selectedId = `direct_${coreItem.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSelectedItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.coreItemId === coreItem.id &&
          !item.variationId &&
          Object.keys(item.attributes).length === 0
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: selectedId,
          coreItemId: coreItem.id,
          item: coreItem.item,
          quantity: 1,
          category: coreItem.category ?? null,
          description: coreItem.description ?? null,
          attributes: {},
          isPrime: true,
          unit: coreItem.unit_size || (coreItem as { unit?: string | null }).unit || null,
        },
      ];
    });
  };

  const handleAddItemClick = (coreItem: any) => {
    const variations = itemVariations[coreItem.id] || [];
    if (variations.length === 0) {
      addCoreItemDirect(coreItem);
      return;
    }
    setSelectingVariationFor(coreItem.id);
  };

  const handleVariationSelect = (variation: any) => {
    console.log('🎯 Variation selected:', {
      variationName: variation.name,
      coreItemId: variation.coreItemId,
      isPrime: variation.isPrime,
      attributes: variation.attributes
    });
    
    const selectedId = `${variation.coreItemId}_${JSON.stringify(variation.attributes)}_${variation.isPrime}`;
    
    setSelectedItems(prev => {
      const existing = prev.find(item => item.id === selectedId);
      if (existing) {
        console.log('  ➕ Incrementing existing item quantity');
        return prev.map(item =>
          item.id === selectedId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        console.log('  ✨ Adding new item to selection');
        const coreItem = items.find(i => i.id === variation.coreItemId);
        return [...prev, {
          id: selectedId,
          coreItemId: variation.coreItemId,
          variationId: variation.variationId,
          item: variation.name,
          quantity: 1,
          category: coreItem?.category ?? null,
          description: coreItem?.description,
          attributes: variation.attributes,
          isPrime: variation.isPrime,
          alternateToolId: variation.alternateToolId,
          unit: coreItem?.unit_size || (coreItem as any)?.unit || null
        }];
      }
    });
    
    console.log('  🔙 Closing variation selector');
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
    console.log('✅ Confirming selection:', {
      selectedItemsCount: selectedItems.length,
      items: selectedItems.map(i => i.item)
    });
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

  const [showAdminLibrary, setShowAdminLibrary] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[min(90dvh,880px)] w-[min(96vw,42rem)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,42rem)]">
          <DialogHeader className="flex-shrink-0 space-y-1 border-b px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-left">
                {titleOverride ??
                  `Select ${type === 'tools' ? 'Tools' : type === 'materials' ? 'Materials' : 'PPE'} from Library`}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminLibrary(true)}
                className="text-xs"
              >
                Manage {type === 'tools' ? 'Tools' : type === 'materials' ? 'Materials' : 'Library'}
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={type === 'ppe' ? 'Search PPE...' : `Search ${type}...`}
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
                             {!item.isPrime && item.alternateToolId && (
                               <Badge variant="outline" className="text-xs">
                                 Alt for: {availableStepTools.find(t => t.id === item.alternateToolId)?.name || 'Unknown'}
                               </Badge>
                             )}
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
                            {item.sourceType === 'materials' && (
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <div className="space-y-4 pb-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {type === 'ppe' ? 'PPE items' : type} found{searchTerm && ` matching "${searchTerm}"`}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const selectedForItem = selectedItems.filter(selected => selected.coreItemId === item.id);
                    const variationCount = (itemVariations[item.id] || []).length;
                    
                    return (
                      <Card key={item.id} className="cursor-pointer transition-colors hover:bg-accent/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{item.item}</h4>
                                {selectedForItem.length > 0 && (
                                  <Badge variant="secondary">
                                    {selectedForItem.length} selected
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              )}
                              {item.sourceType === 'materials' && item.unit_size && (
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
                              className="flex-shrink-0"
                              onClick={() => handleAddItemClick(item)}
                            >
                              {variationCount === 0 ? 'Add' : 'Choose variant'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t px-6 py-4">
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
        <DialogContent className="flex max-h-[min(90dvh,880px)] w-[min(96vw,42rem)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,42rem)]">
          <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
            <DialogTitle className="text-left">
              Select variant — {items.find(i => i.id === selectingVariationFor)?.item}
            </DialogTitle>
          </DialogHeader>
          {selectingVariationFor && (
            <div className="max-h-[min(70dvh,640px)] min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
              <VariationSelector
                coreItemId={selectingVariationFor}
                itemType={type}
                coreItemName={items.find(i => i.id === selectingVariationFor)?.item || ''}
                onVariationSelect={handleVariationSelect}
                allowPrimeToggle={true}
                availableAlternateTools={type === 'tools' ? availableStepTools : []}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Library Window */}
      <ToolsMaterialsWindow 
        open={showAdminLibrary} 
        onOpenChange={(open) => {
          setShowAdminLibrary(open);
          if (!open) {
            // Refresh the items list when admin library is closed
            fetchItems();
          }
        }} 
      />
    </>
  );
}