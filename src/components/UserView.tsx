import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Play, CheckCircle, ExternalLink, Image, Video, AlertTriangle, Info, ShoppingCart, Plus, Award, Eye, EyeOff, HelpCircle, Calendar as CalendarIcon, Sparkles, Camera } from "lucide-react";
import { toast } from "sonner";
import { getStepIndicator } from './FlowTypeLegend';
import { WorkflowSidebar } from './WorkflowSidebar';
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Output, Project, AppReference, Phase } from '@/interfaces/Project';
import ProjectListing from './ProjectListing';
import { MobileProjectListing } from './MobileProjectListing';
import { MobileWorkflowView } from './MobileWorkflowView';
import { OutputDetailPopup } from './OutputDetailPopup';
import { calculateProjectProgress, getWorkflowStepsCount } from '@/utils/progressCalculation';
import { AccountabilityMessagePopup } from './AccountabilityMessagePopup';
import { PhaseRatingPopup } from './PhaseRatingPopup';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { PhaseCompletionPopup } from './PhaseCompletionPopup';
import { OrderingWindow } from './OrderingWindow';
import { MaterialsSelectionWindow } from './MaterialsSelectionWindow';
import { MaterialsSelectionDialog } from './MaterialsSelectionDialog';
import { KickoffWorkflow } from './KickoffWorkflow';
import { UnplannedWorkWindow } from './UnplannedWorkWindow';
import { ProjectSurvey } from './ProjectSurvey';
import { PhotoUpload } from './PhotoUpload';
import { NoteUpload } from './NoteUpload';
import { NotesGallery } from './NotesGallery';
import { PhotoGallery } from './PhotoGallery';
import { WorkflowThemeSelector } from './WorkflowThemeSelector';
import { ProjectCompletionPopup } from './ProjectCompletionPopup';
import { ToolsMaterialsSection } from './ToolsMaterialsSection';
import ProfileManager from './ProfileManager';
import { DecisionRollupWindow } from './DecisionRollupWindow';
import { KeyCharacteristicsWindow } from './KeyCharacteristicsWindow';
import { ProjectCustomizer } from './ProjectCustomizer/ProjectCustomizer';
import { ProjectScheduler } from './ProjectScheduler';
import { ScaledStepProgressDialog } from './ScaledStepProgressDialog';
import { MultiContentRenderer } from './MultiContentRenderer';
import { CompactAppsSection } from './CompactAppsSection';
import { useResponsive } from '@/hooks/useResponsive';
import { useStepInstructions } from '@/hooks/useStepInstructions';
import { ToolRentalsWindow } from './ToolRentalsWindow';
import { HomeManager } from './HomeManager';
import { isKickoffPhaseComplete } from '@/utils/projectUtils';
import { useUserRole } from '@/hooks/useUserRole';
import { markOrderingStepIncompleteIfNeeded, extractProjectToolsAndMaterials } from '@/utils/shoppingUtils';
import { MobileDIYDropdown } from './MobileDIYDropdown';
import { ProjectCompletionHandler } from './ProjectCompletionHandler';
import { ProjectBudgetingWindow } from './ProjectBudgetingWindow';
import { ProjectPerformanceWindow } from './ProjectPerformanceWindow';
import { RiskManagementWindow } from './RiskManagementWindow';
import { getSafeEmbedUrl } from '@/utils/videoEmbedSanitizer';
import { useDynamicPhases } from '@/hooks/useDynamicPhases';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';
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
  const { isAdmin } = useUserRole();
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
  const [projectSurveyOpen, setProjectSurveyOpen] = useState(false);
  const [projectCompletionOpen, setProjectCompletionOpen] = useState(false);
  const [decisionRollupOpen, setDecisionRollupOpen] = useState(false);
  const [decisionRollupMode, setDecisionRollupMode] = useState<'initial-plan' | 'final-plan' | 'unplanned-work'>('initial-plan');
  const [keyCharacteristicsOpen, setKeyCharacteristicsOpen] = useState(false);
  const [projectCustomizerOpen, setProjectCustomizerOpen] = useState(false);
  const [projectCustomizerMode, setProjectCustomizerMode] = useState<'initial-plan' | 'final-plan' | 'unplanned-work' | 'replan'>('replan');
  const [projectSchedulerOpen, setProjectSchedulerOpen] = useState(false);
  const [materialsSelectionOpen, setMaterialsSelectionOpen] = useState(false);
  const [toolRentalsOpen, setToolRentalsOpen] = useState(false);
  const [homeManagerOpen, setHomeManagerOpen] = useState(false);
  const [projectBudgetingOpen, setProjectBudgetingOpen] = useState(false);
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);
  const [projectPerformanceOpen, setProjectPerformanceOpen] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [notesGalleryOpen, setNotesGalleryOpen] = useState(false);
  const [scaledProgressDialogOpen, setScaledProgressDialogOpen] = useState(false);
  const [currentScaledStep, setCurrentScaledStep] = useState<{ id: string; title: string } | null>(null);
  const [selectedMaterialsForShopping, setSelectedMaterialsForShopping] = useState<{
    materials: any[];
    tools: any[];
  }>({ materials: [], tools: [] });
  const [previousToolsAndMaterials, setPreviousToolsAndMaterials] = useState<{ tools: any[], materials: any[] } | null>(null);
  
  // Instruction level state - defaults to 'detailed' for maximum detail
  const [instructionLevel, setInstructionLevel] = useState<'quick' | 'detailed' | 'new_user'>('detailed');

  // Check if kickoff phase is complete for project runs - MOVED UP to fix TypeScript error
  const isKickoffComplete = currentProjectRun ? isKickoffPhaseComplete(currentProjectRun.completedSteps) : true;

  // Sync instruction level with project run preference
  useEffect(() => {
    if (currentProjectRun?.instruction_level_preference) {
      setInstructionLevel(currentProjectRun.instruction_level_preference as 'quick' | 'detailed' | 'new_user');
    }
  }, [currentProjectRun?.instruction_level_preference]);

  // Handle instruction level change and save to project run
  const handleInstructionLevelChange = async (level: 'quick' | 'detailed' | 'new_user') => {
    setInstructionLevel(level);
    if (currentProjectRun) {
      await updateProjectRun({
        ...currentProjectRun,
        instruction_level_preference: level
      });
    }
  };

  // Add event listener for Progress Board force listing
  useEffect(() => {
    const handleForceProgressBoardListing = () => {
      console.log('🎯 UserView: Force Progress Board listing event received');
      setViewMode('listing');
      setCurrentProjectRun(null);
    };

    window.addEventListener('force-progress-board-listing', handleForceProgressBoardListing);

    return () => {
      window.removeEventListener('force-progress-board-listing', handleForceProgressBoardListing);
    };
  }, [setCurrentProjectRun]);

  // Add event listeners for Re-plan window actions
  useEffect(() => {
    const handleOpenProjectScheduler = () => {
      console.log('🎯 UserView: Opening Project Scheduler');
      setProjectSchedulerOpen(true);
    };
    const handleOpenMaterialsSelection = () => {
      console.log('🎯 UserView: Opening Materials Selection');
      setMaterialsSelectionOpen(true);
    };
    const handleOpenOrderingWindow = () => {
      console.log('🎯 UserView: Opening Ordering Window');
      setOrderingWindowOpen(true);
    };
    const handleOpenProjectCustomizer = (event?: any) => {
      console.log('🎯 UserView: Opening Project Customizer', event?.detail);
      const mode = event?.detail?.mode || 'replan';
      setProjectCustomizerMode(mode);
      setProjectCustomizerOpen(true);
    };

    window.addEventListener('openProjectScheduler', handleOpenProjectScheduler);
    window.addEventListener('openMaterialsSelection', handleOpenMaterialsSelection);
    window.addEventListener('openOrderingWindow', handleOpenOrderingWindow);
    window.addEventListener('openProjectCustomizer', handleOpenProjectCustomizer as EventListener);

    return () => {
      window.removeEventListener('openProjectScheduler', handleOpenProjectScheduler);
      window.removeEventListener('openMaterialsSelection', handleOpenMaterialsSelection);
      window.removeEventListener('openOrderingWindow', handleOpenOrderingWindow);
      window.removeEventListener('openProjectCustomizer', handleOpenProjectCustomizer);
    };
  }, []);

  
  // Get the active project data from either currentProject or currentProjectRun
  const activeProject = currentProjectRun || currentProject;
  
  // CRITICAL ARCHITECTURE:
  // - Project templates use DYNAMIC phases (live updates from standard foundation)
  // - Project runs use STATIC phases (immutable snapshot taken at creation)
  const { phases: dynamicPhases, loading: dynamicPhasesLoading } = useDynamicPhases(
    currentProject?.id // Only fetch dynamic phases for templates, NOT runs
  );
  
  // Determine which phases to use based on context
  // CRITICAL: For project runs, use the snapshot. For templates, prefer dynamic phases from RPC
  let rawWorkflowPhases: Phase[] = [];
  if (currentProjectRun) {
    // Project runs: use immutable snapshot from project_runs.phases
    rawWorkflowPhases = Array.isArray(currentProjectRun.phases) ? currentProjectRun.phases : [];
    console.log('📦 Using project run phases:', {
      runId: currentProjectRun.id,
      phasesLength: rawWorkflowPhases.length,
      phasesIsArray: Array.isArray(currentProjectRun.phases),
      rawPhases: currentProjectRun.phases
    });
  } else if (currentProject) {
    // Templates: prefer dynamic phases from RPC, fallback to stored phases
    if (dynamicPhases.length > 0) {
      rawWorkflowPhases = dynamicPhases;
      console.log('🔄 Using dynamic phases from RPC:', { phasesLength: dynamicPhases.length });
    } else if (currentProject.phases && currentProject.phases.length > 0) {
      rawWorkflowPhases = currentProject.phases;
      console.log('📁 Using stored project phases:', { phasesLength: currentProject.phases.length });
    } else {
      console.warn('⚠️ No phases found for project:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        hasDynamicPhases: dynamicPhases.length > 0,
        hasStoredPhases: !!(currentProject.phases && currentProject.phases.length > 0),
        dynamicPhasesLoading
      });
    }
  }

  // Apply standard phase ordering to match Structure Manager
  // This ensures workflow navigation follows the same order as structure manager
  const workflowPhases = enforceStandardPhaseOrdering(rawWorkflowPhases);
  
  // Debug active project structure - CRITICAL DEBUGGING
  console.log('🔍 WorkflowPhases source (RAW DATA PULL):', {
    isProjectRun: !!currentProjectRun,
    projectRunId: currentProjectRun?.id,
    currentProjectId: currentProject?.id,
    dynamicPhasesLength: dynamicPhases.length,
    currentProjectPhasesLength: currentProject?.phases?.length || 0,
    workflowPhasesLength: workflowPhases.length,
    rawPhasesType: typeof (currentProjectRun?.phases || currentProject?.phases),
    rawPhasesIsArray: Array.isArray(currentProjectRun?.phases || currentProject?.phases),
    rawPhases: currentProjectRun?.phases || currentProject?.phases,
    workflowPhasesSample: workflowPhases.slice(0, 2).map(p => ({
      name: p?.name,
      id: p?.id,
      hasOperations: !!p?.operations,
      operationsType: typeof p?.operations,
      operationsIsArray: Array.isArray(p?.operations),
      operationsCount: Array.isArray(p?.operations) ? p.operations.length : (p?.operations ? 1 : 0),
      operationsRaw: p?.operations,
      firstOperation: Array.isArray(p?.operations) ? p.operations[0] : p?.operations,
      firstOperationSteps: Array.isArray(p?.operations) 
        ? (p.operations[0]?.steps ? (Array.isArray(p.operations[0].steps) ? p.operations[0].steps : [p.operations[0].steps]) : [])
        : ((p?.operations as any)?.steps ? (Array.isArray((p.operations as any).steps) ? (p.operations as any).steps : [(p.operations as any).steps]) : [])
    }))
  });
  
  // Debug active project structure - CRITICAL DEBUGGING
  console.log('🔍 UserView Active project debug:', {
    hasCurrentProject: !!currentProject,
    hasCurrentProjectRun: !!currentProjectRun,
    currentProjectRunId: currentProjectRun?.id,
    currentProjectRunName: currentProjectRun?.name,
    activeProjectId: activeProject?.id,
    activeProjectName: activeProject?.name,
    isUsingDynamicPhases: !!currentProject && !currentProjectRun && dynamicPhases.length > 0,
    isUsingImmutableSnapshot: !!currentProjectRun,
    dynamicPhasesLoading,
    rawProjectRunPhases: currentProjectRun?.phases ? 'exists' : 'missing',
    rawProjectRunPhasesType: typeof currentProjectRun?.phases,
    rawProjectRunPhasesIsArray: Array.isArray(currentProjectRun?.phases),
    phasesLength: workflowPhases?.length || 0,
    workflowPhasesType: typeof workflowPhases,
    workflowPhasesIsArray: Array.isArray(workflowPhases),
    firstPhase: workflowPhases?.[0] ? {
      id: workflowPhases[0].id,
      name: workflowPhases[0].name,
      operationsExists: !!workflowPhases[0].operations,
      operationsIsArray: Array.isArray(workflowPhases[0].operations),
      operationsCount: workflowPhases[0].operations?.length || 0,
      firstOperation: workflowPhases[0].operations?.[0] ? {
        id: workflowPhases[0].operations[0].id,
        name: workflowPhases[0].operations[0].name,
        stepsExists: !!workflowPhases[0].operations[0].steps,
        stepsIsArray: Array.isArray(workflowPhases[0].operations[0].steps),
        stepsCount: workflowPhases[0].operations[0].steps?.length || 0
      } : null
    } : null
  });
  
  // Flatten all steps with phases directly from project
  // NORMAL CODE METHODOLOGY: phases -> operations[] -> steps[]
  // Structure: phase.operations is always an array, operation.steps is always an array
  const allSteps = workflowPhases
    ?.flatMap((phase) => 
      (phase.operations || [])
        .flatMap((operation) => 
          (operation.steps || [])
            .map((step) => {
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
                phaseId: phase.id,
                operationName: operation.name,
                operationId: operation.id,
                materials,
                tools
              };
            })
        )
    ) || [];
  
  // CRITICAL DEBUG: Log what's actually in the data - simplified output
  const firstPhase = workflowPhases?.[0];
  const firstOperation = firstPhase?.operations?.[0];
  const firstStep = firstOperation?.steps?.[0];
  
  const operationsLength = Array.isArray(firstPhase?.operations) ? firstPhase.operations.length : (firstPhase?.operations ? 1 : 0);
  const stepsLength = Array.isArray(firstOperation?.steps) ? firstOperation.steps.length : (firstOperation?.steps ? 1 : 0);
  
  console.log('🔍 ROOT CAUSE - First Phase Structure:', {
    phaseName: firstPhase?.name,
    phaseId: firstPhase?.id,
    hasOperations: !!firstPhase?.operations,
    operationsType: typeof firstPhase?.operations,
    operationsIsArray: Array.isArray(firstPhase?.operations),
    operationsLength: operationsLength,
    firstOperationName: firstOperation?.name,
    firstOperationId: firstOperation?.id,
    hasSteps: !!firstOperation?.steps,
    stepsType: typeof firstOperation?.steps,
    stepsIsArray: Array.isArray(firstOperation?.steps),
    stepsLength: stepsLength,
    firstStepId: firstStep?.id,
    firstStepTitle: firstStep?.step,
    RAW_FIRST_PHASE: firstPhase,
    RAW_FIRST_OPERATION: firstOperation,
    RAW_FIRST_STEP: firstStep
  });
  
  // Log the actual structure more explicitly - FORCE OUTPUT
  console.log('🔍 ROOT CAUSE - Operations and Steps Count:', {
    phaseName: firstPhase?.name,
    operationsCount: operationsLength,
    stepsCount: stepsLength,
    firstOperationName: firstOperation?.name,
    firstOperationId: firstOperation?.id,
    firstStepId: firstStep?.id,
    firstStepTitle: firstStep?.step,
    operationsArray: firstPhase?.operations,
    stepsArray: firstOperation?.steps,
    FULL_FIRST_PHASE_JSON: JSON.stringify(firstPhase, null, 2),
    FULL_FIRST_OPERATION_JSON: JSON.stringify(firstOperation, null, 2),
    FULL_FIRST_STEP_JSON: JSON.stringify(firstStep, null, 2)
  });
  
  console.log('🔍 UserView allSteps calculation:', {
    workflowPhasesLength: workflowPhases?.length || 0,
    allStepsLength: allSteps.length
  });
  
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);
  
  // Initialize completed steps from project run data ONLY on project change
  // CRITICAL: Do NOT sync on completedSteps changes to prevent infinite loop
  useEffect(() => {
    // Don't overwrite local state while completing a step
    if (isCompletingStepRef.current) {
      console.log("⏸️ UserView: Skipping completed steps initialization during step completion");
      return;
    }
    
    if (currentProjectRun?.completedSteps && Array.isArray(currentProjectRun.completedSteps)) {
      console.log("🔄 UserView: Initializing completed steps from project run:", {
        projectRunId: currentProjectRun.id,
        projectName: currentProjectRun.name,
        completedStepsCount: currentProjectRun.completedSteps.length,
        completedSteps: currentProjectRun.completedSteps,
        allStepsCount: allSteps.length
      });
      
      // Only update if the data is actually different to avoid unnecessary re-renders
      const currentCompleted = Array.from(completedSteps).sort().join(',');
      const dbCompleted = [...currentProjectRun.completedSteps].sort().join(',');
      
      if (currentCompleted !== dbCompleted) {
        console.log("🔄 UserView: Database has different completed steps, updating local state");
        const newCompletedSteps = new Set(currentProjectRun.completedSteps);
        setCompletedSteps(newCompletedSteps);
        
        console.log("✅ UserView: Completed steps SET updated:", {
          setSize: newCompletedSteps.size,
          setContents: Array.from(newCompletedSteps)
        });
      } else {
        console.log("✅ UserView: Completed steps already in sync with database");
      }
    } else if (currentProjectRun && completedSteps.size > 0) {
      // Clear completed steps if project run has no completed steps
      console.log("🔄 UserView: Clearing completed steps for new project run");
      setCompletedSteps(new Set());
    }
  }, [currentProjectRun?.id]); // CRITICAL FIX: Only depend on project ID, not completedSteps
  
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
        // Don't open cancelled projects
        if (projectRun.status === 'cancelled') {
          console.log('❌ UserView: Project run is cancelled, not opening:', projectRun.name);
          return;
        }
        console.log('✅ UserView: Found and setting project run:', projectRun.name);
        setCurrentProjectRun(projectRun);
        setViewMode('workflow');
      } else {
        console.log('❌ UserView: Project run not found with ID:', projectRunId);
      }
    }
  }, [projectRunId, projectRuns, setCurrentProjectRun]);

  // SIMPLIFIED VIEW MODE LOGIC - Single effect to prevent race conditions
  useEffect(() => {
    console.log('🔄 UserView: View mode logic triggered:', { 
      resetToListing, 
      forceListingMode,
      showProfile,
      currentProjectRun: !!currentProjectRun,
      currentProjectRunStatus: currentProjectRun?.status,
      projectRunId,
      viewMode
    });

    // CRITICAL FIX: Don't open cancelled projects - clear them completely
    if (currentProjectRun && currentProjectRun.status === 'cancelled') {
      console.log('🔄 UserView: Current project run is cancelled - clearing it and forcing listing mode');
      setCurrentProjectRun(null);
      setViewMode('listing');
      return;
    }

    // CRITICAL FIX: ALWAYS respect forceListingMode - Progress Board must show listing
    if (forceListingMode) {
      console.log('🔄 UserView: forceListingMode active - staying in listing mode');
      if (viewMode !== 'listing') {
        setViewMode('listing');
      }
      return;
    }

    // Only auto-open project workflow if not in listing mode and not showing profile
    if (currentProjectRun && !showProfile) {
      console.log('🔄 UserView: Have current project run - checking kickoff completion');
      // Only proceed to workflow if kickoff is complete
      if (isKickoffComplete) {
        console.log('🔄 UserView: Kickoff complete - allowing workflow mode');
        if (viewMode !== 'workflow') {
          setViewMode('workflow');
          onProjectSelected?.();
        }
      } else {
        console.log('🔄 UserView: Kickoff incomplete - staying in workflow for kickoff');
        if (viewMode !== 'workflow') {
          setViewMode('workflow');
        }
      }
      return;
    }

    // Determine new view mode based on priority
    let newViewMode: 'listing' | 'workflow' = viewMode;

    if (showProfile || forceListingMode) {
      newViewMode = 'listing';
    } else if (resetToListing && !currentProjectRun) {
      newViewMode = 'listing';
      setShowProfileManager(false);
    } else if (projectRunId && currentProjectRun) {
      newViewMode = 'workflow';
    }

    // Only update if view mode actually changed
    if (newViewMode !== viewMode) {
      console.log(`🔄 UserView: Changing view mode from ${viewMode} to ${newViewMode}`);
      setViewMode(newViewMode);
    }
    
  }, [resetToListing, forceListingMode, showProfile, currentProjectRun, projectRunId, viewMode, onProjectSelected]);
  
  const currentStep = allSteps[currentStepIndex];
  
  // CRITICAL FIX: Calculate progress from actual workflow steps using unified utility
  // This ensures consistent progress calculation everywhere
  const { total: totalSteps, completed: completedStepsCount } = currentProjectRun 
    ? getWorkflowStepsCount(currentProjectRun) 
    : { total: 0, completed: 0 };
  const progress = totalSteps > 0 ? (completedStepsCount / totalSteps) * 100 : 0;
  
  console.log('📊 Progress Calculation (DETAILED):', {
    totalPhases: activeProject?.phases?.length || 0,
    phasesWithSteps: activeProject?.phases?.filter(p => p.operations?.some(o => o.steps?.length > 0)).length || 0,
    totalSteps: totalSteps,
    workflowCompletedSteps: completedStepsCount,
    completedStepsFromState: completedSteps.size,
    completedStepsArray: Array.from(completedSteps).slice(0, 10),
    calculatedProgress: progress,
    projectRunProgress: currentProjectRun?.progress,
    projectRunCompletedSteps: currentProjectRun?.completedSteps?.length,
    projectRunCompletedStepsPreview: currentProjectRun?.completedSteps?.slice(0, 10) || []
  });
  
  // Debug current step to identify materials/tools/apps issue
  console.log('🔧 Current step debug:', {
    stepIndex: currentStepIndex,
    stepId: currentStep?.id,
    stepName: currentStep?.step,
    phaseName: currentStep?.phaseName,
    materialsLength: currentStep?.materials?.length || 0,
    toolsLength: currentStep?.tools?.length || 0,
    appsLength: currentStep?.apps?.length || 0,
    hasApps: !!currentStep?.apps
  });
  
  // CRITICAL: Update database progress to match calculated progress
  // Remove the automatic progress update - it causes infinite loops
  // Progress will be updated only when steps are completed in handleStepComplete
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

  // Track step start time when user views a step (for analytics)
  useEffect(() => {
    if (!currentStep || !currentProjectRun) return;

    // Record started_at timestamp when step is first viewed
    const trackStepStart = async () => {
      try {
        const { data: existingStep, error: fetchError } = await supabase
          .from('project_run_steps')
          .select('id, started_at')
          .eq('project_run_id', currentProjectRun.id)
          .eq('template_step_id', currentStep.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching project_run_step for start tracking:', fetchError);
          return;
        }

        // Only set started_at if it doesn't exist yet
        if (!existingStep || !existingStep.started_at) {
          const now = new Date().toISOString();
          const stepData = {
            project_run_id: currentProjectRun.id,
            template_step_id: currentStep.id,
            started_at: now,
            updated_at: now
          };

          if (existingStep) {
            // Update existing record with started_at
            const { error: updateError } = await supabase
              .from('project_run_steps')
              .update({
                started_at: now,
                updated_at: now
              })
              .eq('id', existingStep.id);

            if (updateError) {
              console.error('Error updating project_run_step started_at:', updateError);
            } else {
              console.log('✅ Step start timestamp recorded in project_run_steps');
            }
          } else {
            // Insert new record with started_at
            const { error: insertError } = await supabase
              .from('project_run_steps')
              .insert(stepData);

            if (insertError) {
              console.error('Error inserting project_run_step started_at:', insertError);
            } else {
              console.log('✅ Step start timestamp recorded in project_run_steps');
            }
          }
        }
      } catch (error) {
        console.error('Error tracking step start:', error);
        // Don't fail if timestamp tracking fails
      }
    };

    trackStepStart();
  }, [currentStep?.id, currentProjectRun?.id]); // Track when step or project changes
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
    
    // Set flag to prevent useEffect from overwriting state during completion
    isCompletingStepRef.current = true;
    
    try {
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
          const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
          const preservedKickoffSteps = currentProjectRun.completedSteps.filter(stepId => 
            kickoffStepIds.includes(stepId)
          );
          
          const workflowCompletedSteps = newCompletedSteps.filter(stepId => !stepId.startsWith('kickoff-'));
          const allCompletedSteps = [...preservedKickoffSteps, ...workflowCompletedSteps];
          const uniqueCompletedSteps = [...new Set(allCompletedSteps)];
          
          // Use the centralized progress calculation utility (includes ALL steps)
          const tempProjectRun = { ...currentProjectRun, completedSteps: uniqueCompletedSteps };
          const calculatedProgress = calculateProjectProgress(tempProjectRun);
          
          // Set status to 'complete' if progress is 100%
          const newStatus = calculatedProgress >= 100 ? 'complete' : currentProjectRun.status;
          
          const updatedProjectRun = {
            ...currentProjectRun,
            completedSteps: uniqueCompletedSteps,
            progress: Math.round(calculatedProgress),
            status: newStatus,
            updatedAt: new Date()
          };
          
          console.log("🎯 Immediately persisting step completion:", {
            stepId: currentStep.id,
            newCompletedSteps: uniqueCompletedSteps,
            progress: calculatedProgress
          });
          
          // CRITICAL: Wait for database update to complete before clearing flag
          await updateProjectRun(updatedProjectRun);
          
          // Record step completion timestamp in project_run_steps table for analytics
          try {
            const { data: existingStep, error: fetchError } = await supabase
              .from('project_run_steps')
              .select('id, started_at')
              .eq('project_run_id', currentProjectRun.id)
              .eq('template_step_id', currentStep.id)
              .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Error fetching project_run_step:', fetchError);
            }

            const now = new Date().toISOString();
            const stepData = {
              project_run_id: currentProjectRun.id,
              template_step_id: currentStep.id,
              is_completed: true,
              completion_percentage: 100,
              completed_at: now,
              updated_at: now
            };

            if (existingStep) {
              // Update existing record
              const { error: updateError } = await supabase
                .from('project_run_steps')
                .update({
                  ...stepData,
                  started_at: existingStep.started_at || now // Preserve started_at if it exists
                })
                .eq('id', existingStep.id);

              if (updateError) {
                console.error('Error updating project_run_step:', updateError);
              } else {
                console.log('✅ Step completion timestamp recorded in project_run_steps');
              }
            } else {
              // Insert new record
              const { error: insertError } = await supabase
                .from('project_run_steps')
                .insert({
                  ...stepData,
                  started_at: now // Set started_at to now if not previously tracked
                });

              if (insertError) {
                console.error('Error inserting project_run_step:', insertError);
              } else {
                console.log('✅ Step completion timestamp recorded in project_run_steps');
              }
            }
          } catch (error) {
            console.error('Error recording step timestamp:', error);
            // Don't fail the step completion if timestamp recording fails
          }
          
          console.log("✅ Step completion persisted to database successfully");
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
            
            // Automatically mark phase as complete - open PhaseCompletionPopup to verify outputs
            // Phase is considered complete when all steps are done, popup just checks outputs
            setPhaseCompletionOpen(true);
            
            // Note: Phase completion is automatically determined by completed steps
            // No need to store separately - it's inferred from all steps being complete
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
        
        // Check if all steps are now complete
        const allStepsComplete = allSteps.every(step => newCompletedSteps.includes(step.id));
        
        if (allStepsComplete) {
          console.log("🎉 All steps completed! Project finished.");
          
          // Update project run with completion data
          const completionUpdate = {
            ...currentProjectRun,
            status: 'complete' as const,
            end_date: new Date(),
            completedSteps: newCompletedSteps,
            progress: 100,
            updatedAt: new Date()
          };
          
          await updateProjectRun(completionUpdate);
          console.log("✅ Project completion saved with end_date:", completionUpdate.end_date);
          
          setProjectCompletionOpen(true);
        } else if (currentStepIndex < allSteps.length - 1) {
          console.log("🎯 Moving to next step");
          handleNext();
        }
      } else {
        console.log("❌ Cannot complete step - not all outputs are completed");
      }
    } catch (error) {
      console.error("❌ Error completing step:", error);
    } finally {
      // Clear the flag regardless of success or failure
      // Use setTimeout to ensure database update propagates before clearing
      setTimeout(() => {
        isCompletingStepRef.current = false;
      }, 100);
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
      const processedPhases = activeProject.phases;
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
    const processedPhases = activeProject.phases;
    
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

    // Log the issue report for debugging
    console.log("Issue Report submitted and saved:", issueReportData);
    
    toast.success("Issue reported successfully", {
      description: "Your feedback has been recorded"
    });
    
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
  
  // Handle app launches
  const handleLaunchApp = (app: AppReference) => {
    console.log('🚀 App launched:', app);
    
    // Handle external apps
    if (app.appType === 'external-link' && app.linkUrl) {
      window.open(app.linkUrl, app.openInNewTab ? '_blank' : '_self');
      return;
    }
    
    if (app.appType === 'external-embed' && app.embedUrl) {
      // TODO: Open embed modal
      console.log('Opening embed for:', app.embedUrl);
      return;
    }
    
    // Handle native apps
    switch (app.actionKey) {
      case 'project-customizer':
        setProjectCustomizerMode('initial-plan');
        setProjectCustomizerOpen(true);
        break;
      case 'project-scheduler':
        setProjectSchedulerOpen(true);
        break;
      case 'shopping-checklist':
        setOrderingWindowOpen(true);
        break;
      case 'materials-selection':
        setMaterialsSelectionOpen(true);
        break;
      case 'my-homes':
        console.log('🏠 Launching My Homes app');
        setHomeManagerOpen(true);
        break;
      case 'my-profile':
        console.log('🧑 Launching My Profile app');
        setShowProfileManager(true);
        break;
      case 'my-tools':
        console.log('🔧 Launching My Tools app');
        window.dispatchEvent(new CustomEvent('show-tools-library-grid'));
        break;
      case 'tool-access':
        console.log('🛠️ Launching Tool Access app');
        setToolRentalsOpen(true);
        break;
      case 'project-budgeting':
        console.log('💰 Launching Project Budgeting app');
        setProjectBudgetingOpen(true);
        break;
      case 'project-performance':
        console.log('📊 Launching Project Performance app');
        setProjectPerformanceOpen(true);
        break;
      case 'risk-management':
        console.log('🛡️ Launching Risk Management app');
        setRiskManagementOpen(true);
        break;
      default:
        console.warn('Unknown app action:', app.actionKey);
    }
  };

  // Add event listener for open-app custom event
  useEffect(() => {
    const handleOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🎯 UserView: open-app event received', customEvent.detail);
      if (customEvent.detail && customEvent.detail.actionKey) {
        handleLaunchApp({
          appType: 'native',
          actionKey: customEvent.detail.actionKey
        } as AppReference);
      }
    };

    window.addEventListener('open-app', handleOpenApp as EventListener);

    return () => {
      window.removeEventListener('open-app', handleOpenApp as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // handleLaunchApp is stable (uses only setState functions)
  
  // Fetch step instructions based on instruction level
  const { instruction, loading: instructionLoading } = useStepInstructions(
    currentStep?.id || '',
    instructionLevel
  );

  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;

    // If we have instruction data for this level, render it
    if (instruction && !instructionLoading) {
      return (
        <div className="space-y-6">
          {/* Main text content */}
          {instruction.content.text && (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                {instruction.content.text}
              </div>
            </div>
          )}

          {/* Sections (tips, warnings, etc) - Safety warnings always first */}
          {instruction.content.sections && instruction.content.sections.length > 0 && (
            <div className="space-y-4">
              {[...instruction.content.sections]
                .sort((a, b) => {
                  // Sort warnings to top, then tips, then standard
                  const order = { warning: 0, tip: 1, standard: 2 };
                  return (order[a.type || 'standard'] || 2) - (order[b.type || 'standard'] || 2);
                })
                .map((section, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    section.type === 'warning'
                      ? 'bg-orange-50 border-orange-200'
                      : section.type === 'tip'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-muted border-muted-foreground/20'
                  }`}
                >
                  <h4 className="font-semibold mb-2">{section.title}</h4>
                  <div className="text-sm whitespace-pre-wrap">{section.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          {instruction.content.photos && instruction.content.photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {instruction.content.photos.map((photo, idx) => (
                <div key={idx} className="space-y-2">
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full rounded-lg shadow-card"
                  />
                  {photo.caption && (
                    <p className="text-sm text-muted-foreground italic">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {instruction.content.videos && instruction.content.videos.length > 0 && (
            <div className="space-y-4">
              {instruction.content.videos.map((video, idx) => {
                // Safely parse embed HTML if present, otherwise use direct URL
                const safeUrl = video.embed 
                  ? getSafeEmbedUrl(video.embed) || video.url
                  : video.url;
                
                // Only render if we have a valid URL
                if (!safeUrl) {
                  console.warn('Invalid or untrusted video URL blocked');
                  return null;
                }

                return (
                  <div key={idx} className="space-y-2">
                    {video.title && <h4 className="font-semibold">{video.title}</h4>}
                    <div className="aspect-video rounded-lg overflow-hidden shadow-card">
                      <iframe
                        src={safeUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                        title={video.title || 'Video'}
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Links */}
          {instruction.content.links && instruction.content.links.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Additional Resources</h4>
              <div className="space-y-2">
                {instruction.content.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-primary">{link.title}</div>
                    {link.description && (
                      <div className="text-sm text-muted-foreground">{link.description}</div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Fallback to original content if no instruction data
    // Handle multi-content sections (new format with buttons)
    if (step.contentSections && step.contentSections.length > 0) {
      const handleButtonAction = (action: string) => {
        console.log('Button action triggered:', action);
        switch (action) {
          case 'project-customizer':
            setProjectCustomizerMode('initial-plan');
            setProjectCustomizerOpen(true);
            break;
          case 'project-scheduler':
            setProjectSchedulerOpen(true);
            break;
          case 'shopping-checklist':
            setMaterialsSelectionOpen(true);
            break;
          default:
            console.warn('Unknown button action:', action);
        }
      };
      
      return <MultiContentRenderer 
        sections={step.contentSections} 
        onButtonAction={handleButtonAction}
      />;
    }
    
    // Handle case where content might be an array (backwards compatibility)
    if (Array.isArray(step.content) && step.content.length > 0) {
      const handleButtonAction = (action: string) => {
        switch (action) {
          case 'project-customizer':
            setProjectCustomizerMode('initial-plan');
            setProjectCustomizerOpen(true);
            break;
          case 'project-scheduler':
            setProjectSchedulerOpen(true);
            break;
          case 'shopping-checklist':
            setMaterialsSelectionOpen(true);
            break;
          default:
            console.warn('Unknown button action:', action);
        }
      };
      
      return <MultiContentRenderer 
        sections={step.content} 
        onButtonAction={handleButtonAction}
      />;
    }
    
    
    const contentStr = typeof step.content === 'string' ? step.content : '';
    
    switch (step.contentType) {
      case 'document':
        return <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <div className="text-foreground break-all">
                {contentStr}
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
              <div className="whitespace-pre-wrap">{contentStr}</div>
            </div>
          </div>;
      case 'video':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <span className="font-medium">Tutorial Video</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden shadow-card">
              <iframe src={contentStr} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>;
      default:
        return <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {contentStr}
            </div>
          </div>;
    }
  };

  // Group steps by phase + operation using the flattened allSteps array
  // This guarantees the sidebar only depends on the same data powering the main workflow view.
  // CRITICAL: Use allSteps directly since it's already the deduped, flattened list
  const groupedSteps = allSteps.length > 0 
    ? allSteps.reduce((acc, step) => {
        if (!step || !step.id) return acc; // Skip invalid steps
        
        const phaseName = step.phaseName || 'Uncategorized';
        const operationName = step.operationName || 'General';

        if (!acc[phaseName]) {
          acc[phaseName] = {};
        }
        if (!acc[phaseName][operationName]) {
          acc[phaseName][operationName] = [];
        }

        // Dedupe by step ID
        if (!acc[phaseName][operationName].some((existingStep: any) => existingStep.id === step.id)) {
          acc[phaseName][operationName].push(step);
        }

        return acc;
      }, {} as Record<string, Record<string, any[]>>)
    : {};
  
  // Final safety check: if groupedSteps is empty but allSteps has data, create a fallback structure
  const hasGroupedData = Object.keys(groupedSteps).length > 0 && 
    Object.values(groupedSteps).some((ops: any) => 
      Object.values(ops).some((steps: any) => Array.isArray(steps) && steps.length > 0)
    );
  
  const finalGroupedSteps = hasGroupedData 
    ? groupedSteps 
    : (allSteps.length > 0 
        ? { 'All Steps': { 'Workflow': allSteps } } 
        : {});
  
  // Debug the phase structure in detail
  console.log("🔍 WorkflowPhases detailed structure:", {
    workflowPhasesCount: workflowPhases.length,
    allStepsLength: allSteps.length,
    groupedStepsKeys: Object.keys(groupedSteps),
    groupedStepsEmpty: Object.keys(groupedSteps).length === 0,
    hasGroupedData,
    finalGroupedStepsKeys: Object.keys(finalGroupedSteps),
    finalGroupedStepsEmpty: Object.keys(finalGroupedSteps).length === 0,
    groupedStepsSample: Object.entries(finalGroupedSteps).slice(0, 2).map(([phase, ops]) => ({
      phase,
      operations: Object.keys(ops as any),
      totalStepsInPhase: Object.values(ops as any).reduce((sum: number, opSteps: any) => sum + (Array.isArray(opSteps) ? opSteps.length : 0), 0)
    })),
    phasesWithOperations: workflowPhases.map(p => ({
      phaseName: p.name,
      operationsCount: p.operations?.length || 0,
      operations: p.operations?.map(op => ({
        operationName: op.name,
        stepsCount: op.steps?.length || 0,
        stepNames: op.steps?.map(s => s.step).slice(0, 3)
      })) || []
    }))
  });
  
  console.log("🔍 Debug phase structure:", {
    originalPhases: activeProject?.phases.length || 0,
    workflowPhases: workflowPhases.length,
    phaseNames: workflowPhases.map(p => p.name),
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
      {/* Achievement tracking component - pass current phase and steps */}
      <ProjectCompletionHandler 
        projectRunId={currentProjectRun?.id} 
        status={currentProjectRun?.status}
        currentPhaseId={currentProjectRun?.currentPhaseId}
        completedSteps={completedSteps}
      />
      
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
  // CRITICAL FIX: Don't show kickoff for cancelled projects
  if (currentProjectRun && currentProjectRun.status !== 'cancelled' && !isKickoffComplete && viewMode === 'workflow') {
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
          console.log("🎯 onKickoffComplete called - closing kickoff and switching to workflow");
          
            if (currentProjectRun && updateProjectRun) {
             // Ensure ALL kickoff steps are marked complete (prevent duplicates)
             const existingSteps = currentProjectRun.completedSteps || [];
             
             // Find all actual Kickoff phase operation steps to mark complete
             const kickoffPhase = currentProjectRun.phases.find(p => p.name === 'Kickoff');
             const allKickoffStepIds: string[] = kickoffPhase 
               ? kickoffPhase.operations.flatMap(op => op.steps.map(s => s.id))
               : [];
             
             console.log("🎯 Found Kickoff phase step IDs:", allKickoffStepIds);
             
             // Combine kickoff UI step IDs and actual workflow step IDs
             const uniqueSteps = [...new Set([...existingSteps, ...kickoffStepIds, ...allKickoffStepIds])];
             
             console.log("✅ Marking all kickoff steps complete (UI + workflow):", uniqueSteps);
            
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
               // Mark UI kickoff steps
               kickoffStepIds.forEach(stepId => {
                 newCompletedSteps.add(stepId);
               });
               // Mark actual workflow kickoff steps
               allKickoffStepIds.forEach(stepId => {
                 newCompletedSteps.add(stepId);
               });
               console.log("✅ Kickoff steps marked in completedSteps state:", newCompletedSteps);
               return newCompletedSteps;
             });
            
            // Mark the entire kickoff phase as complete
            console.log("🎯 Marking kickoff phase as complete...");
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
  
  // Only show "under construction" if there are literally no phases at all
  const hasPhases = (activeProject?.phases?.length ?? 0) > 0;
  
  if (allSteps.length === 0 && !hasPhases) {
    return <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This project is under construction - check back soon!
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
          instructionLevel={instructionLevel}
          onInstructionLevelChange={handleInstructionLevelChange}
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
            groupedSteps={finalGroupedSteps}
            isKickoffComplete={isKickoffComplete}
            instructionLevel={instructionLevel}
            projectName={currentProjectRun?.customProjectName || currentProjectRun?.name || 'Project'}
            onInstructionLevelChange={handleInstructionLevelChange}
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
            onPhotosClick={() => setPhotoGalleryOpen(true)}
            onNotesClick={() => setNotesGalleryOpen(true)}
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
                    <CardTitle className="text-xl">{currentStep?.step}</CardTitle>
                  </div>
                  {currentStep?.description && <CardDescription className="text-sm">
                    {currentStep.description}
                  </CardDescription>}
                </div>

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
          <Card 
            key={instructionLevel}
            className="gradient-card border-0 shadow-card"
          >
            <CardContent className="p-8">
              {instructionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading {instructionLevel === 'new_user' ? 'Beginner' : instructionLevel === 'detailed' ? 'Intermediate' : 'Advanced'} content...</div>
                </div>
              ) : (
                renderContent(currentStep)
              )}
            </CardContent>
          </Card>

          {/* Photo Gallery - Show in celebration step */}
          {currentStep && currentStep.id === 'celebrate-step' && currentProjectRun && (
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  Project Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View all photos you've captured throughout this project journey.
                </p>
                <Button 
                  onClick={() => setPhotoGalleryOpen(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  View Project Photos
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Apps Section - Positioned prominently after content */}
          {currentStep && currentStep.apps && currentStep.apps.length > 0 && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  Apps for This Step
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <CompactAppsSection
                  apps={currentStep.apps}
                  onAppsChange={() => {}}
                  onAddApp={() => {}}
                  onLaunchApp={handleLaunchApp}
                  editMode={false}
                />
              </CardContent>
            </Card>
          )}

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
                      <AccordionTrigger className="text-base font-semibold">
                        <div className="flex items-center gap-2">
                          <span>Outputs</span>
                          <Badge variant={isAllCompleted ? "default" : "outline"} className={isAllCompleted ? "bg-green-500 text-white text-xs" : "text-xs"}>
                            {completedCount}/{totalCount}
                          </Badge>
                          {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2.5 pt-2">
                          {currentStep.outputs.map(output => (
                            <div key={output.id} className="p-2.5 bg-background/50 rounded-lg">
                              <div className="flex items-start gap-2.5">
                                <Checkbox 
                                  id={`output-${output.id}`}
                                  checked={stepOutputs.has(output.id)}
                                  onCheckedChange={() => toggleOutputCheck(currentStep.id, output.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium">{output.name}</div>
                                    {output.type !== 'none' && (
                                      <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>
                                    )}
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
                                  <div className="text-xs text-muted-foreground mt-1">{output.description}</div>
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
                  {/* Photo Upload and Note Upload Buttons - Always visible for current step */}
                  {currentStep && currentProjectRun && (
                    <>
                      <PhotoUpload
                        projectRunId={currentProjectRun.id}
                        templateId={currentProjectRun.templateId || null}
                        stepId={currentStep.id}
                        stepName={currentStep.step}
                        phaseId={currentStep.phaseId}
                        phaseName={currentStep.phaseName}
                        operationId={currentStep.operationId}
                        operationName={currentStep.operationName}
                      />
                      <NoteUpload
                        projectRunId={currentProjectRun.id}
                        templateId={currentProjectRun.templateId || null}
                        stepId={currentStep.id}
                        stepName={currentStep.step}
                        phaseId={currentStep.phaseId}
                        phaseName={currentStep.phaseName}
                        operationId={currentStep.operationId}
                        operationName={currentStep.operationName}
                        onNoteAdded={() => {
                          // Optionally refresh notes gallery if open
                          if (notesGalleryOpen) {
                            // NotesGallery will refetch on its own
                          }
                        }}
                      />
                    </>
                  )}

                  {currentStep && !completedSteps.has(currentStep.id) && (
                    areAllOutputsCompleted(currentStep) ? (
                      currentStep.stepType === 'scaled' ? (
                        <Button 
                          onClick={() => {
                            setCurrentScaledStep({
                              id: currentStep.id,
                              title: currentStep.step
                            });
                            setScaledProgressDialogOpen(true);
                          }}
                          size="sm"
                          className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth text-xs"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-xs">Report Progress</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleStepComplete} 
                          size="sm"
                          className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth text-xs"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-xs">Mark Complete</span>
                        </Button>
                      )
                    ) : (
                      <Button 
                        disabled 
                        variant="outline"
                        className="opacity-50 cursor-not-allowed text-xs text-muted-foreground" 
                        size="sm"
                        title={isMobile ? "Complete All Outputs First" : undefined}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2 text-xs text-muted-foreground">Complete All Outputs First</span>}
                      </Button>
                    )
                  )}
                  
                  {/* Report Issue Button */}
                  <Dialog open={issueReportOpen} onOpenChange={setIssueReportOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 text-xs sm:text-sm"
                        title={isMobile ? "Report Issue" : undefined}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2 text-xs sm:text-sm">Report Issue</span>}
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
      
      {/* Materials Selection Window (for regular shopping flow) */}
      <MaterialsSelectionWindow
        open={materialsSelectionOpen && !currentProjectRun}
        onOpenChange={setMaterialsSelectionOpen}
        project={currentProject}
        projectRun={currentProjectRun}
        completedSteps={completedSteps}
        onSelectionComplete={(selectedItems) => {
          setSelectedMaterialsForShopping(selectedItems);
          setMaterialsSelectionOpen(false);
          
          // Set "all items shopped for" output to not complete status
          if (currentProjectRun) {
            const updatedProjectRun = { ...currentProjectRun };
            
            // Find and update any "all items shopped for" outputs
            const processedPhases = updatedProjectRun.phases || [];
            processedPhases.forEach((phase, phaseIndex) => {
              if (phase.operations) {
                phase.operations.forEach((operation, opIndex) => {
                  if (operation.steps) {
                    operation.steps.forEach((step, stepIndex) => {
                      if (step.outputs) {
                        step.outputs.forEach((output, outputIndex) => {
                          if (output.name && output.name.toLowerCase().includes('all items shopped for')) {
                            const outputKey = `${phaseIndex}-${opIndex}-${stepIndex}-${outputIndex}`;
                            if (updatedProjectRun.completedSteps?.includes(outputKey)) {
                              updatedProjectRun.completedSteps = updatedProjectRun.completedSteps.filter(id => id !== outputKey);
                            }
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
            
            updateProjectRun(updatedProjectRun);
          }
          
          // Open ordering window with selected items
          setOrderingWindowOpen(true);
        }}
      />

      {/* Materials Selection Dialog (for re-plan -> new materials needed flow) */}
      <MaterialsSelectionDialog
        open={materialsSelectionOpen && !!currentProjectRun}
        onOpenChange={setMaterialsSelectionOpen}
        projectRun={currentProjectRun}
        onConfirm={(selectedMaterials, customMaterials) => {
          console.log('📦 Materials selected:', { selectedMaterials, customMaterials });
          
          // Transform selected materials to match OrderingWindow format
          const materials = selectedMaterials.map(m => ({
            id: m.id,
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
            checked: true
          }));
          
          // Add custom materials
          customMaterials.forEach(m => {
            materials.push({
              id: m.id,
              name: m.name,
              quantity: m.quantity,
              unit: m.unit,
              checked: true
            });
          });
          
          setSelectedMaterialsForShopping({
            materials,
            tools: []
          });
          
          setMaterialsSelectionOpen(false);
          setOrderingWindowOpen(true);
        }}
      />
      
      {/* Ordering Window */}
      <OrderingWindow
        open={orderingWindowOpen}
        onOpenChange={setOrderingWindowOpen}
        project={currentProject}
        projectRun={currentProjectRun}
        userOwnedTools={[]}
        completedSteps={completedSteps}
        selectedMaterials={selectedMaterialsForShopping}
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
          mode={projectCustomizerMode}
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
      
      {/* Project Completion Popup */}
      {currentProjectRun && (
        <ProjectCompletionPopup
          isOpen={projectCompletionOpen}
          onClose={() => setProjectCompletionOpen(false)}
          projectName={currentProjectRun.name}
          onReturnToWorkshop={() => {
            setProjectCompletionOpen(false);
            setCurrentProjectRun(null);
            setViewMode('listing');
          }}
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
          operations={activeProject.phases?.filter(phase => phase.name !== 'Kickoff').flatMap(phase => phase.operations) || []}
          currentStepId={currentStep?.id}
        />
      )}

      {/* Profile Manager */}
      <ProfileManager 
        open={showProfileManager}
        onOpenChange={setShowProfileManager}
      />

      {/* Tool Rentals Window */}
      <ToolRentalsWindow
        isOpen={toolRentalsOpen}
        onClose={() => setToolRentalsOpen(false)}
      />

      {/* Home Manager */}
      <HomeManager
        open={homeManagerOpen}
        onOpenChange={setHomeManagerOpen}
      />

      {/* Project Budgeting Window */}
      <ProjectBudgetingWindow
        open={projectBudgetingOpen}
        onOpenChange={setProjectBudgetingOpen}
      />

      {/* Project Performance Window */}
      <ProjectPerformanceWindow
        open={projectPerformanceOpen}
        onOpenChange={setProjectPerformanceOpen}
      />

      {/* Risk Management Window */}
      {currentProjectRun && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectRunId={currentProjectRun.id}
          mode="run"
        />
      )}

      {/* Photo Gallery */}
      {currentProjectRun && (
        <PhotoGallery
          open={photoGalleryOpen}
          onOpenChange={setPhotoGalleryOpen}
          projectRunId={currentProjectRun.id}
          templateId={currentProjectRun.templateId || undefined}
          mode="user"
          title="My Project Photos"
        />
      )}

      {/* Notes Gallery */}
      {currentProjectRun && (
        <NotesGallery
          open={notesGalleryOpen}
          onOpenChange={setNotesGalleryOpen}
          projectRunId={currentProjectRun.id}
          templateId={currentProjectRun.templateId || undefined}
          mode="user"
          title="Project Notes"
        />
      )}

      {/* Scaled Step Progress Dialog */}
      {currentScaledStep && currentProjectRun && (
        <ScaledStepProgressDialog
          open={scaledProgressDialogOpen}
          onOpenChange={setScaledProgressDialogOpen}
          projectRunId={currentProjectRun.id}
          stepId={currentScaledStep.id}
          stepTitle={currentScaledStep.title}
          onProgressComplete={handleStepComplete}
        />
      )}
    </>
  );
}