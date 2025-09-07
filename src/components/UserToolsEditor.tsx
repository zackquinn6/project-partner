import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera, Eye, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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

export function UserToolsEditor() {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [userTools, setUserTools] = useState<UserOwnedTool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [viewingVariations, setViewingVariations] = useState<Tool | null>(null);
  const [showAddTools, setShowAddTools] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAvailableTools();
      fetchUserTools();
    }
  }, [user]);

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
      toast({ title: "Error", description: "Failed to load available tools", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to load your tools", variant: "destructive" });
    }
  };

  const filteredTools = availableTools.filter(tool => {
    const matchesSearch = tool.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const alreadyOwned = userTools.some(userTool => userTool.id === tool.id);
    
    return matchesSearch && !alreadyOwned;
  });

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
      toast({ title: "Success", description: "Photo uploaded successfully" });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const saveTools = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ owned_tools: userTools as any })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Your tools have been saved" });
    } catch (error) {
      console.error('Error saving tools:', error);
      toast({ title: "Error", description: "Failed to save tools", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddTools) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Tools to Your Library</h3>
          <Button variant="outline" onClick={() => setShowAddTools(false)}>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingVariations(tool)}
                      className="flex-shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Variations
                    </Button>
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
                    onClick={() => addTool(tool)}
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

  return (
    <div className="space-y-4 h-full">
      {/* User's Tools Panel */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My Tools Library ({userTools.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddTools(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add Tools
          </Button>
          <Button onClick={saveTools} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {userTools.map((tool) => (
          <Card key={tool.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{tool.item}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTool(tool.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`quantity-${tool.id}`}>Quantity</Label>
                  <Input
                    id={`quantity-${tool.id}`}
                    type="number"
                    min="1"
                    value={tool.quantity}
                    onChange={(e) => updateTool(tool.id, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor={`model-${tool.id}`}>Model/Brand</Label>
                  <Input
                    id={`model-${tool.id}`}
                    value={tool.model_name || ''}
                    onChange={(e) => updateTool(tool.id, 'model_name', e.target.value)}
                    placeholder="e.g., DeWalt DCD771C2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`description-${tool.id}`}>Personal Notes</Label>
                <Textarea
                  id={`description-${tool.id}`}
                  value={tool.custom_description || ''}
                  onChange={(e) => updateTool(tool.id, 'custom_description', e.target.value)}
                  placeholder="Add your own notes about this tool..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Your Photo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(tool.id, file);
                      }}
                      className="hidden"
                      id={`photo-${tool.id}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById(`photo-${tool.id}`)?.click()}
                      disabled={uploadingPhoto === tool.id}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingPhoto === tool.id ? "Uploading..." : "Add Photo"}
                    </Button>
                  </div>
                </div>
                {(tool.user_photo_url || tool.photo_url) && (
                  <img 
                    src={tool.user_photo_url || tool.photo_url} 
                    alt={tool.item}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}

        {userTools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No tools in your library yet</h3>
            <p className="mb-4">Start building your tool collection by adding from our catalog.</p>
            <Button onClick={() => setShowAddTools(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Tool
            </Button>
          </div>
        )}
      </div>

      {/* Variations Viewer */}
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