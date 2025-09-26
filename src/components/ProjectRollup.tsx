import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Material, Tool, Project } from '@/interfaces/Project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wrench, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
interface ItemUsage {
  id: string;
  name: string;
  description: string;
  category: string;
  alternates: string[];
  locations: {
    phase: string;
    operation: string;
    step: string;
    phaseId: string;
    operationId: string;
    stepId: string;
  }[];
}
const ProjectRollup: React.FC = () => {
  const {
    currentProject
  } = useProject();
  if (!currentProject) {
    return <Card>
        <CardContent className="py-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
          <p className="text-muted-foreground">Select a project to view its tools and materials rollup</p>
        </CardContent>
      </Card>;
  }
  const rollupData = extractToolsAndMaterials(currentProject);
  return <div className="space-y-6">
      <Card>
        
      </Card>

      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Materials ({rollupData.materials.length})
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Tools ({rollupData.tools.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <RollupSection items={rollupData.materials} type="material" />
        </TabsContent>

        <TabsContent value="tools">
          <RollupSection items={rollupData.tools} type="tool" />
        </TabsContent>
      </Tabs>
    </div>;
};
interface RollupSectionProps {
  items: ItemUsage[];
  type: 'material' | 'tool';
}
const RollupSection: React.FC<RollupSectionProps> = ({
  items,
  type
}) => {
  const requiredItems = items.filter(item => item.alternates && item.alternates.length > 0);
  const optionalItems = items.filter(item => !item.alternates || item.alternates.length === 0);
  const getCategoryColor = (category: string) => {
    const colors = {
      'Hardware': 'bg-blue-100 text-blue-800',
      'Software': 'bg-green-100 text-green-800',
      'Consumable': 'bg-orange-100 text-orange-800',
      'Hand Tool': 'bg-purple-100 text-purple-800',
      'Power Tool': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };
  const renderItemCard = (item: ItemUsage) => <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {item.alternates && item.alternates.length > 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              {item.name}
            </CardTitle>
            <CardDescription className="mt-1">{item.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={getCategoryColor(item.category)} variant="secondary">
              {item.category}
            </Badge>
            <Badge variant={item.alternates && item.alternates.length > 0 ? "default" : "outline"}>
              {item.alternates && item.alternates.length > 0 ? `+${item.alternates.length} alternatives` : "No alternatives"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            Where Used ({item.locations.length} {item.locations.length === 1 ? 'location' : 'locations'})
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {item.locations.map((location, index) => <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
                <div className="flex-1">
                  <div className="font-medium">{location.phase}</div>
                  <div className="text-muted-foreground">
                    {location.operation} → {location.step}
                  </div>
                </div>
              </div>)}
          </div>

          {item.locations.length > 3 && <div className="text-center">
              <Badge variant="outline" className="text-xs">
                Used across {item.locations.length} steps
              </Badge>
            </div>}
        </div>
      </CardContent>
    </Card>;
  return <div className="space-y-6">
      {requiredItems.length > 0 && <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Required {type === 'material' ? 'Materials' : 'Tools'} ({requiredItems.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requiredItems.map(renderItemCard)}
          </div>
        </div>}

      {optionalItems.length > 0 && <div>
          <Separator className="my-6" />
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Optional {type === 'material' ? 'Materials' : 'Tools'} ({optionalItems.length})
          </h3>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="optional-items">
              <AccordionTrigger className="hover:no-underline">
                <span className="text-sm text-muted-foreground">
                  View {optionalItems.length} optional {type === 'material' ? 'materials' : 'tools'}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                  {optionalItems.map(renderItemCard)}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>}

      {items.length === 0 && <Card>
          <CardContent className="py-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              No {type === 'material' ? 'Materials' : 'Tools'} Found
            </h3>
            <p className="text-muted-foreground">
              This project doesn't have any {type === 'material' ? 'materials' : 'tools'} defined yet
            </p>
          </CardContent>
        </Card>}
    </div>;
};
function extractToolsAndMaterials(project: Project): {
  materials: ItemUsage[];
  tools: ItemUsage[];
} {
  const materialsMap = new Map<string, ItemUsage>();
  const toolsMap = new Map<string, ItemUsage>();
  
  // Ensure phases is an array before iterating
  if (!project.phases || !Array.isArray(project.phases)) {
    return {
      materials: [],
      tools: []
    };
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
              alternates: material.alternates || [],
              locations: []
            });
          }
          materialsMap.get(key)!.locations.push({
            phase: phase.name,
            operation: operation.name,
            step: step.step,
            phaseId: phase.id,
            operationId: operation.id,
            stepId: step.id
          });
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
              alternates: tool.alternates || [],
              locations: []
            });
          }
          toolsMap.get(key)!.locations.push({
            phase: phase.name,
            operation: operation.name,
            step: step.step,
            phaseId: phase.id,
            operationId: operation.id,
            stepId: step.id
          });
        });
      });
    });
  });
  return {
    materials: Array.from(materialsMap.values()).sort((a, b) => {
      // Sort by alternatives count first, then by name
      const aHasAlts = a.alternates && a.alternates.length > 0;
      const bHasAlts = b.alternates && b.alternates.length > 0;
      if (aHasAlts !== bHasAlts) return aHasAlts ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    tools: Array.from(toolsMap.values()).sort((a, b) => {
      // Sort by alternatives count first, then by name
      const aHasAlts = a.alternates && a.alternates.length > 0;
      const bHasAlts = b.alternates && b.alternates.length > 0;
      if (aHasAlts !== bHasAlts) return aHasAlts ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
  };
}
export default ProjectRollup;