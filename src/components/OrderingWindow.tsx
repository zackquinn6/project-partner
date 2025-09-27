import React, { useState, useEffect } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, EyeOff, ExternalLink, Globe, Check, Maximize, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Project, Material, Tool } from "@/interfaces/Project";
import { supabase } from "@/integrations/supabase/client";
import { addStandardPhasesToProjectRun } from '@/utils/projectUtils';
import { useResponsive } from "@/hooks/useResponsive";

interface OrderingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  projectRun?: any; // ProjectRun object as fallback
  userOwnedTools: any[];
  completedSteps?: Set<string>;
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

export function OrderingWindow({ open, onOpenChange, project, projectRun, userOwnedTools, completedSteps, onOrderingComplete }: OrderingWindowProps) {
  const [urlInput, setUrlInput] = useState<string>("");
  const [orderedTools, setOrderedTools] = useState<Set<string>>(new Set());
  const [orderedMaterials, setOrderedMaterials] = useState<Set<string>>(new Set());
  const [shoppedTools, setShoppedTools] = useState<Set<string>>(new Set());
  const [shoppedMaterials, setShoppedMaterials] = useState<Set<string>>(new Set());
  const [showShopped, setShowShopped] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);

  const handleGoogleSearch = () => {
    const query = urlInput.trim();
    if (!query) return;
    
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(googleSearchUrl, '_blank');
    setUrlInput("");
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoogleSearch();
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

  // Extract all tools and materials from project using rollup logic with proper aggregation
  const projectRollup = React.useMemo(() => {
    const activeProject = project || projectRun;
    if (!activeProject) {
      return { materials: [], tools: [] };
    }
    
    // Get processed phases including standard phases for complete tool/material list
    const processedPhases = addStandardPhasesToProjectRun(activeProject.phases || []);
    
    // For materials: count total quantity needed (sum across all steps)
    const materialsMap = new Map<string, any>();
    // For tools: track max quantity needed in any single step
    const toolsMap = new Map<string, any>();
    
    processedPhases.forEach((phase, phaseIndex) => {
      if (!phase.operations || !Array.isArray(phase.operations)) {
        return;
      }
      
      phase.operations.forEach((operation, opIndex) => {
        if (!operation.steps || !Array.isArray(operation.steps)) {
          return;
        }
        
        operation.steps.forEach((step, stepIndex) => {
          // Include materials/tools from ALL steps for the shopping cart
          // The ordering step should show everything needed, not just incomplete steps
          const stepId = step.id || `step-${phaseIndex}-${opIndex}-${stepIndex}`;
          const isStepComplete = completedSteps?.has(stepId) || false;
          
          // Add sample materials and tools for demonstration (since project templates are empty)
          let materials = step.materials || [];
          let tools = step.tools || [];
          
          // Add sample data to specific steps for testing - same logic as UserView
          if (step.step?.includes('Measure') || step.id === 'measure-room') {
            materials = [
              { id: 'tape-measure', name: 'Measuring Tape', description: '25ft measuring tape', category: 'Hardware', alternates: ['Laser measure', 'Ruler'], unit: 'piece' },
              { id: 'notepad', name: 'Notepad & Pencil', description: 'For recording measurements', category: 'Other', alternates: ['Phone app', 'Digital notepad'], unit: 'set' }
            ];
            tools = [
              { id: 'laser-level', name: 'Laser Level', description: 'For checking floor levelness', category: 'Hardware', alternates: ['Traditional bubble level', 'Water level'] }
            ];
          } else if (step.step?.includes('Calculate') || step.step?.includes('Material')) {
            materials = [
              { id: 'tiles', name: 'Floor Tiles', description: 'Ceramic or porcelain tiles', category: 'Consumable', alternates: ['Luxury vinyl', 'Natural stone'], unit: 'sq ft' },
              { id: 'grout', name: 'Tile Grout', description: 'Sanded grout for floor tiles', category: 'Consumable', alternates: ['Unsanded grout', 'Epoxy grout'], unit: 'lbs' },
              { id: 'adhesive', name: 'Tile Adhesive', description: 'Floor tile adhesive', category: 'Consumable', alternates: ['Mortar mix', 'Premium adhesive'], unit: 'gallons' }
            ];
          } else if (step.step?.includes('Surface') || step.step?.includes('Prep')) {
            materials = [
              { id: 'primer', name: 'Floor Primer', description: 'Concrete floor primer', category: 'Consumable', alternates: ['Self-priming sealer', 'Bonding agent'], unit: 'gallons' }
            ];
            tools = [
              { id: 'floor-scraper', name: 'Floor Scraper', description: 'For removing old flooring', category: 'Hand Tool', alternates: ['Putty knife', 'Chisel'] },
              { id: 'shop-vac', name: 'Shop Vacuum', description: 'For cleaning debris', category: 'Power Tool', alternates: ['Regular vacuum', 'Broom and dustpan'] }
            ];
          }
          
          console.log('🛒 Processing step for shopping cart:', {
            stepName: step.step,
            stepId: stepId,
            materialsCount: materials.length,
            toolsCount: tools.length,
            materials: materials.map(m => m.name),
            tools: tools.map(t => t.name)
          });
          
          // Process materials - include from all steps (completed or not) since we need to buy everything
          if (materials && Array.isArray(materials) && materials.length > 0) {
            materials.forEach((material, materialIndex) => {
              const key = material.id || material.name || `material-${materialIndex}-${Date.now()}`;
              if (materialsMap.has(key)) {
                const existing = materialsMap.get(key);
                existing.totalQuantity = (existing.totalQuantity || 1) + 1;
                existing.usedInSteps.push(step.step);
              } else {
                const newMaterial = {
                  id: material.id || key,
                  name: material.name,
                  description: material.description || '',
                  category: material.category || 'Other',
                  alternates: material.alternates || [],
                  unit: material.unit || 'pieces',
                  totalQuantity: 1,
                  usedInSteps: [step.step]
                };
                materialsMap.set(key, newMaterial);
              }
            });
          }

          // Process tools - include from all steps (completed or not) since we need to buy everything
          if (tools && Array.isArray(tools) && tools.length > 0) {
            tools.forEach((tool, toolIndex) => {
              const key = tool.id || tool.name || `tool-${toolIndex}-${Date.now()}`;
              const toolQuantity = 1; // Default quantity per step
              
              if (toolsMap.has(key)) {
                const existing = toolsMap.get(key);
                existing.maxQuantity = Math.max(existing.maxQuantity || 1, toolQuantity);
                existing.usedInSteps.push(step.step);
              } else {
                const newTool = {
                  id: tool.id || key,
                  name: tool.name,
                  description: tool.description || '',
                  category: tool.category || 'Other',
                  alternates: tool.alternates || [],
                  maxQuantity: toolQuantity,
                  usedInSteps: [step.step]
                };
                toolsMap.set(key, newTool);
              }
            });
          }
        });
      });
    });
    
    return {
      materials: Array.from(materialsMap.values()),
      tools: Array.from(toolsMap.values())
    };
  }, [project, projectRun]);

  const uniqueTools = projectRollup.tools;
  const uniqueMaterials = projectRollup.materials;

  // Auto-check tools that user already owns
  useEffect(() => {
    const ownedToolIds = new Set<string>();
    uniqueTools.forEach(tool => {
      // Check if user owns this tool using the userOwnedTools prop
      if (userOwnedTools.some((ownedTool: any) => 
        ownedTool.tool === tool.name || 
        ownedTool.name === tool.name ||
        ownedTool === tool.name)) {
        ownedToolIds.add(tool.id);
      }
    });
    setOrderedTools(ownedToolIds);
  }, [uniqueTools, userOwnedTools]);

  const handleToolToggle = (toolId: string) => {
    // Check if item is currently shopped
    if (shoppedTools.has(toolId)) {
      // Move from shopped back to active
      setShoppedTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
      setOrderedTools(prev => new Set(prev).add(toolId));
    } else {
      // Move to shopped when checked off
      setOrderedTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
      setShoppedTools(prev => new Set(prev).add(toolId));
    }
  };

  const handleMaterialToggle = (materialId: string) => {
    // Check if item is currently shopped
    if (shoppedMaterials.has(materialId)) {
      // Move from shopped back to active
      setShoppedMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
      setOrderedMaterials(prev => new Set(prev).add(materialId));
    } else {
      // Move to shopped when checked off
      setOrderedMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
      setShoppedMaterials(prev => new Set(prev).add(materialId));
    }
  };

  const handleItemDetails = (item: any, type: 'tool' | 'material') => {
    setSelectedItem({ ...item, type });
    setItemDetailsOpen(true);
  };

  // Filter items for display
  const activeTools = uniqueTools.filter(tool => !shoppedTools.has(tool.id));
  const activeMaterials = uniqueMaterials.filter(material => !shoppedMaterials.has(material.id));
  const shoppedToolsList = uniqueTools.filter(tool => shoppedTools.has(tool.id));
  const shoppedMaterialsList = uniqueMaterials.filter(material => shoppedMaterials.has(material.id));

  // Handle case where no tools or materials exist
  if (uniqueTools.length === 0 && uniqueMaterials.length === 0) {
    return (
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="No Items to Order"
        size="modal-sm"
      >
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Items to Order</h3>
          <p className="text-sm text-center">This project doesn't have any tools or materials defined.</p>
        </div>
      </ResponsiveDialog>
    );
  }

  const { isMobile } = useResponsive();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Shopping Checklist"
      size={isMobile ? "content-full" : "large"}
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Shopping Sites and Search */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Shopping Sites */}
          <div>
            <h4 className="font-medium text-sm mb-2">Shopping Websites</h4>
            <div className="flex flex-wrap gap-2">
              {SHOPPING_SITES.map((site) => (
                <Button
                  key={site.name}
                  onClick={() => window.open(site.url, '_blank')}
                  size="sm"
                  className={`text-xs ${site.color} text-white`}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {site.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Google Search */}
          <div>
            <h4 className="font-medium text-sm mb-2">Search Products</h4>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search for products on Google..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={handleUrlKeyPress}
                className="text-sm flex-1"
              />
              <Button onClick={handleGoogleSearch} size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-1" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Shopping Checklist Stats */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              {uniqueTools.length + uniqueMaterials.length} items
            </Badge>
            <Badge variant="outline" className="text-xs">
              {shoppedToolsList.length + shoppedMaterialsList.length} shopped
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="show-shopped-main"
              checked={showShopped}
              onCheckedChange={(checked) => setShowShopped(checked === true)}
            />
            <label htmlFor="show-shopped-main" className="text-xs">Show completed</label>
          </div>
        </div>

        {/* Shopping Items - Mobile Optimized Tabs */}
        <div className="flex-1 min-h-0">
          <Tabs defaultValue="materials" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="materials" className="text-sm">
                Materials ({activeMaterials.length + (showShopped ? shoppedMaterialsList.length : 0)})
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-sm">
                Tools ({activeTools.length + (showShopped ? shoppedToolsList.length : 0)})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="materials" className="flex-1">
              <ScrollArea className="h-[60vh] md:h-[50vh]">
                <div className="space-y-3 pr-3">
                  {activeMaterials.length === 0 && (!showShopped || shoppedMaterialsList.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No materials to order for this project</p>
                    </div>
                  ) : (
                    <>
                      {/* Active Materials */}
                      {activeMaterials.map((material, index) => (
                        <div key={`active-${material.id}-${index}`} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={shoppedMaterials.has(material.id)}
                                  onChange={() => handleMaterialToggle(material.id)}
                                  className="rounded w-4 h-4 flex-shrink-0"
                                />
                                <h4 className="font-medium text-sm">{material.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 ml-7">
                                {material.description}
                              </p>
                              {material.totalQuantity && (
                                <Badge variant="secondary" className="text-xs mt-2 ml-7">
                                  Qty: {material.totalQuantity} {material.unit || 'pieces'}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemDetails(material, 'material')}
                              className="ml-2 flex-shrink-0"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Shopped Materials */}
                      {showShopped && shoppedMaterialsList.length > 0 && (
                        <>
                          {activeMaterials.length > 0 && <Separator className="my-4" />}
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">Completed Items</h3>
                          </div>
                          {shoppedMaterialsList.map((material, index) => (
                            <div key={`shopped-${material.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <h4 className="font-medium text-sm line-through">{material.name}</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 ml-7 line-through">
                                    {material.description}
                                  </p>
                                  {material.totalQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2 ml-7 line-through">
                                      Qty: {material.totalQuantity} {material.unit || 'pieces'}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemDetails(material, 'material')}
                                  className="ml-2 flex-shrink-0"
                                >
                                  <Info className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="tools" className="flex-1">
              <ScrollArea className="h-[60vh] md:h-[50vh]">
                <div className="space-y-3 pr-3">
                  {activeTools.length === 0 && (!showShopped || shoppedToolsList.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No tools to order for this project</p>
                    </div>
                  ) : (
                    <>
                      {/* Active Tools */}
                      {activeTools.map((tool, index) => (
                        <div key={`active-${tool.id}-${index}`} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={shoppedTools.has(tool.id)}
                                  onChange={() => handleToolToggle(tool.id)}
                                  className="rounded w-4 h-4 flex-shrink-0"
                                />
                                <h4 className="font-medium text-sm">{tool.name}</h4>
                                {userOwnedTools.some((ownedTool: any) => 
                                  ownedTool.tool === tool.name || 
                                  ownedTool.name === tool.name ||
                                  ownedTool === tool.name) && (
                                  <Badge variant="secondary" className="text-xs">Owned</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 ml-7">
                                {tool.description}
                              </p>
                              {tool.maxQuantity && (
                                <Badge variant="secondary" className="text-xs mt-2 ml-7">
                                  Qty: {tool.maxQuantity}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemDetails(tool, 'tool')}
                              className="ml-2 flex-shrink-0"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Shopped Tools */}
                      {showShopped && shoppedToolsList.length > 0 && (
                        <>
                          {activeTools.length > 0 && <Separator className="my-4" />}
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">Completed Items</h3>
                          </div>
                          {shoppedToolsList.map((tool, index) => (
                            <div key={`shopped-${tool.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <h4 className="font-medium text-sm line-through">{tool.name}</h4>
                                    {userOwnedTools.some((ownedTool: any) => 
                                      ownedTool.tool === tool.name || 
                                      ownedTool.name === tool.name ||
                                      ownedTool === tool.name) && (
                                      <Badge variant="secondary" className="text-xs line-through">Owned</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 ml-7 line-through">
                                    {tool.description}
                                  </p>
                                  {tool.maxQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2 ml-7 line-through">
                                      Qty: {tool.maxQuantity}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemDetails(tool, 'tool')}
                                  className="ml-2 flex-shrink-0"
                                >
                                  <Info className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer with Complete Button */}
        {onOrderingComplete && (
          <div className="p-4 border rounded-lg bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Progress: {shoppedTools.size + shoppedMaterials.size}/{uniqueTools.length + uniqueMaterials.length} items checked
            </div>
            
            <Button
              onClick={onOrderingComplete}
              disabled={shoppedTools.size + shoppedMaterials.size < uniqueTools.length + uniqueMaterials.length}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              <Check className="w-4 h-4 mr-2" />
              Complete Shopping
            </Button>
          </div>
        )}
      </div>
      
      {/* Item Details Dialog */}
      <Dialog open={itemDetailsOpen} onOpenChange={setItemDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              {selectedItem?.type === 'tool' ? 'Tool' : 'Material'} Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-lg">{selectedItem?.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedItem?.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Category:</span>
                <p className="text-muted-foreground">{selectedItem?.category || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Alternates:</span>
                <p className="text-muted-foreground">{selectedItem?.alternates?.length > 0 ? selectedItem.alternates.join(', ') : 'None'}</p>
              </div>
              {selectedItem?.totalQuantity && (
                <div>
                  <span className="font-medium">Total Quantity:</span>
                  <p className="text-muted-foreground">{selectedItem.totalQuantity} {selectedItem.unit || 'pieces'}</p>
                </div>
              )}
              {selectedItem?.maxQuantity && (
                <div>
                  <span className="font-medium">Max Quantity:</span>
                  <p className="text-muted-foreground">{selectedItem.maxQuantity}</p>
                </div>
              )}
            </div>
            
            {selectedItem?.usedInSteps && selectedItem.usedInSteps.length > 0 && (
              <div>
                <span className="font-medium text-sm">Used in steps:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedItem.usedInSteps.map((step: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {step}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveDialog>
  );
}