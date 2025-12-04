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
import { useDebounce } from "@/hooks/useDebounce";
import { VariationViewer } from "./VariationViewer";

interface Tool {
  id: string;
  name: string;
  description?: string;
  example_models?: string;
  photo_url?: string;
  item?: string;
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
  item?: string;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('owned_tools')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setUserTools((data?.owned_tools as unknown as UserOwnedTool[]) || []);
    } catch (error) {
      console.error('Error fetching user tools:', error);
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
            .from('variation_instances')
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

  // Track when variations have been checked for all tools
  const [variationsChecked, setVariationsChecked] = useState(false);
  
  useEffect(() => {
    // Mark variations as checked once we have tools and the variations map is populated
    // (even if empty, it means we've checked)
    if (availableTools.length > 0) {
      // Check if we've attempted to fetch variations (toolVariations object exists)
      // We consider it "checked" if we have the same number of tool IDs in variations map
      // OR if we've waited long enough for the async fetch to complete
      const hasCheckedAllTools = availableTools.every(tool => 
        toolVariations.hasOwnProperty(tool.id)
      );
      
      if (hasCheckedAllTools || Object.keys(toolVariations).length > 0) {
        setVariationsChecked(true);
      } else {
        // Fallback: mark as checked after a reasonable delay
        const timer = setTimeout(() => {
          setVariationsChecked(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [availableTools, toolVariations]);
  
  const filteredTools = useMemo(() => {
    // If variations haven't been checked yet and we have tools, show all tools that match search
    // This prevents filtering out tools before we know if they have variations
    if (!variationsChecked && availableTools.length > 0) {
      return availableTools
        .filter(tool => {
          const toolName = tool.item || tool.name || '';
          const matchesSearch = toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchesSearch;
        })
        .sort((a, b) => {
          const aName = a.item || a.name || '';
          const bName = b.item || b.name || '';
          return aName.localeCompare(bName);
        });
    }
    
    // Once variations are loaded, apply full filtering logic
    return availableTools
      .filter(tool => {
        const toolName = tool.item || tool.name || '';
        const matchesSearch = toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!matchesSearch) return false;

        // Get all variations for this core tool
        const variations = toolVariations[tool.id] || [];
        
        // If tool has no variations, check if core tool itself is owned
        if (variations.length === 0) {
          const coreToolOwned = userTools.some(userTool => userTool.id === tool.id);
          return !coreToolOwned;
        }
        
        // If tool has variations, check if ALL variations are owned
        // Create a fresh set each time to ensure we have the latest userTools state
        const ownedVariationIds = new Set(userTools.map(userTool => userTool.id));
        const allVariationsOwned = variations.every(variation => 
          ownedVariationIds.has(variation.id)
        );
        
        // Also check if the core tool itself is owned (for tools that have both core and variations)
        const coreToolOwned = ownedVariationIds.has(tool.id);
        
        // Show tool only if:
        // 1. Not all variations are owned AND
        // 2. The core tool itself is not owned
        return !allVariationsOwned && !coreToolOwned;
      })
      .sort((a, b) => {
        const aName = a.item || a.name || '';
        const bName = b.item || b.name || '';
        return aName.localeCompare(bName);
      });
  }, [availableTools, searchTerm, toolVariations, userTools, variationsChecked]);

  const handleAddTool = async (tool: Tool) => {
    // Set loading state for this specific tool
    setAddingToolId(tool.id);
    
    try {
      // Always check if this tool has variations first
      const { data: variations, error } = await supabase
        .from('variation_instances')
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
    const newUserTool: UserOwnedTool = {
      ...tool,
      quantity: 1,
      model_name: '',
      user_photo_url: ''
    };
    const updatedTools = [...userTools, newUserTool];
    setUserTools(updatedTools);
    
    // Save to database immediately in background
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ owned_tools: updatedTools as any })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Failed to save tool:', error);
        } else {
          window.dispatchEvent(new CustomEvent('tools-library-updated'));
        }
      } catch (error) {
        console.error('Error saving tool:', error);
      }
    }
  };

  const removeTool = (toolId: string) => {
    setUserTools(userTools.filter(tool => tool.id !== toolId));
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
        .from('profiles')
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
        .from('profiles')
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
        .from('profiles')
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
              console.log('Back to My Tools clicked');
              // Save tools before closing
              if (user && userTools.length > 0) {
                try {
                  const { error } = await supabase
                    .from('profiles')
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
            Back to My Tools
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
            {filteredTools.map((tool) => (
              <Card key={tool.id} className="p-4">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{tool.item}</h4>
                      </div>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                      )}
                      {tool.example_models && (
                        <p className="text-xs text-muted-foreground">Examples: {tool.example_models}</p>
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
                // Check if this variation is already in the user's tools
                const isDuplicate = userTools.some(userTool => userTool.id === variation.id);
                if (isDuplicate) {
                  return;
                }
                
                // Create a new tool based on the selected variation
                const newUserTool: UserOwnedTool = {
                  id: variation.id,
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
                    .from('profiles')
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
                    .from('profiles')
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
            Back to My Tools
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
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="p-4">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium truncate">{tool.item}</h4>
                  </div>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                  )}
                  {tool.example_models && (
                    <p className="text-xs text-muted-foreground">Examples: {tool.example_models}</p>
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
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
            </div>
          </Card>
        ))}
        
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