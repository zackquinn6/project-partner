import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video, AlertTriangle, Info, ShoppingCart, Plus, Award } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { Output } from '@/interfaces/Project';
import ProjectListing from './ProjectListing';
import { OutputDetailPopup } from './OutputDetailPopup';
import { AccountabilityMessagePopup } from './AccountabilityMessagePopup';
import { PhaseRatingPopup } from './PhaseRatingPopup';
import { HelpPopup } from './HelpPopup';
import { PhaseCompletionPopup } from './PhaseCompletionPopup';
import { OrderingWindow } from './OrderingWindow';
import { KickoffWorkflow } from './KickoffWorkflow';
import { UnplannedWorkWindow } from './UnplannedWorkWindow';
import { CompletionCertificate } from './CompletionCertificate';
import { ProjectSurvey } from './ProjectSurvey';
import { isKickoffPhaseComplete, addStandardPhasesToProjectRun } from '@/utils/projectUtils';
interface UserViewProps {
  resetToListing?: boolean;
  forceListingMode?: boolean;
  onProjectSelected?: () => void;
  projectRunId?: string;
}
export default function UserView({
  resetToListing,
  forceListingMode,
  onProjectSelected,
  projectRunId
}: UserViewProps) {
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
  const [phaseCompletionPopupOpen, setPhaseCompletionPopupOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [orderingWindowOpen, setOrderingWindowOpen] = useState(false);
  const [accountabilityPopupOpen, setAccountabilityPopupOpen] = useState(false);
  const [messageType, setMessageType] = useState<'phase-complete' | 'issue-report'>('phase-complete');

  // Phase rating state
  const [phaseRatingOpen, setPhaseRatingOpen] = useState(false);
  const [currentCompletedPhaseName, setCurrentCompletedPhaseName] = useState<string>("");
  const [phaseCompletionOpen, setPhaseCompletionOpen] = useState(false);

  // New windows state
  const [unplannedWorkOpen, setUnplannedWorkOpen] = useState(false);
  const [completionCertificateOpen, setCompletionCertificateOpen] = useState(false);
  const [projectSurveyOpen, setProjectSurveyOpen] = useState(false);

  // Check if kickoff phase is complete for project runs - MOVED UP to fix TypeScript error
  const isKickoffComplete = currentProjectRun ? isKickoffPhaseComplete(currentProjectRun.completedSteps) : true;
  
  // Get the active project data from either currentProject or currentProjectRun
  const activeProject = currentProjectRun || currentProject;
  
  // Flatten all steps with standard phases included
  const allSteps = activeProject ? addStandardPhasesToProjectRun(activeProject.phases).flatMap(phase => 
    phase.operations.flatMap(operation => 
      operation.steps.map(step => ({
        ...step,
        phaseName: phase.name,
        operationName: operation.name
      }))
    )
  ) : [];
  
  // Initialize completed steps from project run data
  useEffect(() => {
    if (currentProjectRun?.completedSteps) {
      setCompletedSteps(new Set(currentProjectRun.completedSteps));
    }
  }, [currentProjectRun?.completedSteps]);
  
  // Navigate to first incomplete step when workflow opens
  useEffect(() => {
    if (viewMode === 'workflow' && allSteps.length > 0 && isKickoffComplete) {
      const firstIncompleteIndex = allSteps.findIndex(step => !completedSteps.has(step.id));
      if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentStepIndex) {
        console.log("🎯 Navigating to first incomplete step:", firstIncompleteIndex, allSteps[firstIncompleteIndex]?.step);
        setCurrentStepIndex(firstIncompleteIndex);
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [viewMode, allSteps.length, isKickoffComplete, completedSteps, currentStepIndex]);

  // Load project run if projectRunId is provided
  useEffect(() => {
    if (projectRunId) {
      console.log('🎯 UserView: Loading project run with ID:', projectRunId);
      const projectRun = projectRuns.find(run => run.id === projectRunId);
      if (projectRun) {
        console.log('✅ UserView: Found and setting project run:', projectRun.name);
        setCurrentProjectRun(projectRun);
        setViewMode('workflow');
      } else {
        console.log('❌ UserView: Project run not found with ID:', projectRunId);
      }
    }
  }, [projectRunId, projectRuns, setCurrentProjectRun]);

  // Reset to listing view when projects view is requested - PRIORITY OVERRIDE
  useEffect(() => {
    console.log('🔄 UserView: resetToListing useEffect triggered:', { 
      resetToListing, 
      currentProjectRun: !!currentProjectRun 
    });
    
    if (resetToListing) {
      console.log("🔄 UserView: Resetting to listing mode due to resetToListing prop");
      setViewMode('listing');
      // Also clear any project selections to ensure clean navigation
      setCurrentProjectRun(null);
    }
  }, [resetToListing, setCurrentProjectRun]);

  // Auto-switch to workflow view when a project or project run is selected (but respect resetToListing and forceListingMode)
  useEffect(() => {
    // CRITICAL: DON'T auto-switch if we're being told to reset to listing OR if we're in force listing mode
    if (resetToListing || forceListingMode) {
      console.log("🚫 UserView: Blocking auto-switch due to resetToListing or forceListingMode");
      return;
    }
    
    if (currentProject || currentProjectRun) {
      console.log("🔄 UserView: Auto-switching to workflow mode");
      setViewMode('workflow');
    }
  }, [currentProject, currentProjectRun, resetToListing, forceListingMode]);
  
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? completedSteps.size / allSteps.length * 100 : 0;
  
  // Update project run progress whenever completed steps change - BUT NOT during kickoff
  useEffect(() => {
    // CRITICAL: Don't update progress during kickoff phase - it overwrites kickoff steps!
    if (currentProjectRun && allSteps.length > 0 && isKickoffComplete) {
      const calculatedProgress = completedSteps.size / allSteps.length * 100;
      if (Math.abs(calculatedProgress - (currentProjectRun.progress || 0)) > 0.1) {
        console.log("📊 UserView: Updating progress for workflow steps (NOT during kickoff)");
        
        // NEVER overwrite kickoff step completion data - FIX: Properly deduplicate
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
        const preservedKickoffSteps = currentProjectRun.completedSteps.filter(stepId => 
          kickoffStepIds.includes(stepId)
        );
        
        // Create unique array without duplicates
        const uniqueCompletedSteps = [...new Set([...preservedKickoffSteps, ...Array.from(completedSteps)])];
        
        const updatedProjectRun = {
          ...currentProjectRun,
          progress: Math.round(calculatedProgress),
          completedSteps: uniqueCompletedSteps,
          updatedAt: new Date()
        };
        updateProjectRun(updatedProjectRun);
      }
    } else if (currentProjectRun && !isKickoffComplete) {
      console.log("⚠️ UserView: Skipping progress update during kickoff phase");
    }
  }, [completedSteps, currentProjectRun, allSteps.length, updateProjectRun, isKickoffComplete]);
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

  // Time tracking functions
  const startTimeTracking = async (type: 'phase' | 'operation' | 'step', id: string) => {
    if (!currentProjectRun) return;
    
    const now = new Date().toISOString();
    const timeTracking = currentProjectRun.time_tracking || {};
    
    const updatedTimeTracking = {
      ...timeTracking,
      [type + 's']: {
        ...timeTracking[type + 's' as keyof typeof timeTracking],
        [id]: {
          ...timeTracking[type + 's' as keyof typeof timeTracking]?.[id],
          startTime: now
        }
      }
    };
    
    await updateProjectRun({
      ...currentProjectRun,
      time_tracking: updatedTimeTracking,
      updatedAt: new Date()
    });
  };

  const endTimeTracking = async (type: 'phase' | 'operation' | 'step', id: string) => {
    if (!currentProjectRun) return;
    
    const now = new Date().toISOString();
    const timeTracking = currentProjectRun.time_tracking || {};
    const currentEntry = timeTracking[type + 's' as keyof typeof timeTracking]?.[id];
    
    if (!currentEntry?.startTime) return;
    
    const startTime = new Date(currentEntry.startTime);
    const endTime = new Date(now);
    const totalTime = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes
    
    const updatedTimeTracking = {
      ...timeTracking,
      [type + 's']: {
        ...timeTracking[type + 's' as keyof typeof timeTracking],
        [id]: {
          ...currentEntry,
          endTime: now,
          totalTime
        }
      }
    };
    
    await updateProjectRun({
      ...currentProjectRun,
      time_tracking: updatedTimeTracking,
      updatedAt: new Date()
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
      console.log("Completing step:", currentStep.step);
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
      
      // End time tracking for current step
      endTimeTracking('step', currentStep.id);
      
      // Check if this completes a phase
      const currentPhase = getCurrentPhase();
      const phaseSteps = getAllStepsInPhase(currentPhase);
      const newCompletedSteps = new Set([...completedSteps, currentStep.id]);
      const isPhaseComplete = phaseSteps.every(step => newCompletedSteps.has(step.id));
      
      if (isPhaseComplete && currentPhase) {
        console.log("Phase completed:", currentPhase.name);
        setCurrentCompletedPhaseName(currentPhase.name);
        // End time tracking for phase
        endTimeTracking('phase', currentPhase.id);
        setPhaseCompletionOpen(true);
      }
      
      // Move to next step
      if (currentStepIndex < allSteps.length - 1) {
        console.log("Moving to next step");
        handleNext();
      } else {
        console.log("All steps completed! Project finished.");
        // Trigger completion certificate and survey
        setCompletionCertificateOpen(true);
      }
    } else {
      console.log("Cannot complete step - not all outputs are completed");
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
  
  console.log("UserView debug:", {
    resetToListing,
    viewMode,
    currentProjectRun: !!currentProjectRun,
    currentProject: !!currentProject,
    completedSteps: currentProjectRun?.completedSteps,
    isKickoffComplete,
    projectRunId,
    projectRunsCount: projectRuns.length,
    projectRunsIds: projectRuns.map(pr => pr.id)
  });
  
  // Fix My Projects navigation - STOP auto-switching when resetToListing is true
  if (resetToListing) {
    console.log("🔄 My Projects clicked - showing project listing");
    
    return (
      <div className="min-h-screen">
        <ProjectListing 
          onProjectSelect={project => {
            console.log("Project selected from My Projects:", project);
            if (project === null) {
              setViewMode('listing');
              return;
            }
            if (project === 'workflow') {
              console.log("Switching to workflow mode from Continue button");
              setViewMode('workflow'); 
              onProjectSelected?.();
              return;
            }
            setViewMode('workflow');
            onProjectSelected?.();
          }}
        />
      </div>
    );
  }
  if (projectRunId && !currentProjectRun && projectRuns.length > 0) {
    console.log("❌ UserView: Have projectRunId but currentProjectRun not found in loaded runs");
    console.log("Available project run IDs:", projectRuns.map(pr => pr.id));
    console.log("Looking for projectRunId:", projectRunId);
    
    // Clear the invalid projectRunId and go to listing
    console.log("🧹 Clearing invalid projectRunId and redirecting to listing");
    window.history.replaceState({ view: 'user' }, document.title, window.location.pathname);
    
    return <ProjectListing 
      onProjectSelect={project => {
        console.log("Project selected from error recovery:", project);
        if (project === null) {
          setViewMode('listing');
          return;
        }
        if (project === 'workflow') {
          setViewMode('workflow');
          return;
        }
        setViewMode('workflow');
        onProjectSelected?.();
      }} 
    />;
  }
  
  if (projectRunId && !currentProjectRun && projectRuns.length === 0) {
    console.log("⏳ UserView: Have projectRunId but project runs not loaded yet, showing loading...");
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading your project...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // THIRD: If no projects at all or explicitly in listing mode, show project listing
  if (viewMode === 'listing' || (!currentProject && !currentProjectRun && !projectRunId && projectRuns.length === 0)) {
    console.log("📋 UserView: Showing project listing (no project selected)");
    return <ProjectListing 
      onProjectSelect={project => {
        console.log("Project selected:", project);
        if (project === null) {
          setViewMode('listing');
          return;
        }
        if (project === 'workflow') {
          setViewMode('workflow');
          return;
        }
        setViewMode('workflow');
        onProjectSelected?.();
      }} 
    />;
  }
  
  // FOURTH: If project run exists and kickoff is not complete, show kickoff workflow
  if (currentProjectRun && !isKickoffComplete && viewMode === 'workflow') {
    // Fix missing kickoff steps if user has progressed past them
    const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
    const currentCompletedSteps = currentProjectRun.completedSteps || [];
    
    // If we have step 3 but missing 1 or 2, auto-complete them since user clearly progressed through
    const hasStep3 = currentCompletedSteps.includes('kickoff-step-3');
    const missingEarlierSteps = kickoffStepIds.slice(0, 2).filter(id => !currentCompletedSteps.includes(id));
    
    if (hasStep3 && missingEarlierSteps.length > 0) {
      console.log("🔧 Auto-completing missing earlier kickoff steps:", missingEarlierSteps);
      const updatedSteps = [...currentCompletedSteps];
      missingEarlierSteps.forEach(stepId => {
        if (!updatedSteps.includes(stepId)) {
          updatedSteps.push(stepId);
        }
      });
      
      // Update project run with all steps complete
      updateProjectRun({
        ...currentProjectRun,
        completedSteps: updatedSteps,
        status: 'in-progress',
        updatedAt: new Date()
      }).then(() => {
        console.log("✅ Missing steps auto-completed, project should now proceed to workflow");
      });
      
      // Since all steps are now complete, return empty to force re-render
      return null;
    }
    
    return (
      <KickoffWorkflow 
        onKickoffComplete={async () => {
          console.log("onKickoffComplete called - forcing completion");
          
            if (currentProjectRun && updateProjectRun) {
             // Ensure ALL kickoff steps are marked complete (prevent duplicates)
             const existingSteps = currentProjectRun.completedSteps || [];
             const uniqueSteps = [...new Set([...existingSteps, ...kickoffStepIds])];
             
             console.log("✅ Marking all kickoff steps complete:", uniqueSteps);
            
            // Automatically mark kickoff outputs as complete
            console.log("📝 Marking kickoff outputs as complete...");
            setCheckedOutputs(prev => {
              const newOutputs = { ...prev };
              
              // Mark outputs for each kickoff step
              newOutputs['kickoff-step-1'] = new Set(['overview-output']);
              newOutputs['kickoff-step-2'] = new Set(['agreement-output']);
              newOutputs['kickoff-step-3'] = new Set(['planning-output']);
              
              console.log("✅ Kickoff outputs marked complete:", newOutputs);
              return newOutputs;
            });
            
            // Mark individual completed steps for the main workflow tracking
            setCompletedSteps(prev => {
              const newCompletedSteps = new Set(prev);
              kickoffStepIds.forEach(stepId => {
                newCompletedSteps.add(stepId);
              });
              console.log("✅ Kickoff steps marked in completedSteps state:", newCompletedSteps);
              return newCompletedSteps;
            });
            
            // Mark the entire kickoff phase as complete
            console.log("🎯 Marking kickoff phase as complete...");
            const kickoffPhase = currentProjectRun.phases.find(phase => phase.name === 'Kickoff');
            if (kickoffPhase) {
              setCurrentCompletedPhaseName(kickoffPhase.name);
              
              // Add phase rating for kickoff phase
              const kickoffRating = {
                phaseId: kickoffPhase.id,
                phaseName: kickoffPhase.name,
                rating: 5, // Auto-rate kickoff as excellent since user completed setup
                timestamp: new Date().toISOString()
              };
              
              const updatedPhaseRatings = [
                ...(currentProjectRun.phase_ratings || []),
                kickoffRating
              ];
              
              console.log("✅ Auto-rating kickoff phase:", kickoffRating);
              
              // Update project status to in-progress with all steps and phase rating
              await updateProjectRun({
                ...currentProjectRun,
                completedSteps: uniqueSteps,
                status: 'in-progress',
                phase_ratings: updatedPhaseRatings,
                progress: Math.round((uniqueSteps.length / (currentProjectRun.phases.reduce((total, phase) => {
                  return total + phase.operations.reduce((opTotal, operation) => {
                    return opTotal + operation.steps.length;
                  }, 0);
                }, 0))) * 100),
                updatedAt: new Date()
              });
            } else {
              // Fallback if kickoff phase not found
              await updateProjectRun({
                ...currentProjectRun,
                completedSteps: uniqueSteps,
                status: 'in-progress',
                progress: Math.round((uniqueSteps.length / (currentProjectRun.phases.reduce((total, phase) => {
                  return total + phase.operations.reduce((opTotal, operation) => {
                    return opTotal + operation.steps.length;
                  }, 0);
                }, 0))) * 100),
                updatedAt: new Date()
              });
            }
            
            console.log("✅ Kickoff completed - proceeding to main workflow");
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
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar - Move Help button to top */}
        <Card className="lg:col-span-1 gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="space-y-4">
              <div>
                <CardTitle className="text-lg">Workflow Progress</CardTitle>
                <CardDescription>
                  Step {currentStepIndex + 1} of {allSteps.length}
                </CardDescription>
              </div>
              
              {/* Help button prominently at top */}
              <Button 
                onClick={() => setHelpPopupOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Stuck? Get Help
              </Button>
              
              {/* Add unplanned work button */}
              {isKickoffComplete && (
                <Button 
                  variant="outline" 
                  onClick={() => setUnplannedWorkOpen(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unplanned Work
                </Button>
              )}
            </div>
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
                   return <div key={step.id} 
                     className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast border ${
                       step.id === currentStep?.id ? 'bg-primary/10 text-primary border-primary/20' : 
                       completedSteps.has(step.id) ? 'bg-green-50 text-green-700 border-green-200' : 
                       'hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                     }`} 
                     onClick={() => {
                       console.log('Step clicked:', step.step, 'index:', stepIndex);
                        // Allow clicking on any step after kickoff is complete
                        if (stepIndex >= 0 && isKickoffComplete) {
                          console.log('Navigating to step:', stepIndex, step.step);
                          setCurrentStepIndex(stepIndex);
                          // Start time tracking for the new step
                          startTimeTracking('step', step.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          console.log('Step navigation blocked - kickoff not complete or invalid index');
                        }
                     }}>
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
          {/* Header */}
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
                  {currentStep?.description && <CardDescription className="text-base">
                      {currentStep.description}
                     </CardDescription>}
                </div>
                
                {/* Show ordering button for ordering steps */}
                {currentStep && (
                  currentStep.step === 'Tool & Material Ordering' || 
                  currentStep.phaseName === 'Ordering' ||
                  currentStep.id === 'ordering-step-1'
                ) && (
                  <Button 
                    onClick={() => {
                      console.log('Opening ordering window for step:', currentStep.step);
                      setOrderingWindowOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Shop Online
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

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
                                     <div className="font-medium">{output.name}</div>
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
                  <Button 
                    onClick={handlePrevious} 
                    disabled={currentStepIndex === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <Button 
                    onClick={handleNext} 
                    disabled={currentStepIndex === allSteps.length - 1}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

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
      
      {/* Ordering Window */}
      <OrderingWindow
        open={orderingWindowOpen}
        onOpenChange={setOrderingWindowOpen}
        project={currentProject}
        userOwnedTools={[]}
        onOrderingComplete={() => {
          console.log("Ordering window completed for step:", currentStep?.step);
          // Mark the ordering step as complete
          if (currentStep && (currentStep.id === 'ordering-step-1' || currentStep.step === 'Tool & Material Ordering' || currentStep.phaseName === 'Ordering')) {
            console.log("Marking ordering step as complete:", currentStep.id);
            setCompletedSteps(prev => new Set([...prev, currentStep.id]));
            
            // Check if this completes the ordering phase
            const currentPhase = getCurrentPhase();
            if (currentPhase && currentPhase.name === 'Ordering') {
              const phaseSteps = getAllStepsInPhase(currentPhase);
              const newCompletedSteps = new Set([...completedSteps, currentStep.id]);
              const isPhaseComplete = phaseSteps.every(step => newCompletedSteps.has(step.id));
              
              if (isPhaseComplete) {
                console.log("Ordering phase completed, triggering phase completion");
                setCurrentCompletedPhaseName(currentPhase.name);
                setPhaseCompletionOpen(true);
              }
            }
            
            // Move to next step if not at the end
            if (currentStepIndex < allSteps.length - 1) {
              console.log("Moving to next step after ordering completion");
              handleNext();
            }
          }
          setOrderingWindowOpen(false);
        }}
      />
      
      {/* Help Popup */}
      <HelpPopup
        isOpen={helpPopupOpen}
        onClose={() => setHelpPopupOpen(false)}
      />
      
      {/* Unplanned Work Window */}
      <UnplannedWorkWindow
        isOpen={unplannedWorkOpen}
        onClose={() => setUnplannedWorkOpen(false)}
      />
      
      {/* Completion Certificate */}
      {currentProjectRun && (
        <CompletionCertificate
          isOpen={completionCertificateOpen}
          onClose={() => setCompletionCertificateOpen(false)}
          projectName={currentProjectRun.name}
          startDate={currentProjectRun.startDate}
          endDate={currentProjectRun.endDate || new Date()}
          projectLeader={currentProjectRun.projectLeader}
        />
      )}
      
      {/* Project Survey */}
      {currentProjectRun && (
        <ProjectSurvey
          isOpen={projectSurveyOpen}
          onClose={() => setProjectSurveyOpen(false)}
          projectName={currentProjectRun.name}
          onComplete={() => {
            // Survey completed, project fully finished
            console.log('Project survey completed');
          }}
        />
      )}
    </div>
  );
}