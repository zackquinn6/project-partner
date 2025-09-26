import React, { useState, useEffect } from "react";
import { ScrollableDialog } from "@/components/ScrollableDialog";
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
  const [currentUrl, setCurrentUrl] = useState<string>(SHOPPING_SITES[0].url);
  const [urlInput, setUrlInput] = useState<string>("");
  const [checklistVisible, setChecklistVisible] = useState(true);
  const [orderedTools, setOrderedTools] = useState<Set<string>>(new Set());
  const [orderedMaterials, setOrderedMaterials] = useState<Set<string>>(new Set());
  const [shoppedTools, setShoppedTools] = useState<Set<string>>(new Set());
  const [shoppedMaterials, setShoppedMaterials] = useState<Set<string>>(new Set());
  const [showShopped, setShowShopped] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);

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
              { id: 'tape-measure', name: 'Measuring Tape', description: '25ft measuring tape', category: 'Hardware', alternates: ['Laser measure', 'Ruler'] },
              { id: 'notepad', name: 'Notepad & Pencil', description: 'For recording measurements', category: 'Other', alternates: ['Phone app', 'Digital notepad'] }
            ];
            tools = [
              { id: 'laser-level', name: 'Laser Level', description: 'For checking floor levelness', category: 'Hardware', alternates: ['Traditional bubble level', 'Water level'] }
            ];
          } else if (step.step?.includes('Calculate') || step.step?.includes('Material')) {
            materials = [
              { id: 'tiles', name: 'Floor Tiles', description: 'Ceramic or porcelain tiles', category: 'Consumable', alternates: ['Luxury vinyl', 'Natural stone'] },
              { id: 'grout', name: 'Tile Grout', description: 'Sanded grout for floor tiles', category: 'Consumable', alternates: ['Unsanded grout', 'Epoxy grout'] },
              { id: 'adhesive', name: 'Tile Adhesive', description: 'Floor tile adhesive', category: 'Consumable', alternates: ['Mortar mix', 'Premium adhesive'] }
            ];
          } else if (step.step?.includes('Surface') || step.step?.includes('Prep')) {
            materials = [
              { id: 'primer', name: 'Floor Primer', description: 'Concrete floor primer', category: 'Consumable', alternates: ['Self-priming sealer', 'Bonding agent'] }
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
      <ScrollableDialog
        open={open}
        onOpenChange={onOpenChange}
        title="No Items to Order"
        className="w-[90vw] max-w-md"
      >
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Items to Order</h3>
          <p className="text-sm text-center">This project doesn't have any tools or materials defined.</p>
        </div>
      </ScrollableDialog>
    );
  }

  if (fullScreenMode) {
    return (
      <ScrollableDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Shopping Checklist"
        className="w-[90vw] max-w-7xl"
      >
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-3 md:px-6 py-3 shrink-0 bg-background border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{uniqueTools.length + uniqueMaterials.length} items total</Badge>
                <Badge variant="outline">{shoppedToolsList.length + shoppedMaterialsList.length} shopped</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="show-shopped"
                    checked={showShopped}
                    onCheckedChange={(checked) => setShowShopped(checked === true)}
                  />
                  <label htmlFor="show-shopped" className="text-sm">Show shopped</label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullScreenMode(false)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Show Browser
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 min-h-0">
            <Tabs defaultValue="materials" className="flex flex-col flex-1 h-full">
              <div className="px-3 md:px-6 py-3 bg-background border-b shrink-0">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="materials" className="text-xs md:text-sm px-2 py-3">
                    Materials ({activeMaterials.length + (showShopped ? shoppedMaterialsList.length : 0)})
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="text-xs md:text-sm px-2 py-3">
                    Tools ({activeTools.length + (showShopped ? shoppedToolsList.length : 0)})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="materials" className="flex-1 overflow-y-auto px-3 md:px-6 min-h-0">
                <div className="space-y-2 py-3">
                  {activeMaterials.length === 0 && (!showShopped || shoppedMaterialsList.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No materials to order for this project</p>
                    </div>
                  ) : (
                    <>
                      {/* Active Materials */}
                      {activeMaterials.map((material, index) => (
                        <div key={`active-${material.id}-${index}`} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={shoppedMaterials.has(material.id)}
                                  onChange={() => handleMaterialToggle(material.id)}
                                  className="rounded"
                                />
                                <h4 className="font-medium text-sm truncate">{material.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {material.description}
                              </p>
                              {material.totalQuantity && (
                                <Badge variant="secondary" className="text-xs mt-2">
                                  Qty: {material.totalQuantity}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemDetails(material, 'material')}
                              className="ml-2 flex-shrink-0"
                            >
                              <Info className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Shopped Materials */}
                      {showShopped && shoppedMaterialsList.length > 0 && (
                        <>
                          {activeMaterials.length > 0 && <Separator className="my-4" />}
                          <div className="mb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Shopped Items</h3>
                          </div>
                          {shoppedMaterialsList.map((material, index) => (
                            <div key={`shopped-${material.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <h4 className="font-medium text-sm truncate line-through">{material.name}</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 line-through">
                                    {material.description}
                                  </p>
                                  {material.totalQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2 line-through">
                                      Qty: {material.totalQuantity}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemDetails(material, 'material')}
                                  className="ml-2 flex-shrink-0"
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="tools" className="flex-1 overflow-y-auto px-3 md:px-6 min-h-0">
                <div className="space-y-2 py-3">
                  {activeTools.length === 0 && (!showShopped || shoppedToolsList.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tools to order for this project</p>
                    </div>
                  ) : (
                    <>
                      {/* Active Tools */}
                      {activeTools.map((tool, index) => (
                        <div key={`active-${tool.id}-${index}`} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={shoppedTools.has(tool.id)}
                                  onChange={() => handleToolToggle(tool.id)}
                                  className="rounded"
                                />
                                <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                                {userOwnedTools.some((ownedTool: any) => 
                                  ownedTool.tool === tool.name || 
                                  ownedTool.name === tool.name ||
                                  ownedTool === tool.name) && (
                                  <Badge variant="secondary" className="text-xs">Already Owned</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {tool.description}
                              </p>
                              {tool.maxQuantity && (
                                <Badge variant="secondary" className="text-xs mt-2">
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
                              <Info className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Shopped Tools */}
                      {showShopped && shoppedToolsList.length > 0 && (
                        <>
                          {activeTools.length > 0 && <Separator className="my-4" />}
                          <div className="mb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Shopped Items</h3>
                          </div>
                          {shoppedToolsList.map((tool, index) => (
                            <div key={`shopped-${tool.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <h4 className="font-medium text-sm truncate line-through">{tool.name}</h4>
                                    {userOwnedTools.some((ownedTool: any) => 
                                      ownedTool.tool === tool.name || 
                                      ownedTool.name === tool.name ||
                                      ownedTool === tool.name) && (
                                      <Badge variant="secondary" className="text-xs line-through">Already Owned</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 line-through">
                                    {tool.description}
                                  </p>
                                  {tool.maxQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2 line-through">
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
                                  <Info className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer with Complete Button */}
          <div className="p-3 md:p-4 border-t bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs md:text-sm text-muted-foreground">
              Progress: {orderedTools.size + orderedMaterials.size}/{uniqueTools.length + uniqueMaterials.length} items checked
            </div>
            
            {onOrderingComplete && (
              <Button
                onClick={onOrderingComplete}
                disabled={orderedTools.size + orderedMaterials.size < uniqueTools.length + uniqueMaterials.length}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                size="sm"
              >
                <Check className="w-4 h-4 mr-2" />
                Complete Shopping
              </Button>
            )}
          </div>
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
                    <p className="text-muted-foreground">{selectedItem.totalQuantity}</p>
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
      </ScrollableDialog>
    );
  }

  return (
    <ScrollableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Shopping & Ordering"
      className="w-[90vw] max-w-7xl"
    >
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Mobile/Desktop responsive layout */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* Browser Section */}
          <div className={`${checklistVisible ? 'lg:flex-1' : 'w-full'} flex flex-col ${checklistVisible ? 'hidden lg:flex' : 'flex'}`}>
            {/* Shopping Site Navigation */}
            <div className="p-3 md:p-4 border-b bg-muted/30 shrink-0">
              {/* Shopping Sites */}
              <div className="flex flex-wrap gap-2 mb-3">
                {SHOPPING_SITES.map((site) => (
                  <Button
                    key={site.name}
                    onClick={() => setCurrentUrl(site.url)}
                    size="sm"
                    className={`text-xs ${site.color} text-white`}
                  >
                    {site.name}
                  </Button>
                ))}
              </div>

              {/* Custom URL Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  type="url"
                  placeholder="Enter custom website URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleUrlKeyPress}
                  className="text-sm"
                />
                <Button onClick={handleNavigateToUrl} size="sm" variant="outline">
                  <Globe className="w-4 h-4" />
                </Button>
              </div>

              {/* Toggle Checklist and Fullscreen */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChecklistVisible(!checklistVisible)}
                  className="flex items-center gap-1 lg:hidden"
                >
                  {checklistVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {checklistVisible ? 'Hide' : 'Show'} Checklist
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullScreenMode(true)}
                  className="flex items-center gap-1"
                >
                  <Maximize className="w-4 h-4" />
                  Checklist Only
                </Button>
              </div>
            </div>

            {/* Browser iframe */}
            <div className="flex-1 p-3 md:p-4">
              <iframe
                src={currentUrl}
                className="w-full h-full border rounded-lg"
                title="Shopping Website"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </div>

          {/* Checklist Section */}
          {checklistVisible && (
            <div className="w-full lg:w-96 flex flex-col lg:border-l border-t lg:border-t-0 bg-background">
              <div className="p-3 md:p-4 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm md:text-base">Shopping Checklist</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{uniqueTools.length + uniqueMaterials.length} items</Badge>
                    <Badge variant="outline" className="text-xs">{shoppedToolsList.length + shoppedMaterialsList.length} shopped</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs md:text-sm text-muted-foreground">
                    <div>Tools: {orderedTools.size}/{uniqueTools.length}</div>
                    <div>Materials: {orderedMaterials.size}/{uniqueMaterials.length}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="show-shopped-sidebar"
                      checked={showShopped}
                      onCheckedChange={(checked) => setShowShopped(checked === true)}
                    />
                    <label htmlFor="show-shopped-sidebar" className="text-xs">Show shopped</label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-h-0">
                <Tabs defaultValue="materials" className="flex flex-col flex-1 h-full">
                  <div className="px-3 md:px-4 py-2 shrink-0">
                    <TabsList className="grid w-full grid-cols-2 h-10">
                      <TabsTrigger value="materials" className="text-xs md:text-sm">
                        Materials ({activeMaterials.length + (showShopped ? shoppedMaterialsList.length : 0)})
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="text-xs md:text-sm">
                        Tools ({activeTools.length + (showShopped ? shoppedToolsList.length : 0)})
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="materials" className="flex-1 overflow-y-auto px-3 md:px-4 min-h-0">
                    <div className="space-y-2 py-2">
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
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={orderedMaterials.has(material.id)}
                                      onChange={() => handleMaterialToggle(material.id)}
                                      className="rounded"
                                    />
                                    <h4 className="font-medium text-sm truncate">{material.name}</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {material.description}
                                  </p>
                                  {material.totalQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2">
                                      Qty: {material.totalQuantity}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemDetails(material, 'material')}
                                  className="ml-2 flex-shrink-0 w-8 h-8 p-0"
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Shopped Materials */}
                          {showShopped && shoppedMaterialsList.length > 0 && (
                            <>
                              {activeMaterials.length > 0 && <Separator className="my-2" />}
                              <div className="mb-2">
                                <h3 className="text-xs font-medium text-muted-foreground">Shopped Items</h3>
                              </div>
                              {shoppedMaterialsList.map((material, index) => (
                                <div key={`shopped-${material.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <h4 className="font-medium text-sm truncate line-through">{material.name}</h4>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 line-through">
                                        {material.description}
                                      </p>
                                      {material.totalQuantity && (
                                        <Badge variant="secondary" className="text-xs mt-2 line-through">
                                          Qty: {material.totalQuantity}
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemDetails(material, 'material')}
                                      className="ml-2 flex-shrink-0 w-8 h-8 p-0"
                                    >
                                      <Info className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tools" className="flex-1 overflow-y-auto px-3 md:px-4 min-h-0">
                    <div className="space-y-2 py-2">
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
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={shoppedTools.has(tool.id)}
                                      onChange={() => handleToolToggle(tool.id)}
                                      className="rounded"
                                    />
                                    <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                                    {userProfile?.owned_tools?.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name) && (
                                      <Badge variant="secondary" className="text-xs">Already Owned</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {tool.description}
                                  </p>
                                  {tool.maxQuantity && (
                                    <Badge variant="secondary" className="text-xs mt-2">
                                      Qty: {tool.maxQuantity}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemDetails(tool, 'tool')}
                                  className="ml-2 flex-shrink-0 w-8 h-8 p-0"
                                >
                                  <Info className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Shopped Tools */}
                          {showShopped && shoppedToolsList.length > 0 && (
                            <>
                              {activeTools.length > 0 && <Separator className="my-2" />}
                              <div className="mb-2">
                                <h3 className="text-xs font-medium text-muted-foreground">Shopped Items</h3>
                              </div>
                              {shoppedToolsList.map((tool, index) => (
                                <div key={`shopped-${tool.id}-${index}`} className="border rounded-lg p-3 bg-muted/30 opacity-60">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <h4 className="font-medium text-sm truncate line-through">{tool.name}</h4>
                                        {userProfile?.owned_tools?.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name) && (
                                          <Badge variant="secondary" className="text-xs line-through">Already Owned</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 line-through">
                                        {tool.description}
                                      </p>
                                      {tool.maxQuantity && (
                                        <Badge variant="secondary" className="text-xs mt-2 line-through">
                                          Qty: {tool.maxQuantity}
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemDetails(tool, 'tool')}
                                      className="ml-2 flex-shrink-0 w-8 h-8 p-0"
                                    >
                                      <Info className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Complete Button */}
        <div className="p-3 md:p-4 border-t bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs md:text-sm text-muted-foreground">
            Progress: {orderedTools.size + orderedMaterials.size}/{uniqueTools.length + uniqueMaterials.length} items checked
          </div>
          
          {onOrderingComplete && (
            <Button
              onClick={onOrderingComplete}
              disabled={orderedTools.size + orderedMaterials.size < uniqueTools.length + uniqueMaterials.length}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              size="sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Complete Shopping
            </Button>
          )}
        </div>
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
                  <p className="text-muted-foreground">{selectedItem.totalQuantity}</p>
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
    </ScrollableDialog>
  );
}