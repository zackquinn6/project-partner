import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { WorkflowStep, Material, Tool } from '@/interfaces/Project';

interface ToolsMaterialsSectionProps {
  currentStep: WorkflowStep;
  checkedMaterials: Set<string>;
  checkedTools: Set<string>;
  onToggleMaterial: (materialId: string) => void;
  onToggleTool: (toolId: string) => void;
}

export function ToolsMaterialsSection({
  currentStep,
  checkedMaterials,
  checkedTools,
  onToggleMaterial,
  onToggleTool
}: ToolsMaterialsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Ensure we have valid arrays and at least one has items
  const hasMaterials = Array.isArray(currentStep?.materials) && currentStep.materials.length > 0;
  const hasTools = Array.isArray(currentStep?.tools) && currentStep.tools.length > 0;

  if (!currentStep || (!hasMaterials && !hasTools)) {
    return null;
  }

  const materialsCount = currentStep.materials?.length || 0;
  const toolsCount = currentStep.tools?.length || 0;
  const checkedMaterialsCount = checkedMaterials.size;
  const checkedToolsCount = checkedTools.size;
  const allMaterialsChecked = materialsCount === 0 || checkedMaterialsCount === materialsCount;
  const allToolsChecked = toolsCount === 0 || checkedToolsCount === toolsCount;
  const allComplete = allMaterialsChecked && allToolsChecked;

  return (
    <Card className="gradient-card border-0 shadow-card" data-tutorial="tools-materials">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Tools & Materials</CardTitle>
            <Badge variant={allComplete ? "default" : "outline"} className={allComplete ? "bg-green-500 text-white text-xs" : "text-xs"}>
              {checkedMaterialsCount + checkedToolsCount}/{materialsCount + toolsCount}
            </Badge>
            {allComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Materials Column */}
            {currentStep.materials?.length > 0 && (
              <div className="space-y-2" data-tutorial="materials">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Materials</h4>
                  <Badge variant={allMaterialsChecked ? "default" : "outline"} className={allMaterialsChecked ? "bg-green-500 text-white text-xs" : "text-xs"}>
                    {checkedMaterialsCount}/{materialsCount}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {currentStep.materials.map(material => (
                    <div key={material.id} className="p-2.5 bg-background/50 rounded-lg">
                      <div className="flex items-start gap-2.5">
                        <Checkbox 
                          id={`material-${material.id}`}
                          checked={checkedMaterials.has(material.id)}
                          onCheckedChange={() => onToggleMaterial(material.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{material.name}</div>
                          {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                          {material.description && <div className="text-xs text-muted-foreground mt-1">{material.description}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools Column */}
            {currentStep.tools?.length > 0 && (
              <div className="space-y-2" data-tutorial="tools">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Tools</h4>
                  <Badge variant={allToolsChecked ? "default" : "outline"} className={allToolsChecked ? "bg-green-500 text-white text-xs" : "text-xs"}>
                    {checkedToolsCount}/{toolsCount}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {currentStep.tools.map(tool => (
                    <div key={tool.id} className="p-2.5 bg-background/50 rounded-lg">
                      <div className="flex items-start gap-2.5">
                        <Checkbox 
                          id={`tool-${tool.id}`}
                          checked={checkedTools.has(tool.id)}
                          onCheckedChange={() => onToggleTool(tool.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{tool.name}</div>
                          {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                          {tool.description && <div className="text-xs text-muted-foreground mt-1">{tool.description}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}