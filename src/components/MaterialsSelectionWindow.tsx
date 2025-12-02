import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Wrench, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Project } from '@/interfaces/Project';
import { useIsMobile } from '@/hooks/use-mobile';

interface MaterialsSelectionWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  projectRun?: any;
  completedSteps?: Set<string>;
  onSelectionComplete: (selectedItems: {
    materials: any[];
    tools: any[];
  }) => void;
}

interface StepItem {
  id: string;
  name: string;
  description: string;
  category: string;
  alternates?: string[];
  unit?: string;
  quantity?: number;
  stepName: string;
  stepId: string;
  isCompleted: boolean;
}

export function MaterialsSelectionWindow({ 
  open, 
  onOpenChange, 
  project, 
  projectRun, 
  completedSteps = new Set(), 
  onSelectionComplete 
}: MaterialsSelectionWindowProps) {
  const [showCompletedSteps, setShowCompletedSteps] = useState(true); // Changed default to true
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  // Extract all materials and tools from project steps
  const { availableMaterials, availableTools, stepStats } = useMemo(() => {
    const activeProject = project || projectRun;
    if (!activeProject) {
      return { availableMaterials: [], availableTools: [], stepStats: { total: 0, completed: 0, incomplete: 0 } };
    }

    const processedPhases = activeProject.phases || [];
    const materialsMap = new Map<string, StepItem>();
    const toolsMap = new Map<string, StepItem>();
    let totalSteps = 0;
    let completedStepsCount = 0;

    processedPhases.forEach((phase, phaseIndex) => {
      if (!phase.operations || !Array.isArray(phase.operations)) return;

      phase.operations.forEach((operation, opIndex) => {
        if (!operation.steps || !Array.isArray(operation.steps)) return;

        operation.steps.forEach((step, stepIndex) => {
          const stepId = step.id || `step-${phaseIndex}-${opIndex}-${stepIndex}`;
          const isStepComplete = completedSteps.has(stepId);
          totalSteps++;
          if (isStepComplete) completedStepsCount++;

          // Only include steps based on the showCompletedSteps toggle
          if (!showCompletedSteps && isStepComplete) return;

          // Use actual materials and tools from database - no sample data
          let materials = step.materials || [];
          let tools = step.tools || [];

          // Process materials
          materials.forEach((material, materialIndex) => {
            const key = `${material.id || material.name}-${stepId}`;
            if (!materialsMap.has(key)) {
              materialsMap.set(key, {
                id: key,
                name: material.name,
                description: material.description || '',
                category: material.category || 'Other',
                alternates: material.alternates || [],
                unit: material.unit || 'pieces',
                quantity: 1,
                stepName: step.step || 'Unknown Step',
                stepId: stepId,
                isCompleted: isStepComplete
              });
            }
          });

          // Process tools
          tools.forEach((tool, toolIndex) => {
            const key = `${tool.id || tool.name}-${stepId}`;
            if (!toolsMap.has(key)) {
              toolsMap.set(key, {
                id: key,
                name: tool.name,
                description: tool.description || '',
                category: tool.category || 'Other',
                alternates: tool.alternates || [],
                quantity: 1,
                stepName: step.step || 'Unknown Step',
                stepId: stepId,
                isCompleted: isStepComplete
              });
            }
          });
        });
      });
    });

    return {
      availableMaterials: Array.from(materialsMap.values()),
      availableTools: Array.from(toolsMap.values()),
      stepStats: {
        total: totalSteps,
        completed: completedStepsCount,
        incomplete: totalSteps - completedStepsCount
      }
    };
  }, [project, projectRun, completedSteps, showCompletedSteps]);

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (type: 'materials' | 'tools') => {
    if (type === 'materials') {
      const allMaterialIds = availableMaterials.map(m => m.id);
      setSelectedMaterials(new Set(allMaterialIds));
    } else {
      const allToolIds = availableTools.map(t => t.id);
      setSelectedTools(new Set(allToolIds));
    }
  };

  const handleDeselectAll = (type: 'materials' | 'tools') => {
    if (type === 'materials') {
      setSelectedMaterials(new Set());
    } else {
      setSelectedTools(new Set());
    }
  };

  const handleContinueToShopping = () => {
    const selectedMaterialItems = availableMaterials.filter(m => selectedMaterials.has(m.id));
    const selectedToolItems = availableTools.filter(t => selectedTools.has(t.id));

    onSelectionComplete({
      materials: selectedMaterialItems,
      tools: selectedToolItems
    });

    // Reset selections
    setSelectedMaterials(new Set());
    setSelectedTools(new Set());
    onOpenChange(false);
  };

  const renderItemCard = (item: StepItem, type: 'material' | 'tool') => {
    const isSelected = type === 'material' ? selectedMaterials.has(item.id) : selectedTools.has(item.id);
    const toggleHandler = type === 'material' ? handleMaterialToggle : handleToolToggle;
    const Icon = type === 'material' ? Package : Wrench;

    return (
      <Card 
        key={item.id}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'border-primary bg-primary/5 shadow-md' 
            : 'border-border hover:border-primary/50 hover:shadow-sm'
        }`}
        onClick={() => toggleHandler(item.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={() => toggleHandler(item.id)}
              className="mt-1"
            />
            <Icon className={`w-5 h-5 mt-0.5 ${item.isCompleted ? 'text-green-600' : 'text-primary'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                {item.isCompleted && (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
              </div>
              
              {item.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {item.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {item.stepName}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
                {item.unit && (
                  <span className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit}
                  </span>
                )}
              </div>

              {item.alternates && item.alternates.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">
                    Alternatives: {item.alternates.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (availableMaterials.length === 0 && availableTools.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={isMobile 
          ? "w-full h-full max-w-full max-h-full rounded-none border-0 p-0 [&>button]:hidden" 
          : "max-w-md max-h-[85vh] p-0 [&>button]:hidden"
        }>
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              No Materials Found
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Materials or Tools Available</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {showCompletedSteps 
                ? "This project doesn't have any materials or tools defined."
                : "All steps are completed, or no materials are needed for remaining steps."
              }
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile 
        ? "w-full h-full max-w-full max-h-full rounded-none border-0 p-0 [&>button]:hidden flex flex-col" 
        : "max-w-6xl w-[90vw] max-h-[90vh] h-[90vh] p-0 [&>button]:hidden flex flex-col"
      }>
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Select Materials & Tools Needed
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Choose items you need to purchase for your project. All items are shown by default.
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="ml-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
          {/* Project Stats & Controls */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 mb-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-xs">
                {stepStats.total} total steps
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stepStats.incomplete} incomplete
              </Badge>
              <Badge variant="default" className="text-xs">
                {availableMaterials.length + availableTools.length} items available
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-completed-steps"
                  checked={showCompletedSteps}
                  onCheckedChange={(checked) => setShowCompletedSteps(checked === true)}
                />
                <label htmlFor="show-completed-steps" className="text-sm font-medium">
                  Include items from completed steps
                </label>
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          {(selectedMaterials.size > 0 || selectedTools.size > 0) && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20 mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Selected:</span>
                <Badge variant="default" className="text-xs">
                  {selectedMaterials.size} materials
                </Badge>
                <Badge variant="default" className="text-xs">
                  {selectedTools.size} tools
                </Badge>
              </div>
              <Button 
                onClick={handleContinueToShopping}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Continue to Shopping
              </Button>
            </div>
          )}

          {/* Items Tabs */}
          <Tabs defaultValue="materials" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="materials" className="text-sm">
                Materials ({availableMaterials.length})
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-sm">
                Tools ({availableTools.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="materials" className="flex-1 min-h-0 flex flex-col mt-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="font-medium">Select Materials</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSelectAll('materials')} 
                    variant="outline" 
                    size="sm"
                    disabled={availableMaterials.length === 0}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={() => handleDeselectAll('materials')} 
                    variant="outline" 
                    size="sm"
                    disabled={selectedMaterials.size === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {availableMaterials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">
                        {showCompletedSteps 
                          ? "No materials found in this project."
                          : "No materials needed for incomplete steps."
                        }
                      </p>
                    </div>
                  ) : (
                    availableMaterials.map(material => renderItemCard(material, 'material'))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="tools" className="flex-1 min-h-0 flex flex-col mt-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="font-medium">Select Tools</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSelectAll('tools')} 
                    variant="outline" 
                    size="sm"
                    disabled={availableTools.length === 0}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={() => handleDeselectAll('tools')} 
                    variant="outline" 
                    size="sm"
                    disabled={selectedTools.size === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="space-y-3 pr-4">
                  {availableTools.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">
                        {showCompletedSteps 
                          ? "No tools found in this project."
                          : "No tools needed for incomplete steps."
                        }
                      </p>
                    </div>
                  ) : (
                    availableTools.map(tool => renderItemCard(tool, 'tool'))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleContinueToShopping}
              disabled={selectedMaterials.size === 0 && selectedTools.size === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Continue to Shopping ({selectedMaterials.size + selectedTools.size} items)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}