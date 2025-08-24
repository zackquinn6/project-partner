import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Upload, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tool {
  id: string;
  item: string;
  description?: string;
  example_models?: string;
  photo_url?: string;
}

interface EnhancedOwnedTool {
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

interface EnhancedOwnedToolsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownedTools: EnhancedOwnedTool[];
  onSave: (tools: EnhancedOwnedTool[]) => void;
}

export default function EnhancedOwnedToolsEditor({ open, onOpenChange, ownedTools, onSave }: EnhancedOwnedToolsEditorProps) {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [userTools, setUserTools] = useState<EnhancedOwnedTool[]>(ownedTools);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTools();
      setUserTools(ownedTools);
    }
  }, [open, ownedTools]);

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('item');

      if (error) throw error;
      setAvailableTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast({
        title: "Error loading tools",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTools = availableTools.filter(tool => {
    const matchesSearch = tool.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === "all" || 
                       (selectedType === "common" && isCommonTool(tool.item));
    
    // Allow adding the same tool multiple times, just check for description uniqueness
    return matchesSearch && matchesType;
  });

  const isCommonTool = (toolName: string) => {
    const commonTools = [
      "hammer", "screwdriver", "drill", "level", "tape measure", 
      "pliers", "wrench", "saw", "utility knife", "safety glasses"
    ];
    return commonTools.some(common => toolName.toLowerCase().includes(common));
  };

  const addTool = (tool: Tool) => {
    const newOwnedTool: EnhancedOwnedTool = {
      ...tool,
      custom_description: "",
      quantity: 1,
      model_name: "",
      user_photo_url: ""
    };
    setUserTools(prev => [...prev, newOwnedTool]);
  };

  const removeTool = (index: number) => {
    setUserTools(prev => prev.filter((_, i) => i !== index));
  };

  const updateTool = (index: number, field: keyof EnhancedOwnedTool, value: string | number) => {
    setUserTools(prev => prev.map((tool, i) => 
      i === index ? { ...tool, [field]: value } : tool
    ));
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    setUploadingPhoto(`${index}`);
    try {
      // Upload to Supabase Storage
      const fileName = `user-tools/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('library-photos')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('library-photos')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        updateTool(index, 'user_photo_url', publicUrlData.publicUrl);
        toast({
          title: "Photo uploaded",
          description: "Tool photo has been updated successfully."
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleSave = () => {
    onSave(userTools);
    onOpenChange(false);
    toast({
      title: "Tools saved",
      description: "Your owned tools have been updated."
    });
  };

  const toolTypes = [
    { value: "all", label: "All Tools" },
    { value: "common", label: "Common Tools" }
  ];

  const canAddMoreOfSameTool = (toolId: string, description: string) => {
    // Allow adding if description is unique among existing tools with same ID
    return !userTools.some(owned => owned.id === toolId && owned.custom_description === description);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Enhanced Tool Library Manager</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Available Tools Panel */}
          <div className="flex-1 space-y-4 flex flex-col">
            <div className="space-y-3 flex-shrink-0">
              <Label className="text-sm font-medium">Add Tools from Library</Label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toolTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading tools...</div>
              ) : filteredTools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || selectedType !== "all" ? "No tools match your search" : "No tools available"}
                </div>
              ) : (
                filteredTools.map(tool => (
                  <Card key={tool.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{tool.item}</div>
                          {tool.description && (
                            <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                          )}
                          {tool.example_models && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Examples: {tool.example_models}
                            </div>
                          )}
                          {userTools.filter(owned => owned.id === tool.id).length > 0 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {userTools.filter(owned => owned.id === tool.id).length} owned
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addTool(tool)}
                          className="ml-3"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Owned Tools Panel */}
          <div className="flex-1 space-y-4 flex flex-col">
            <div className="flex-shrink-0">
              <Label className="text-sm font-medium">Your Owned Tools</Label>
              <div className="text-xs text-muted-foreground mt-1">
                {userTools.length} tool{userTools.length !== 1 ? 's' : ''} in your library
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {userTools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tools in your library yet. Add some from the left panel.
                </div>
              ) : (
                userTools.map((tool, index) => (
                  <Card key={`${tool.id}-${index}`} className="border-primary/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{tool.item}</div>
                          {tool.description && (
                            <div className="text-sm text-muted-foreground">{tool.description}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeTool(index)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={tool.quantity}
                            onChange={(e) => updateTool(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Model Name/Number</Label>
                          <Input
                            placeholder="e.g., DeWalt DCD771C2"
                            value={tool.model_name || ""}
                            onChange={(e) => updateTool(index, 'model_name', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Personal Notes (required for duplicates)</Label>
                        <Textarea
                          placeholder="Add notes about this tool (condition, location, version, etc.)"
                          value={tool.custom_description || ""}
                          onChange={(e) => updateTool(index, 'custom_description', e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Your Photo</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {tool.user_photo_url ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={tool.user_photo_url} 
                                alt={tool.item}
                                className="w-16 h-16 object-cover rounded border"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTool(index, 'user_photo_url', '')}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(index, file);
                                }}
                                className="hidden"
                                id={`photo-${index}`}
                              />
                              <label htmlFor={`photo-${index}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="cursor-pointer"
                                  asChild
                                  disabled={uploadingPhoto === `${index}`}
                                >
                                  <span>
                                    {uploadingPhoto === `${index}` ? (
                                      "Uploading..."
                                    ) : (
                                      <>
                                        <Camera className="w-4 h-4 mr-2" />
                                        Add Photo
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gradient-primary text-white">
            Save Tools ({userTools.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}