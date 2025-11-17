import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Camera, Wrench, Package, Eye, Save, Trash2, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserToolsEditor } from "./UserToolsEditor";
import { UserMaterialsEditor } from "./UserMaterialsEditor";

interface Tool {
  id: string;
  name: string;
  description?: string;
  example_models?: string;
  photo_url?: string;
}

interface UserOwnedTool {
  id: string;
  name: string;
  description?: string;
  custom_description?: string;
  example_models?: string;
  photo_url?: string;
  quantity: number;
  model_name?: string;
  user_photo_url?: string;
}

interface Material {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  photo_url?: string;
}

interface UserOwnedMaterial {
  id: string;
  name: string;
  description?: string;
  custom_description?: string;
  unit?: string;
  photo_url?: string;
  quantity: number;
  brand?: string;
  user_photo_url?: string;
  purchase_location?: string;
}

interface ToolsMaterialsLibraryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditMode?: () => void;
  onAddMode?: () => void;
}

export function ToolsMaterialsLibraryView({ open, onOpenChange, onEditMode, onAddMode }: ToolsMaterialsLibraryViewProps) {
  const [userTools, setUserTools] = useState<UserOwnedTool[]>([]);
  const [userMaterials, setUserMaterials] = useState<UserOwnedMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<UserOwnedTool | UserOwnedMaterial | null>(null);
  const [selectedType, setSelectedType] = useState<'tool' | 'material'>('tool');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'library' | 'add'>('library');
  const { user } = useAuth();

  useEffect(() => {
    if (user && open) {
      fetchUserItems();
    }
  }, [user, open]);

  // Listen for tools library updates
  useEffect(() => {
    const handleLibraryUpdate = () => {
      fetchUserItems();
    };

    window.addEventListener('tools-library-updated', handleLibraryUpdate);
    return () => window.removeEventListener('tools-library-updated', handleLibraryUpdate);
  }, [user]);

  const fetchUserItems = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('owned_tools, owned_materials')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      // Deduplicate tools by ID
      const rawTools = (data?.owned_tools as unknown as UserOwnedTool[]) || [];
      const uniqueTools = rawTools.filter((tool, index, arr) => 
        arr.findIndex(t => t.id === tool.id) === index
      );
      
      // Deduplicate materials by ID and enrich with unit_size from materials table
      const rawMaterials = (data?.owned_materials as unknown as UserOwnedMaterial[]) || [];
      const uniqueMaterials = rawMaterials.filter((material, index, arr) => 
        arr.findIndex(m => m.id === material.id) === index
      );
      
      // Fetch unit_size from materials table for owned materials
      if (uniqueMaterials.length > 0) {
        const materialIds = uniqueMaterials.map(m => m.id);
        const { data: materialsData } = await supabase
          .from('materials')
          .select('id, unit_size')
          .in('id', materialIds);
        
        // Merge unit_size into user materials
        const enrichedMaterials = uniqueMaterials.map(userMaterial => {
          const materialInfo = materialsData?.find(m => m.id === userMaterial.id);
          return {
            ...userMaterial,
            unit_size: materialInfo?.unit_size || userMaterial.unit_size
          };
        });
        
        setUserMaterials(enrichedMaterials);
      } else {
        setUserMaterials(uniqueMaterials);
      }
      
      setUserTools(uniqueTools);
    } catch (error) {
      console.error('Error fetching user items:', error);
    }
  };

  const filteredTools = userTools.filter(tool => 
    tool.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMaterials = userMaterials.filter(material => 
    material.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (material.description && material.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePhotoUpload = async (itemId: string, file: File, type: 'tool' | 'material') => {
    if (!user) return;
    
    setUploadingPhoto(itemId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${itemId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(fileName);

      if (type === 'tool') {
        const updatedTools = userTools.map(tool => 
          tool.id === itemId ? { ...tool, user_photo_url: publicUrl } : tool
        );
        setUserTools(updatedTools);
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({ ...selectedItem, user_photo_url: publicUrl } as UserOwnedTool);
        }
      } else {
        const updatedMaterials = userMaterials.map(material => 
          material.id === itemId ? { ...material, user_photo_url: publicUrl } : material
        );
        setUserMaterials(updatedMaterials);
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({ ...selectedItem, user_photo_url: publicUrl } as UserOwnedMaterial);
        }
      }

    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const updateItem = async (field: string, value: any) => {
    if (!selectedItem || !user) return;
    
    let updatedTools = userTools;
    let updatedMaterials = userMaterials;
    
    if (selectedType === 'tool') {
      updatedTools = userTools.map(tool => 
        tool.id === selectedItem.id ? { ...tool, [field]: value } : tool
      );
      setUserTools(updatedTools);
      setSelectedItem({ ...selectedItem, [field]: value } as UserOwnedTool);
    } else {
      updatedMaterials = userMaterials.map(material => 
        material.id === selectedItem.id ? { ...material, [field]: value } : material
      );
      setUserMaterials(updatedMaterials);
      setSelectedItem({ ...selectedItem, [field]: value } as UserOwnedMaterial);
    }
    
    // Immediately save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          owned_tools: updatedTools as any,
          owned_materials: updatedMaterials as any
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Failed to save item update to database:', error);
        // Revert local state on error
        if (selectedType === 'tool') {
          setUserTools(userTools);
          setSelectedItem(selectedItem);
        } else {
          setUserMaterials(userMaterials);
          setSelectedItem(selectedItem);
        }
        return;
      }
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert local state on error
      if (selectedType === 'tool') {
        setUserTools(userTools);
        setSelectedItem(selectedItem);
      } else {
        setUserMaterials(userMaterials);
        setSelectedItem(selectedItem);
      }
    }
  };

  const deleteItem = async () => {
    if (!selectedItem || !user) return;
    
    let updatedTools = userTools;
    let updatedMaterials = userMaterials;
    
    if (selectedType === 'tool') {
      updatedTools = userTools.filter(tool => tool.id !== selectedItem.id);
      setUserTools(updatedTools);
    } else {
      updatedMaterials = userMaterials.filter(material => material.id !== selectedItem.id);
      setUserMaterials(updatedMaterials);
    }
    
    // Immediately save to database
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          owned_tools: updatedTools as any,
          owned_materials: updatedMaterials as any
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Failed to delete from database:', error);
        // Revert local state on error
        if (selectedType === 'tool') {
          setUserTools(userTools);
        } else {
          setUserMaterials(userMaterials);
        }
        return;
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      // Revert local state on error
      if (selectedType === 'tool') {
        setUserTools(userTools);
      } else {
        setUserMaterials(userMaterials);
      }
      return;
    }
    
    setSelectedItem(null);
  };

  const saveItems = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          owned_tools: userTools as any,
          owned_materials: userMaterials as any
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-4 md:px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {viewMode === 'add' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('library')}
                  className="mr-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <DialogTitle className="text-lg md:text-xl font-bold">
                  {viewMode === 'add' ? 'Add to Library' : 'My Tools Library'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewMode === 'add' 
                    ? 'Add tools and materials to your personal library.' 
                    : 'View and manage your personal collection of tools and materials.'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="ml-4 flex-shrink-0"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {viewMode === 'library' ? (
            <div className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
            {/* Library Grid */}
            <div className="flex-1 space-y-4 min-w-0">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                  <Input
                    placeholder="Search your library..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11"
                  />
                </div>
                <Button 
                  size="icon"
                  variant="outline" 
                  onClick={() => setViewMode('add')}
                  title="Add Items"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => {
                    fetchUserItems();
                  }}
                  title="Refresh Library"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={saveItems} 
                  disabled={isLoading}
                  title="Save Library"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>

              <Tabs defaultValue="tools" className="flex-1">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="tools" className="text-sm px-2 py-2">Tools ({userTools.length})</TabsTrigger>
                  <TabsTrigger value="materials" className="text-sm px-2 py-2">Materials ({userMaterials.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tools" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
                  {filteredTools.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No tools in your library yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                      {filteredTools.map((tool) => (
                        <Card 
                          key={tool.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow p-3 relative"
                          onClick={() => {
                            setSelectedItem(tool);
                            setSelectedType('tool');
                          }}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center relative">
                              {(tool.user_photo_url || tool.photo_url) ? (
                                <img 
                                  src={tool.user_photo_url || tool.photo_url} 
                                  alt={tool.item}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <Wrench className="w-6 h-6 text-primary" />
                              )}
                              {tool.quantity >= 1 && (
                                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                                  {tool.quantity}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-center font-medium line-clamp-2">{tool.item}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="materials" className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
                  {filteredMaterials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No materials in your library yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                      {filteredMaterials.map((material) => (
                        <Card 
                          key={material.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow p-3 relative"
                          onClick={() => {
                            setSelectedItem(material);
                            setSelectedType('material');
                          }}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center relative">
                              {(material.user_photo_url || material.photo_url) ? (
                                <img 
                                  src={material.user_photo_url || material.photo_url} 
                                  alt={material.item}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-accent-foreground" />
                              )}
                              {material.quantity >= 1 && (
                                <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                                  {material.quantity}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-center font-medium line-clamp-2">{material.item}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Detail Panel */}
            {selectedItem && (
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 space-y-4 lg:space-y-6 overflow-y-auto max-h-[50vh] lg:max-h-full">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    {(selectedItem.user_photo_url || selectedItem.photo_url) ? (
                      <img 
                        src={selectedItem.user_photo_url || selectedItem.photo_url} 
                        alt={selectedItem.item}
                        className="w-14 h-14 object-cover rounded"
                      />
                    ) : selectedType === 'tool' ? (
                      <Wrench className="w-8 h-8 text-primary" />
                    ) : (
                      <Package className="w-8 h-8 text-accent-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{selectedItem.item}</h3>
                    <Badge variant="secondary" className="mt-1">
                      Qty: {selectedItem.quantity}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      value={selectedItem.quantity}
                      onChange={(e) => updateItem('quantity', parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  {selectedItem.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedItem.description}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">My Notes</Label>
                    <Textarea
                      value={selectedItem.custom_description || ''}
                      onChange={(e) => updateItem('custom_description', e.target.value)}
                      placeholder="Add your personal notes..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {selectedType === 'tool' && 'model_name' in selectedItem && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Model Name</Label>
                      <Input
                        value={selectedItem.model_name || ''}
                        onChange={(e) => updateItem('model_name', e.target.value)}
                        placeholder="e.g., DeWalt DCD771C2"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {selectedType === 'material' && 'brand' in selectedItem && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Brand</Label>
                        <Input
                          value={selectedItem.brand || ''}
                          onChange={(e) => updateItem('brand', e.target.value)}
                          placeholder="e.g., Benjamin Moore"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Purchase Location</Label>
                        <Input
                          value={selectedItem.purchase_location || ''}
                          onChange={(e) => updateItem('purchase_location', e.target.value)}
                          placeholder="e.g., Home Depot"
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Photo</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              handlePhotoUpload(selectedItem.id, file, selectedType);
                            }
                          };
                          input.click();
                        }}
                        disabled={uploadingPhoto === selectedItem.id}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingPhoto === selectedItem.id ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                      {(selectedItem.user_photo_url || selectedItem.photo_url) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateItem('user_photo_url', null)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={deleteItem}
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Item
                  </Button>
                </div>
              </div>
            )}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
                  <TabsTrigger value="tools" className="text-sm px-3 py-2">Tools</TabsTrigger>
                  <TabsTrigger value="materials" className="text-sm px-3 py-2">Materials</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tools">
                  <UserToolsEditor 
                    initialMode="add-tools"
                    onBackToLibrary={() => {
                      setViewMode('library');
                      fetchUserItems();
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="materials">
                  <UserMaterialsEditor 
                    initialMode="add-materials"
                    onBackToLibrary={() => {
                      setViewMode('library');
                      fetchUserItems();
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
