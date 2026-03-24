import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera, Eye, ShoppingCart, Save, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { VariationViewer } from "./VariationViewer";

interface Tool {
  id: string;
  name: string;
  description?: string;
  photo_url?: string;
  item?: string;
  specialty_scale?: number;
}

interface UserOwnedTool {
  id: string;           // user_tools row id (or legacy: catalog / variation id in owned_tools JSON)
  tool_id: string;      // core tools.id
  name: string;
  /** Display label — synced with name when loaded from user_tools */
  item?: string;
  description?: string;
  custom_description?: string;
  quantity: number;
  model_name?: string;
  user_photo_url?: string;
  photo_url?: string;
}

interface UserToolsEditorProps {
  initialMode?: 'library' | 'add-tools';
  onBackToLibrary?: () => void;
  onSwitchToAdd?: () => void;
}

export function UserToolsEditor({ initialMode = 'library', onBackToLibrary, onSwitchToAdd }: UserToolsEditorProps = {}) {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [userTools, setUserTools] = useState<UserOwnedTool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewingVariations, setViewingVariations] = useState<Tool | null>(null);
  const [checkingVariations, setCheckingVariations] = useState<Tool | null>(null);
  const [showAddTools, setShowAddTools] = useState(initialMode === 'add-tools');
  const [addingToolId, setAddingToolId] = useState<string | null>(null);
  const { user } = useAuth();

  // Update showAddTools when initialMode changes
  useEffect(() => {
    setShowAddTools(initialMode === 'add-tools');
  }, [initialMode]);

  // Debounce user tools for auto-save
  const debouncedUserTools = useDebounce(userTools, 2000);

  useEffect(() => {
    if (user) {
      fetchAvailableTools();
      fetchUserTools();
    }
  }, [user]);

  // Window close auto-save
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && userTools.length > 0) {
        navigator.sendBeacon('/api/save-tools', JSON.stringify({
          userId: user.id,
          tools: userTools
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, userTools]);

  const fetchAvailableTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('name', { ascending: true, nullsFirst: false });
      
      if (error) {
        console.error('Error fetching tools:', error);
        // Fallback: try ordering by 'item' if 'name' doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tools')
          .select('*')
          .order('item', { ascending: true, nullsFirst: false });
        
        if (fallbackError) {
          throw fallbackError;
        }
        setAvailableTools(fallbackData || []);
        return;
      }
      
      // Map 'name' to 'item' for backward compatibility if needed
      const mappedData = (data || []).map(tool => ({
        ...tool,
        item: tool.name || tool.item || ''
      }));
      
      setAvailableTools(mappedData);
      console.log('✅ Fetched available tools:', mappedData.length);
    } catch (error) {
      console.error('Error fetching tools:', error);
    }
  };

  const fetchUserTools = async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('owned_tools')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('UserToolsEditor: owned_tools fetch', profileError);
      }

      const fromProfileRaw = profile?.owned_tools;
      const fromProfile: UserOwnedTool[] = Array.isArray(fromProfileRaw)
        ? (fromProfileRaw as UserOwnedTool[]).map((t) => ({
            ...t,
            item: t.item ?? t.name ?? '',
          }))
        : [];

      const { data, error } = await supabase
        .from('user_tools')
        .select('id, tool_id, name, description, model_name, quantity, user_photo_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fromTableRaw: UserOwnedTool[] = ((data as UserOwnedTool[]) || []).map((row) => ({
        ...row,
        item: row.item ?? row.name ?? '',
      }));

      // Resolve default linked photos from canonical tables (do not copy binaries):
      // - core tools.photo_url by tool_id
      // - tool_variations.photo_url by core_item_id + model/name match where possible
      const uniqueToolIds = Array.from(new Set(fromTableRaw.map(r => r.tool_id).filter(Boolean)));
      const [corePhotosRes, variationPhotosRes] = await Promise.all([
        uniqueToolIds.length > 0
          ? supabase
              .from('tools')
              .select('id, photo_url')
              .in('id', uniqueToolIds)
          : Promise.resolve({ data: [], error: null } as any),
        uniqueToolIds.length > 0
          ? supabase
              .from('tool_variations')
              .select('core_item_id, name, sku, photo_url')
              .eq('item_type', 'tools')
              .in('core_item_id', uniqueToolIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (corePhotosRes.error) throw corePhotosRes.error;
      if (variationPhotosRes.error) throw variationPhotosRes.error;

      const corePhotoById = new Map<string, string | null>(
        (corePhotosRes.data || []).map((r: any) => [r.id, r.photo_url || null])
      );
      const variationsByCore = new Map<string, any[]>();
      for (const v of variationPhotosRes.data || []) {
        const list = variationsByCore.get(v.core_item_id) || [];
        list.push(v);
        variationsByCore.set(v.core_item_id, list);
      }

      const fromTable: UserOwnedTool[] = fromTableRaw.map((row) => {
        const variations = variationsByCore.get(row.tool_id) || [];
        const matchedVariation = variations.find((v: any) =>
          (row.model_name && v.sku && row.model_name.toLowerCase().trim() === String(v.sku).toLowerCase().trim()) ||
          (row.name && v.name && row.name.toLowerCase().trim() === String(v.name).toLowerCase().trim())
        );
        const linkedPhotoUrl = matchedVariation?.photo_url || corePhotoById.get(row.tool_id) || null;

        return {
          ...row,
          // Prefer user override; otherwise use linked canonical photo URL.
          photo_url: row.user_photo_url ? row.photo_url : linkedPhotoUrl || row.photo_url,
        };
      });

      // Variation picks are stored on owned_tools with variation id; user_tools rows use row UUID.
      // Merge by id so the add-list can see every owned variation and core rows from user_tools.
      const byId = new Map<string, UserOwnedTool>();
      for (const t of fromProfile) {
        if (t?.id != null && String(t.id).length > 0) {
          byId.set(String(t.id), t);
        }
      }
      for (const t of fromTable) {
        if (t?.id != null && String(t.id).length > 0) {
          const k = String(t.id);
          const prev = byId.get(k);
          byId.set(k, { ...prev, ...t, item: t.item ?? t.name ?? '', tool_id: t.tool_id });
        }
      }

      const merged = Array.from(byId.values()).map((tool) => {
        if (tool.user_photo_url) return tool;

        // Ensure profile-only/legacy rows also resolve a linked canonical photo when possible.
        if (tool.tool_id && !tool.photo_url) {
          const variations = variationsByCore.get(tool.tool_id) || [];
          const matchedVariation = variations.find((v: any) =>
            (tool.model_name && v.sku && tool.model_name.toLowerCase().trim() === String(v.sku).toLowerCase().trim()) ||
            (tool.name && v.name && tool.name.toLowerCase().trim() === String(v.name).toLowerCase().trim())
          );
          const linkedPhotoUrl = matchedVariation?.photo_url || corePhotoById.get(tool.tool_id) || null;
          return { ...tool, photo_url: linkedPhotoUrl || tool.photo_url };
        }

        return tool;
      });
      console.log('✅ UserToolsEditor - Merged library tools:', {
        count: merged.length,
        fromProfile: fromProfile.length,
        fromTable: fromTable.length,
      });

      setUserTools(merged);
    } catch (error) {
      console.error('❌ UserToolsEditor - Error fetching user tools:', error);
    }
  };

  const [toolVariations, setToolVariations] = useState<Record<string, any[]>>({});

  // Fetch variations for all tools to properly filter
  useEffect(() => {
    const fetchToolVariations = async () => {
      if (availableTools.length === 0) return;
      
      const variationsMap: Record<string, any[]> = {};
      
      try {
        for (const tool of availableTools) {
          const { data: variations } = await supabase
            .from('tool_variations')
            .select('*')
            .eq('core_item_id', tool.id)
            .eq('item_type', 'tools');
          
          variationsMap[tool.id] = variations || [];
        }
        setToolVariations(variationsMap);
      } catch (error) {
        console.error('Error fetching variations:', error);
      }
    };

    fetchToolVariations();
  }, [availableTools]);

  /** Catalog core tool already in library (user_tools.tool_id or legacy id on profile JSON). */
  const userOwnsCatalogTool = useCallback(
    (catalogToolId: string) =>
      userTools.some((ut) => ut.tool_id === catalogToolId || ut.id === catalogToolId),
    [userTools]
  );

  /** Specific tool_variations row already in library (owned_tools uses variation id as entry id). */
  const userOwnsVariationId = useCallback(
    (variationId: string) => userTools.some((ut) => ut.id === variationId),
    [userTools]
  );

  const filteredTools = useMemo(() => {
    return availableTools
      .filter((tool) => {
        const toolName = tool.item || tool.name || '';
        const matchesSearch =
          toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // Variation map not loaded yet for this catalog id — avoid duplicate core adds only
        if (!Object.prototype.hasOwnProperty.call(toolVariations, tool.id)) {
          return !userOwnsCatalogTool(tool.id);
        }

        const variations = toolVariations[tool.id] || [];

        if (variations.length === 0) {
          return !userOwnsCatalogTool(tool.id);
        }

        // Keep in add list until every variation has been added (by variation row id).
        const allVariationsOwned = variations.every((v) => userOwnsVariationId(v.id));
        return !allVariationsOwned;
      })
      .sort((a, b) => {
        const aName = a.item || a.name || '';
        const bName = b.item || b.name || '';
        return aName.localeCompare(bName);
      });
  }, [availableTools, searchTerm, toolVariations, userTools, userOwnsCatalogTool, userOwnsVariationId]);

  const { commonTools, otherTools } = useMemo(() => {
    const scale = (t: Tool) => t.specialty_scale ?? 2;
    const common = filteredTools.filter((t) => scale(t) === 1);
    const other = filteredTools.filter((t) => scale(t) !== 1);
    return { commonTools: common, otherTools: other };
  }, [filteredTools]);

  const handleAddTool = async (tool: Tool) => {
    // Set loading state for this specific tool
    setAddingToolId(tool.id);
    
    try {
      // Always check if this tool has variations first (from unified tool_variations table)
      const { data: variations, error } = await supabase
        .from('tool_variations')
        .select('id')
        .eq('core_item_id', tool.id)
        .eq('item_type', 'tools')
        .limit(1);

      if (error) throw error;

      if (variations && variations.length > 0) {
        // Tool has variations, always show variation selector
        setCheckingVariations(tool);
      } else {
        // No variations exist, add the core tool directly
        await addToolAsync(tool);
      }
    } catch (error) {
      console.error('Error checking variations:', error);
      // Fallback to direct add if error occurs
      await addToolAsync(tool);
    } finally {
      setAddingToolId(null);
    }
  };

  const addToolAsync = async (tool: Tool) => {
    if (!user) return;

    try {
      console.log('💾 UserToolsEditor - Inserting tool into user_tools:', {
        userId: user.id,
        toolId: tool.id,
        toolName: tool.name || tool.item
      });

      const { data, error } = await supabase
        .from('user_tools')
        .insert({
          user_id: user.id,
          tool_id: tool.id,
          name: tool.name || tool.item || '',
          description: tool.description,
          model_name: '',
          quantity: 1
        })
        .select('id, tool_id, name, description, model_name, quantity, user_photo_url')
        .single();

      if (error) {
        console.error('❌ Failed to save tool to user_tools:', error);
        toast.error(error.message || 'Could not add tool to your library.');
        return;
      }

      const row = data as UserOwnedTool;
      const newUserTool: UserOwnedTool = {
        ...row,
        item: row.name,
        photo_url: tool.photo_url,
      };
      const updatedTools = [...userTools, newUserTool];
      setUserTools(updatedTools);

      // ToolsMaterialsLibraryView and other UIs read owned_tools on user_profiles — keep in sync.
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ owned_tools: updatedTools as any })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('❌ Failed to sync owned_tools after user_tools insert:', profileError);
        toast.error(profileError.message || 'Tool saved but profile library sync failed.');
      }

      window.dispatchEvent(new CustomEvent('tools-library-updated'));
    } catch (error) {
      console.error('❌ Error saving tool to user_tools:', error);
      toast.error('Could not add tool to your library.');
    }
  };

  const removeTool = async (rowId: string) => {
    if (!user) return;
    const next = userTools.filter((tool) => tool.id !== rowId);
    const { error: delError } = await supabase
      .from('user_tools')
      .delete()
      .eq('id', rowId)
      .eq('user_id', user.id);

    if (delError) {
      console.error('Failed to remove tool from user_tools:', delError);
      toast.error(delError.message || 'Could not remove tool.');
      return;
    }

    setUserTools(next);

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ owned_tools: next as any })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Failed to sync owned_tools after remove:', profileError);
      toast.error(profileError.message || 'Removed tool but profile sync failed.');
    }

    window.dispatchEvent(new CustomEvent('tools-library-updated'));
  };

  // Immediate save on field changes
  const handleFieldUpdate = (toolId: string, field: keyof UserOwnedTool, value: any) => {
    const updatedTools = userTools.map(tool => 
      tool.id === toolId ? { ...tool, [field]: value } : tool
    );
    setUserTools(updatedTools);
    
    // Trigger immediate save
    if (user) {
      supabase
        .from('user_profiles')
        .update({ owned_tools: updatedTools as any })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Auto-save failed:', error);
        });
    }
  };

  const updateTool = (toolId: string, field: keyof UserOwnedTool, value: any) => {
    setUserTools(userTools.map(tool => 
      tool.id === toolId ? { ...tool, [field]: value } : tool
    ));
  };

  const handlePhotoUpload = async (toolId: string, file: File) => {
    if (!user) return;
    
    setUploadingPhoto(toolId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${toolId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-photos')
        .getPublicUrl(fileName);

      updateTool(toolId, 'user_photo_url', publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const autoSaveTools = useCallback(async () => {
    if (!user || userTools.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ owned_tools: userTools as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error auto-saving tools:', error);
    }
  }, [user, userTools]);

  const saveTools = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ owned_tools: userTools as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddTools) {
    return (
      <>
        <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Tools to Your Library</h3>
          <Button 
            variant="outline" 
            onClick={async () => {
              console.log('Back to My Library clicked');
              // Save tools before closing
              if (user && userTools.length > 0) {
                try {
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({ owned_tools: userTools as any })
                    .eq('user_id', user.id);
                  
                  if (error) {
                    console.error('Failed to save tools:', error);
                  } else {
                    console.log('Tools saved successfully');
                  }
                } catch (error) {
                  console.error('Error saving tools:', error);
                }
              }
              
              // Dispatch event to refresh library grid
              window.dispatchEvent(new CustomEvent('tools-library-updated'));
              
              // Use callback to return to library view
              if (onBackToLibrary) {
                onBackToLibrary();
              }
            }}
          >
            Back to My Library
          </Button>
        </div>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search available tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {commonTools.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Common tools</Label>
                {commonTools.map((tool) => (
                  <Card key={tool.id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{tool.item}</h4>
                        </div>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tool.photo_url && (
                          <img
                            src={tool.photo_url}
                            alt={tool.item}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAddTool(tool)}
                          className="flex-shrink-0"
                          disabled={addingToolId === tool.id}
                        >
                          {addingToolId === tool.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {otherTools.length > 0 && (
              <div className="space-y-2">
                {commonTools.length > 0 && (
                  <Label className="text-sm font-semibold text-muted-foreground">All tools</Label>
                )}
                {otherTools.map((tool) => (
                  <Card key={tool.id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{tool.item}</h4>
                        </div>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tool.photo_url && (
                          <img
                            src={tool.photo_url}
                            alt={tool.item}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleAddTool(tool)}
                          className="flex-shrink-0"
                          disabled={addingToolId === tool.id}
                        >
                          {addingToolId === tool.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {filteredTools.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No tools found matching your search" : "All available tools have been added to your library"}
              </div>
            )}
          </div>
        </div>

        {/* Variation Selection for Adding - MOVED INSIDE showAddTools block */}
        {checkingVariations ? (
          <div>
            <VariationViewer
              open={true}
              onOpenChange={() => {
                setCheckingVariations(null);
              }}
              coreItemId={checkingVariations.id}
              coreItemName={checkingVariations.item}
              itemType="tools"
              onVariationSelect={(variation) => {
                if (userOwnsVariationId(variation.id)) {
                  return;
                }

                const coreId = checkingVariations.id;
                const newUserTool: UserOwnedTool = {
                  id: variation.id,
                  tool_id: coreId,
                  name: variation.name,
                  item: variation.name,
                  description: variation.description,
                  photo_url: variation.photo_url,
                  quantity: 1,
                  model_name: variation.sku || '',
                  user_photo_url: ''
                };
                const updatedTools = [...userTools, newUserTool];
                setUserTools(updatedTools);
                
                // Save to database immediately
                if (user) {
                  supabase
                    .from('user_profiles')
                    .update({ owned_tools: updatedTools as any })
                    .eq('user_id', user.id)
                    .then(({ error }) => {
                      if (error) {
                        console.error('Failed to save tool to database:', error);
                      } else {
                        // Dispatch event to refresh library view
                        window.dispatchEvent(new CustomEvent('tools-library-updated'));
                      }
                    });
                }
                
                // Check if all variants are now owned - if so, close the window
                const currentToolVariations = toolVariations[checkingVariations?.id || ''] || [];
                const updatedOwnedIds = new Set([...userTools.map(t => t.id), variation.id]);
                const allVariationsNowOwned = currentToolVariations.every(v => 
                  updatedOwnedIds.has(v.id)
                );
                
                if (allVariationsNowOwned) {
                  setCheckingVariations(null);
                }
                // If not all owned, keep the window open for more selections
              }}
              ownedVariationIds={new Set(userTools.map(userTool => userTool.id))}
            />
          </div>
        ) : null}
      </>
    );
  }

  // Show library view when not in add-tools mode
  if (!showAddTools) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">My Tools Library</h3>
          <Button 
            onClick={() => {
              if (onSwitchToAdd) {
                onSwitchToAdd();
              } else {
                setShowAddTools(true);
              }
            }}
            className="w-8 h-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {userTools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tools in your library yet.</p>
              <p className="text-sm mt-2">Click "Add Tools" to get started!</p>
            </div>
          ) : (
            userTools.map((tool) => (
              <Card key={tool.id} className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{tool.item}</h4>
                      <Badge variant="secondary">Qty: {tool.quantity}</Badge>
                    </div>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                    )}
                    {tool.custom_description && (
                      <p className="text-sm text-primary mb-2">
                        <strong>My Notes:</strong> {tool.custom_description}
                      </p>
                    )}
                    {tool.model_name && (
                      <p className="text-xs text-muted-foreground">Model: {tool.model_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(tool.user_photo_url || tool.photo_url) && (
                      <img 
                        src={tool.user_photo_url || tool.photo_url} 
                        alt={tool.item}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeTool(tool.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Always show add tools view - library view removed
  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Add Tools to Your Library</h3>
          <Button 
            variant="outline" 
            onClick={async () => {
              // Save tools before closing
              if (user && userTools.length > 0) {
                try {
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({ owned_tools: userTools as any })
                    .eq('user_id', user.id);
                  
                  if (error) {
                    console.error('Failed to save tools:', error);
                  }
                } catch (error) {
                  console.error('Error saving tools:', error);
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
                setShowAddTools(false);
              }
            }}
          >
            Back to My Library
          </Button>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search available tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {commonTools.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-muted-foreground">Common tools</Label>
            {commonTools.map((tool) => (
              <Card key={tool.id} className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{tool.item}</h4>
                    </div>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tool.photo_url && (
                      <img
                        src={tool.photo_url}
                        alt={tool.item}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAddTool(tool)}
                      className="flex-shrink-0"
                      disabled={addingToolId === tool.id}
                    >
                      {addingToolId === tool.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {otherTools.length > 0 && (
          <div className="space-y-2">
            {commonTools.length > 0 && (
              <Label className="text-sm font-semibold text-muted-foreground">All tools</Label>
            )}
            {otherTools.map((tool) => (
              <Card key={tool.id} className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{tool.item}</h4>
                    </div>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tool.photo_url && (
                      <img
                        src={tool.photo_url}
                        alt={tool.item}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAddTool(tool)}
                      className="flex-shrink-0"
                      disabled={addingToolId === tool.id}
                    >
                      {addingToolId === tool.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No tools found matching your search" : "All available tools have been added to your library"}
          </div>
        )}
      </div>

      {/* Variations Viewer for Information Only */}
      {viewingVariations && (
        <VariationViewer
          open={!!viewingVariations}
          onOpenChange={() => setViewingVariations(null)}
          coreItemId={viewingVariations.id}
          coreItemName={viewingVariations.item}
          itemType="tools"
        />
      )}
    </div>
  );
}