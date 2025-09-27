import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video, AlertTriangle, Info, ShoppingCart, Plus, Award, Eye, EyeOff, HelpCircle, Calendar as CalendarIcon } from "lucide-react";
import { getStepIndicator } from './FlowTypeLegend';
import { WorkflowSidebar } from './WorkflowSidebar';
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { Output, Project } from '@/interfaces/Project';
import ProjectListing from './ProjectListing';
import { MobileProjectListing } from './MobileProjectListing';
import { MobileWorkflowView } from './MobileWorkflowView';
import { OutputDetailPopup } from './OutputDetailPopup';
import { AccountabilityMessagePopup } from './AccountabilityMessagePopup';
import { PhaseRatingPopup } from './PhaseRatingPopup';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { PhaseCompletionPopup } from './PhaseCompletionPopup';
import { OrderingWindow } from './OrderingWindow';
import { KickoffWorkflow } from './KickoffWorkflow';
import { UnplannedWorkWindow } from './UnplannedWorkWindow';
import { CompletionCertificate } from './CompletionCertificate';
import { ProjectSurvey } from './ProjectSurvey';
import { ToolsMaterialsSection } from './ToolsMaterialsSection';
import ProfileManager from './ProfileManager';
import { DecisionRollupWindow } from './DecisionRollupWindow';
import { KeyCharacteristicsWindow } from './KeyCharacteristicsWindow';
import { ProjectCustomizer } from './ProjectCustomizer/ProjectCustomizer';
import { ProjectScheduler } from './ProjectScheduler';
import { useResponsive } from '@/hooks/useResponsive';
import { isKickoffPhaseComplete, addStandardPhasesToProjectRun } from '@/utils/projectUtils';
import { markOrderingStepIncompleteIfNeeded, extractProjectToolsAndMaterials } from '@/utils/shoppingUtils';
import { MobileDIYDropdown } from './MobileDIYDropdown';
interface UserViewProps {
  resetToListing?: boolean;
  forceListingMode?: boolean;
  onProjectSelected?: () => void;
  projectRunId?: string;
  showProfile?: boolean;
}
export default function UserView({
  resetToListing,
  forceListingMode,
  onProjectSelected,
  projectRunId,
  showProfile
}: UserViewProps) {
  const { isMobile } = useResponsive();
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
  const [expertHelpOpen, setExpertHelpOpen] = useState(false);
  const [showProfileManager, setShowProfileManager] = useState(false);

  // Handle showProfile prop - don't switch to workflow if profile should be shown
  useEffect(() => {
    console.log('🔍 UserView: showProfile effect triggered:', { showProfile, showProfileManager });
    if (showProfile && !showProfileManager) {
      console.log('👤 UserView: Opening profile manager due to showProfile prop');
      setShowProfileManager(true);
    }
  }, [showProfile, showProfileManager]);
  const [phaseCompletionPopupOpen, setPhaseCompletionPopupOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [orderingWindowOpen, setOrderingWindowOpen] = useState(false);
  const [accountabilityPopupOpen, setAccountabilityPopupOpen] = useState(false);
  const [messageType, setMessageType] = useState<'phase-complete' | 'issue-report'>('phase-complete');

  // Phase rating state
  const [phaseRatingOpen, setPhaseRatingOpen] = useState(false);
  const [currentCompletedPhaseName, setCurrentCompletedPhaseName] = useState<string>("");
  const [phaseCompletionOpen, setPhaseCompletionOpen] = useState(false);
  
  // CRITICAL FIX: Store the completed phase object before navigation changes currentStep
  const [completedPhase, setCompletedPhase] = useState<any>(null);

  // New windows state
  const [unplannedWorkOpen, setUnplannedWorkOpen] = useState(false);
  const [completionCertificateOpen, setCompletionCertificateOpen] = useState(false);
  const [projectSurveyOpen, setProjectSurveyOpen] = useState(false);
  const [decisionRollupOpen, setDecisionRollupOpen] = useState(false);
  const [decisionRollupMode, setDecisionRollupMode] = useState<'initial-plan' | 'final-plan' | 'unplanned-work'>('initial-plan');
  const [keyCharacteristicsOpen, setKeyCharacteristicsOpen] = useState(false);
  const [projectCustomizerOpen, setProjectCustomizerOpen] = useState(false);
  const [projectSchedulerOpen, setProjectSchedulerOpen] = useState(false);
  const [previousToolsAndMaterials, setPreviousToolsAndMaterials] = useState<{ tools: any[], materials: any[] } | null>(null);

  // Check if kickoff phase is complete for project runs - MOVED UP to fix TypeScript error
  const isKickoffComplete = currentProjectRun ? isKickoffPhaseComplete(currentProjectRun.completedSteps) : true;

  // Add event listeners for Re-plan window actions
  useEffect(() => {
    const handleOpenProjectScheduler = () => {
      console.log('🎯 UserView: Opening Project Scheduler');
      setProjectSchedulerOpen(true);
    };
    const handleOpenOrderingWindow = () => {
      console.log('🎯 UserView: Opening Ordering Window');
      setOrderingWindowOpen(true);
    };
    const handleOpenProjectCustomizer = () => {
      console.log('🎯 UserView: Opening Project Customizer');
      setProjectCustomizerOpen(true);
    };

    window.addEventListener('openProjectScheduler', handleOpenProjectScheduler);
    window.addEventListener('openOrderingWindow', handleOpenOrderingWindow);
    window.addEventListener('openProjectCustomizer', handleOpenProjectCustomizer);

    return () => {
      window.removeEventListener('openProjectScheduler', handleOpenProjectScheduler);
      window.removeEventListener('openOrderingWindow', handleOpenOrderingWindow);
      window.removeEventListener('openProjectCustomizer', handleOpenProjectCustomizer);
    };
  }, []);
  
  // Get the active project data from either currentProject or currentProjectRun
  const activeProject = currentProjectRun || currentProject;
  
  // Debug active project structure
  console.log('🔍 Active project debug:', {
    hasCurrentProject: !!currentProject,
    hasCurrentProjectRun: !!currentProjectRun,
    activeProjectId: activeProject?.id,
    activeProjectName: activeProject?.name,
    phasesLength: activeProject?.phases?.length || 0,
    firstPhase: activeProject?.phases?.[0] ? {
      name: activeProject.phases[0].name,
      operationsCount: activeProject.phases[0].operations?.length || 0,
      firstOperationStepsCount: activeProject.phases[0].operations?.[0]?.steps?.length || 0,
      sampleStep: activeProject.phases[0].operations?.[0]?.steps?.[0] ? {
        id: activeProject.phases[0].operations[0].steps[0].id,
        step: activeProject.phases[0].operations[0].steps[0].step,
        materialsLength: activeProject.phases[0].operations[0].steps[0].materials?.length || 0,
        toolsLength: activeProject.phases[0].operations[0].steps[0].tools?.length || 0
      } : null
    } : null
  });
  
  // Flatten all steps with standard phases included
  const allSteps = activeProject ? addStandardPhasesToProjectRun(activeProject.phases).flatMap(phase => 
    phase.operations.flatMap(operation => 
      operation.steps.map(step => {
        // Add sample materials and tools for demonstration (since project templates are empty)
        let materials = step.materials || [];
        let tools = step.tools || [];
        
          // Add sample data to specific steps for testing
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
        
        return {
          ...step,
          phaseName: phase.name,
          operationName: operation.name,
          materials,
          tools
        };
      })
    )
  ) : [];
  
  // Initialize completed steps from project run data
  useEffect(() => {
    if (currentProjectRun?.completedSteps) {
      setCompletedSteps(new Set(currentProjectRun.completedSteps));
    }
  }, [currentProjectRun?.completedSteps]);
  
  // Navigate to first incomplete step when workflow opens - ENHANCED DEBUG VERSION
  useEffect(() => {
    if (viewMode === 'workflow' && allSteps.length > 0 && isKickoffComplete) {
      const firstIncompleteIndex = allSteps.findIndex(step => !completedSteps.has(step.id));
      
      console.log("🎯 Step navigation initialization:", {
        totalSteps: allSteps.length,
        completedStepsCount: completedSteps.size,
        firstIncompleteIndex,
        currentStepIndex,
        firstIncompleteStep: allSteps[firstIncompleteIndex] ? {
          id: allSteps[firstIncompleteIndex].id,
          name: allSteps[firstIncompleteIndex].step,
          phaseName: allSteps[firstIncompleteIndex].phaseName
        } : null,
        stepsByPhase: allSteps.reduce((acc, step, index) => {
          if (!acc[step.phaseName]) acc[step.phaseName] = [];
          acc[step.phaseName].push({
            index,
            id: step.id,
            name: step.step,
            completed: completedSteps.has(step.id)
          });
          return acc;
        }, {} as Record<string, any[]>)
      });
      
      // CRITICAL FIX: Don't auto-navigate if user manually selected a step
      // Only auto-navigate on initial load or when no specific step is selected
      const shouldAutoNavigate = firstIncompleteIndex !== -1 && (
        currentStepIndex === 0 || // Initial load
        allSteps[currentStepIndex] && completedSteps.has(allSteps[currentStepIndex].id) // Current step is completed
      );
      
      if (shouldAutoNavigate) {
        console.log("🎯 Auto-navigating to first incomplete step:", {
          newIndex: firstIncompleteIndex,
          stepName: allSteps[firstIncompleteIndex]?.step,
          stepPhase: allSteps[firstIncompleteIndex]?.phaseName,
          reason: currentStepIndex === 0 ? 'Initial load' : 'Current step completed'
        });
        setCurrentStepIndex(firstIncompleteIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.log("🎯 Keeping current step:", {
          currentIndex: currentStepIndex,
          currentStep: allSteps[currentStepIndex] ? {
            id: allSteps[currentStepIndex].id,
            name: allSteps[currentStepIndex].step,
            phase: allSteps[currentStepIndex].phaseName
          } : null,
          reason: 'User manually selected or no incomplete steps'
        });
      }
    } else {
      console.log("🎯 Step navigation blocked:", {
        viewMode,
        allStepsLength: allSteps.length,
        isKickoffComplete
      });
    }
  }, [viewMode, allSteps.length, isKickoffComplete, completedSteps]);

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

  // CONSOLIDATED VIEW MODE LOGIC - Single source of truth for view mode decisions
  useEffect(() => {
    console.log('🔄 UserView: Consolidated view mode logic triggered:', { 
      resetToListing, 
      forceListingMode,
      showProfile,
      currentProjectRun: !!currentProjectRun,
      projectRunId,
      viewMode
    });

    // Priority 1: Profile mode - always show listing with profile
    if (showProfile) {
      console.log("🔄 UserView: Profile mode requested - staying in listing");
      setViewMode('listing');
      return;
    }

    // Priority 2: Force listing mode - override everything except profile
    if (forceListingMode) {
      console.log("🔄 UserView: Force listing mode active");
      setViewMode('listing');
      return;
    }

    // Priority 3: Reset to listing - but NOT if we have an active project run (Continue button case)
    if (resetToListing && !currentProjectRun) {
      console.log("🔄 UserView: Reset to listing (no active project run)");
      setViewMode('listing');
      setShowProfileManager(false);
      return;
    }

    // Priority 4: Project run selected - switch to workflow (Continue button case) - HIGHER PRIORITY
    if (currentProjectRun && !showProfile && !forceListingMode) {
      console.log("🔄 UserView: Project run active, switching to workflow mode");
      setViewMode('workflow');
      onProjectSelected?.();
      return;
    }

    // Priority 5: Project run ID provided via URL/navigation
    if (projectRunId && currentProjectRun) {
      console.log("🔄 UserView: ProjectRunId navigation, switching to workflow");
      setViewMode('workflow');
      return;
    }

    // Default: Keep current view if no specific conditions are met
    console.log("🔄 UserView: No conditions met, keeping current view:", viewMode);
    
  }, [resetToListing, forceListingMode, showProfile, currentProjectRun, projectRunId, viewMode, onProjectSelected]);
  
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? completedSteps.size / allSteps.length * 100 : 0;
  
  // Debug current step to identify materials/tools issue
  console.log('🔧 Current step debug:', {
    stepIndex: currentStepIndex,
    stepId: currentStep?.id,
    stepName: currentStep?.step,
    materialsLength: currentStep?.materials?.length || 0,
    toolsLength: currentStep?.tools?.length || 0,
    materials: currentStep?.materials,
    tools: currentStep?.tools,
    fullStep: currentStep,
    allStepsWithMaterials: allSteps.filter(step => step.materials && step.materials.length > 0).map(step => ({
      id: step.id,
      name: step.step,
      materialsCount: step.materials?.length || 0,
      materials: step.materials
    })),
    allStepsWithTools: allSteps.filter(step => step.tools && step.tools.length > 0).map(step => ({
      id: step.id,
      name: step.step,
      toolsCount: step.tools?.length || 0,
      tools: step.tools
    }))
  });
  
  // Update project run progress whenever completed steps change - BUT NOT during kickoff
  useEffect(() => {
    // CRITICAL: Don't update progress during kickoff phase - it overwrites kickoff steps!
    if (currentProjectRun && allSteps.length > 0 && isKickoffComplete) {
      const calculatedProgress = completedSteps.size / allSteps.length * 100;
      if (Math.abs(calculatedProgress - (currentProjectRun.progress || 0)) > 0.1) {
        console.log("📊 UserView: Updating progress for workflow steps (NOT during kickoff)");
        
        // NEVER overwrite kickoff step completion data - FIX: Properly deduplicate
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
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

  // Navigate to specific step by ID
  const navigateToStep = (stepId: string) => {
    const stepIndex = allSteps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      console.log(`🎯 Navigating to step: ${stepId} at index ${stepIndex}`);
      setCurrentStepIndex(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } else {
      console.error(`❌ Step not found: ${stepId}`);
      return false;
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

  const handleStepComplete = async () => {
    if (!currentStep) return;
    
    console.log("🎯 handleStepComplete called for step:", {
      stepId: currentStep.id,
      stepName: currentStep.step,
      stepPhase: currentStep.phaseName,
      currentStepIndex,
      totalSteps: allSteps.length,
      allStepNames: allSteps.map((s, i) => ({ index: i, id: s.id, name: s.step, phase: s.phaseName }))
    });
    
    // CRITICAL DEBUG: Check if we're actually on the step the user thinks we're on
    console.log("🔍 STEP MISMATCH DEBUG:", {
      userExpectedPhase: "Ordering", // User says they're completing ordering
      actualCurrentStep: {
        id: currentStep.id,
        name: currentStep.step,
        phase: currentStep.phaseName,
        index: currentStepIndex
      },
      orderingSteps: allSteps.filter(s => s.phaseName === 'Ordering').map((s, i) => ({
        stepId: s.id,
        stepName: s.step,
        globalIndex: allSteps.findIndex(step => step.id === s.id)
      }))
    });
    
    // Check if all outputs for this step are completed
    const stepOutputs = currentStep.outputs || [];
    const stepCheckedOutputs = checkedOutputs[currentStep.id] || new Set();
    const allOutputsCompleted = stepOutputs.length === 0 || stepOutputs.every(output => 
      stepCheckedOutputs.has(output.id)
    );
    
    if (allOutputsCompleted) {
      console.log("🎯 Completing step:", currentStep.step, "ID:", currentStep.id);
      
      // Add step to completed steps with immediate persistence
      const newCompletedSteps = [...new Set([...completedSteps, currentStep.id])];
      setCompletedSteps(new Set(newCompletedSteps));
      
      // Immediately update the project run to persist the step completion
      if (currentProjectRun) {
        const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
        const preservedKickoffSteps = currentProjectRun.completedSteps.filter(stepId => 
          kickoffStepIds.includes(stepId)
        );
        
        const workflowCompletedSteps = newCompletedSteps.filter(stepId => !stepId.startsWith('kickoff-'));
        const allCompletedSteps = [...preservedKickoffSteps, ...workflowCompletedSteps];
        const uniqueCompletedSteps = [...new Set(allCompletedSteps)];
        
        const totalSteps = allSteps.length;
        const calculatedProgress = (workflowCompletedSteps.length / totalSteps) * 100;
        
        const updatedProjectRun = {
          ...currentProjectRun,
          completedSteps: uniqueCompletedSteps,
          progress: Math.round(calculatedProgress),
          updatedAt: new Date()
        };
        
        console.log("🎯 Immediately persisting step completion:", {
          stepId: currentStep.id,
          newCompletedSteps: uniqueCompletedSteps,
          progress: Math.round(calculatedProgress)
        });
        
        await updateProjectRun(updatedProjectRun);
      }
      
      // End time tracking for step
      endTimeTracking('step', currentStep.id);
      
      // Check if this completes a phase - FIXED VERSION
      console.log("🔍 Checking if step completion triggers phase completion...");
      const currentPhase = getCurrentPhase();
      
      if (currentPhase) {
        console.log("🔍 Current phase found:", currentPhase.name);
        const phaseSteps = getAllStepsInPhase(currentPhase);
        console.log("🔍 Phase steps:", phaseSteps.map(s => ({ id: s.id, name: s.step })));
        
        const newCompletedStepsSet = new Set(newCompletedSteps);
        const isPhaseComplete = phaseSteps.every(step => newCompletedStepsSet.has(step.id));
        
        console.log("🔍 Phase completion check:", {
          phaseName: currentPhase.name,
          totalPhaseSteps: phaseSteps.length,
          completedPhaseSteps: phaseSteps.filter(step => newCompletedStepsSet.has(step.id)).length,
          isPhaseComplete,
          currentStepName: currentStep.step,
          currentStepPhase: currentStep.phaseName
        });
        
        if (isPhaseComplete) {
          console.log("🎯 Phase completed:", currentPhase.name);
          
          // CRITICAL FIX: Store completed phase BEFORE navigation changes currentStep
          setCompletedPhase(currentPhase);
          setCurrentCompletedPhaseName(currentPhase.name);
          
          // End time tracking for phase
          endTimeTracking('phase', currentPhase.id);
          setPhaseCompletionOpen(true);
        } else {
          console.log("🔍 Phase not yet complete:", {
            phaseName: currentPhase.name,
            remainingSteps: phaseSteps.filter(step => !newCompletedStepsSet.has(step.id)).map(s => s.step)
          });
        }
      } else {
        console.log("❌ No current phase found for step:", {
          stepId: currentStep.id,
          stepName: currentStep.step,
          expectedPhase: currentStep.phaseName
        });
      }
      
      // Move to next step
      if (currentStepIndex < allSteps.length - 1) {
        console.log("🎯 Moving to next step");
        handleNext();
      } else {
        console.log("🎯 All steps completed! Project finished.");
        // Trigger completion certificate and survey
        setCompletionCertificateOpen(true);
      }
    } else {
      console.log("❌ Cannot complete step - not all outputs are completed");
    }
  };

  // Helper functions for phase completion check - FIXED VERSION
  const getCurrentPhase = () => {
    if (!currentStep || !activeProject) {
      console.log("🔍 getCurrentPhase: Missing currentStep or activeProject", {
        currentStep: currentStep?.id,
        currentStepName: currentStep?.step,
        activeProject: !!activeProject
      });
      return null;
    }
    
    // CRITICAL FIX: Use the step's stored phaseName first as it's most reliable
    if (currentStep.phaseName) {
      const processedPhases = addStandardPhasesToProjectRun(activeProject.phases);
      const phaseByName = processedPhases.find(phase => phase.name === currentStep.phaseName);
      
      if (phaseByName) {
        console.log("🎯 getCurrentPhase: Found phase by stored phaseName:", {
          stepId: currentStep.id,
          stepName: currentStep.step,
          phaseName: currentStep.phaseName,
          foundPhase: phaseByName.name
        });
        return phaseByName;
      }
    }
    
    // FALLBACK: Search through phases to find the step (should not be needed with correct data)
    const processedPhases = addStandardPhasesToProjectRun(activeProject.phases);
    
    console.log("🔍 getCurrentPhase: Fallback search for step", {
      stepId: currentStep.id,
      stepName: currentStep.step,
      stepPhaseName: currentStep.phaseName,
      totalPhases: processedPhases.length,
      phaseNames: processedPhases.map(p => p.name)
    });
    
    for (const phase of processedPhases) {
      for (const operation of phase.operations || []) {
        if (operation.steps.some(step => step.id === currentStep.id)) {
          console.log("🎯 getCurrentPhase: Found step in phase via fallback search:", {
            stepId: currentStep.id,
            stepName: currentStep.step,
            foundInPhase: phase.name,
            foundInOperation: operation.name,
            expectedPhaseName: currentStep.phaseName
          });
          return phase;
        }
      }
    }
    
    console.log("❌ getCurrentPhase: Step not found in any phase!");
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
    
    // Special case for ordering step - add Shopping List button in content
    if (step.step === 'Tool & Material Ordering' || 
        step.phaseName === 'Ordering' || 
        step.id === 'ordering-step-1') {
      return (
        <div className="space-y-6">
          <div className="prose prose-base max-w-none">
            <p>
              Use our integrated shopping browser to purchase all required tools and materials for your project. 
              Our system will help you find the best prices and ensure you get everything you need.
            </p>
          </div>
          
          {/* Shopping List Button - styled to match Project Customizer button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => {
                console.log('Opening ordering window for step:', step.step);
                setOrderingWindowOpen(true);
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Shopping List
            </Button>
          </div>
        </div>
      );
    }
    
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

  // Group steps by phase and operation for sidebar navigation - FIXED: Use processed phases with standard phases
  const processedPhases = activeProject ? addStandardPhasesToProjectRun(activeProject.phases) : [];
  const groupedSteps = processedPhases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>) || {};
  
  console.log("🔍 Debug phase structure:", {
    originalPhases: activeProject?.phases.length || 0,
    processedPhases: processedPhases.length,
    phaseNames: processedPhases.map(p => p.name),
    currentStepId: currentStep?.id,
    currentStepName: currentStep?.step,
    currentStepIndex,
    allStepsCount: allSteps.length,
    completedStepsArray: Array.from(completedSteps),
    orderingStepExists: allSteps.find(s => s.id === 'ordering-step-1'),
    orderingStepCompleted: completedSteps.has('ordering-step-1')
  });
  
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
  
  // Fix My Projects navigation - mobile is handled by Index component
  if (resetToListing) {
    console.log("🚨 SECOND WINDOW ALERT - UserView resetToListing triggered!");
    console.log("🚨 resetToListing:", resetToListing, "isMobile:", isMobile);
    
    // For mobile, the flow is handled entirely by Index component
    // No need to render anything here
    if (isMobile) {
      console.log("🚨 Mobile: Projects navigation blocked in UserView - Index should handle this");
      return null;
    }
    
    return (
      <div className="min-h-screen">
        {(
          <ProjectListing 
            onProjectSelect={project => {
              console.log("🎯 Desktop Project selected from My Projects:", project, {currentProjectRun: !!currentProjectRun});
              if (project === null) {
                setViewMode('listing');
                return;
              }
              // Legacy support for 'workflow' string - now handled by useEffect above
              if (project === 'workflow') {
                console.log("🎯 Received workflow signal - FORCING WORKFLOW MODE NOW!");
                setViewMode('workflow');
                onProjectSelected?.();
                return;
              }
              console.log("🎯 Desktop: Setting workflow mode for project selection");
              setViewMode('workflow');
              onProjectSelected?.();
            }}
          />
        )}
      </div>
    );
  }
  if (projectRunId && !currentProjectRun && projectRuns.length > 0) {
    console.log("❌ UserView: Have projectRunId but currentProjectRun not found in loaded runs");
    console.log("Available project run IDs:", projectRuns.map(pr => pr.id));
    console.log("Looking for projectRunId:", projectRunId);
    
    // MOBILE FIX: Never show ProjectListing error recovery on mobile
    if (isMobile) {
      console.log("🚨 SECOND WINDOW BLOCKED - Mobile error recovery should not render ProjectListing");
      return null;
    }
    
    // Clear the invalid projectRunId and go to listing
    console.log("🧹 Clearing invalid projectRunId and redirecting to listing");
    window.history.replaceState({ view: 'user' }, document.title, window.location.pathname);
    
    return <ProjectListing 
      onProjectSelect={project => {
        console.log("🎯 Project selected from error recovery:", project, {currentProjectRun: !!currentProjectRun});
        if (project === null) {
          setViewMode('listing');
          return;
        }
          if (project === 'workflow') {
            console.log("🎯 Received workflow signal from error recovery - FORCING WORKFLOW MODE NOW!");
            setViewMode('workflow');
            onProjectSelected?.();
            return;
          }
        console.log("🎯 Setting workflow mode for project selection from error recovery");
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
    console.log("📋 UserView: Checking if should show project listing...");
    console.log("📋 viewMode:", viewMode, "currentProject:", !!currentProject, "currentProjectRun:", !!currentProjectRun, "projectRunId:", projectRunId);
    
    // MOBILE FIX: Never show ProjectListing on mobile - Index handles all mobile project listing
    if (isMobile) {
      console.log("🚨 SECOND WINDOW BLOCKED - Mobile should not render ProjectListing in UserView");
      return null;
    }
    
    console.log("📋 UserView: Showing project listing (no project selected)");
    return <ProjectListing 
      onProjectSelect={project => {
        console.log("🎯 Project selected from main listing:", project, {currentProjectRun: !!currentProjectRun});
        if (project === null) {
          setViewMode('listing');
          return;
        }
        if (project === 'workflow') {
          console.log("🎯 Received workflow signal from main listing - FORCING WORKFLOW MODE NOW!");
          setViewMode('workflow');
          onProjectSelected?.();
          return;
        }
        console.log("🎯 Setting workflow mode for project selection from main listing");
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
              // CRITICAL FIX: Store completed phase for popup
              setCompletedPhase(kickoffPhase);
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
        onExit={() => {
          console.log("🚪 Exit kickoff - returning to project listing");
          setViewMode('listing');
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
    <>
      {/* Mobile DIY Dropdown */}
      {isMobile && activeProject && (
        <MobileDIYDropdown
          onHelpClick={() => setExpertHelpOpen(true)}
          onKeysToSuccessClick={() => setKeyCharacteristicsOpen(true)}
          onUnplannedWorkClick={() => {
            setDecisionRollupMode('unplanned-work');
            setDecisionRollupOpen(true);
          }}
          isKickoffComplete={isKickoffComplete}
        />
      )}

      {/* Mobile Workflow View */}
      {isMobile ? (
        <MobileWorkflowView
          projectName={activeProject?.name || 'Project'}
          currentStep={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={allSteps.length}
          progress={progress}
          completedSteps={completedSteps}
          onBack={() => {
            // Go back to projects listing  
            console.log('🔄 Mobile workflow: Back button clicked');
            window.dispatchEvent(new CustomEvent('navigate-to-projects'));
          }}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onStepComplete={handleStepComplete}
          onNavigateToStep={(stepIndex) => {
            console.log('🎯 Mobile: Navigating to step:', stepIndex);
            if (stepIndex >= 0 && isKickoffComplete) {
              setCurrentStepIndex(stepIndex);
              startTimeTracking('step', allSteps[stepIndex].id);
            }
          }}
          allSteps={allSteps}
          checkedMaterials={checkedMaterials}
          checkedTools={checkedTools}
          onToggleMaterial={toggleMaterialCheck}
          onToggleTool={toggleToolCheck}
        />
      ) : (
        /* Desktop Workflow View */
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
          <WorkflowSidebar
            allSteps={allSteps}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            progress={progress}
            groupedSteps={groupedSteps}
            isKickoffComplete={isKickoffComplete}
            onStepClick={(stepIndex, step) => {
              console.log('🎯 Step clicked:', {
                stepName: step.step,
                stepIndex,
                stepId: step.id,
                isKickoffComplete,
                currentStepIndex
              });
              
              if (stepIndex >= 0 && isKickoffComplete) {
                console.log('🎯 Navigating to step:', {
                  newIndex: stepIndex,
                  stepName: step.step,
                  stepId: step.id
                });
                setCurrentStepIndex(stepIndex);
                startTimeTracking('step', step.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                console.log('❌ Step navigation blocked:', {
                  reason: stepIndex < 0 ? 'Invalid step index' : 'Kickoff not complete',
                  stepIndex,
                  isKickoffComplete
                });
              }
            }}
            onHelpClick={() => setExpertHelpOpen(true)}
            onUnplannedWorkClick={() => {
              setDecisionRollupMode('unplanned-work');
              setDecisionRollupOpen(true);
            }}
            onKeysToSuccessClick={() => setKeyCharacteristicsOpen(true)}
          />

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="space-y-6">
              {/* Header */}
              <Card className="gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
                    {getStepIndicator(currentStep?.flowType)}
                  </div>
                  {currentStep?.description && <CardDescription className="text-base">
                    {currentStep.description}
                  </CardDescription>}
                </div>
                
                {/* Don't show ordering button for ordering steps since it's now in content */}

              </div>
            </CardHeader>
          </Card>

              {/* Tools & Materials Section - Hide for ordering steps since they don't need materials/tools */}
              {currentStep && 
                !(currentStep.step === 'Tool & Material Ordering' || 
                  currentStep.phaseName === 'Ordering' || 
                  currentStep.id === 'ordering-step-1') &&
                (currentStep.materials?.length > 0 || currentStep.tools?.length > 0) && (
                <ToolsMaterialsSection
                  currentStep={currentStep}
                  checkedMaterials={checkedMaterials[currentStep.id] || new Set()}
                  checkedTools={checkedTools[currentStep.id] || new Set()}
                  onToggleMaterial={(materialId) => toggleMaterialCheck(currentStep.id, materialId)}
                  onToggleTool={(toolId) => toggleToolCheck(currentStep.id, toolId)}
                />
              )}

          {/* Content */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-8">
              {renderContent(currentStep)}
              
              {/* Decision Buttons for Planning Steps */}
              {currentStep && (
                (currentStep.step?.toLowerCase().includes('project') && (currentStep.step?.toLowerCase().includes('plan') || currentStep.step?.toLowerCase().includes('scope'))) ||
                (currentStep.step?.toLowerCase().includes('finalize') && currentStep.step?.toLowerCase().includes('plan')) ||
                (currentStep.step?.toLowerCase() === 'project scheduling')
              ) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex gap-3 justify-center">
                    {/* Show Project Customizer button for Project Planning and Scope steps */}
                    {(currentStep.step?.toLowerCase().includes('project') && (currentStep.step?.toLowerCase().includes('plan') || currentStep.step?.toLowerCase().includes('scope'))) && (
                      <Button 
                        onClick={() => {
                          setDecisionRollupMode('initial-plan');
                          setProjectCustomizerOpen(true);
                        }}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Project Customizer
                      </Button>
                    )}

                    {/* Show Project Scheduler button only for Project Scheduling step */}
                    {(() => {
                      const showScheduler = currentStep.step?.toLowerCase().includes('scheduling');
                      console.log("🗓️ Project Scheduler button check:", {
                        stepName: currentStep.step,
                        stepNameLower: currentStep.step?.toLowerCase(),
                        includesScheduling: showScheduler,
                        shouldShow: showScheduler
                      });
                      return showScheduler;
                    })() && (
                      <Button 
                        onClick={() => setProjectSchedulerOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        Project Scheduler
                      </Button>
                    )}

                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outputs */}
          {currentStep && currentStep.outputs?.length > 0 && (
            <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-6">
                <Accordion type="multiple" defaultValue={["outputs"]} className="w-full">
                  {(() => {
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
                          {currentStep.outputs.map(output => (
                            <div key={output.id} className="p-3 bg-background/50 rounded-lg">
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
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
                  })()}
                </Accordion>
              </CardContent>
            </Card>
          )}

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
                      <Button onClick={handleStepComplete} className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    ) : (
                      <Button 
                        disabled 
                        className="opacity-50 cursor-not-allowed" 
                        size={isMobile ? "sm" : "default"}
                        title={isMobile ? "Complete All Outputs First" : undefined}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2">Complete All Outputs First</span>}
                      </Button>
                    )
                  )}
                  
                  {/* Report Issue Button */}
                  <Dialog open={issueReportOpen} onOpenChange={setIssueReportOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size={isMobile ? "sm" : "default"}
                        title={isMobile ? "Report Issue" : undefined}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2">Report Issue</span>}
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
          </main>
        </div>
        </SidebarProvider>
      )}

      {/* Popups and Dialogs - Outside of sidebar/mobile view */}
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
      {/* Phase Completion Popup - FIXED: Use stored completedPhase instead of getCurrentPhase() */}
      <PhaseCompletionPopup
        open={phaseCompletionOpen}
        onOpenChange={(open) => {
          console.log("🔧 PHASE COMPLETION POPUP:", {
            opening: open,
            completedPhase: completedPhase?.name,
            currentStepAfterNav: currentStep?.step,
            currentStepPhaseAfterNav: currentStep?.phaseName
          });
          setPhaseCompletionOpen(open);
        }}
        phase={completedPhase}
        checkedOutputs={checkedOutputs}
        onOutputToggle={toggleOutputCheck}
        onPhaseComplete={() => {
          console.log("🎯 Phase completion confirmed for:", completedPhase?.name);
          setPhaseCompletionOpen(false);
          setCompletedPhase(null); // Clear stored phase
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
        projectRun={currentProjectRun}
        userOwnedTools={[]}
        completedSteps={completedSteps}
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
                
                // CRITICAL FIX: Store completed phase BEFORE any navigation
                setCompletedPhase(currentPhase);
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
      
      {/* Expert Help Window */}
      <ExpertHelpWindow
        isOpen={expertHelpOpen}
        onClose={() => setExpertHelpOpen(false)}
      />
      
      {/* Unplanned Work Window */}
      <UnplannedWorkWindow
        isOpen={unplannedWorkOpen}
        onClose={() => setUnplannedWorkOpen(false)}
      />
      
      {/* Decision Rollup Window */}
      {activeProject && (
        <DecisionRollupWindow
          open={decisionRollupOpen}
          onOpenChange={setDecisionRollupOpen}
          phases={activeProject.phases || []}
          onPhasesUpdate={(updatedPhases) => {
            if (currentProjectRun) {
              updateProjectRun({
                ...currentProjectRun,
                phases: updatedPhases,
                updatedAt: new Date()
              });
            }
          }}
          mode={decisionRollupMode}
          title={
            decisionRollupMode === 'initial-plan' ? 'Initial Planning Decisions' :
            decisionRollupMode === 'final-plan' ? 'Final Planning Assessment' :
            'Unplanned Work Decisions'
          }
          onNavigateToStep={navigateToStep}
        />
      )}

      {/* Project Customizer */}
      {projectCustomizerOpen && currentProjectRun && (
        <ProjectCustomizer
          open={projectCustomizerOpen}
          onOpenChange={(open) => {
            setProjectCustomizerOpen(open);
            
            // When customizer closes, check if shopping is needed
            if (!open && currentProjectRun) {
              // Store current tools/materials for shopping comparison
              const currentRequirements = extractProjectToolsAndMaterials(currentProjectRun);
              
              // Check if shopping is needed and mark ordering step incomplete if necessary
              markOrderingStepIncompleteIfNeeded(
                currentProjectRun,
                completedSteps,
                setCompletedSteps,
                previousToolsAndMaterials
              );
              
              // Update previous tools/materials for next comparison
              setPreviousToolsAndMaterials(currentRequirements);
            }
          }}
          currentProjectRun={currentProjectRun}
          mode={currentStep?.step.includes('Project Work Scope') ? 'initial-plan' : 
                currentStep?.step.includes('Finalize Project Plan') ? 'final-plan' : 
                decisionRollupMode === 'unplanned-work' ? 'unplanned-work' : 'replan'}
        />
      )}

      {/* Project Scheduler */}
      {projectSchedulerOpen && currentProjectRun && (
        <ProjectScheduler
          open={projectSchedulerOpen}
          onOpenChange={setProjectSchedulerOpen}
          project={activeProject as Project}
          projectRun={currentProjectRun}
        />
      )}

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

      {/* Key Characteristics Window */}
      {activeProject && (
        <KeyCharacteristicsWindow
          open={keyCharacteristicsOpen}
          onOpenChange={setKeyCharacteristicsOpen}
          operations={activeProject.phases?.flatMap(phase => phase.operations) || []}
          currentStepId={currentStep?.id}
        />
      )}
    </>
  );
}