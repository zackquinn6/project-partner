import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera, Eye, ShoppingCart, Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { VariationViewer } from "./VariationViewer";

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

interface UserToolsEditorProps {
  initialMode?: 'library' | 'add-tools';
  onBackToLibrary?: () => void;
  onSwitchToAdd?: () => void;
}

export function UserToolsEditor({ initialMode = 'add-tools', onBackToLibrary, onSwitchToAdd }: UserToolsEditorProps = {}) {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [userTools, setUserTools] = useState<UserOwnedTool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewingVariations, setViewingVariations] = useState<Tool | null>(null);
  const [checkingVariations, setCheckingVariations] = useState<Tool | null>(null);
  const [showAddTools, setShowAddTools] = useState(initialMode === 'add-tools');
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
        .order('item');
      
      if (error) throw error;
      setAvailableTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      // Failed to load available tools - no toast needed
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
      // Failed to load your tools - no toast needed
    }
  };

  const filteredTools = availableTools
    .filter(tool => {
      const matchesSearch = tool.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const alreadyOwned = userTools.some(userTool => userTool.id === tool.id);
      
      return matchesSearch && !alreadyOwned;
    })
    .sort((a, b) => a.item.localeCompare(b.item));

  const handleAddTool = async (tool: Tool) => {
    console.log('Adding tool:', tool.item);
    // Always check if this tool has variations first
    try {
      const { data: variations, error } = await supabase
        .from('variation_instances')
        .select('id')
        .eq('core_item_id', tool.id)
        .eq('item_type', 'tools')
        .limit(1);

      if (error) throw error;
      console.log('Variations found:', variations);

      if (variations && variations.length > 0) {
        // Tool has variations, always show variation selector
        console.log('Setting checkingVariations to:', tool);
        setCheckingVariations(tool);
      } else {
        // No variations exist, add the core tool directly
        console.log('No variations, adding directly');
        addTool(tool);
      }
    } catch (error) {
      console.error('Error checking variations:', error);
      // Fallback to direct add if error occurs
      addTool(tool);
    }
  };

  const addTool = (tool: Tool) => {
    const newUserTool: UserOwnedTool = {
      ...tool,
      quantity: 1,
      model_name: '',
      user_photo_url: ''
    };
    setUserTools([...userTools, newUserTool]);
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
      // Photo uploaded successfully - no toast needed
    } catch (error) {
      console.error('Error uploading photo:', error);
      // Failed to upload photo - no toast needed
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
      // Removed toast notification for auto-save failures
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
      // Tools saved successfully - no toast needed
    } catch (error) {
      console.error('Error saving tools:', error);
      // Failed to save tools - no toast needed
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddTools) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Tools to Your Library</h3>
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
      </div>
    );
  }

  // Always show add tools view - library view removed
  return (
    <div className="space-y-4 h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Add Tools to Your Library</h3>
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

      {/* Variation Selection for Adding */}
      {checkingVariations && (
        <VariationViewer
          open={true}
          onOpenChange={() => {
            console.log('VariationViewer onOpenChange called');
            setCheckingVariations(null);
          }}
          coreItemId={checkingVariations.id}
          coreItemName={checkingVariations.item}
          itemType="tools"
          onVariationSelect={(variation) => {
            console.log('Variation selected:', variation);
            // Create a new tool based on the selected variation
            const newUserTool: UserOwnedTool = {
              id: variation.id,
              item: variation.name,
              description: variation.description,
              photo_url: variation.photo_url,
              quantity: 1,
              model_name: variation.sku || '',
              user_photo_url: ''
            };
            setUserTools([...userTools, newUserTool]);
            setCheckingVariations(null);
          }}
        />
      )}

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