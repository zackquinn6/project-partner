import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, EyeOff, ExternalLink, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Project, Material, Tool } from "@/interfaces/Project";
import { supabase } from "@/integrations/supabase/client";

interface OrderingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  userOwnedTools: string[];
  onOrderingComplete?: () => void;
}

interface ShoppingSite {
  name: string;
  url: string;
  color: string;
}

const SHOPPING_SITES: ShoppingSite[] = [
  { name: "Lowe's", url: "https://lowes.com", color: "bg-blue-600 hover:bg-blue-700" },
  { name: "Floor & Decor", url: "https://flooranddecor.com", color: "bg-orange-600 hover:bg-orange-700" },
  { name: "Wayfair", url: "https://wayfair.com", color: "bg-purple-600 hover:bg-purple-700" },
  { name: "Amazon", url: "https://amazon.com", color: "bg-yellow-600 hover:bg-yellow-700" },
  { name: "Toolio.us", url: "https://toolio.us", color: "bg-green-600 hover:bg-green-700" },
];

export function OrderingWindow({ open, onOpenChange, project, userOwnedTools, onOrderingComplete }: OrderingWindowProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(SHOPPING_SITES[0].url);
  const [urlInput, setUrlInput] = useState<string>("");
  const [checklistVisible, setChecklistVisible] = useState(true);
  const [orderedTools, setOrderedTools] = useState<Set<string>>(new Set());
  const [orderedMaterials, setOrderedMaterials] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleNavigateToUrl = () => {
    let url = urlInput.trim();
    if (!url) return;
    
    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    setCurrentUrl(url);
    setUrlInput("");
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigateToUrl();
    }
  };

  // Fetch user profile to get owned tools
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('owned_tools')
            .eq('user_id', user.id)
            .single();
          
          if (!error && data) {
            setUserProfile(data);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (open) {
      fetchUserProfile();
    }
  }, [open]);

  // Extract all tools and materials from project using rollup logic
  const projectRollup = React.useMemo(() => {
    if (!project) return { materials: [], tools: [] };
    
    const materialsMap = new Map<string, any>();
    const toolsMap = new Map<string, any>();
    
    // Ensure phases is an array before iterating
    if (!project.phases || !Array.isArray(project.phases)) {
      return { materials: [], tools: [] };
    }
    
    project.phases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          // Process materials
          step.materials.forEach(material => {
            const key = material.id;
            if (!materialsMap.has(key)) {
              materialsMap.set(key, {
                id: material.id,
                name: material.name,
                description: material.description,
                category: material.category,
                required: material.required
              });
            }
          });

          // Process tools
          step.tools.forEach(tool => {
            const key = tool.id;
            if (!toolsMap.has(key)) {
              toolsMap.set(key, {
                id: tool.id,
                name: tool.name,
                description: tool.description,
                category: tool.category,
                required: tool.required
              });
            }
          });
        });
      });
    });
    
    return {
      materials: Array.from(materialsMap.values()),
      tools: Array.from(toolsMap.values())
    };
  }, [project]);

  const uniqueTools = projectRollup.tools;
  const uniqueMaterials = projectRollup.materials;

  // Auto-check tools that user already owns
  useEffect(() => {
    const ownedToolIds = new Set<string>();
    uniqueTools.forEach(tool => {
      const ownedTools = userProfile?.owned_tools || [];
      if (ownedTools.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name)) {
        ownedToolIds.add(tool.id);
      }
    });
    setOrderedTools(ownedToolIds);
  }, [uniqueTools, userProfile]);

  const handleToolToggle = (toolId: string) => {
    setOrderedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const handleMaterialToggle = (materialId: string) => {
    setOrderedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const allItemsOrdered = uniqueTools.every(tool => orderedTools.has(tool.id)) &&
                          uniqueMaterials.every(material => orderedMaterials.has(material.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Tool & Material Ordering
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex h-[calc(95vh-120px)]">
          {/* Main Browser Area */}
          <div className="flex-1 flex flex-col border-r">
            {/* Navigation Bar */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChecklistVisible(!checklistVisible)}
                  className="flex items-center gap-2"
                >
                  {checklistVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {checklistVisible ? 'Hide' : 'Show'} Checklist
                </Button>
                
                <div className="flex-1" />
                
                {allItemsOrdered && onOrderingComplete && (
                  <Button
                    onClick={onOrderingComplete}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete Ordering
                  </Button>
                )}
              </div>
              
              {/* Shopping Site Buttons */}
              <div className="flex gap-2 flex-wrap mb-4">
                {SHOPPING_SITES.map((site) => (
                  <div key={site.name} className="flex gap-1">
                    <Button
                      onClick={() => setCurrentUrl(site.url)}
                      className={`${site.color} text-white flex items-center gap-2`}
                      size="sm"
                    >
                      {site.name}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(site.url, '_blank')}
                      className="px-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Custom URL Input */}
              <div className="flex gap-2 items-center">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter any website URL (e.g., homedepot.com)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleUrlKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleNavigateToUrl}
                  variant="outline"
                  size="sm"
                  disabled={!urlInput.trim()}
                >
                  Go
                </Button>
              </div>
            </div>
            
            {/* Browser iframe */}
            <div className="flex-1 bg-white flex flex-col">
              <div className="p-4 bg-muted/50 border-b text-sm text-muted-foreground">
                Note: Some websites may not load in embedded view due to security restrictions. 
                Click the site buttons to open in new tabs if needed.
              </div>
              <div className="flex-1 relative">
                <iframe
                  src={currentUrl}
                  className="w-full h-full border-0"
                  title="Shopping Browser"
                  onError={() => {
                    // Handle iframe loading errors
                    console.warn('Iframe failed to load:', currentUrl);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Checklist Sidebar */}
          {checklistVisible && (
            <div className="w-80 flex flex-col bg-background border-l">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Shopping Checklist</h3>
                <p className="text-sm text-muted-foreground">
                  Check off items as you order them
                </p>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Tools Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        Tools
                        <Badge variant="secondary">
                          {orderedTools.size}/{uniqueTools.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                      <CardContent className="space-y-3">
                        {uniqueTools.length > 0 ? uniqueTools.map((tool) => {
                          const isOrdered = orderedTools.has(tool.id);
                          
                          return (
                            <div key={tool.id} className="flex items-start gap-3">
                              <Checkbox
                                checked={isOrdered}
                                onCheckedChange={() => handleToolToggle(tool.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{tool.name}</p>
                                  {(userProfile?.owned_tools || []).some((ownedTool: any) => 
                                    ownedTool.tool === tool.name || ownedTool.name === tool.name
                                  ) && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      Owned
                                    </Badge>
                                  )}
                                </div>
                                {tool.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {tool.description}
                                  </p>
                                )}
                                {tool.required && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No tools defined for this project</p>
                            <p className="text-xs mt-1">You can still use the shopping sites to browse for tools</p>
                          </div>
                        )}
                      </CardContent>
                  </Card>

                  <Separator />

                  {/* Materials Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        Materials
                        <Badge variant="secondary">
                          {orderedMaterials.size}/{uniqueMaterials.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-3">
                       {uniqueMaterials.length > 0 ? uniqueMaterials.map((material) => {
                         const isOrdered = orderedMaterials.has(material.id);
                         
                         return (
                           <div key={material.id} className="flex items-start gap-3">
                             <Checkbox
                               checked={isOrdered}
                               onCheckedChange={() => handleMaterialToggle(material.id)}
                               className="mt-1"
                             />
                             <div className="flex-1 min-w-0">
                               <p className="font-medium text-sm">{material.name}</p>
                               {material.description && (
                                 <p className="text-xs text-muted-foreground mt-1">
                                   {material.description}
                                 </p>
                               )}
                               {material.required && (
                                 <Badge variant="destructive" className="text-xs mt-1">
                                   Required
                                 </Badge>
                               )}
                             </div>
                           </div>
                         );
                       }) : (
                         <div className="text-center py-4 text-muted-foreground">
                           <p className="text-sm">No materials defined for this project</p>
                           <p className="text-xs mt-1">You can still use the shopping sites to browse for materials</p>
                         </div>
                       )}
                     </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}