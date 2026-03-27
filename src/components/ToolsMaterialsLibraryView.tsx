import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Camera, Wrench, Package, RefreshCw, Trash2, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  collectOwnedToolCoreIds,
  enrichOwnedToolsWithCatalogPhotos,
  fetchOwnedToolsPhotoResolution,
} from "@/utils/ownedToolsCatalogPhotos";
import { UserToolsEditor } from "./UserToolsEditor";
import { UserMaterialsEditor } from "./UserMaterialsEditor";

interface Tool {
  id: string;
  name: string;
  description?: string;
  photo_url?: string;
  item?: string;
}

interface UserOwnedTool {
  id: string;
  /** Core catalog row when linked to admin tools library */
  tool_id?: string;
  name: string;
  description?: string;
  custom_description?: string;
  photo_url?: string;
  quantity: number;
  model_name?: string;
  user_photo_url?: string;
  item?: string;
}

interface Material {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  photo_url?: string;
  item?: string;
  unit_size?: string;
}

interface UserOwnedMaterial {
  id: string;
  name: string;
  description?: string;
  custom_description?: string;
  unit?: string;
  photo_url?: string;
  item?: string;
  unit_size?: string;
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
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'library' | 'add'>('library');
  const { user } = useAuth();

  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLibraryRef = useRef<{
    tools: UserOwnedTool[];
    materials: UserOwnedMaterial[];
  } | null>(null);
  const fetchUserItemsRef = useRef<() => Promise<void>>(async () => {});

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
        .from('user_profiles')
        .select('owned_tools, owned_materials')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      const rawTools = (data?.owned_tools as unknown as UserOwnedTool[]) || [];
      const byToolId = new Map<string, UserOwnedTool>();
      for (const tool of rawTools) {
        const prev = byToolId.get(tool.id);
        if (prev) {
          byToolId.set(tool.id, {
            ...prev,
            quantity: (prev.quantity ?? 0) + (tool.quantity ?? 0),
          });
        } else {
          byToolId.set(tool.id, { ...tool });
        }
      }
      const uniqueTools = Array.from(byToolId.values());
      
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

