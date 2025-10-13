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
            size="sm"
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
              
              // Dispatch event to refresh library
              window.dispatchEvent(new CustomEvent('tools-library-updated'));
              
              // Only dispatch close event if not in tab context (onBackToLibrary means we're in tabs)
              if (!onBackToLibrary) {
                window.dispatchEvent(new CustomEvent('close-add-tools-window'));
              }
              
              if (onBackToLibrary) {
                onBackToLibrary();
              } else {
                setShowAddMaterials(false);
              }
            }}
            className="text-xs px-3 py-1 h-7"
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

      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        {userMaterials.sort((a, b) => a.item.localeCompare(b.item)).map((material) => (
          <Card key={material.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {(material.user_photo_url || material.photo_url) && (
                  <img 
                    src={material.user_photo_url || material.photo_url} 
                    alt={material.item}
                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{material.item}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Qty: {material.quantity}</span>
                    {material.brand && <span>• {material.brand}</span>}
                  </div>
                  {material.custom_description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{material.custom_description}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeMaterial(material.id)}
                className="w-6 h-6 p-0 text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
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