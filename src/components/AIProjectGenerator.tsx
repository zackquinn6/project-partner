import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';
import { 
  generateProjectWithAI, 
  calculateCostEstimate, 
  type ProjectGenerationRequest,
  type GeneratedProjectStructure,
  type CostEstimate 
} from '@/utils/aiProjectGenerator';
import { importGeneratedProject } from '@/utils/projectImportPipeline';

interface AIProjectGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

const PROJECT_CATEGORIES = [
  'Appliances', 'Bathroom', 'Ceilings', 'Decks & Patios', 'Doors & Windows', 
  'Electrical', 'Exterior Carpentry', 'Flooring', 'General Repairs & Maintenance', 
  'HVAC & Ventilation', 'Insulation & Weatherproofing', 'Interior Carpentry', 
  'Kitchen', 'Landscaping & Outdoor Projects', 'Lighting & Electrical', 
  'Masonry & Concrete', 'Painting & Finishing', 'Plumbing', 'Roofing', 
  'Safety & Security', 'Smart Home & Technology', 'Storage & Organization', 
  'Tile', 'Walls & Drywall'
];

export function AIProjectGenerator({ 
  open, 
  onOpenChange, 
  onProjectCreated 
}: AIProjectGeneratorProps) {
  const { user } = useAuth();
  const { fetchProjects } = useProject();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [aiModel, setAiModel] = useState<'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4o'>('gpt-4o-mini');
  const [includeWebScraping, setIncludeWebScraping] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProjectStructure | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'configure' | 'preview' | 'cost'>('configure');

  // Calculate cost estimate when inputs change
  useEffect(() => {
    if (projectName && selectedCategories.length > 0) {
      const estimate = calculateCostEstimate(projectName, 50, aiModel, includeWebScraping);
      setCostEstimate(estimate);
    }
  }, [projectName, selectedCategories, aiModel, includeWebScraping]);

  const handleGenerate = async () => {
    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    if (!user) {
      toast.error('Please sign in to generate projects');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedProject(null);
    setImportResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const request: ProjectGenerationRequest = {
        projectName,
        projectDescription: projectDescription || undefined,
        category: selectedCategories,
        aiModel,
        includeWebScraping,
      };

      const result = await generateProjectWithAI(request);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGeneratedProject(result);
      setActiveTab('preview');
      
      toast.success('Project generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate project');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleImport = async () => {
    if (!generatedProject || !user) {
      toast.error('No project to import or user not authenticated');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importGeneratedProject(
        projectName,
        projectDescription || projectName,
        selectedCategories,
        generatedProject,
        user.id
      );

      setImportResult(result);

      if (result.success && result.projectId) {
        toast.success('Project imported successfully!');
        // Refresh projects list
        await fetchProjects();
        if (onProjectCreated) {
          onProjectCreated(result.projectId);
        }
        // Reset form after successful import
        setTimeout(() => {
          handleReset();
          onOpenChange(false);
        }, 2000);
      } else {
        toast.error('Import completed with errors. Check the results.');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import project');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setProjectName('');
    setProjectDescription('');
    setSelectedCategories([]);
    setAiModel('gpt-4o-mini');
    setIncludeWebScraping(true);
    setGeneratedProject(null);
    setImportResult(null);
    setActiveTab('configure');
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Project Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedProject}>Preview</TabsTrigger>
            <TabsTrigger value="cost">Cost Estimate</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="flex-1 overflow-y-auto">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g., Interior Painting"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Categories *</Label>
                <div className="flex flex-wrap gap-2 p-4 border rounded-lg min-h-[100px]">
                  {PROJECT_CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => !isGenerating && toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={aiModel} onValueChange={(v) => setAiModel(v as any)} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Cost-effective)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Balanced)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Highest Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="webScraping"
                      checked={includeWebScraping}
                      onChange={(e) => setIncludeWebScraping(e.target.checked)}
                      disabled={isGenerating}
                      className="rounded"
                    />
                    <Label htmlFor="webScraping" className="cursor-pointer">Include Web Scraping</Label>
                  </div>
                </div>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating project...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !projectName.trim() || selectedCategories.length === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Project
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto">
            {generatedProject ? (
              <div className="space-y-4 py-4">
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>
                    Project generated successfully! Review the structure below, then import to create the project.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Phases: {generatedProject.phases.length}</h3>
                    <ScrollArea className="h-[300px] border rounded p-4">
                      {generatedProject.phases.map((phase, idx) => (
                        <div key={idx} className="mb-4 pb-4 border-b last:border-0">
                          <h4 className="font-medium">{phase.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                          <div className="ml-4 space-y-2">
                            {phase.operations.map((op, opIdx) => (
                              <div key={opIdx} className="text-sm">
                                <span className="font-medium">{op.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({op.steps.length} steps)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  {generatedProject.risks && generatedProject.risks.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Risks: {generatedProject.risks.length}</h3>
                      <div className="space-y-2">
                        {generatedProject.risks.map((risk, idx) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{risk.risk}</p>
                                <p className="text-sm text-muted-foreground mt-1">{risk.mitigation}</p>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Badge variant="outline">{risk.likelihood}</Badge>
                                <Badge variant="outline">{risk.impact}</Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult && (
                    <Alert variant={importResult.success ? 'default' : 'destructive'}>
                      {importResult.success ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <AlertDescription>
                        <div>
                          <p className="font-medium">
                            {importResult.success ? 'Import Successful' : 'Import Completed with Errors'}
                          </p>
                          <div className="mt-2 text-sm space-y-1">
                            <p>Phases: {importResult.stats?.phasesCreated || 0}</p>
                            <p>Operations: {importResult.stats?.operationsCreated || 0}</p>
                            <p>Steps: {importResult.stats?.stepsCreated || 0}</p>
                            <p>Instructions: {importResult.stats?.instructionsCreated || 0}</p>
                          </div>
                          {importResult.errors?.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Errors:</p>
                              <ul className="list-disc list-inside">
                                {importResult.errors.map((err: string, i: number) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="flex-1"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Import to Database
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isImporting}
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Generate a project to see preview
              </div>
            )}
          </TabsContent>

          <TabsContent value="cost" className="flex-1 overflow-y-auto">
            {costEstimate ? (
              <div className="space-y-4 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cost Estimate
                    </CardTitle>
                    <CardDescription>
                      Estimated costs for generating this project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Web Scraping</span>
                        <span className="font-medium">
                          ${costEstimate.scraping.estimated.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Processing ({costEstimate.aiProcessing.model})</span>
                        <span className="font-medium">
                          ${costEstimate.aiProcessing.estimated.toFixed(2)}
                        </span>
                      </div>
                      {costEstimate.aiProcessing.tokensUsed && (
                        <div className="text-sm text-muted-foreground ml-4">
                          <div>Input tokens: {costEstimate.aiProcessing.tokensUsed.input.toLocaleString()}</div>
                          <div>Output tokens: {costEstimate.aiProcessing.tokensUsed.output.toLocaleString()}</div>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Estimated Cost</span>
                        <span>${costEstimate.total.estimated.toFixed(2)}</span>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>
                        Actual costs may vary based on project complexity and AI model response length.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Enter project details to see cost estimate
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

