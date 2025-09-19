import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function UserMaterialsEditor() {
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [userMaterials, setUserMaterials] = useState<UserOwnedMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAvailableMaterials();
      fetchUserMaterials();
    }
  }, [user]);

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
      // Failed to load available materials - no toast needed
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
      setUserMaterials((data?.owned_materials as unknown as UserOwnedMaterial[]) || []);
    } catch (error) {
      console.error('Error fetching user materials:', error);
      // Failed to load your materials - no toast needed
    }
  };

  const filteredMaterials = availableMaterials.filter(material => {
    const matchesSearch = material.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const alreadyOwned = userMaterials.some(userMaterial => userMaterial.id === material.id);
    
    return matchesSearch && !alreadyOwned;
  });

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
      // Photo uploaded successfully - no toast needed
    } catch (error) {
      console.error('Error uploading photo:', error);
      // Failed to upload photo - no toast needed
    } finally {
      setUploadingPhoto(null);
    }
  };

  const saveMaterials = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ owned_materials: userMaterials as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
      // Your materials have been saved - no toast needed
    } catch (error) {
      console.error('Error saving materials:', error);
      // Failed to save materials - no toast needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Available Materials Panel */}
      <div className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Materials</h3>
          
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

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredMaterials.map((material) => (
            <Card key={material.id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate mb-2">{material.item}</h4>
                  {material.description && (
                    <p className="text-sm text-muted-foreground mb-2">{material.description}</p>
                  )}
                  {material.unit_size && (
                    <Badge variant="secondary" className="text-xs">
                      {material.unit_size}
                    </Badge>
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
                    onClick={() => addMaterial(material)}
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

      {/* User's Materials Panel */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Materials ({userMaterials.length})</h3>
          <Button 
            size="sm" 
            onClick={saveMaterials} 
            disabled={isLoading}
            title="Save Materials"
            variant="outline"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {userMaterials.map((material) => (
            <Card key={material.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{material.item}</h4>
                    {material.unit_size && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {material.unit_size}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMaterial(material.id)}
                    title="Delete material"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`quantity-${material.id}`}>Quantity</Label>
                    <Input
                      id={`quantity-${material.id}`}
                      type="number"
                      min="1"
                      value={material.quantity}
                      onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`brand-${material.id}`}>Brand</Label>
                    <Input
                      id={`brand-${material.id}`}
                      value={material.brand || ''}
                      onChange={(e) => updateMaterial(material.id, 'brand', e.target.value)}
                      placeholder="e.g., Sherwin Williams"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`location-${material.id}`}>Purchase Location</Label>
                  <Input
                    id={`location-${material.id}`}
                    value={material.purchase_location || ''}
                    onChange={(e) => updateMaterial(material.id, 'purchase_location', e.target.value)}
                    placeholder="e.g., Home Depot, Amazon"
                  />
                </div>

                <div>
                  <Label htmlFor={`description-${material.id}`}>Personal Notes</Label>
                  <Textarea
                    id={`description-${material.id}`}
                    value={material.custom_description || ''}
                    onChange={(e) => updateMaterial(material.id, 'custom_description', e.target.value)}
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
              No materials in your library yet. Add some from the available materials on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}