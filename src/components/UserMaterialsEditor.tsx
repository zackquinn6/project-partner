import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera, Save, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { VariationViewer } from "./VariationViewer";

interface Material {
  id: string;
  item: string;
  description?: string;
  unit_size?: string;
  photo_url?: string;
}

interface UserOwnedMaterial {
  id: string;
  item: string;
  description?: string;
  custom_description?: string;
  unit_size?: string;
  photo_url?: string;
  quantity: number;
  brand?: string;
  user_photo_url?: string;
  purchase_location?: string;
}

interface UserMaterialsEditorProps {
  initialMode?: 'library' | 'add-materials';
  onBackToLibrary?: () => void;
}

export function UserMaterialsEditor({ initialMode = 'library', onBackToLibrary }: UserMaterialsEditorProps = {}) {
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [userMaterials, setUserMaterials] = useState<UserOwnedMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [checkingVariations, setCheckingVariations] = useState<Material | null>(null);
  const [showAddMaterials, setShowAddMaterials] = useState(initialMode === 'add-materials');
  const { user } = useAuth();

  // Update showAddMaterials when initialMode changes
  useEffect(() => {
    setShowAddMaterials(initialMode === 'add-materials');
  }, [initialMode]);

  // Debounce user materials for auto-save
  const debouncedUserMaterials = useDebounce(userMaterials, 2000);

  useEffect(() => {
    if (user) {
      fetchAvailableMaterials();
      fetchUserMaterials();
    }
  }, [user]);

  // Window close auto-save
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && userMaterials.length > 0) {
        navigator.sendBeacon('/api/save-materials', JSON.stringify({
          userId: user.id,
          materials: userMaterials
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, userMaterials]);

  const fetchAvailableMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('item');
      
      if (error) throw error;
      setAvailableMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchUserMaterials = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('owned_materials')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      const rawMaterials = (data?.owned_materials as unknown as UserOwnedMaterial[]) || [];
      
      // Fetch unit_size from materials table for owned materials
      if (rawMaterials.length > 0) {
        const materialIds = rawMaterials.map(m => m.id);
        const { data: materialsData } = await supabase
          .from('materials')
          .select('id, unit_size')
          .in('id', materialIds);
        
        // Merge unit_size into user materials
        const enrichedMaterials = rawMaterials.map(userMaterial => {
          const materialInfo = materialsData?.find(m => m.id === userMaterial.id);
          return {
            ...userMaterial,
            unit_size: materialInfo?.unit_size || userMaterial.unit_size
          };
        });
        
        setUserMaterials(enrichedMaterials);
      } else {
        setUserMaterials(rawMaterials);
      }
    } catch (error) {
      console.error('Error fetching user materials:', error);
    }
  };

  const filteredMaterials = availableMaterials
    .filter(material => {
      const matchesSearch = material.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const alreadyOwned = userMaterials.some(userMaterial => userMaterial.id === material.id);
      
      return matchesSearch && !alreadyOwned;
    })
    .sort((a, b) => a.item.localeCompare(b.item));

  const handleAddMaterial = async (material: Material) => {
    // Always check if this material has variations first
    try {
      const { data: variations, error } = await supabase
        .from('variation_instances')
        .select('id')
        .eq('core_item_id', material.id)
        .eq('item_type', 'materials')
        .limit(1);

      if (error) throw error;

      if (variations && variations.length > 0) {
        // Material has variations, always show variation selector
        setCheckingVariations(material);
      } else {
        // No variations exist, add the core material directly
        addMaterial(material);
      }
    } catch (error) {
      console.error('Error checking variations:', error);
      // Fallback to direct add if error occurs
      addMaterial(material);
    }
  };

  const addMaterial = (material: Material) => {
    const newUserMaterial: UserOwnedMaterial = {
      ...material,
      quantity: 1,
      brand: '',
      user_photo_url: '',
      purchase_location: ''
    };
    setUserMaterials([...userMaterials, newUserMaterial]);
  };

  const removeMaterial = (materialId: string) => {
    setUserMaterials(userMaterials.filter(material => material.id !== materialId));
  };

  // Immediate save on field changes  
  const handleMaterialFieldUpdate = (materialId: string, field: keyof UserOwnedMaterial, value: any) => {
    const updatedMaterials = userMaterials.map(material => 
      material.id === materialId ? { ...material, [field]: value } : material
    );
    setUserMaterials(updatedMaterials);
    
    // Trigger immediate save
    if (user) {
      supabase
        .from('profiles')
        .update({ owned_materials: updatedMaterials as any })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Auto-save failed:', error);
        });
    }
  };

  const updateMaterial = (materialId: string, field: keyof UserOwnedMaterial, value: any) => {
    setUserMaterials(userMaterials.map(material => 
      material.id === materialId ? { ...material, [field]: value } : material
    ));
  };

  const handlePhotoUpload = async (materialId: string, file: File) => {
    if (!user) return;
    
    setUploadingPhoto(materialId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${materialId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(fileName);

      updateMaterial(materialId, 'user_photo_url', publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const autoSaveMaterials = useCallback(async () => {
    if (!user || userMaterials.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ owned_materials: userMaterials as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error auto-saving materials:', error);
    }
  }, [user, userMaterials]);

  const saveMaterials = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ owned_materials: userMaterials as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddMaterials) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Materials to Your Library</h3>
          <Button 
            variant="outline" 
            onClick={async () => {
              // Save materials before closing
              if (user && userMaterials.length > 0) {
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ owned_materials: userMaterials as any })
                    .eq('user_id', user.id);
                  
                  if (error) {
                    console.error('Failed to save materials:', error);
                  }
                } catch (error) {
                  console.error('Error saving materials:', error);
                }
              }
              
              // Dispatch event to refresh library and close add window
              window.dispatchEvent(new CustomEvent('tools-library-updated'));
              window.dispatchEvent(new CustomEvent('close-add-tools-window'));
              
              if (onBackToLibrary) {
                onBackToLibrary();
              } else {
                setShowAddMaterials(false);
              }
            }}
          >
            Back to My Materials
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search available materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {filteredMaterials.map((material) => (
            <Card key={material.id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium truncate">{material.item}</h4>
                  </div>
                  {material.description && (
                    <p className="text-sm text-muted-foreground mb-2">{material.description}</p>
                  )}
                  {material.unit_size && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Unit: {material.unit_size}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {material.photo_url && (
                    <img 
                      src={material.photo_url} 
                      alt={material.item}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleAddMaterial(material)}
                    className="flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredMaterials.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No materials found matching your search" : "All available materials have been added to your library"}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* User's Materials Panel */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Materials Library ({userMaterials.length})</h3>
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="outline" 
            onClick={() => setShowAddMaterials(true)}
            title="Add Materials"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={saveMaterials}
            disabled={isLoading}
            title="Save Materials Library"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {userMaterials.sort((a, b) => a.item.localeCompare(b.item)).map((material) => (
          <Card key={material.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{material.item}</h4>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMaterial(material.id)}
                  title="Delete material"
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`quantity-${material.id}`}>
                    Quantity
                  </Label>
                  {material.unit_size && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Unit: {material.unit_size}
                    </div>
                  )}
                  <Input
                    id={`quantity-${material.id}`}
                    type="number"
                    min="1"
                    value={material.quantity}
                    onChange={(e) => handleMaterialFieldUpdate(material.id, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor={`brand-${material.id}`}>Brand</Label>
                  <Input
                    id={`brand-${material.id}`}
                    value={material.brand || ''}
                    onChange={(e) => handleMaterialFieldUpdate(material.id, 'brand', e.target.value)}
                    placeholder="e.g., Sherwin Williams"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`location-${material.id}`}>Purchase Location</Label>
                <Input
                  id={`location-${material.id}`}
                  value={material.purchase_location || ''}
                  onChange={(e) => handleMaterialFieldUpdate(material.id, 'purchase_location', e.target.value)}
                  placeholder="e.g., Home Depot, Amazon"
                />
              </div>

              <div>
                <Label htmlFor={`description-${material.id}`}>Personal Notes</Label>
                <Textarea
                  id={`description-${material.id}`}
                  value={material.custom_description || ''}
                  onChange={(e) => handleMaterialFieldUpdate(material.id, 'custom_description', e.target.value)}
                  placeholder="Add your own notes about this material..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Item Photo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(material.id, file);
                      }}
                      className="hidden"
                      id={`photo-${material.id}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById(`photo-${material.id}`)?.click()}
                      disabled={uploadingPhoto === material.id}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingPhoto === material.id ? "Uploading..." : "Add Photo"}
                    </Button>
                  </div>
                </div>
                {(material.user_photo_url || material.photo_url) && (
                  <img 
                    src={material.user_photo_url || material.photo_url} 
                    alt={material.item}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}

        {userMaterials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No materials in your library yet</h3>
            <p className="mb-4">Start building your material collection by adding from our catalog.</p>
            <Button onClick={() => setShowAddMaterials(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Material
            </Button>
          </div>
        )}
      </div>

      {/* Variation Selection for Adding */}
      {checkingVariations && (
        <VariationViewer
          open={!!checkingVariations}
          onOpenChange={() => setCheckingVariations(null)}
          coreItemId={checkingVariations.id}
          coreItemName={checkingVariations.item}
          itemType="materials"
          onVariationSelect={(variation) => {
            // Check if this variation is already in the user's materials
            const isDuplicate = userMaterials.some(userMaterial => userMaterial.id === variation.id);
            if (isDuplicate) {
              setCheckingVariations(null);
              return;
            }
            
            // Create a new material based on the selected variation
            const newUserMaterial: UserOwnedMaterial = {
              id: variation.id,
              item: variation.name,
              description: variation.description,
              photo_url: variation.photo_url,
              quantity: 1,
              brand: variation.sku || '',
              user_photo_url: '',
              purchase_location: ''
            };
            const updatedMaterials = [...userMaterials, newUserMaterial];
            setUserMaterials(updatedMaterials);
            
            // Save to database immediately
            if (user) {
              supabase
                .from('profiles')
                .update({ owned_materials: updatedMaterials as any })
                .eq('user_id', user.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('Failed to save material to database:', error);
                  } else {
                    // Dispatch event to refresh library view
                    window.dispatchEvent(new CustomEvent('tools-library-updated'));
                  }
                });
            }
            
            setCheckingVariations(null);
          }}
        />
      )}
    </div>
  );
}