      const toolCoreIds = collectOwnedToolCoreIds(uniqueTools);
      const toolMaps = await fetchOwnedToolsPhotoResolution(supabase, toolCoreIds);
      const toolsWithCatalogPhotos = enrichOwnedToolsWithCatalogPhotos(
        uniqueTools,
        toolMaps.corePhotoById,
        toolMaps.variationsByCore
      );
      setUserTools(toolsWithCatalogPhotos);
    } catch (error) {
      console.error('Error fetching user items:', error);
    }
  };

  fetchUserItemsRef.current = fetchUserItems;

  const clearScheduledProfileSave = useCallback(() => {
    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }
  }, []);

  const persistLibrary = useCallback(
    async (tools: UserOwnedTool[], materials: UserOwnedMaterial[]) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('user_profiles')
        .update({
          owned_tools: tools as any,
          owned_materials: materials as any,
        })
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed to save profile library:', error);
        await fetchUserItemsRef.current();
      }
    },
    [user?.id]
  );

  const scheduleLibraryPersist = useCallback(
    (tools: UserOwnedTool[], materials: UserOwnedMaterial[]) => {
      if (!user?.id) return;
      pendingLibraryRef.current = { tools, materials };
      clearScheduledProfileSave();
      profileSaveTimerRef.current = setTimeout(() => {
        profileSaveTimerRef.current = null;
        const p = pendingLibraryRef.current;
        pendingLibraryRef.current = null;
        if (p) void persistLibrary(p.tools, p.materials);
      }, 450);
    },
    [user?.id, clearScheduledProfileSave, persistLibrary]
  );

  useEffect(() => {
    if (open) return;
    clearScheduledProfileSave();
    const p = pendingLibraryRef.current;
    if (p && user?.id) {
      pendingLibraryRef.current = null;
      void persistLibrary(p.tools, p.materials);
    }
  }, [open, user?.id, clearScheduledProfileSave, persistLibrary]);

  const filteredTools = userTools.filter(tool => {
    const itemMatch = tool.item?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const descriptionMatch = tool.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const nameMatch = tool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    return itemMatch || descriptionMatch || nameMatch;
  });

  const sortedFilteredTools = useMemo(
    () =>
      [...filteredTools].sort((a, b) => {
        const ka = (a.item?.trim() || a.name?.trim() || '').toLowerCase();
        const kb = (b.item?.trim() || b.name?.trim() || '').toLowerCase();
        return ka.localeCompare(kb, undefined, { sensitivity: 'base' });
      }),
    [filteredTools]
  );

  const filteredMaterials = userMaterials.filter(material => {
    const itemMatch = material.item?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const descriptionMatch = material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const nameMatch = material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    return itemMatch || descriptionMatch || nameMatch;
  });

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
        void persistLibrary(updatedTools, userMaterials);
      } else {
        const updatedMaterials = userMaterials.map(material => 
          material.id === itemId ? { ...material, user_photo_url: publicUrl } : material
        );
        setUserMaterials(updatedMaterials);
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({ ...selectedItem, user_photo_url: publicUrl } as UserOwnedMaterial);
        }
        void persistLibrary(userTools, updatedMaterials);
      }

    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const updateItem = (field: string, value: any) => {
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

    scheduleLibraryPersist(updatedTools, updatedMaterials);
  };

  const deleteItem = async () => {
    if (!selectedItem || !user) return;

    const prevTools = userTools;
    const prevMaterials = userMaterials;

    let updatedTools = userTools;
    let updatedMaterials = userMaterials;

    if (selectedType === 'tool') {
      updatedTools = userTools.filter(tool => tool.id !== selectedItem.id);
      setUserTools(updatedTools);
    } else {
      updatedMaterials = userMaterials.filter(material => material.id !== selectedItem.id);
      setUserMaterials(updatedMaterials);
    }

    clearScheduledProfileSave();
    pendingLibraryRef.current = null;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        owned_tools: updatedTools as any,
        owned_materials: updatedMaterials as any,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete from database:', error);
      setUserTools(prevTools);
      setUserMaterials(prevMaterials);
      return;
    }

    setSelectedItem(null);
  };

  const saveItems = async () => {
    if (!user) return;
    clearScheduledProfileSave();
    pendingLibraryRef.current = null;
    await persistLibrary(userTools, userMaterials);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden z-[110]">
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
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <Tabs defaultValue="tools" className="flex-1">
                <TabsList className="grid h-12 w-full grid-cols-[2fr_1fr]">
                  <TabsTrigger value="tools" className="w-full text-sm px-2 py-2">
                    Tools
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="w-full text-sm px-2 py-2">
                    Materials
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tools" className="mt-4 space-y-4 data-[state=inactive]:hidden">
                  {sortedFilteredTools.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No tools in your library yet</p>
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-0.5 py-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2">
                      {sortedFilteredTools.map((tool) => (
                        <button
                          type="button"
                          key={tool.id} 
                          className="group relative flex flex-col items-center gap-0.5 rounded-md p-0 text-center transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          onClick={() => {
                            setSelectedItem(tool);
                            setSelectedType('tool');
                          }}
                        >
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-md bg-primary/10">
                            {(tool.user_photo_url || tool.photo_url) ? (
                              <img 
                                src={tool.user_photo_url || tool.photo_url} 
                                alt={tool.item}
                                className="h-9 w-9 rounded object-cover"
                              />
                            ) : (
                              <Wrench className="h-6 w-6 shrink-0 text-primary" />
                            )}
                            {tool.quantity >= 1 && (
                              <div className="absolute bottom-0 right-0 flex h-4 min-w-[1rem] translate-x-px translate-y-px items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm ring-1 ring-background">
                                {tool.quantity}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-medium leading-[1.15] line-clamp-2">{tool.item}</span>
                        </button>
                      ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="materials" className="mt-4 space-y-4 data-[state=inactive]:hidden">
                  {filteredMaterials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No materials in your library yet</p>
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain px-0.5 py-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2">
                      {filteredMaterials.map((material) => (
                        <button
                          type="button"
                          key={material.id} 
                          className="group relative flex flex-col items-center gap-0.5 rounded-md p-0 text-center transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          onClick={() => {
                            setSelectedItem(material);
                            setSelectedType('material');
                          }}
                        >
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-md bg-accent/10">
                            {(material.user_photo_url || material.photo_url) ? (
                              <img 
                                src={material.user_photo_url || material.photo_url} 
                                alt={material.item}
                                className="h-9 w-9 rounded object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 shrink-0 text-accent-foreground" />
                            )}
                            {material.quantity >= 1 && (
                              <div className="absolute bottom-0 right-0 flex h-4 min-w-[1rem] translate-x-px translate-y-px items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-semibold leading-none text-accent-foreground shadow-sm ring-1 ring-background">
                                {material.quantity}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-medium leading-[1.15] line-clamp-2">{material.item}</span>
                        </button>
                      ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Detail Panel */}
            {selectedItem && (
              <div className="w-full min-w-0 lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 lg:pr-2 px-2 sm:px-3 space-y-4 lg:space-y-6 max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain lg:max-h-full">
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
                    <h3 className="font-semibold text-sm leading-tight break-words">{selectedItem.item}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="min-w-0 py-0.5">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      value={selectedItem.quantity}
                      onChange={(e) => updateItem('quantity', parseInt(e.target.value) || 0)}
                      className="mt-1 w-full max-w-[6.5rem] min-w-0"
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
                    <Label className="text-xs text-muted-foreground mb-2 block">Photos</Label>
                    
                    {/* Admin Library Photo (if exists) */}
                    {selectedItem.photo_url && (
                      <div className="mb-3 p-2 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">From Admin Library</span>
                          <Badge variant="secondary" className="text-[10px]">Reference</Badge>
                        </div>
                        <img 
                          src={selectedItem.photo_url} 
                          alt={`${selectedItem.item} - admin photo`}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                    
                    {/* User's Custom Photo */}
                    {selectedItem.user_photo_url ? (
                      <div className="mb-3 p-2 border rounded-lg bg-primary/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-primary">Your Custom Photo</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateItem('user_photo_url', null)}
                            className="h-6 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <img 
                          src={selectedItem.user_photo_url} 
                          alt={`${selectedItem.item} - your photo`}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mb-2">
                        {selectedItem.photo_url ? 'You can add your own photo too:' : 'No photos yet. Add one:'}
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
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
                      {uploadingPhoto === selectedItem.id ? 'Uploading...' : (selectedItem.user_photo_url ? 'Replace My Photo' : 'Upload My Photo')}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={deleteItem}
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="mb-4 grid h-12 w-full grid-cols-[2fr_1fr]">
                  <TabsTrigger value="tools" className="w-full text-sm px-3 py-2">
                    Tools
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="w-full text-sm px-3 py-2">
                    Materials
                  </TabsTrigger>
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
