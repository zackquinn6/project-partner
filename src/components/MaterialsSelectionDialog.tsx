import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Package, Minus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useIsMobile } from '@/hooks/use-mobile';

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface CustomMaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface MaterialsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRun: ProjectRun | null;
  onConfirm: (selectedMaterials: MaterialItem[], customMaterials: CustomMaterialItem[]) => void;
}

export const MaterialsSelectionDialog: React.FC<MaterialsSelectionDialogProps> = ({
  open,
  onOpenChange,
  projectRun,
  onConfirm
}) => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterialItem[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQuantity, setNewCustomQuantity] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('');

  // Extract materials from project run
  useEffect(() => {
    if (projectRun && open) {
      const extractedMaterials: Map<string, MaterialItem> = new Map();
      
      projectRun.phases.forEach(phase => {
        phase.operations.forEach(operation => {
          operation.steps.forEach(step => {
            step.materials?.forEach(material => {
              const existingMaterial = extractedMaterials.get(material.id);
              // Extract actual unit from material, with proper fallback
              const materialUnit = (material as any).unit || (material as any).scalingUnit || 'ea';
              const quantity = (material as any).quantity || 1;
              
              if (existingMaterial) {
                existingMaterial.quantity += quantity;
              } else {
                extractedMaterials.set(material.id, {
                  id: material.id,
                  name: material.name || 'Unknown Material',
                  quantity: 0, // Default to 0 - user sets quantity for what they need
                  unit: materialUnit
                });
              }
            });
          });
        });
      });

      setMaterials(Array.from(extractedMaterials.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [projectRun, open]);

  // Filter materials based on search
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const query = searchQuery.toLowerCase();
    return materials.filter(m => m.name.toLowerCase().includes(query));
  }, [materials, searchQuery]);

  const updateQuantity = (id: string, quantity: number) => {
    setMaterials(prev => prev.map(m => 
      m.id === id ? { ...m, quantity: Math.max(0, quantity) } : m
    ));
  };

  const addCustomMaterial = () => {
    if (!newCustomName.trim()) {
      toast.error('Please enter a material name');
      return;
    }

    const quantity = parseInt(newCustomQuantity) || 0;
    
    const newCustomMaterial: CustomMaterialItem = {
      id: `custom-${Date.now()}`,
      name: newCustomName.trim(),
      quantity,
      unit: newCustomUnit.trim() || 'ea'
    };

    setCustomMaterials(prev => [...prev, newCustomMaterial]);
    setNewCustomName('');
    setNewCustomQuantity('');
    setNewCustomUnit('');
    toast.success('Custom material added');
  };

  const removeCustomMaterial = (id: string) => {
    setCustomMaterials(prev => prev.filter(m => m.id !== id));
  };

  const updateCustomQuantity = (id: string, quantity: number) => {
    setCustomMaterials(prev => prev.map(m => 
      m.id === id ? { ...m, quantity: Math.max(0, quantity) } : m
    ));
  };

  const handleConfirm = () => {
    // Filter materials with quantity > 0
    const selectedMaterials = materials.filter(m => m.quantity > 0);
    const selectedCustom = customMaterials.filter(m => m.quantity > 0);
    
    if (selectedMaterials.length === 0 && selectedCustom.length === 0) {
      toast.error('Please add at least one material with quantity greater than 0');
      return;
    }

    onConfirm(selectedMaterials, selectedCustom);
    onOpenChange(false);
  };

  const selectedCount = materials.filter(m => m.quantity > 0).length + customMaterials.filter(m => m.quantity > 0).length;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="large"
      title="Select Materials to Purchase"
      description="Choose which materials you need to purchase for your project"
    >
      <ScrollArea className="h-[calc(100vh-16rem)] max-h-[600px]">
        <div className="space-y-4 pr-4">
          {/* Search */}
          <div className="relative pt-2 pl-2">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Project Materials</span>
                <Badge variant="secondary">{filteredMaterials.length} items</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Set quantity to add materials to your shopping list (0 = not needed)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredMaterials.map(material => (
                  <div key={material.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{material.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(material.id, material.quantity - 1)}
                        disabled={material.quantity <= 0}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => updateQuantity(material.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm"
                        min="0"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(material.id, material.quantity + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm text-muted-foreground w-12">{material.unit}</span>
                    </div>
                  </div>
                ))}
                {filteredMaterials.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No materials match your search' : 'No materials found in project'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Custom Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Materials</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Add materials not in the project list
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add Custom Material - Inline Form */}
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <Input
                  placeholder="Material name"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="flex-1 h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomMaterial();
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newCustomQuantity}
                  onChange={(e) => setNewCustomQuantity(e.target.value)}
                  className="w-20 h-8 text-center"
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomMaterial();
                    }
                  }}
                />
                <Input
                  placeholder="Unit"
                  value={newCustomUnit}
                  onChange={(e) => setNewCustomUnit(e.target.value)}
                  className="w-20 h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomMaterial();
                    }
                  }}
                />
                <Button 
                  onClick={addCustomMaterial} 
                  size="sm"
                  className="h-8 px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Custom Materials List */}
              {customMaterials.length > 0 && (
                <div className="space-y-2">
                  {customMaterials.map(material => (
                    <div key={material.id} className="flex items-center gap-2 p-2 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{material.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCustomQuantity(material.id, material.quantity - 1)}
                          disabled={material.quantity <= 0}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateCustomQuantity(material.id, parseInt(e.target.value) || 0)}
                          className="w-16 h-7 text-xs text-center"
                          min="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCustomQuantity(material.id, material.quantity + 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm text-muted-foreground w-12">{material.unit}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomMaterial(material.id)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Actions - Fixed at bottom */}
      <div className="flex justify-between items-center pt-4 mt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
