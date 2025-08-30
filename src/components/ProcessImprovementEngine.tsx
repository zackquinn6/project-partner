import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/interfaces/Project';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  Loader2,
  ExternalLink,
  Wrench,
  Plus,
  RotateCcw,
  Shield
} from 'lucide-react';

interface ImprovementRecommendation {
  id: string;
  type: 'step-addition' | 'step-modification' | 'tool-update' | 'tip-addition' | 'process-reorder';
  title: string;
  description: string;
  currentStep?: string;
  proposedChange: string;
  reasoning: string;
  confidence: number;
  source: string;
  sourceType: 'manufacturer' | 'industry-guide' | 'safety-standard' | 'best-practice';
  validated: boolean;
}

interface ProcessImprovementEngineProps {
  project: Project;
  onProjectUpdate: (updatedProject: Project) => void;
  onClose: () => void;
}

export const ProcessImprovementEngine: React.FC<ProcessImprovementEngineProps> = ({ 
  project, 
  onProjectUpdate, 
  onClose 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [improvements, setImprovements] = useState<ImprovementRecommendation[]>([]);
  const [selectedImprovements, setSelectedImprovements] = useState<Set<string>>(new Set());
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [searchQueriesUsed, setSearchQueriesUsed] = useState<string[]>([]);
  const [sourcesAnalyzed, setSourcesAnalyzed] = useState(0);
  const { toast } = useToast();

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setImprovements([]);
    setSelectedImprovements(new Set());
    setAnalysisComplete(false);

    try {
      console.log('Starting process improvement analysis for project:', project.name);
      
      const { data, error } = await supabase.functions.invoke('process-improvement-analysis', {
        body: { project }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Analysis failed');
      }

      console.log('Analysis completed successfully:', data);
      
      setImprovements(data.improvements || []);
      setSearchQueriesUsed(data.searchQueriesUsed || []);
      setSourcesAnalyzed(data.sourcesAnalyzed || 0);
      setAnalysisComplete(true);

      toast({
        title: "Analysis Complete",
        description: `Found ${data.improvements?.length || 0} improvement recommendations`
      });

    } catch (error) {
      console.error('Process improvement analysis failed:', error);
      toast({
        title: "Analysis Failed", 
        description: error.message || "Unable to analyze workflow. Please try again.",
        variant: "destructive"
      });
    }

    setIsAnalyzing(false);
  };

  const toggleImprovement = (improvementId: string) => {
    const newSelected = new Set(selectedImprovements);
    if (newSelected.has(improvementId)) {
      newSelected.delete(improvementId);
    } else {
      newSelected.add(improvementId);
    }
    setSelectedImprovements(newSelected);
  };

  const implementSelectedImprovements = async () => {
    if (selectedImprovements.size === 0) {
      toast({
        title: "No Improvements Selected",
        description: "Please select at least one improvement to implement.",
        variant: "destructive"
      });
      return;
    }

    const selectedImprovementsList = improvements.filter(imp => 
      selectedImprovements.has(imp.id)
    );

    // Create updated project with improvements applied
    let updatedProject = { ...project };

    selectedImprovementsList.forEach(improvement => {
      updatedProject = applyImprovementToProject(updatedProject, improvement);
    });

    // Update timestamp
    updatedProject.updatedAt = new Date();

    // Call the update function
    onProjectUpdate(updatedProject);

    toast({
      title: "Improvements Applied",
      description: `Successfully applied ${selectedImprovements.size} improvements to ${project.name}`
    });

    // Close the dialog
    onClose();
  };

  const applyImprovementToProject = (currentProject: Project, improvement: ImprovementRecommendation): Project => {
    const updatedProject = { ...currentProject };

    switch (improvement.type) {
      case 'step-addition':
        // Add new step to the appropriate phase/operation
        // For simplicity, add to the first operation of the first phase
        if (updatedProject.phases.length > 0 && updatedProject.phases[0].operations.length > 0) {
          const newStep = {
            id: `step-${Date.now()}`,
            step: improvement.title,
            description: improvement.description,
            content: improvement.description,
            contentType: 'text' as const,
            contentSections: [{
              id: `section-${Date.now()}`,
              type: 'text' as const,
              content: improvement.proposedChange,
              title: 'Process Improvement',
              width: 'full' as const,
              alignment: 'left' as const
            }],
            timeEstimate: '10-15 minutes',
            materials: [],
            tools: [],
            outputs: [],
            flowType: 'linear' as const
          };
          updatedProject.phases[0].operations[0].steps.push(newStep);
        }
        break;

      case 'step-modification':
        // Find and modify existing step
        updatedProject.phases.forEach(phase => {
          phase.operations.forEach(operation => {
            const stepIndex = operation.steps.findIndex(step => 
              step.step.toLowerCase().includes(improvement.currentStep?.toLowerCase() || '')
            );
            if (stepIndex !== -1) {
              const currentStep = operation.steps[stepIndex];
              operation.steps[stepIndex] = {
                ...currentStep,
                content: currentStep.content + '\n\n' + improvement.proposedChange,
                contentSections: currentStep.contentSections ? [
                  ...currentStep.contentSections,
                  {
                    id: `section-${Date.now()}`,
                    type: 'text' as const,
                    content: improvement.proposedChange,
                    title: 'Improvement Note',
                    width: 'full' as const,
                    alignment: 'left' as const
                  }
                ] : [{
                  id: `section-${Date.now()}`,
                  type: 'text' as const,
                  content: improvement.proposedChange,
                  title: 'Improvement Note',
                  width: 'full' as const,
                  alignment: 'left' as const
                }]
              };
            }
          });
        });
        break;

      case 'tool-update':
        // Add recommended tools to project
        // This would require updating the tools library or step-specific tools
        break;

      default:
        console.log('Improvement type not yet implemented:', improvement.type);
    }

    return updatedProject;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'step-addition': return <Plus className="w-4 h-4 text-green-500" />;
      case 'step-modification': return <RotateCcw className="w-4 h-4 text-blue-500" />;
      case 'tool-update': return <Wrench className="w-4 h-4 text-purple-500" />;
      case 'tip-addition': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'process-reorder': return <RotateCcw className="w-4 h-4 text-orange-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'manufacturer': return 'bg-blue-500/10 text-blue-500';
      case 'industry-guide': return 'bg-green-500/10 text-green-500';
      case 'safety-standard': return 'bg-red-500/10 text-red-500';
      case 'best-practice': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Process Improvement Analysis
          </h2>
          <p className="text-muted-foreground">
            AI-powered workflow analysis for {project.name}
          </p>
        </div>
        
        {!analysisComplete && (
          <Button 
            onClick={runAnalysis} 
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Start Analysis
              </>
            )}
          </Button>
        )}
      </div>

      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-medium">Analyzing Workflow</p>
                <p className="text-sm text-muted-foreground">
                  Researching best practices and industry standards...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisComplete && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Improvements Found</p>
                    <p className="text-2xl font-bold">{improvements.length}</p>
                  </div>
                  <Brain className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sources Analyzed</p>
                    <p className="text-2xl font-bold">{sourcesAnalyzed}</p>
                  </div>
                  <ExternalLink className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                    <p className="text-2xl font-bold">
                      {improvements.length > 0 
                        ? Math.round(improvements.reduce((sum, imp) => sum + imp.confidence, 0) / improvements.length)
                        : 0}%
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {improvements.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No improvements found. Your workflow appears to follow current best practices!
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Improvement Recommendations</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedImprovements.size} selected
                    </span>
                    <Button 
                      onClick={implementSelectedImprovements}
                      disabled={selectedImprovements.size === 0}
                      size="sm"
                    >
                      Apply Selected
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {improvements.map((improvement) => (
                      <div key={improvement.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedImprovements.has(improvement.id)}
                            onCheckedChange={() => toggleImprovement(improvement.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(improvement.type)}
                              <h3 className="font-semibold">{improvement.title}</h3>
                              <Badge className={getSourceTypeColor(improvement.sourceType)}>
                                {improvement.sourceType}
                              </Badge>
                              <Badge variant="outline">
                                {improvement.confidence}% confidence
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {improvement.description}
                            </p>

                            {improvement.currentStep && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Affects step:</span> {improvement.currentStep}
                              </div>
                            )}

                            <div className="bg-muted/50 p-3 rounded text-sm">
                              <p className="font-medium mb-1">Proposed Change:</p>
                              <p>{improvement.proposedChange}</p>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Reasoning:</span> {improvement.reasoning}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Source:</span> {improvement.source}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setAnalysisComplete(false)}>
              Run New Analysis
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
};