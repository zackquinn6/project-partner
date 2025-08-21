import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video, AlertTriangle, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { Output } from '@/interfaces/Project';
import ProjectListing from './ProjectListing';
import { OutputDetailPopup } from './OutputDetailPopup';
import { AccountabilityMessagePopup } from './AccountabilityMessagePopup';
import { PhaseRatingPopup } from './PhaseRatingPopup';
import { HelpPopup } from './HelpPopup';
import { PhaseCompletionPopup } from './PhaseCompletionPopup';
import { KickoffWorkflow } from './KickoffWorkflow';
import { isKickoffPhaseComplete } from '@/utils/projectUtils';
interface UserViewProps {
  resetToListing?: boolean;
  onProjectSelected?: () => void;
  projectRunId?: string;
}
export default function UserView({
  resetToListing,
  onProjectSelected,
  projectRunId
}: UserViewProps = {}) {
  const {
    currentProject,
    currentProjectRun,
    projectRuns,
    setCurrentProjectRun,
    updateProjectRun
  } = useProject();
  const [viewMode, setViewMode] = useState<'listing' | 'workflow'>('listing');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, Set<string>>>({});
  const [checkedTools, setCheckedTools] = useState<Record<string, Set<string>>>({});
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  
  // Issue report state
  const [issueReportOpen, setIssueReportOpen] = useState(false);
  const [reportIssues, setReportIssues] = useState({
    instructionsNotClear: false,
    missingTools: false,
    toolMalfunction: false,
    missingWrongMaterials: false,
    defectiveMaterials: false,
    unplannedWork: false,
    mistakeMade: false,
    injuryNearMiss: false,
    partnerDelay: false,
    weatherDelay: false
  });
  const [reportComments, setReportComments] = useState("");
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [outputPopupOpen, setOutputPopupOpen] = useState(false);
  const [helpPopupOpen, setHelpPopupOpen] = useState(false);
  const [accountabilityPopupOpen, setAccountabilityPopupOpen] = useState(false);
  const [messageType, setMessageType] = useState<'phase-complete' | 'issue-report'>('phase-complete');

  // Phase rating state
  const [phaseRatingOpen, setPhaseRatingOpen] = useState(false);
  const [currentCompletedPhaseName, setCurrentCompletedPhaseName] = useState<string>("");
  const [phaseCompletionOpen, setPhaseCompletionOpen] = useState(false);

  // Get the active project data from either currentProject or currentProjectRun
  const activeProject = currentProjectRun || currentProject;
  
  // Flatten all steps from all phases and operations for navigation
  const allSteps = activeProject?.phases.flatMap(phase => phase.operations.flatMap(operation => operation.steps.map(step => ({
    ...step,
    phaseName: phase.name,
    operationName: operation.name
  })))) || [];

  // Load project run if projectRunId is provided
  useEffect(() => {
    if (projectRunId) {
      const projectRun = projectRuns.find(run => run.id === projectRunId);
      if (projectRun) {
        setCurrentProjectRun(projectRun);
        setViewMode('workflow');
      }
    }
  }, [projectRunId, projectRuns, setCurrentProjectRun]);

  // Auto-switch to workflow view when a project or project run is selected (but respect resetToListing)
  useEffect(() => {
    if ((currentProject || currentProjectRun) && !resetToListing) {
      console.log("Auto-switching to workflow mode");
      setViewMode('workflow');
    }
  }, [currentProject, currentProjectRun, resetToListing]);

  // Reset to listing view when projects view is requested
  useEffect(() => {
    if (resetToListing) {
      console.log("Resetting to listing mode due to resetToListing prop");
      setViewMode('listing');
    }
  }, [resetToListing]);
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? completedSteps.size / allSteps.length * 100 : 0;
  
  // Update project run progress whenever completed steps change
  useEffect(() => {
    if (currentProjectRun && allSteps.length > 0) {
      const calculatedProgress = completedSteps.size / allSteps.length * 100;
      if (Math.abs(calculatedProgress - (currentProjectRun.progress || 0)) > 0.1) {
        const updatedProjectRun = {
          ...currentProjectRun,
          progress: calculatedProgress,
          completedSteps: Array.from(completedSteps),
          updatedAt: new Date()
        };
        updateProjectRun(updatedProjectRun);
      }
    }
  }, [completedSteps, currentProjectRun, allSteps.length, updateProjectRun]);
  const handleNext = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  // Helper functions for check-off functionality
  const toggleMaterialCheck = (stepId: string, materialId: string) => {
    setCheckedMaterials(prev => {
      const stepMaterials = prev[stepId] || new Set();
      const newSet = new Set(stepMaterials);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  const toggleToolCheck = (stepId: string, toolId: string) => {
    setCheckedTools(prev => {
      const stepTools = prev[stepId] || new Set();
      const newSet = new Set(stepTools);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  const toggleOutputCheck = (stepId: string, outputId: string) => {
    setCheckedOutputs(prev => {
      const stepOutputs = prev[stepId] || new Set();
      const newSet = new Set(stepOutputs);
      if (newSet.has(outputId)) {
        newSet.delete(outputId);
      } else {
        newSet.add(outputId);
      }
      return { ...prev, [stepId]: newSet };
    });
  };

  // Check if all outputs are completed (required for step completion)
  const areAllOutputsCompleted = (step: typeof currentStep) => {
    if (!step || !step.outputs || step.outputs.length === 0) return true;
    const stepOutputs = checkedOutputs[step.id] || new Set();
    return step.outputs.every(output => stepOutputs.has(output.id));
  };

  const handleComplete = () => {
    if (currentStep && areAllOutputsCompleted(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
      
      // Check if this completes a phase
      const currentPhase = getCurrentPhase();
      const phaseSteps = getAllStepsInPhase(currentPhase);
      const newCompletedSteps = new Set([...completedSteps, currentStep.id]);
      const isPhaseComplete = phaseSteps.every(step => newCompletedSteps.has(step.id));
      
      if (isPhaseComplete) {
        setCurrentCompletedPhaseName(currentPhase.name);
        setPhaseCompletionOpen(true);
      }
      
      if (currentStepIndex < allSteps.length - 1) {
        handleNext();
      }
    }
  };

  // Helper functions for phase completion check
  const getCurrentPhase = () => {
    if (!currentStep || !activeProject) return null;
    
    for (const phase of activeProject.phases) {
      for (const operation of phase.operations) {
        if (operation.steps.some(step => step.id === currentStep.id)) {
          return phase;
        }
      }
    }
    return null;
  };

  const getAllStepsInPhase = (phase: any) => {
    if (!phase) return [];
    return phase.operations.flatMap((operation: any) => operation.steps);
  };

  // Handle phase rating submission
  const handlePhaseRatingSubmit = async (rating: number) => {
    if (!currentProjectRun) return;

    const ratingData = {
      phaseId: getCurrentPhase()?.id,
      phaseName: currentCompletedPhaseName,
      rating,
      timestamp: new Date().toISOString()
    };

    // Add to existing phase ratings array
    const updatedPhaseRatings = [
      ...(currentProjectRun.phase_ratings || []),
      ratingData
    ];

    // Update project run with new rating
    await updateProjectRun({
      ...currentProjectRun,
      phase_ratings: updatedPhaseRatings,
      updatedAt: new Date()
    });
    
    console.log("Phase Rating:", ratingData);
    
    // Show accountability partner message after rating
    setMessageType('phase-complete');
    setAccountabilityPopupOpen(true);
  };

  // Handle issue report from phase rating
  const handleReportIssueFromRating = () => {
    setPhaseRatingOpen(false);
    setIssueReportOpen(true);
  };
  // Handle issue report submission
  const handleReportSubmit = async () => {
    if (!currentProjectRun) return;

    const issueReportData = {
      stepId: currentStep?.id,
      phaseId: getCurrentPhase()?.id,
      phaseName: getCurrentPhase()?.name,
      step: currentStep?.step,
      issues: reportIssues,
      comments: reportComments,
      timestamp: new Date().toISOString()
    };

    // Add to existing issue reports array
    const updatedIssueReports = [
      ...(currentProjectRun.issue_reports || []),
      issueReportData
    ];

    // Update project run with new issue report
    await updateProjectRun({
      ...currentProjectRun,
      issue_reports: updatedIssueReports,
      updatedAt: new Date()
    });

    // Show accountability partner message
    setMessageType('issue-report');
    setAccountabilityPopupOpen(true);

    // Log the issue report for debugging
    console.log("Issue Report:", issueReportData);
    
    // Reset form and close dialog
    setReportIssues({
      instructionsNotClear: false,
      missingTools: false,
      toolMalfunction: false,
      missingWrongMaterials: false,
      defectiveMaterials: false,
      unplannedWork: false,
      mistakeMade: false,
      injuryNearMiss: false,
      partnerDelay: false,
      weatherDelay: false
    });
    setReportComments("");
    setIssueReportOpen(false);
  };
  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;
    switch (step.contentType) {
      case 'document':
        return <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <div className="text-foreground break-all">
                {step.content}
              </div>
            </div>
          </div>;
      case 'image':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-primary" />
              <span className="font-medium">Visual Reference</span>
            </div>
            {step.image && <img src={step.image} alt={step.step} className="w-full rounded-lg shadow-card max-w-2xl" />}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{step.content}</div>
            </div>
          </div>;
      case 'video':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <span className="font-medium">Tutorial Video</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden shadow-card">
              <iframe src={step.content} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>;
      default:
        return <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {step.content}
            </div>
          </div>;
    }
  };

  // Group steps by phase and operation for sidebar navigation
  const groupedSteps = activeProject?.phases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>) || {};
  // Check if kickoff phase is complete for project runs
  const isKickoffComplete = currentProjectRun ? isKickoffPhaseComplete(currentProjectRun.completedSteps) : true;
  
  console.log("UserView debug:", {
    resetToListing,
    viewMode,
    currentProjectRun: !!currentProjectRun,
    currentProject: !!currentProject,
    completedSteps: currentProjectRun?.completedSteps,
    isKickoffComplete
  });
  
  // FIRST: If explicitly requesting listing mode or no projects selected, show project listing
  if (resetToListing || viewMode === 'listing' || (!currentProject && !currentProjectRun)) {
    return <ProjectListing 
      onProjectSelect={project => {
        console.log("Project selected:", project);
        if (project === null) {
          // Force stay in listing mode (e.g., after deletion)
          setViewMode('listing');
          return;
        }
        if (project === 'workflow') {
          // Signal from ProjectListing to switch to workflow mode
          setViewMode('workflow');
          return;
        }
        // Only change to workflow mode if user explicitly selects a project
        setViewMode('workflow');
        onProjectSelected?.();
      }} 
    />;
  }
  
  // SECOND: If project run exists and kickoff is not complete, show kickoff workflow
  if (currentProjectRun && !isKickoffComplete && viewMode === 'workflow') {
    return (
      <KickoffWorkflow 
        onKickoffComplete={async () => {
          console.log("onKickoffComplete called");
          // Ensure kickoff phase is properly marked as complete
          if (currentProjectRun && updateProjectRun) {
            const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
            const allKickoffStepsComplete = kickoffStepIds.every(id => 
              currentProjectRun.completedSteps.includes(id)
            );
            
            console.log("All kickoff steps complete:", allKickoffStepsComplete);
            
            if (allKickoffStepsComplete) {
              // Update project status to in-progress
              await updateProjectRun({
                ...currentProjectRun,
                status: 'in-progress',
                updatedAt: new Date()
              });
              
              console.log("Project status updated to in-progress, forcing re-render");
              // Force component to re-render and show main workflow by updating state
              setViewMode('workflow');
              // Small delay to ensure state update is processed
              setTimeout(() => {
                console.log("Forced re-render completed");
              }, 100);
            } else {
              console.warn("Not all kickoff steps are complete, cannot proceed to workflow");
            }
          }
        }} 
      />
    );
  }

  // If current project has no workflow steps
  if (allSteps.length === 0) {
    return <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This project under construction - check back soon!
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="container mx-auto px-6 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
            <CardDescription>
              Step {currentStepIndex + 1} of {allSteps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-4">
              {Object.entries(groupedSteps).map(([phase, operations]) => <div key={phase} className="space-y-2">
                  <h4 className="font-semibold text-primary">{phase}</h4>
                  {Object.entries(operations).map(([operation, opSteps]) => <div key={operation} className="ml-2 space-y-1">
                      <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                      {opSteps.map(step => {
                  const stepIndex = allSteps.findIndex(s => s.id === step.id);
                  return <div key={step.id} className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${step.id === currentStep?.id ? 'bg-primary/10 text-primary border border-primary/20' : completedSteps.has(step.id) ? 'bg-green-50 text-green-700 border border-green-200' : 'hover:bg-muted/50'}`} onClick={() => setCurrentStepIndex(stepIndex)}>
                            <div className="flex items-center gap-2">
                              {completedSteps.has(step.id) && <CheckCircle className="w-4 h-4" />}
                              <span className="truncate">{step.step}</span>
                            </div>
                          </div>;
                })}
                    </div>)}
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header with Help Button */}
          <div className="flex justify-between items-start gap-4">
            <Card className="gradient-card border-0 shadow-card flex-1">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {currentStep?.phaseName}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">
                  {currentStep?.operationName}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
              {currentStep?.description && <CardDescription className="text-base">
                  {currentStep.description}
                 </CardDescription>}
            </CardHeader>
          </Card>
          <Button 
            variant="outline" 
            onClick={() => setHelpPopupOpen(true)}
            className="whitespace-nowrap bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          >
            Stuck? Get Help
          </Button>
          </div>

          {/* Content */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-8">
              {renderContent(currentStep)}
            </CardContent>
          </Card>

          {/* Materials, Tools, and Outputs */}
          {currentStep && (currentStep.materials?.length > 0 || currentStep.tools?.length > 0 || currentStep.outputs?.length > 0) && <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-6">
                <Accordion type="multiple" defaultValue={["materials", "tools", "outputs"]} className="w-full">
                  {/* Materials */}
                  {currentStep.materials?.length > 0 && (() => {
                    const stepMaterials = checkedMaterials[currentStep.id] || new Set();
                    const completedCount = stepMaterials.size;
                    const totalCount = currentStep.materials.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="materials">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Materials Needed</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.materials.map(material => <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`material-${material.id}`}
                                  checked={stepMaterials.has(material.id)}
                                  onCheckedChange={() => toggleMaterialCheck(currentStep.id, material.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{material.name}</div>
                                  {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                                  {material.description && <div className="text-sm text-muted-foreground mt-1">{material.description}</div>}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}

                  {/* Tools */}
                  {currentStep.tools?.length > 0 && (() => {
                    const stepTools = checkedTools[currentStep.id] || new Set();
                    const completedCount = stepTools.size;
                    const totalCount = currentStep.tools.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="tools">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Tools Required</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.tools.map(tool => <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`tool-${tool.id}`}
                                  checked={stepTools.has(tool.id)}
                                  onCheckedChange={() => toggleToolCheck(currentStep.id, tool.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{tool.name}</div>
                                    {tool.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                  </div>
                                  {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                                  {tool.description && <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>}
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}

                  {/* Outputs */}
                  {currentStep.outputs?.length > 0 && (() => {
                    const stepOutputs = checkedOutputs[currentStep.id] || new Set();
                    const completedCount = stepOutputs.size;
                    const totalCount = currentStep.outputs.length;
                    const isAllCompleted = completedCount === totalCount;
                    
                    return <AccordionItem value="outputs">
                      <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Outputs</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white" : ""}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {currentStep.outputs.map(output => <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  id={`output-${output.id}`}
                                  checked={stepOutputs.has(output.id)}
                                  onCheckedChange={() => toggleOutputCheck(currentStep.id, output.id)}
                                  className="mt-1"
                                />
                                 <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                     <div className="font-medium">Project Overview</div>
                                     <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                                     <button
                                       onClick={() => {
                                         setSelectedOutput(output);
                                         setOutputPopupOpen(true);
                                       }}
                                       className="p-1 rounded-full hover:bg-muted transition-colors"
                                       title="View output details"
                                     >
                                       <Info className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                     </button>
                                   </div>
                                   <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                                 </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}
                </Accordion>
              </CardContent>
            </Card>}

          {/* Navigation */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                

                <div className="flex items-center gap-3">
                  {currentStep && !completedSteps.has(currentStep.id) && (
                    areAllOutputsCompleted(currentStep) ? (
                      <Button onClick={handleComplete} className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    ) : (
                      <Button disabled className="opacity-50 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete All Outputs First
                      </Button>
                    )
                  )}
                  
                  {/* Report Issue Button */}
                  <Dialog open={issueReportOpen} onOpenChange={setIssueReportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Report Issue
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Oh no - What happened?</DialogTitle>
                        <DialogDescription>
                          Help us improve this step by reporting any issues you encountered.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="instructions-not-clear"
                              checked={reportIssues.instructionsNotClear}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, instructionsNotClear: !!checked }))
                              }
                            />
                            <Label htmlFor="instructions-not-clear">Instructions not clear — missing steps, measurements, or sequence confusion</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="missing-tools"
                              checked={reportIssues.missingTools}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, missingTools: !!checked }))
                              }
                            />
                            <Label htmlFor="missing-tools">Missing tools — item not delivered or misplaced before use</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="tool-malfunction"
                              checked={reportIssues.toolMalfunction}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, toolMalfunction: !!checked }))
                              }
                            />
                            <Label htmlFor="tool-malfunction">Tool malfunction — breaks or operates incorrectly during project</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="missing-wrong-materials"
                              checked={reportIssues.missingWrongMaterials}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, missingWrongMaterials: !!checked }))
                              }
                            />
                            <Label htmlFor="missing-wrong-materials">Missing / wrong materials — absent, wrong type, or wrong quantity</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="defective-materials"
                              checked={reportIssues.defectiveMaterials}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, defectiveMaterials: !!checked }))
                              }
                            />
                            <Label htmlFor="defective-materials">Defective materials — damaged, expired, or unsafe to use</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="unplanned-work"
                              checked={reportIssues.unplannedWork}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, unplannedWork: !!checked }))
                              }
                            />
                            <Label htmlFor="unplanned-work">Unplanned work discovered — hidden damage, compliance surprises, new tasks needed</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="mistake-made"
                              checked={reportIssues.mistakeMade}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, mistakeMade: !!checked }))
                              }
                            />
                            <Label htmlFor="mistake-made">Mistake made / materials damaged — user error that requires fix or replacement</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="injury-near-miss"
                              checked={reportIssues.injuryNearMiss}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, injuryNearMiss: !!checked }))
                              }
                            />
                            <Label htmlFor="injury-near-miss">Injury or near‑miss — any safety incident needing immediate attention</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="partner-delay"
                              checked={reportIssues.partnerDelay}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, partnerDelay: !!checked }))
                              }
                            />
                            <Label htmlFor="partner-delay">Partner delay — delivery, pickup, or on‑site support arrives late/no‑show</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="weather-delay"
                              checked={reportIssues.weatherDelay}
                              onCheckedChange={(checked) => 
                                setReportIssues(prev => ({ ...prev, weatherDelay: !!checked }))
                              }
                            />
                            <Label htmlFor="weather-delay">Weather delay — wind, rain, freeze, or other environmental hazard</Label>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="comments">Comments</Label>
                          <Textarea
                            id="comments"
                            placeholder="Please describe the issue in detail..."
                            value={reportComments}
                            onChange={(e) => setReportComments(e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIssueReportOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleReportSubmit}>
                          Submit Report
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Output Detail Popup */}
      {selectedOutput && (
        <OutputDetailPopup
          output={selectedOutput}
          isOpen={outputPopupOpen}
          onClose={() => {
            setOutputPopupOpen(false);
            setSelectedOutput(null);
          }}
        />
      )}

      {/* Accountability Partner Message Popup */}
      <AccountabilityMessagePopup
        isOpen={accountabilityPopupOpen}
        onClose={() => setAccountabilityPopupOpen(false)}
        messageType={messageType}
        progress={progress}
        projectName={activeProject?.name}
      />
      {/* Phase Completion Popup */}
      <PhaseCompletionPopup
        open={phaseCompletionOpen}
        onOpenChange={setPhaseCompletionOpen}
        phase={getCurrentPhase()}
        checkedOutputs={checkedOutputs}
        onOutputToggle={toggleOutputCheck}
        onPhaseComplete={() => {
          setPhaseCompletionOpen(false);
          setPhaseRatingOpen(true);
        }}
      />

      {/* Phase Rating Popup */}
      <PhaseRatingPopup
        open={phaseRatingOpen}
        onOpenChange={setPhaseRatingOpen}
        phaseName={currentCompletedPhaseName}
        onRatingSubmit={handlePhaseRatingSubmit}
        onReportIssue={handleReportIssueFromRating}
      />
      
      {/* Help Popup */}
      <HelpPopup
        isOpen={helpPopupOpen}
        onClose={() => setHelpPopupOpen(false)}
      />
    </div>;
}