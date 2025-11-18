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
  AlertTriangle,
  X
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
  const [projectTemplates, setProjectTemplates] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedExistingProject, setSelectedExistingProject] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4o'>('gpt-4o-mini');
  const [includeWebScraping, setIncludeWebScraping] = useState(true);
  
  // Content selection checkboxes
  const [contentSelection, setContentSelection] = useState({
    structure: true,
    tools: true,
    materials: true,
    instructions3Level: true,
    instructions1Level: false,
    outputs: true,
    processVariables: true,
    timeEstimation: true,
    decisionTrees: true,
    alternateTools: true,
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProjectStructure | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'configure' | 'preview' | 'cost'>('configure');

  // Fetch project templates (only draft revisions) when dialog opens
  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        try {
          // Fetch all projects to find latest draft revisions
          const { data: allProjects, error: fetchError } = await supabase
            .from('projects')
            .select('id, name, description, category, publish_status, parent_project_id, revision_number')
            .neq('id', '00000000-0000-0000-0000-000000000000') // Exclude Manual Project Template
            .neq('id', '00000000-0000-0000-0000-000000000001') // Exclude Standard Project Foundation
            .order('name', { ascending: true });

          if (fetchError) {
            console.error('Error fetching project templates:', fetchError);
            toast.error('Failed to load project templates');
            return;
          }

          if (!allProjects) {
            setProjectTemplates([]);
            return;
          }

          // Group projects by parent (or own id if no parent)
          const projectGroups = new Map<string, any[]>();
          
          allProjects.forEach(project => {
            const parentId = project.parent_project_id || project.id;
            if (!projectGroups.has(parentId)) {
              projectGroups.set(parentId, []);
            }
            projectGroups.get(parentId)!.push(project);
          });

          // For each group, find the latest draft revision
          const draftRevisions: any[] = [];
          
          projectGroups.forEach((projects, parentId) => {
            // Filter to only draft revisions
            const drafts = projects.filter(p => p.publish_status === 'draft');
            
            if (drafts.length > 0) {
              // Get the latest draft revision (highest revision_number)
              const latestDraft = drafts.reduce((latest, current) => {
                const latestRev = latest.revision_number ?? 0;
                const currentRev = current.revision_number ?? 0;
                return currentRev > latestRev ? current : latest;
              });
              
              draftRevisions.push(latestDraft);
            }
          });

          setProjectTemplates(draftRevisions);
          console.log('✅ Loaded draft project revisions:', draftRevisions.map(p => `${p.name} (rev ${p.revision_number ?? 0})`));
        } catch (error) {
          console.error('Error fetching project templates:', error);
          toast.error('Failed to load project templates');
        }
      };

      fetchTemplates();
    }
  }, [open]);

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
        projectName: projectName.trim(),
        projectDescription: undefined, // AI will generate this
        category: selectedCategories,
        aiModel,
        includeWebScraping,
        contentSelection,
        aiInstructions: aiInstructions || undefined,
      };

      console.log('🚀 Generating project with request:', {
        projectName: request.projectName,
        category: request.category,
        aiInstructions: request.aiInstructions,
        contentSelection: request.contentSelection
      });

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

    // Check for duplicate project name (query database directly to ensure accuracy)
    if (!selectedExistingProject) {
      const normalizedName = projectName.trim().toLowerCase();
      const { data: existingProjects, error: checkError } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', projectName.trim());

      if (checkError) {
        toast.error('Failed to validate project name. Please try again.');
        return;
      }

      if (existingProjects && existingProjects.length > 0) {
        const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
        if (exactMatch) {
          toast.error('A project with this name already exists. Please choose a unique name.');
          return;
        }
      }
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Check if selected project is standard foundation - protect it
      if (selectedExistingProject === '00000000-0000-0000-0000-000000000001') {
        toast.error('Cannot edit Standard Project Foundation. Please select a different project or create a new one.');
        return;
      }

      const result = await importGeneratedProject(
        projectName,
        projectName, // AI will generate description
        selectedCategories,
        generatedProject,
        user.id,
        {
          // AI will generate effort level, skill level, and project challenges
          effortLevel: undefined,
          skillLevel: undefined,
          projectChallenges: undefined,
        },
        selectedExistingProject || undefined
      );

      setImportResult(result);

      if (result.success && result.projectId) {
        toast.success(selectedExistingProject ? 'Project updated successfully!' : 'Project imported successfully!');
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

  // Load existing project data when selected
  useEffect(() => {
    if (selectedExistingProject && projectTemplates) {
      const project = projectTemplates.find(p => p.id === selectedExistingProject);
      if (project) {
        setProjectName(project.name);
        setSelectedCategories(project.category || []);
        // Don't load description, effort level, skill level, or project challenges - AI will generate these
      }
    }
  }, [selectedExistingProject, projectTemplates]);

  const handleReset = () => {
    setProjectName('');
    setAiInstructions('');
    setSelectedCategories([]);
    setSelectedExistingProject(null);
    setAiModel('gpt-4o-mini');
    setIncludeWebScraping(true);
    setGeneratedProject(null);
    setImportResult(null);
    setActiveTab('configure');
    setContentSelection({
      structure: true,
      tools: true,
      materials: true,
      instructions3Level: true,
      instructions1Level: false,
      outputs: true,
      processVariables: true,
      timeEstimation: true,
      decisionTrees: true,
      alternateTools: true,
    });
  };

  const toggleContentSelection = (key: keyof typeof contentSelection) => {
    setContentSelection(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Project Generator
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedProject}>Preview</TabsTrigger>
            <TabsTrigger value="cost">Cost Estimate</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            <div className="space-y-6">
              {/* Select Existing Project Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Existing Project (Optional)</CardTitle>
                  <CardDescription>
                    Choose an existing draft revision to update with new AI-generated content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select 
                    value={selectedExistingProject || 'new'} 
                    onValueChange={(value) => setSelectedExistingProject(value === 'new' ? null : value)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a draft revision to update (or leave blank for new project)" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Create New Project</SelectItem>
                    {projectTemplates.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} {project.revision_number ? `(Rev ${project.revision_number})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Only draft revisions are shown. If a project is published and has no draft revision, 
                    you'll need to create a new revision in Project Management before using the AI generator.
                  </p>
                  {projectTemplates.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No draft revisions available. Create a new project or create a draft revision of an existing project.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Project Generator Instructions Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Generator Instructions</CardTitle>
                  <CardDescription>
                    The AI will generate a complete project structure based on your specifications. 
                    Use the content selection options below to control what gets populated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• The generator will create phases, operations, and steps based on best practices for your project type</p>
                  <p>• Tools and materials will be matched against your existing library</p>
                  <p>• Instructions will be generated at the skill levels you select</p>
                  <p>• Process variables, outputs, and time estimates will be included based on your selections</p>
                  <p>• Decision trees can create "if necessary" operations and alternative operation paths</p>
                  <p>• Alternate tools allow multiple tool options for the same operation (e.g., standard vs automated paint roller)</p>
                </CardContent>
              </Card>

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
                <Label htmlFor="aiInstructions">AI Instructions</Label>
                <Textarea
                  id="aiInstructions"
                  placeholder="Provide specific instructions for the AI generator (e.g., 'Focus on beginner-friendly steps', 'Include safety warnings for electrical work', 'Emphasize cost-saving techniques')..."
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  disabled={isGenerating}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These instructions guide the AI in generating project content. Description, effort level, skill level, and project challenges will be automatically generated by the AI.
                </p>
              </div>

              {/* Content Selection Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content to Populate</CardTitle>
                  <CardDescription>
                    Select which content elements should be generated for this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-structure"
                        checked={contentSelection.structure}
                        onChange={() => toggleContentSelection('structure')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-structure" className="cursor-pointer font-normal">
                        Structure (Phases, Operations, Steps)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-tools"
                        checked={contentSelection.tools}
                        onChange={() => toggleContentSelection('tools')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-tools" className="cursor-pointer font-normal">
                        Tools
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-materials"
                        checked={contentSelection.materials}
                        onChange={() => toggleContentSelection('materials')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-materials" className="cursor-pointer font-normal">
                        Materials
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-instructions3"
                        checked={contentSelection.instructions3Level}
                        onChange={() => toggleContentSelection('instructions3Level')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-instructions3" className="cursor-pointer font-normal">
                        3-Level Instructions (Quick, Detailed, Contractor)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-instructions1"
                        checked={contentSelection.instructions1Level}
                        onChange={() => toggleContentSelection('instructions1Level')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-instructions1" className="cursor-pointer font-normal">
                        1-Level Instructions (Detailed Only)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-outputs"
                        checked={contentSelection.outputs}
                        onChange={() => toggleContentSelection('outputs')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-outputs" className="cursor-pointer font-normal">
                        Outputs
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-process-variables"
                        checked={contentSelection.processVariables}
                        onChange={() => toggleContentSelection('processVariables')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-process-variables" className="cursor-pointer font-normal">
                        Process Variables
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-time-estimation"
                        checked={contentSelection.timeEstimation}
                        onChange={() => toggleContentSelection('timeEstimation')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-time-estimation" className="cursor-pointer font-normal">
                        Time Estimation
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-decision-trees"
                        checked={contentSelection.decisionTrees}
                        onChange={() => toggleContentSelection('decisionTrees')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-decision-trees" className="cursor-pointer font-normal">
                        Decision Trees (Alternative Operations & If-Necessary Steps)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="content-alternate-tools"
                        checked={contentSelection.alternateTools}
                        onChange={() => toggleContentSelection('alternateTools')}
                        disabled={isGenerating}
                        className="rounded"
                      />
                      <Label htmlFor="content-alternate-tools" className="cursor-pointer font-normal">
                        Alternate Tools
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Tree Rules Section */}
              {(contentSelection.decisionTrees || contentSelection.alternateTools) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alternate Tools vs Alternate Operations Rule</CardTitle>
                    <CardDescription>
                      Understanding when to use alternate tools versus creating separate alternative operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-semibold mb-2">Use Alternate Tools when:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                        <li>The same operation/process can be completed with different tool options</li>
                        <li>Tools perform the same function but with different features or automation levels</li>
                        <li>Example: Standard paint roller vs Automated paint roller (both roll paint, same process)</li>
                        <li>Example: Manual screwdriver vs Electric screwdriver (both drive screws, same process)</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-semibold mb-2">Use Alternate Operations when:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                        <li>The process/methodology is fundamentally different, not just the tool</li>
                        <li>Different techniques require different steps, safety considerations, or workflows</li>
                        <li>Example: Painting with roller vs Painting with sprayer (different techniques, different steps)</li>
                        <li>Example: Hand sanding vs Machine sanding (different processes, different time/effort)</li>
                        <li>Example: "If necessary" operations like wall spackling (conditional step based on wall condition)</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Key Differentiator:</p>
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Same process, different tools = Alternate Tools</strong> | 
                        <strong> Different process/methodology = Alternate Operations</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

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

          <TabsContent value="preview" className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {generatedProject ? (
              <div className="space-y-4">
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

          <TabsContent value="cost" className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {costEstimate ? (
              <div className="space-y-4">
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

