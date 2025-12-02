import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, EyeOff, ExternalLink, Globe, Check, Maximize, Info, Calendar, AlertTriangle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Project, Material, Tool } from "@/interfaces/Project";
import { supabase } from "@/integrations/supabase/client";
import { useResponsive } from "@/hooks/useResponsive";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { extractNeedDatesFromSchedule, detectScheduleChanges, createScheduleSnapshot } from "@/utils/shoppingUtils";
import { format } from "date-fns";
interface OrderingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  projectRun?: any; // ProjectRun object as fallback
  userOwnedTools: any[];
  completedSteps?: Set<string>;
  selectedMaterials?: {
    materials: any[];
    tools: any[];
  };
  onOrderingComplete?: () => void;
}
interface ShoppingSite {
  name: string;
  url: string;
  color: string;
}
const SHOPPING_SITES: ShoppingSite[] = [{
  name: "Lowe's",
  url: "https://lowes.com",
  color: "bg-blue-600 hover:bg-blue-700"
}, {
  name: "Floor & Decor",
  url: "https://flooranddecor.com",
  color: "bg-orange-600 hover:bg-orange-700"
}, {
  name: "Wayfair",
  url: "https://wayfair.com",
  color: "bg-purple-600 hover:bg-purple-700"
}, {
  name: "Amazon",
  url: "https://amazon.com",
  color: "bg-yellow-600 hover:bg-yellow-700"
}, {
  name: "Toolio.us",
  url: "https://toolio.us",
  color: "bg-green-600 hover:bg-green-700"
}];
export function OrderingWindow({
  open,
  onOpenChange,
  project,
  projectRun,
  userOwnedTools,
  completedSteps,
  selectedMaterials,
  onOrderingComplete
}: OrderingWindowProps) {
  const {
    updateProjectRun
  } = useProject();
  const [orderedTools, setOrderedTools] = useState<Set<string>>(new Set());
  const [orderedMaterials, setOrderedMaterials] = useState<Set<string>>(new Set());
  const [shoppedTools, setShoppedTools] = useState<Set<string>>(new Set());
  const [shoppedMaterials, setShoppedMaterials] = useState<Set<string>>(new Set());
  const [showShopped, setShowShopped] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);

  // Calculate need dates and warnings
  const needDates = useMemo(() => {
    if (!projectRun) return [];
    return extractNeedDatesFromSchedule(projectRun);
  }, [projectRun]);
  const isScheduled = useMemo(() => {
    return projectRun?.schedule_events?.events && Array.isArray(projectRun.schedule_events.events) && projectRun.schedule_events.events.length > 0;
  }, [projectRun]);
  const scheduleWarnings = useMemo(() => {
    if (!projectRun || !isScheduled) return [];
    const previousSnapshot = projectRun.shopping_checklist_data?.scheduleSnapshot || null;
    return detectScheduleChanges(needDates, previousSnapshot);
  }, [projectRun, isScheduled, needDates]);

  // Load shopping checklist data from database on mount
  useEffect(() => {
    if (!open || !projectRun?.shopping_checklist_data) return;
    const savedData = projectRun.shopping_checklist_data;
    if (savedData.orderedItems && Array.isArray(savedData.orderedItems)) {
      const shoppedToolIds = new Set<string>();
      const shoppedMaterialIds = new Set<string>();
      savedData.orderedItems.forEach((item: any) => {
        if (item.itemType === 'tool') {
          shoppedToolIds.add(item.itemId);
        } else if (item.itemType === 'material') {
          shoppedMaterialIds.add(item.itemId);
        }
      });
      setShoppedTools(shoppedToolIds);
      setShoppedMaterials(shoppedMaterialIds);
    }
  }, [open, projectRun]);

  // Save shopping checklist data to database
  const saveShoppingData = async (shoppedToolsSet: Set<string>, shoppedMaterialsSet: Set<string>) => {
    if (!projectRun) return;
    try {
      const orderedItems = [...Array.from(shoppedToolsSet).map(toolId => {
        const tool = uniqueTools.find(t => t.id === toolId);
        return {
          itemId: toolId,
          itemName: tool?.name || 'Unknown Tool',
          itemType: 'tool',
          orderedDate: new Date().toISOString()
        };
      }), ...Array.from(shoppedMaterialsSet).map(materialId => {
        const material = uniqueMaterials.find(m => m.id === materialId);
        return {
          itemId: materialId,
          itemName: material?.name || 'Unknown Material',
          itemType: 'material',
          orderedDate: new Date().toISOString()
        };
      })];
      const allItemsOrdered = orderedItems.length >= uniqueTools.length + uniqueMaterials.length;

      // Create schedule snapshot if scheduled
      const scheduleSnapshot = isScheduled ? createScheduleSnapshot(needDates) : null;
      await updateProjectRun({
        ...projectRun,
        shopping_checklist_data: {
          orderedItems,
          completedDate: allItemsOrdered ? new Date().toISOString() : null,
          scheduleSnapshot: scheduleSnapshot
        }
      });
    } catch (error) {
      console.error('Error saving shopping data:', error);
      toast.error('Failed to save shopping checklist');
    }
  };

  // Fetch user profile to get owned tools
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          const {
            data,
            error
          } = await supabase.from('profiles').select('owned_tools').eq('user_id', user.id).single();
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
      return {
        materials: [],
        tools: []
      };
    }

    // If we have selected materials from MaterialsSelectionWindow, use those instead
    if (selectedMaterials && (selectedMaterials.materials.length > 0 || selectedMaterials.tools.length > 0)) {
      console.log('🛒 Using selected materials from MaterialsSelectionWindow:', selectedMaterials);

      // Convert selected items to the format expected by OrderingWindow
      const materials = selectedMaterials.materials.map((material, index) => ({
        id: material.id || `selected-material-${index}`,
        name: material.name,
        description: material.description || '',
        category: material.category || 'Other',
        alternates: material.alternates || [],
        unit: material.unit || 'pieces',
        totalQuantity: material.quantity || 1,
        usedInSteps: [material.stepName || 'Selected Step']
      }));
      const tools = selectedMaterials.tools.map((tool, index) => ({
        id: tool.id || `selected-tool-${index}`,
        name: tool.name,
        description: tool.description || '',
        category: tool.category || 'Other',
        alternates: tool.alternates || [],
        maxQuantity: tool.quantity || 1,
        usedInSteps: [tool.stepName || 'Selected Step']
      }));
      return {
        materials,
        tools
      };
    }

    // Original logic for when no materials are pre-selected
    // Get phases directly from project - no dynamic addition needed
    const processedPhases = activeProject.phases || [];

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

          // Use actual materials and tools from database - no sample data
          let materials = step.materials || [];
          let tools = step.tools || [];
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
  }, [project, projectRun, selectedMaterials]);
  const uniqueTools = projectRollup.tools;
  const uniqueMaterials = projectRollup.materials;

  // Auto-check tools that user already owns
  useEffect(() => {
    const ownedToolIds = new Set<string>();
    uniqueTools.forEach(tool => {
      // Check if user owns this tool using the userOwnedTools prop
      if (userOwnedTools.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name || ownedTool === tool.name)) {
        ownedToolIds.add(tool.id);
      }
    });
    setOrderedTools(ownedToolIds);
  }, [uniqueTools, userOwnedTools]);
  const handleToolToggle = (toolId: string) => {
    let newShoppedTools: Set<string>;
    let newOrderedTools: Set<string>;

    // Check if item is currently shopped
    if (shoppedTools.has(toolId)) {
      // Move from shopped back to active
      newShoppedTools = new Set(shoppedTools);
      newShoppedTools.delete(toolId);
      newOrderedTools = new Set(orderedTools);
      newOrderedTools.add(toolId);
    } else {
      // Move to shopped when checked off
      newOrderedTools = new Set(orderedTools);
      newOrderedTools.delete(toolId);
      newShoppedTools = new Set(shoppedTools);
      newShoppedTools.add(toolId);
    }
    setShoppedTools(newShoppedTools);
    setOrderedTools(newOrderedTools);

    // Persist to database
    saveShoppingData(newShoppedTools, shoppedMaterials);
  };
  const handleMaterialToggle = (materialId: string) => {
    let newShoppedMaterials: Set<string>;
    let newOrderedMaterials: Set<string>;

    // Check if item is currently shopped
    if (shoppedMaterials.has(materialId)) {
      // Move from shopped back to active
      newShoppedMaterials = new Set(shoppedMaterials);
      newShoppedMaterials.delete(materialId);
      newOrderedMaterials = new Set(orderedMaterials);
      newOrderedMaterials.add(materialId);
    } else {
      // Move to shopped when checked off
      newOrderedMaterials = new Set(orderedMaterials);
      newOrderedMaterials.delete(materialId);
      newShoppedMaterials = new Set(shoppedMaterials);
      newShoppedMaterials.add(materialId);
    }
    setShoppedMaterials(newShoppedMaterials);
    setOrderedMaterials(newOrderedMaterials);

    // Persist to database
    saveShoppingData(shoppedTools, newShoppedMaterials);
  };
  const handleItemDetails = (item: any, type: 'tool' | 'material') => {
    setSelectedItem({
      ...item,
      type
    });
    setItemDetailsOpen(true);
  };

  // Get need date for an item
  const getNeedDate = (itemId: string, itemName: string, itemType: 'material' | 'tool') => {
    return needDates.find(nd => (nd.itemId === itemId || nd.itemName === itemName) && nd.itemType === itemType);
  };

  // Filter items for display
  const activeTools = uniqueTools.filter(tool => !shoppedTools.has(tool.id));
  const activeMaterials = uniqueMaterials.filter(material => !shoppedMaterials.has(material.id));
  const shoppedToolsList = uniqueTools.filter(tool => shoppedTools.has(tool.id));
  const shoppedMaterialsList = uniqueMaterials.filter(material => shoppedMaterials.has(material.id));

  // Handle case where no tools or materials exist
  if (uniqueTools.length === 0 && uniqueMaterials.length === 0) {
    return <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="No Items to Order" size="modal-sm">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Items to Order</h3>
          <p className="text-sm text-center">This project doesn't have any tools or materials defined.</p>
        </div>
      </ResponsiveDialog>;
  }
  const {
    isMobile
  } = useResponsive();
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="" size={isMobile ? "content-full" : "large"}>
      <div className="flex flex-col h-full space-y-2">
        {/* Custom Title with Close Button */}
        <div className="flex items-center justify-between mb-2 pb-3 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg md:text-xl font-bold">
            {selectedMaterials && (selectedMaterials.materials.length > 0 || selectedMaterials.tools.length > 0) ? 'Shopping Checklist - New Materials Needed' : 'Shopping Checklist'}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-xs font-medium"
          >
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
        </div>
        
        {/* Schedule Status */}
        {!isScheduled && <Alert className="mb-2">
            <Calendar className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Project not scheduled. Generate a schedule to see when items are needed - this can be beneficial for tool rentals / borrowing.                        
            </AlertDescription>
          </Alert>}

        {/* Schedule Warnings */}
        {scheduleWarnings.length > 0 && <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold text-xs mb-1">Schedule Changes Detected:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {scheduleWarnings.map((warning, idx) => <li key={idx} className="text-xs">{warning.message}</li>)}
              </ul>
            </AlertDescription>
          </Alert>}
        
        {/* Shopping Sites and Search */}
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          {/* Shopping Sites */}
          <div>
            <h4 className="font-medium text-xs mb-2">Shopping Websites</h4>
            <div className="flex flex-wrap gap-1.5">
              {SHOPPING_SITES.map(site => <Button key={site.name} onClick={() => window.open(site.url, '_blank')} size="sm" className={`text-xs px-2 py-1 h-auto ${site.color} text-white`}>
                  <ExternalLink className="w-2.5 h-2.5 mr-1" />
                  {site.name}
                </Button>)}
            </div>
          </div>

          {/* Open New Tab Button */}
          <div>
            <Button onClick={() => window.open('about:blank', '_blank')} size="sm" variant="outline" className="w-full h-8 text-xs">
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Open New Tab
            </Button>
          </div>
        </div>

        {/* Shopping Checklist Stats with Complete Button */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              {uniqueTools.length + uniqueMaterials.length} items
            </Badge>
            <Badge variant="outline" className="text-xs">
              {shoppedToolsList.length + shoppedMaterialsList.length} shopped
            </Badge>
          </div>
          
          {/* Complete Shopping Button - Centered in window */}
          {onOrderingComplete && <Button onClick={onOrderingComplete} disabled={shoppedTools.size + shoppedMaterials.size < uniqueTools.length + uniqueMaterials.length} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-auto" size="sm">
              <Check className="w-3 h-3 mr-1.5" />
              Complete Shopping
            </Button>}
          
          <div className="flex items-center gap-2">
            <Checkbox id="show-shopped-main" checked={showShopped} onCheckedChange={checked => setShowShopped(checked === true)} />
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
              <ScrollArea className="h-[50vh] md:h-[45vh]">
                <div className="space-y-3 pr-3">
                  {activeMaterials.length === 0 && (!showShopped || shoppedMaterialsList.length === 0) ? <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No materials to order for this project</p>
                    </div> : <>
                      {/* Active Materials */}
                      {activeMaterials.map((material, index) => {
                    const needDate = getNeedDate(material.id, material.name, 'material');
                    return <div key={`active-${material.id}-${index}`} className="border rounded-lg p-1.5 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={shoppedMaterials.has(material.id)} onChange={() => handleMaterialToggle(material.id)} className="rounded w-4 h-4 flex-shrink-0" />
                                <h4 className="font-medium text-sm">{material.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 ml-7">
                                {material.description}
                              </p>
                              {needDate && needDate.startDate && <div className="flex items-center gap-2 mt-2 ml-7 text-xs text-blue-700">
                                  <Calendar className="h-3 w-3" />
                                  <span>Needed by: {format(needDate.startDate, 'MM/dd/yyyy')}</span>
                                </div>}
                              {material.totalQuantity && <Badge variant="secondary" className="text-xs mt-2 ml-7">
                                  Qty: {material.totalQuantity} {material.unit || 'pieces'}
                                </Badge>}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleItemDetails(material, 'material')} className="ml-2 flex-shrink-0">
                              <Info className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>;
                  })}
                      
                      {/* Shopped Materials */}
                      {showShopped && shoppedMaterialsList.length > 0 && <>
                          {activeMaterials.length > 0 && <Separator className="my-4" />}
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">Completed Items</h3>
                          </div>
                          {shoppedMaterialsList.map((material, index) => <div key={`shopped-${material.id}-${index}`} className="border rounded-lg p-1.5 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <h4 className="font-medium text-sm line-through">{material.name}</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 ml-7 line-through">
                                    {material.description}
                                  </p>
                                  {material.totalQuantity && <Badge variant="secondary" className="text-xs mt-2 ml-7 line-through">
                                      Qty: {material.totalQuantity} {material.unit || 'pieces'}
                                    </Badge>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleItemDetails(material, 'material')} className="ml-2 flex-shrink-0">
                                  <Info className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>)}
                        </>}
                    </>}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="tools" className="flex-1">
              <ScrollArea className="h-[50vh] md:h-[45vh]">
                <div className="space-y-3 pr-3">
                  {activeTools.length === 0 && (!showShopped || shoppedToolsList.length === 0) ? <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No tools to order for this project</p>
                    </div> : <>
                      {/* Active Tools */}
                      {activeTools.map((tool, index) => {
                    const isOwned = userOwnedTools.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name || ownedTool === tool.name);
                    const needDate = !isOwned ? getNeedDate(tool.id, tool.name, 'tool') : null;
                    return <div key={`active-${tool.id}-${index}`} className="border rounded-lg p-1.5 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={shoppedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} className="rounded w-4 h-4 flex-shrink-0" />
                                <h4 className="font-medium text-sm">{tool.name}</h4>
                                {isOwned && <Badge variant="secondary" className="text-xs">Owned</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 ml-7">
                                {tool.description}
                              </p>
                              {needDate && needDate.startDate && needDate.endDate && <div className="flex items-center gap-2 mt-2 ml-7 text-xs text-blue-700">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    Need between {format(needDate.startDate, 'MM/dd/yyyy')} and {format(needDate.endDate, 'MM/dd/yyyy')}
                                  </span>
                                </div>}
                              {tool.maxQuantity && <Badge variant="secondary" className="text-xs mt-2 ml-7">
                                  Qty: {tool.maxQuantity}
                                </Badge>}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleItemDetails(tool, 'tool')} className="ml-2 flex-shrink-0">
                              <Info className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>;
                  })}
                      
                      {/* Shopped Tools */}
                      {showShopped && shoppedToolsList.length > 0 && <>
                          {activeTools.length > 0 && <Separator className="my-4" />}
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">Completed Items</h3>
                          </div>
                          {shoppedToolsList.map((tool, index) => <div key={`shopped-${tool.id}-${index}`} className="border rounded-lg p-1.5 bg-muted/30 opacity-60">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <h4 className="font-medium text-sm line-through">{tool.name}</h4>
                                    {userOwnedTools.some((ownedTool: any) => ownedTool.tool === tool.name || ownedTool.name === tool.name || ownedTool === tool.name) && <Badge variant="secondary" className="text-xs line-through">Owned</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 ml-7 line-through">
                                    {tool.description}
                                  </p>
                                  {tool.maxQuantity && <Badge variant="secondary" className="text-xs mt-2 ml-7 line-through">
                                      Qty: {tool.maxQuantity}
                                    </Badge>}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleItemDetails(tool, 'tool')} className="ml-2 flex-shrink-0">
                                  <Info className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>)}
                        </>}
                    </>}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
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
              {selectedItem?.totalQuantity && <div>
                  <span className="font-medium">Total Quantity:</span>
                  <p className="text-muted-foreground">{selectedItem.totalQuantity} {selectedItem.unit || 'pieces'}</p>
                </div>}
              {selectedItem?.maxQuantity && <div>
                  <span className="font-medium">Max Quantity:</span>
                  <p className="text-muted-foreground">{selectedItem.maxQuantity}</p>
                </div>}
            </div>
            
            {selectedItem?.usedInSteps && selectedItem.usedInSteps.length > 0 && <div>
                <span className="font-medium text-sm">Used in steps:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedItem.usedInSteps.map((step: string, index: number) => <Badge key={index} variant="outline" className="text-xs">
                      {step}
                    </Badge>)}
                </div>
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveDialog>;
}