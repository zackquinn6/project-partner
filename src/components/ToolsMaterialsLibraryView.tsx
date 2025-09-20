import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Camera, Wrench, Package, Eye, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Tool {
  id: string;
  item: string;
  description?: string;
  example_models?: string;
  photo_url?: string;
}

interface UserOwnedTool {
  id: string;
  item: string;
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

interface ToolsMaterialsLibraryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolsMaterialsLibraryView({ open, onOpenChange }: ToolsMaterialsLibraryViewProps) {
  const [userTools, setUserTools] = useState<UserOwnedTool[]>([]);
  const [userMaterials, setUserMaterials] = useState<UserOwnedMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<UserOwnedTool | UserOwnedMaterial | null>(null);
  const [selectedType, setSelectedType] = useState<'tool' | 'material'>('tool');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user && open) {
      fetchUserItems();
    }
  }, [user, open]);

  const fetchUserItems = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('owned_tools, owned_materials')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setUserTools((data?.owned_tools as unknown as UserOwnedTool[]) || []);
      setUserMaterials((data?.owned_materials as unknown as UserOwnedMaterial[]) || []);
    } catch (error) {
      console.error('Error fetching user items:', error);
      toast({ title: "Error", description: "Failed to load your library", variant: "destructive" });
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

      toast({ title: "Success", description: "Photo uploaded successfully" });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const updateItem = (field: string, value: any) => {
    if (!selectedItem) return;

    if (selectedType === 'tool') {
      const updatedTools = userTools.map(tool => 
        tool.id === selectedItem.id ? { ...tool, [field]: value } : tool
      );
      setUserTools(updatedTools);
      setSelectedItem({ ...selectedItem, [field]: value } as UserOwnedTool);
    } else {
      const updatedMaterials = userMaterials.map(material => 
        material.id === selectedItem.id ? { ...material, [field]: value } : material
      );
      setUserMaterials(updatedMaterials);
      setSelectedItem({ ...selectedItem, [field]: value } as UserOwnedMaterial);
    }
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
      toast({ title: "Success", description: "Your library has been saved" });
    } catch (error) {
      console.error('Error saving items:', error);
      toast({ title: "Error", description: "Failed to save library", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>My Tools Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 gap-6 min-h-0">
          {/* Library Grid */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search your library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                size="icon"
                variant="outline" 
                onClick={() => {
                  const event = new CustomEvent('show-tools-materials-editor');
                  window.dispatchEvent(event);
                }}
                title="Add Items"
              >
                <Plus className="w-4 h-4" />
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tools">Tools ({userTools.length})</TabsTrigger>
                <TabsTrigger value="materials">Materials ({userMaterials.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tools" className="space-y-4 mt-4 h-96 overflow-y-auto">
                {filteredTools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No tools in your library yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {filteredTools.map((tool) => (
                      <Card 
                        key={tool.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow p-3"
                        onClick={() => {
                          setSelectedItem(tool);
                          setSelectedType('tool');
                        }}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            {(tool.user_photo_url || tool.photo_url) ? (
                              <img 
                                src={tool.user_photo_url || tool.photo_url} 
                                alt={tool.item}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <Wrench className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <span className="text-xs text-center font-medium line-clamp-2">{tool.item}</span>
                          <Badge variant="secondary" className="text-xs">Qty: {tool.quantity}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="materials" className="space-y-4 mt-4 h-96 overflow-y-auto">
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No materials in your library yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {filteredMaterials.map((material) => (
                      <Card 
                        key={material.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow p-3"
                        onClick={() => {
                          setSelectedItem(material);
                          setSelectedType('material');
                        }}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                            {(material.user_photo_url || material.photo_url) ? (
                              <img 
                                src={material.user_photo_url || material.photo_url} 
                                alt={material.item}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-accent-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-center font-medium line-clamp-2">{material.item}</span>
                          <Badge variant="secondary" className="text-xs">Qty: {material.quantity}</Badge>
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
            <div className="w-80 border-l pl-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  {(selectedItem.user_photo_url || selectedItem.photo_url) ? (
                    <img 
                      src={selectedItem.user_photo_url || selectedItem.photo_url} 
                      alt={selectedItem.item}
                      className="w-14 h-14 object-cover rounded"
                    />
                  ) : (
                    selectedType === 'tool' ? <Wrench className="w-8 h-8" /> : <Package className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedItem.item}</h3>
                  <Badge variant="outline">{selectedType === 'tool' ? 'Tool' : 'Material'}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={selectedItem.quantity}
                      onChange={(e) => updateItem('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>{selectedType === 'tool' ? 'Model/Brand' : 'Brand'}</Label>
                    <Input
                      value={selectedType === 'tool' ? (selectedItem as UserOwnedTool).model_name || '' : (selectedItem as UserOwnedMaterial).brand || ''}
                      onChange={(e) => updateItem(selectedType === 'tool' ? 'model_name' : 'brand', e.target.value)}
                      placeholder={selectedType === 'tool' ? 'e.g., DeWalt DCD771C2' : 'e.g., Sherwin Williams'}
                    />
                  </div>
                </div>

                {selectedType === 'material' && (
                  <div>
                    <Label>Purchase Location</Label>
                    <Input
                      value={(selectedItem as UserOwnedMaterial).purchase_location || ''}
                      onChange={(e) => updateItem('purchase_location', e.target.value)}
                      placeholder="e.g., Home Depot, Amazon"
                    />
                  </div>
                )}

                <div>
                  <Label>Personal Notes</Label>
                  <Textarea
                    value={selectedItem.custom_description || ''}
                    onChange={(e) => updateItem('custom_description', e.target.value)}
                    placeholder="Add your own notes..."
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Item Photo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(selectedItem.id, file, selectedType);
                      }}
                      className="hidden"
                      id={`photo-${selectedItem.id}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById(`photo-${selectedItem.id}`)?.click()}
                      disabled={uploadingPhoto === selectedItem.id}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingPhoto === selectedItem.id ? "Uploading..." : "Update Photo"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}