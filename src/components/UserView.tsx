import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { useProjectData } from '@/contexts/ProjectDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Output, Project, AppReference, Phase } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
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
import { ProjectWorkflowOverviewPage } from './ProjectWorkflowOverviewPage';
import { ProjectPlanningWizard } from './ProjectPlanningWizard';
import { UnplannedWorkWindow } from './UnplannedWorkWindow';
import { ProjectSurvey } from './ProjectSurvey';
import { PhotoUpload } from './PhotoUpload';
import { NoteUpload } from './NoteUpload';
import { NotesGallery } from './NotesGallery';
import { PhotoGallery } from './PhotoGallery';
import { WorkflowThemeSelector } from './WorkflowThemeSelector';
import { ProjectCompletionPopup } from './ProjectCompletionPopup';
import { ToolsMaterialsSection } from './ToolsMaterialsSection';
import { ToolInstructionsPopup } from './ToolInstructionsPopup';
import ProfileManager from './ProfileManager';
import { DecisionRollupWindow } from './DecisionRollupWindow';
import { KeyCharacteristicsWindow } from './KeyCharacteristicsWindow';
import { ProjectCustomizer } from './ProjectCustomizer/ProjectCustomizer';
import { ProjectScheduler } from './ProjectScheduler';
import { ProgressViewsWindow } from './ProgressViewsWindow';
import { ScaledStepProgressDialog } from './ScaledStepProgressDialog';
import { MultiContentRenderer } from './MultiContentRenderer';
import { CompactAppsSection } from './CompactAppsSection';
import { useResponsive } from '@/hooks/useResponsive';
import { useStepInstructions } from '@/hooks/useStepInstructions';
import { ToolRentalsWindow } from './ToolRentalsWindow';
import { HomeManager } from './HomeManager';
import { 
  isKickoffPhaseComplete,
  getStepCompletionKey,
  isStepCompleted,
  extractStepIdFromCompletionKey,
  KICKOFF_UI_STEP_IDS
} from '@/utils/projectUtils';
import { collectPlanningWizardWorkflowCompletion } from '@/utils/planningWizardCompletion';
import type { PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';
import { useUserRole } from '@/hooks/useUserRole';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { useMembership } from '@/contexts/MembershipContext';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradePrompt } from './UpgradePrompt';
import { markOrderingStepIncompleteIfNeeded, extractProjectToolsAndMaterials } from '@/utils/shoppingUtils';
import { MobileDIYDropdown } from './MobileDIYDropdown';
import { ProjectCompletionHandler } from './ProjectCompletionHandler';
import { ProjectBudgetingWindow } from './ProjectBudgetingWindow';
import { ProjectPerformanceWindow } from './ProjectPerformanceWindow';
import { RiskManagementWindow } from './RiskManagementWindow';
import { QualityCheckWindow } from './QualityCheckWindow';
import { getSafeEmbedUrl } from '@/utils/videoEmbedSanitizer';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';
import { PostKickoffNotification } from './PostKickoffNotification';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { 
  organizeWorkflowNavigation, 
  convertToGroupedSteps,
  getFlowType,
  type ProjectSpace as WorkflowProjectSpace
} from '@/utils/workflowNavigationUtils';
import { getNativeAppById } from '@/utils/appsRegistry';
import {
  mergeQualityControlSettings,
  isOutputInQualityScope,
  parseQualityControlSettingsColumn
} from '@/utils/qualityControlSettings';
import { isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import { 
  formatEstimatedFinishDate,
  shouldRefreshEstimatedFinishDate
} from '@/utils/estimatedFinishDate';
import { 
  shouldRegenerateSchedule,
  autoRegenerateSchedule
} from '@/utils/autoScheduleRegeneration';
import { projectRunFromSupabaseRow } from '@/utils/projectRunFromSupabaseRow';
import { instructionLevelFromProfileSkill } from '@/utils/instructionLevelFromProfile';
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
  const navigate = useNavigate();
  const { projectCatalogEnabled } = useGlobalPublicSettings();
  const { isMobile } = useResponsive();
  const { isAdmin } = useUserRole();
  const { canAccessApp, hasProjectsTier, hasRiskLessTier, loading: membershipLoading } = useMembership();
  const { user } = useAuth();
  const qualityControlPdfUserLabel = useMemo(() => {
    if (!user) return '';
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName = meta?.full_name;
    if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();
    const metaName = meta?.name;
    if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
    if (user.email) return user.email;
    return '';
  }, [user]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptFeature, setUpgradePromptFeature] = useState('this app');
  const {
    currentProject,
    currentProjectRun,
    projectRuns,
    projects,
    setCurrentProjectRun,
    updateProjectRun,
    deleteProjectRun
  } = useProject();
  const safeProjectRuns = projectRuns ?? [];
  const { refetchProjectRuns, updateProjectRunsCache } = useProjectData();
  const [viewMode, setViewMode] = useState<'listing' | 'workflow'>('listing');
  const [workflowMainView, setWorkflowMainView] = useState<'overview' | 'steps'>('overview');
  const lastWorkflowProjectRunIdRef = useRef<string | null>(null);
  const handleLaunchAppRef = useRef<(app: AppReference) => void>(() => {});
  /** Run ids for which we already applied profile-based instruction level (no DB preference yet). */
  const instructionLevelProfileInitRunIdsRef = useRef<Set<string>>(new Set());
  const currentProjectRunForInstructionRef = useRef(currentProjectRun);
  currentProjectRunForInstructionRef.current = currentProjectRun;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const stepRuntimeStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRuntimeStepKeyRef = useRef<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, Set<string>>>({});
  const [checkedTools, setCheckedTools] = useState<Record<string, Set<string>>>({});
  const [checkedOutputs, setCheckedOutputs] = useState<Record<string, Set<string>>>({});
  const [stepPhotosRefreshNonce, setStepPhotosRefreshNonce] = useState(0);
  const [stepPhotoCountForCompletion, setStepPhotoCountForCompletion] = useState<number | null>(null);
  const [toolInstructions, setToolInstructions] = useState<{ id: string; name: string } | null>(null);
  
  // Project spaces state for workflow navigation
  const [projectSpaces, setProjectSpaces] = useState<WorkflowProjectSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  
  // Estimated finish date state
  const [estimatedFinishDate, setEstimatedFinishDate] = useState<Date | null>(null);
  const [estimatedFinishDateLoading, setEstimatedFinishDateLoading] = useState(false);
  const [lastFinishDateRefresh, setLastFinishDateRefresh] = useState<Date | null>(null);
  
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
  
  // App overrides state - loaded from database to get custom app names/icons
  const [appOverrides, setAppOverrides] = useState<Map<string, { app_name: string; description?: string; icon?: string; }>>(new Map());

  // Handle showProfile prop - don't switch to workflow if profile should be shown
  useEffect(() => {
    if (showProfile && !showProfileManager) {
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
  const [projectPlanningWizardOpen, setProjectPlanningWizardOpen] = useState(false);
  const [materialsSelectionOpen, setMaterialsSelectionOpen] = useState(false);
  const [toolRentalsOpen, setToolRentalsOpen] = useState(false);
  const [homeManagerOpen, setHomeManagerOpen] = useState(false);
  const [projectBudgetingOpen, setProjectBudgetingOpen] = useState(false);
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);
  const [projectPerformanceOpen, setProjectPerformanceOpen] = useState(false);
  const [qualityCheckOpen, setQualityCheckOpen] = useState(false);
  const [qualityCheckExpandSettingsAccordion, setQualityCheckExpandSettingsAccordion] = useState(false);
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [notesGalleryOpen, setNotesGalleryOpen] = useState(false);
  const [notesGalleryInitialStepId, setNotesGalleryInitialStepId] = useState<string>('');
  const [progressViewsOpen, setProgressViewsOpen] = useState(false);
  const [scaledProgressDialogOpen, setScaledProgressDialogOpen] = useState(false);
  const [currentScaledStep, setCurrentScaledStep] = useState<{ id: string; title: string } | null>(null);
  const [selectedMaterialsForShopping, setSelectedMaterialsForShopping] = useState<{
    materials: any[];
    tools: any[];
  }>({ materials: [], tools: [] });
  const [previousToolsAndMaterials, setPreviousToolsAndMaterials] = useState<{ tools: any[], materials: any[] } | null>(null);
  
  // Detail level state - defaults to 'intermediate' for balanced detail
  const [instructionLevel, setInstructionLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  // Check if kickoff phase is complete for project runs - MOVED UP to fix TypeScript error
  const isKickoffComplete = currentProjectRun
    ? isKickoffPhaseComplete(currentProjectRun.completedSteps ?? [])
    : true;

  // When entering a workflow, default to the overview page (per project run).
  useEffect(() => {
    const projectRunId = currentProjectRun?.id;
    if (viewMode === 'workflow' && isKickoffComplete && projectRunId) {
      if (lastWorkflowProjectRunIdRef.current !== projectRunId) {
        setWorkflowMainView('overview');
        lastWorkflowProjectRunIdRef.current = projectRunId;
      }
    }

    if (viewMode !== 'workflow') {
      lastWorkflowProjectRunIdRef.current = null;
    }
  }, [viewMode, isKickoffComplete, currentProjectRun?.id]);

  // Post-kickoff notification state
  const [showPostKickoffNotification, setShowPostKickoffNotification] = useState(false);
  const [dontShowPostKickoffNotification, setDontShowPostKickoffNotification] = useLocalStorage<boolean>(
    'dontShowPostKickoffNotification',
    false
  );

  // Sync detail level with project run; seed from user profile when the run has no saved preference yet
  useEffect(() => {
    const run = currentProjectRun;
    const runId = run?.id;
    if (!run || !runId || !user?.id) return;

    const pref = run.instruction_level_preference;
    const validPref =
      pref === 'beginner' || pref === 'intermediate' || pref === 'advanced';

    if (validPref) {
      setInstructionLevel(pref);
      return;
    }

    if (instructionLevelProfileInitRunIdsRef.current.has(runId)) return;
    instructionLevelProfileInitRunIdsRef.current.add(runId);

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('skill_level')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) {
        instructionLevelProfileInitRunIdsRef.current.delete(runId);
        return;
      }

      if (error) {
        console.error('UserView: could not load profile for instruction level', error);
        instructionLevelProfileInitRunIdsRef.current.delete(runId);
        setInstructionLevel('intermediate');
        return;
      }

      const mapped = instructionLevelFromProfileSkill(data?.skill_level);
      const latest = currentProjectRunForInstructionRef.current;
      if (!latest || latest.id !== runId) {
        instructionLevelProfileInitRunIdsRef.current.delete(runId);
        return;
      }

      if (mapped) {
        setInstructionLevel(mapped);
        await updateProjectRun({
          ...latest,
          instruction_level_preference: mapped,
        });
      } else {
        setInstructionLevel('intermediate');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentProjectRun?.id,
    currentProjectRun?.instruction_level_preference,
    user?.id,
    updateProjectRun,
  ]);

  // Handle instruction level change and save to project run
  const handleInstructionLevelChange = async (level: 'beginner' | 'intermediate' | 'advanced') => {
    setInstructionLevel(level);
    if (currentProjectRun) {
      await updateProjectRun({
        ...currentProjectRun,
        instruction_level_preference: level
      });
    }
  };

  // Add event listener for Project Dashboard force listing
  useEffect(() => {
    const handleForceProgressBoardListing = () => {
      setViewMode('listing');
      setCurrentProjectRun(null);
    };

    window.addEventListener('force-project-dashboard-listing', handleForceProgressBoardListing);

    return () => {
      window.removeEventListener('force-project-dashboard-listing', handleForceProgressBoardListing);
    };
  }, [setCurrentProjectRun]);

  // Load app overrides from database to get custom app names/icons
  useEffect(() => {
    const loadAppOverrides = async () => {
      try {
        const { data: appOverridesData, error } = await supabase
          .from('app_overrides')
          .select('*');
        
        if (error) {
          console.error('Error loading app overrides:', error);
          return;
        }
        
        const overrideMap = new Map<string, { app_name: string; description?: string; icon?: string; }>();
        if (appOverridesData) {
          appOverridesData.forEach(override => {
            overrideMap.set(override.app_id, {
              app_name: override.app_name,
              description: override.description || undefined,
              icon: override.icon || undefined
            });
          });
        }
        setAppOverrides(overrideMap);
      } catch (error) {
        console.error('Error loading app overrides:', error);
      }
    };
    
    loadAppOverrides();
  }, []);

  // Add event listeners for Re-plan window actions
  useEffect(() => {
    const handleOpenProjectScheduler = () => {
      setProjectSchedulerOpen(true);
    };
    const handleOpenMaterialsSelection = () => {
      setMaterialsSelectionOpen(true);
    };
    const handleOpenOrderingWindow = () => {
      setOrderingWindowOpen(true);
    };
    const handleOpenProjectCustomizer = (event?: any) => {
      const mode = event?.detail?.mode || 'replan';
      const fromPlanningWizard = event?.detail?.fromPlanningWizard || false;
      const onComplete = event?.detail?.onComplete;
      
      // Store the onComplete callback if opened from planning wizard
      if (fromPlanningWizard && onComplete) {
        // Store it in a ref or state to call when customizer closes
        (window as any).__planningWizardCustomizerComplete = onComplete;
      }
      
      setProjectCustomizerMode(mode);
      setProjectCustomizerOpen(true);
    };
    const handleOpenProjectBudgeting = () => {
      setProjectBudgetingOpen(true);
    };

    window.addEventListener('openProjectScheduler', handleOpenProjectScheduler);
    window.addEventListener('open-project-scheduler', handleOpenProjectScheduler);
    window.addEventListener('openMaterialsSelection', handleOpenMaterialsSelection);
    window.addEventListener('openOrderingWindow', handleOpenOrderingWindow);
    window.addEventListener('openProjectCustomizer', handleOpenProjectCustomizer as EventListener);
    window.addEventListener('open-project-customizer', handleOpenProjectCustomizer as EventListener);
    window.addEventListener('open-project-budgeting', handleOpenProjectBudgeting);

    return () => {
      window.removeEventListener('openProjectScheduler', handleOpenProjectScheduler);
      window.removeEventListener('open-project-scheduler', handleOpenProjectScheduler);
      window.removeEventListener('openMaterialsSelection', handleOpenMaterialsSelection);
      window.removeEventListener('openOrderingWindow', handleOpenOrderingWindow);
      window.removeEventListener('openProjectCustomizer', handleOpenProjectCustomizer);
      window.removeEventListener('open-project-customizer', handleOpenProjectCustomizer);
      window.removeEventListener('open-project-budgeting', handleOpenProjectBudgeting);
    };
  }, []);

  
  // Get the active project data from either currentProject or currentProjectRun
  const activeProject = currentProjectRun || currentProject;
  
  // Load project spaces from database with dynamic linkage
  // CRITICAL: Always read space names directly from database - never copy/store them
  // This ensures workflow navigation automatically updates when space names change
  useEffect(() => {
    if (!currentProjectRun?.id) {
      setProjectSpaces([]);
      return;
    }
    
    const loadSpaces = async () => {
      setSpacesLoading(true);
      try {
        const { data: spacesData, error } = await supabase
          .from('project_run_spaces')
          .select('id, space_name, space_type, priority')
          .eq('project_run_id', currentProjectRun.id)
          .order('priority', { ascending: true, nullsLast: true });
        
        if (error) {
          console.error('❌ Error fetching spaces from database:', error);
          throw error;
        }
        
        // CRITICAL: Map space_name directly from database - this is dynamic linkage
        // If space_name changes in database, this will reflect it immediately
        const spaces: WorkflowProjectSpace[] = (spacesData || []).map(space => ({
          id: space.id,
          space_name: space.space_name, // Dynamic: always reads from database
          priority: space.priority,
          spaceType: space.space_type
        }));
        
        setProjectSpaces(spaces);
        
        // If no spaces exist, log a warning
        if (spaces.length === 0) {
          console.error('❌ CRITICAL: No spaces found for project run! Default "Room 1" should have been created by create_project_run_snapshot. This will prevent workflow navigation from working correctly.');
        }
      } catch (error) {
        console.error('❌ Error loading project spaces:', error);
        setProjectSpaces([]);
      } finally {
        setSpacesLoading(false);
      }
    };
    
    loadSpaces();
    
    // CRITICAL: Set up Supabase realtime subscription for dynamic linkage
    // This automatically updates workflow navigation when space names change in database
    const channel = supabase
      .channel(`project-spaces-${currentProjectRun.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'project_run_spaces',
          filter: `project_run_id=eq.${currentProjectRun.id}`
        },
        (payload) => {
          
          // Reload spaces from database to get updated names
          // This ensures workflow navigation always shows current space names
          loadSpaces();
        }
      )
      .subscribe();
    
    // Handler for refresh events (manual triggers)
    const handleRefresh = async () => {
      // Reload spaces
      await loadSpaces();
      
      // CRITICAL: Refetch project runs to get updated schedule_optimization_method
      // This ensures organizedNavigation useMemo sees the change and rebuilds
      await refetchProjectRuns();
      
      console.log('🔄 UserView: Refreshed spaces and project runs after scheduler update');
    };
    
    // Listen for refresh events
    window.addEventListener('project-customizer-updated', handleRefresh);
    window.addEventListener('project-scheduler-updated', handleRefresh);
    window.addEventListener('project-replanned', handleRefresh);
    window.addEventListener('space-name-updated', handleRefresh);
    
    return () => {
      // Cleanup: unsubscribe when component unmounts or project changes
      supabase.removeChannel(channel);
      window.removeEventListener('project-customizer-updated', handleRefresh);
      window.removeEventListener('project-scheduler-updated', handleRefresh);
      window.removeEventListener('project-replanned', handleRefresh);
      window.removeEventListener('space-name-updated', handleRefresh);
    };
  }, [currentProjectRun?.id]);

  // When the project run has no phases in memory (e.g. stale cache or partial load), refetch from DB
  // so the workflow navigation pane can display standard phases (Kickoff, Planning, Closing, etc.)
  const lastRefetchedPhasesRunId = React.useRef<string | null>(null);
  React.useEffect(() => {
    const run = currentProjectRun;
    if (!run?.id || !updateProjectRunsCache || !setCurrentProjectRun || !projectRuns.length) return;
    const hasPhases = run.phases != null && Array.isArray(run.phases) && run.phases.length > 0;
    if (hasPhases) {
      lastRefetchedPhasesRunId.current = null;
      return;
    }
    if (lastRefetchedPhasesRunId.current === run.id) return;
    lastRefetchedPhasesRunId.current = run.id;
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from('project_runs')
          .select('phases')
          .eq('id', run.id)
          .single();
        if (error || !row?.phases) return;
        let parsed: Phase[] = [];
        try {
          parsed = typeof row.phases === 'string' ? JSON.parse(row.phases) : row.phases;
        } catch {
          return;
        }
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        const updatedRun = { ...run, phases: parsed };
        setCurrentProjectRun(updatedRun);
        updateProjectRunsCache(projectRuns.map(r => (r.id === run.id ? updatedRun : r)));
      } finally {
        lastRefetchedPhasesRunId.current = null;
      }
    })();
  }, [currentProjectRun?.id, currentProjectRun?.phases, projectRuns, setCurrentProjectRun, updateProjectRunsCache]);
  
  // CRITICAL ARCHITECTURE:
  // - UserView ONLY displays project runs (immutable snapshots)
  // - Process Map operates on templates, not project runs
  // - Project runs are immutable snapshots - phases are copied (not linked) at creation time
  // - All phases (standard and custom) are copied into the snapshot, not dynamically linked
  
  // CRITICAL: UserView ONLY displays project runs (immutable snapshots)
  // Process Map operates on templates, not project runs
  // Project runs are immutable snapshots - they should NEVER dynamically load phases from database
  // All phases (standard and custom) are copied into the snapshot at creation time, not linked
  let rawWorkflowPhases: Phase[] = [];
  if (currentProjectRun) {
    // Project runs: use ONLY the immutable snapshot from project_runs.phases
    // This is a complete copy of the template at the time the run was created
    // All phases (standard and custom) are copied, not linked
    let parsedPhases: Phase[] = [];
    try {
      if (Array.isArray(currentProjectRun.phases)) {
        parsedPhases = currentProjectRun.phases;
      } else if (typeof currentProjectRun.phases === 'string') {
        parsedPhases = JSON.parse(currentProjectRun.phases);
      } else if (currentProjectRun.phases) {
        parsedPhases = currentProjectRun.phases as Phase[];
      }
    } catch (e) {
      console.error('❌ Error parsing project run phases:', e, currentProjectRun.phases);
      parsedPhases = [];
    }
    rawWorkflowPhases = Array.isArray(parsedPhases) ? parsedPhases : [];
    
    if (rawWorkflowPhases.length === 0) {
      console.error('❌ CRITICAL ERROR: Project run has no phases!', {
        runId: currentProjectRun.id,
        runName: currentProjectRun.name,
        projectId: currentProjectRun.projectId
      });
      toast.error('Project run is missing phases. Please contact support or try creating a new project run.');
    }
  } else {
    // No project run - UserView should not display templates
    // Templates are edited in Process Map, not viewed in UserView workflow
    rawWorkflowPhases = [];
  }

  // Apply standard phase ordering to match Process Map
  // This ensures workflow navigation follows the same order as Process Map
  const workflowPhases = enforceStandardPhaseOrdering(rawWorkflowPhases);
  
  // CRITICAL: Project runs should preserve exact template phase structure
  // Template structure: Standard phases → Custom phases → Standard phases (Ordering) → Close Project
  // Navigation logic:
  // - Single-piece-flow (default): Standard phases show once, custom phases repeated per space
  // - Batch-flow: Standard phases show once, spaces nested inside custom phases
  const organizedNavigation = React.useMemo(() => {
    if (!workflowPhases || workflowPhases.length === 0) {
      return [];
    }
    
    // UserView ONLY displays project runs (immutable snapshots)
    // Use organizeWorkflowNavigation to properly structure based on flow type
    // This handles single-piece-flow vs batch-flow correctly
    const result = organizeWorkflowNavigation(workflowPhases, projectSpaces, currentProjectRun);
    
    return result;
  }, [workflowPhases, projectSpaces, currentProjectRun]);
  
  // Flatten all steps from organized navigation
  // This maintains the correct order based on flow type
  const allSteps = React.useMemo(() => {
    if (organizedNavigation.length === 0) return [];
    
    let stepIndex = 0;
    return organizedNavigation.flatMap(item => {
      return item.steps.map((step) => {
        // Use actual materials and tools from database - no sample data
        let materials = step.materials || [];
        let tools = step.tools || [];
        
        // Determine phase and operation names based on navigation structure
        let phaseName = (step as any).phaseName || item.name;
        let phaseId = (step as any).phaseId || item.id;
        let operationName = (step as any).operationName || 'General';
        let operationId = (step as any).operationId || '';
        
        // For space containers, preserve original phase info from step
        if (item.type === 'space-container' && item.phase) {
          phaseName = item.phase.name;
          phaseId = item.phase.id;
        } else if (item.phase) {
          phaseName = item.phase.name;
          phaseId = item.phase.id;
        }
        
        // Find the operation this step belongs to
        if (item.phase) {
          for (const operation of item.phase.operations || []) {
            if (operation.steps?.some(s => s.id === step.id)) {
              operationName = operation.name;
              operationId = operation.id;
              break;
            }
          }
        }
        
        // Ensure apps are properly parsed if they come as JSON strings
        let apps = step.apps || [];
        if (typeof apps === 'string') {
          try {
            apps = JSON.parse(apps);
          } catch (e) {
            console.error('Failed to parse apps JSON for step:', step.id, e);
            apps = [];
          }
        }
        if (!Array.isArray(apps)) {
          apps = [];
        }
        
        // Enrich apps with icon data from registry and overrides if missing
        apps = apps.map(app => {
          // Extract actionKey for lookup
          const actionKey = app.actionKey || app.id?.replace('app-', '');
          
          // Check for app override first (custom names/icons from database)
          const override = actionKey ? appOverrides.get(actionKey) : null;
          
          // Get base app from registry
          const nativeApp = actionKey ? getNativeAppById(actionKey) : null;
          
          // Build enriched app with priority: override > existing app data > native app > fallback
          return {
            ...app,
            icon: app.icon || override?.icon || nativeApp?.icon || 'Sparkles',
            appName: app.appName || override?.app_name || nativeApp?.appName || app.appName,
            description: app.description || override?.description || nativeApp?.description || app.description
          };
        });
        
        // Preserve spaceId and spaceName if they exist (from workflowNavigationUtils)
        const spaceId = (step as any).spaceId;
        const spaceName = (step as any).spaceName;
        
        return {
          ...step,
          phaseName,
          phaseId,
          operationName,
          operationId,
          materials,
          tools,
          apps, // Ensure apps are properly parsed and enriched array
          navigationType: item.type, // Track navigation type for display
          // Preserve spaceId and spaceName from step if they exist (from workflowNavigationUtils)
          // Fallback to item.spaces for space-container type
          spaceId: spaceId || (item.type === 'space-container' ? item.spaces?.[0]?.id : undefined),
          spaceName: spaceName || (item.type === 'space-container' ? item.spaces?.[0]?.space_name : undefined),
          originalIndex: stepIndex++
        };
      });
    });
  }, [organizedNavigation, appOverrides]);

  const persistedCompletedStepsSignature = useMemo(() => {
    const arr = currentProjectRun?.completedSteps;
    if (!Array.isArray(arr)) return '';
    return [...arr].sort().join(',');
  }, [currentProjectRun?.completedSteps]);

  /** When steps are marked complete in the DB (kickoff, planning wizard, etc.), mirror required outputs as checked in the main workflow UI. */
  useEffect(() => {
    if (!currentProjectRun?.id || allSteps.length === 0) return;
    const completedArr = currentProjectRun.completedSteps;
    if (!Array.isArray(completedArr) || completedArr.length === 0) return;

    setCheckedOutputs((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const step of allSteps) {
        const spaceId = (step as { spaceId?: string | null }).spaceId ?? null;
        if (!isStepCompleted(completedArr, step.id, spaceId)) continue;
        const outputs = step.outputs || [];
        if (outputs.length === 0) continue;
        const existing = new Set(next[step.id] || []);
        const beforeSize = existing.size;
        for (const o of outputs) {
          existing.add(o.id);
        }
        if (existing.size !== beforeSize) {
          next[step.id] = existing;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentProjectRun?.id, persistedCompletedStepsSignature, allSteps]);
  
  // CRITICAL DEBUG: Log what's actually in the data - simplified output
  const firstPhase = workflowPhases?.[0];
  const firstOperation = firstPhase?.operations?.[0];
  const firstStep = firstOperation?.steps?.[0];
  
  const operationsLength = Array.isArray(firstPhase?.operations) ? firstPhase.operations.length : (firstPhase?.operations ? 1 : 0);
  const stepsLength = Array.isArray(firstOperation?.steps) ? firstOperation.steps.length : (firstOperation?.steps ? 1 : 0);
  
  
  // CRITICAL FIX: Use ref instead of state to avoid race conditions
  const isCompletingStepRef = useRef(false);
  
  // Initialize completed steps from project run data ONLY on project change
  // CRITICAL: Do NOT sync on completedSteps changes to prevent infinite loop
  useEffect(() => {
    // Don't overwrite local state while completing a step
    if (isCompletingStepRef.current) {
      return;
    }
    
    if (currentProjectRun?.completedSteps && Array.isArray(currentProjectRun.completedSteps)) {
      // Only update if the data is actually different to avoid unnecessary re-renders
      const currentCompleted = Array.from(completedSteps).sort().join(',');
      const dbCompleted = [...currentProjectRun.completedSteps].sort().join(',');
      
      if (currentCompleted !== dbCompleted) {
        const newCompletedSteps = new Set(currentProjectRun.completedSteps);
        setCompletedSteps(newCompletedSteps);
      }
    } else if (currentProjectRun && completedSteps.size > 0) {
      // Clear completed steps if project run has no completed steps
      setCompletedSteps(new Set());
    }
  }, [currentProjectRun?.id]); // CRITICAL FIX: Only depend on project ID, not completedSteps
  
  // Navigate to first incomplete step when workflow opens - ENHANCED DEBUG VERSION
  useEffect(() => {
    if (viewMode === 'workflow' && allSteps.length > 0 && isKickoffComplete) {
      const firstIncompleteIndex = allSteps.findIndex(step => 
        !isStepCompleted(completedSteps, step.id, (step as any).spaceId)
      );
      
      // CRITICAL FIX: Don't auto-navigate if user manually selected a step
      // Only auto-navigate on initial load or when no specific step is selected
      const shouldAutoNavigate = firstIncompleteIndex !== -1 && (
        currentStepIndex === 0 || // Initial load
        allSteps[currentStepIndex] && isStepCompleted(
          completedSteps, 
          allSteps[currentStepIndex].id, 
          (allSteps[currentStepIndex] as any).spaceId
        ) // Current step is completed
      );
      
      if (shouldAutoNavigate) {
        setCurrentStepIndex(firstIncompleteIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [viewMode, allSteps.length, isKickoffComplete, completedSteps]);

  // Load project run if projectRunId is provided
  useEffect(() => {
    // If projectRunId is cleared/null, ensure we're in listing mode (e.g. after delete on Project Dashboard)
    if (!projectRunId) {
      if (currentProjectRun) {
        setCurrentProjectRun(null);
      }
      setViewMode('listing');
      if (!currentProjectRun) return;
    }

    // CRITICAL: If projectRunId is provided, we MUST load it regardless of current viewMode
    // This ensures new projects from ProjectCatalog open to kickoff even if we're in listing mode
    if (projectRunId) {
      const projectRun = safeProjectRuns.find(run => run.id === projectRunId);

      // Never treat "not in projectRuns yet" as deleted: refetch resolves before React
      // re-renders context (e.g. after create_project_run_snapshot), so the new id can be
      // missing briefly even though it exists. Always load via DB when absent from the list.
      if (projectRun) {
        // Don't open cancelled projects
        if (projectRun.status === 'cancelled') {
          return;
        }
        setCurrentProjectRun(projectRun);
        // CRITICAL: Set viewMode to 'workflow' for new project runs so kickoff can display
        // Kickoff only shows when viewMode === 'workflow' and !isKickoffComplete
        // Use setTimeout to ensure state updates are processed
        setTimeout(() => {
          setViewMode('workflow');
        }, 0);
      } else {
        // Project run not in array yet - fetch directly from database
        const fetchProjectRun = async () => {
          try {
            const { data: freshRun, error } = await supabase
              .from('project_runs')
              .select('*')
              .eq('id', projectRunId)
              .single();
            
            if (error) {
              console.error('❌ Error fetching project run from database:', error);
              // If project run doesn't exist (was deleted), clear it and go to listing
              if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
                setCurrentProjectRun(null);
                setViewMode('listing');
                onProjectSelected?.('listing' as any);
              }
              return;
            }
            
            if (!freshRun) {
              console.error('❌ Project run not found in database:', projectRunId);
              // Project run was deleted, clear it and go to listing
              console.log('🚪 Project run was deleted, returning to listing');
              setCurrentProjectRun(null);
              setViewMode('listing');
              onProjectSelected?.('listing' as any);
              return;
            }
            
            // Transform database data to ProjectRun format (same as ProjectDataContext)
            let parsedPhases: any[] = [];
            if (freshRun.phases) {
              if (Array.isArray(freshRun.phases)) {
                parsedPhases = freshRun.phases;
              } else if (typeof freshRun.phases === 'string') {
                try {
                  parsedPhases = JSON.parse(freshRun.phases);
                } catch (e) {
                  console.error('❌ Error parsing phases JSON:', e);
                }
              }
            }
            
            let parsedCompletedSteps: string[] = [];
            if (freshRun.completed_steps) {
              if (Array.isArray(freshRun.completed_steps)) {
                parsedCompletedSteps = freshRun.completed_steps;
              } else if (typeof freshRun.completed_steps === 'string') {
                try {
                  parsedCompletedSteps = JSON.parse(freshRun.completed_steps);
                } catch (e) {
                  console.error('❌ Error parsing completed_steps JSON:', e);
                }
              }
            }
            
            let customizationDecisions: any = null;
            if (freshRun.customization_decisions) {
              try {
                customizationDecisions = typeof freshRun.customization_decisions === 'string'
                  ? JSON.parse(freshRun.customization_decisions)
                  : freshRun.customization_decisions;
              } catch (e) {
                console.error('Failed to parse customization_decisions JSON:', e);
              }
            }
            
            const transformedRun: ProjectRun = {
              id: freshRun.id,
              projectId: freshRun.project_id,
              name: freshRun.name,
              description: freshRun.description || '',
              projectChallenges: freshRun.project_challenges,
              isManualEntry: freshRun.is_manual_entry || false,
              createdAt: new Date(freshRun.created_at),
              updatedAt: new Date(freshRun.updated_at),
              startDate: new Date(freshRun.start_date),
              planEndDate: new Date(freshRun.plan_end_date),
              endDate: freshRun.end_date ? new Date(freshRun.end_date) : undefined,
              status: freshRun.status as 'not-started' | 'in-progress' | 'complete' | 'cancelled',
              projectLeader: freshRun.project_leader,
              accountabilityPartner: freshRun.accountability_partner,
              customProjectName: freshRun.custom_project_name,
              home_id: freshRun.home_id,
              currentPhaseId: freshRun.current_phase_id,
              currentOperationId: freshRun.current_operation_id,
              currentStepId: freshRun.current_step_id,
              completedSteps: Array.isArray(parsedCompletedSteps) ? parsedCompletedSteps : [],
              progress: freshRun.progress,
              phases: Array.isArray(parsedPhases) ? parsedPhases : [],
              category: freshRun.category,
              effortLevel: freshRun.effort_level as Project['effortLevel'],
              skillLevel: freshRun.skill_level as Project['skillLevel'],
              estimatedTime: freshRun.estimated_time,
              scalingUnit: freshRun.scaling_unit as Project['scalingUnit'],
              customization_decisions: customizationDecisions,
              instruction_level_preference: (freshRun.instruction_level_preference as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
              initial_budget: freshRun.initial_budget,
              initial_timeline: freshRun.initial_timeline,
              initial_sizing: freshRun.initial_sizing,
              progress_reporting_style: freshRun.progress_reporting_style
                ? (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based')
                : undefined,
              quality_control_settings: parseQualityControlSettingsColumn(freshRun.quality_control_settings)
            };
            
            if (transformedRun.status === 'cancelled') {
              return;
            }
            
            setCurrentProjectRun(transformedRun);
            // CRITICAL: Set viewMode to 'workflow' for new project runs so kickoff can display
            // Kickoff only shows when viewMode === 'workflow' and !isKickoffComplete
            // Use setTimeout to ensure state updates are processed
            setTimeout(() => {
              setViewMode('workflow');
            }, 0);
          } catch (error) {
            console.error('❌ Error in fetchProjectRun:', error);
          }
        };
        
        fetchProjectRun();
      }
      
      if (projectRunId && currentProjectRun && currentProjectRun.id === projectRunId) {
        // Project run is already loaded - ensure viewMode is 'workflow'
        // This handles the case where project run was loaded but viewMode wasn't set correctly
        if (viewMode === 'listing') {
          setViewMode('workflow');
          onProjectSelected?.();
        }
      }
    }
  }, [projectRunId, projectRuns, setCurrentProjectRun, viewMode, onProjectSelected, currentProjectRun, isKickoffComplete]);

  // SIMPLIFIED VIEW MODE LOGIC - Single effect to prevent race conditions
  useEffect(() => {
    // View mode logic
    // CRITICAL FIX: Don't open cancelled projects - clear them completely
    if (currentProjectRun && currentProjectRun.status === 'cancelled') {
      setCurrentProjectRun(null);
      setViewMode('listing');
      return;
    }

    // CRITICAL FIX: ALWAYS respect forceListingMode - Project Dashboard must show listing
    // BUT: Don't force listing if we have a projectRunId (project selected from dropdown or catalog)
    // When projectRunId is provided, we should directly open the project, not go to listing
    if (forceListingMode && !projectRunId) {
      if (viewMode !== 'listing') {
        setViewMode('listing');
      }
      return;
    }
    
    // CRITICAL: If projectRunId is provided, prioritize opening the project directly
    // This ensures project selection from dropdown opens the project, not listing
    if (projectRunId && !currentProjectRun) {
      // Don't set viewMode yet - wait for project run to load in the other useEffect
      return;
    }

    // Only auto-open project workflow if not in listing mode and not showing profile
    if (currentProjectRun && !showProfile) {
      // CRITICAL: For new project runs (kickoff incomplete), we MUST be in 'workflow' mode
      // so that the kickoff component can render (it only renders when viewMode === 'workflow')
      if (isKickoffComplete) {
        if (viewMode !== 'workflow') {
          setViewMode('workflow');
          onProjectSelected?.();
        }
      } else {
        // CRITICAL: Kickoff component only renders when viewMode === 'workflow'
        // So we must ensure viewMode is 'workflow' for incomplete kickoff
        if (viewMode !== 'workflow') {
          setViewMode('workflow');
        }
      }
      return;
    }

    // Determine new view mode based on priority
    let newViewMode: 'listing' | 'workflow' = viewMode;

    // CRITICAL: If projectRunId is provided (project selected from dropdown or catalog), prioritize opening to workflow
    // This ensures direct project opening, not going to listing mode
    if (projectRunId && currentProjectRun) {
      newViewMode = 'workflow';
    } else if (showProfile || (forceListingMode && !projectRunId)) {
      newViewMode = 'listing';
    } else if (resetToListing && !currentProjectRun) {
      newViewMode = 'listing';
      setShowProfileManager(false);
    }

    // Only update if view mode actually changed
    if (newViewMode !== viewMode) {
      setViewMode(newViewMode);
    }
    
  }, [resetToListing, forceListingMode, showProfile, currentProjectRun, projectRunId, viewMode, onProjectSelected]);
  
  const currentStep = allSteps[currentStepIndex];

  useEffect(() => {
    if (!currentProjectRun || !currentStep) {
      setStepPhotoCountForCompletion(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { count, error } = await supabase
        .from('project_run_photos')
        .select('id', { count: 'exact', head: true })
        .eq('project_run_id', currentProjectRun.id)
        .eq('step_title', currentStep.step);
      if (!cancelled && !error) {
        setStepPhotoCountForCompletion(count ?? 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectRun?.id, currentStep?.id, stepPhotosRefreshNonce]);
  
  // Function to refresh estimated finish date
  const refreshEstimatedFinishDate = React.useCallback(async (forceRefresh: boolean = false) => {
    if (!currentProjectRun || !workflowPhases || workflowPhases.length === 0) {
      setEstimatedFinishDate(null);
      return;
    }
    
    // Check if refresh is needed
    if (!forceRefresh && !shouldRefreshEstimatedFinishDate(lastFinishDateRefresh)) {
      return;
    }
    
    setEstimatedFinishDateLoading(true);
    try {
      // Get schedule_events from project run
      const scheduleEvents = currentProjectRun.schedule_events as any;
      
      // Check if project has been scheduled (has events in schedule_events from Project Scheduler)
      // A project is scheduled if "Generate schedule" has been created and applied in the project scheduler app
      const hasSchedule = scheduleEvents?.events && 
                         Array.isArray(scheduleEvents.events) && 
                         scheduleEvents.events.length > 0;
      
      if (!hasSchedule) {
        // Project hasn't been scheduled yet - show TBD
        setEstimatedFinishDate(null);
        setLastFinishDateRefresh(new Date());
        return;
      }
      
      // Project has been scheduled - extract finish date from saved schedule events
      // Use only the dates from the saved schedule, don't recalculate
      if (scheduleEvents.events && scheduleEvents.events.length > 0) {
        // Find the latest event end date
        // Events have date field (YYYY-MM-DD) and duration (in minutes)
        const eventEndDates = scheduleEvents.events
          .map((event: any) => {
            if (event.date) {
              const eventDate = new Date(event.date);
              // Add duration (in minutes) to get end date/time
              if (event.duration) {
                eventDate.setMinutes(eventDate.getMinutes() + event.duration);
              }
              return eventDate;
            }
            // If event has endTime directly, use it
            if (event.endTime) {
              return new Date(event.endTime);
            }
            return null;
          })
          .filter((date: Date | null) => date !== null) as Date[];
        
        if (eventEndDates.length > 0) {
          // Get the latest end date from all scheduled events
          const latestEndDate = eventEndDates.reduce((latest, date) => {
            return date > latest ? date : latest;
          });
          setEstimatedFinishDate(latestEndDate);
          setLastFinishDateRefresh(new Date());
          return;
        }
      }
      
      // If we can't extract a date from events, show TBD
      setEstimatedFinishDate(null);
      setLastFinishDateRefresh(new Date());
    } catch (error) {
      console.error('Error calculating estimated finish date:', error);
      setEstimatedFinishDate(null);
    } finally {
      setEstimatedFinishDateLoading(false);
    }
  }, [currentProjectRun, workflowPhases, completedSteps, lastFinishDateRefresh]);
  
  // Function to check and auto-regenerate schedule if needed
  const checkAndRegenerateSchedule = React.useCallback(async () => {
    if (!currentProjectRun || !currentProject || !workflowPhases || workflowPhases.length === 0 || !isKickoffComplete) {
      return;
    }
    
    // Check if schedule needs regeneration (older than 1 day)
    if (shouldRegenerateSchedule(currentProjectRun)) {
      
      // Get completed steps from project run (ensure we have latest data)
      const completedStepsFromRun = new Set<string>(
        Array.isArray(currentProjectRun.completedSteps) 
          ? currentProjectRun.completedSteps 
          : []
      );
      
      const success = await autoRegenerateSchedule(
        currentProjectRun,
        currentProject,
        workflowPhases,
        completedStepsFromRun
      );
      
      if (success) {
        // Reload project run to get updated schedule
        const { data: updatedRun, error } = await supabase
          .from('project_runs')
          .select('*')
          .eq('id', currentProjectRun.id)
          .single();
        
        if (!error && updatedRun) {
          setCurrentProjectRun(updatedRun as any);
          // Refresh estimated finish date with new schedule
          refreshEstimatedFinishDate(true);
        }
      }
    }
  }, [currentProjectRun, currentProject, workflowPhases, isKickoffComplete, setCurrentProjectRun, refreshEstimatedFinishDate]);

  const handlePlanningWizardFullyComplete = React.useCallback(
    async (tools: PlanningToolId[]) => {
      if (!currentProjectRun) return;
      const phases = Array.isArray(currentProjectRun.phases) ? (currentProjectRun.phases as Phase[]) : [];
      const { stepIds, outputEntries } = collectPlanningWizardWorkflowCompletion(phases, tools);
      if (stepIds.length === 0) {
        return;
      }

      const base = [...(currentProjectRun.completedSteps || [])];
      const uniqueCompleted = [...new Set([...base, ...stepIds])];

      setCheckedOutputs((prev) => {
        const next = { ...prev };
        for (const { stepId, outputIds } of outputEntries) {
          next[stepId] = new Set([...(next[stepId] || []), ...outputIds]);
        }
        return next;
      });

      setCompletedSteps(new Set(uniqueCompleted));

      const tempRun = { ...currentProjectRun, completedSteps: uniqueCompleted };
      let calculatedProgress = 0;
      try {
        calculatedProgress = calculateProjectProgress(tempRun);
      } catch {
        toast.error('Progress reporting style is missing for this project run.');
        return;
      }
      const newStatus = calculatedProgress >= 100 ? 'complete' : currentProjectRun.status;

      const orderingPhase = phases.find((p) => p?.name === 'Ordering');

      await updateProjectRun({
        ...currentProjectRun,
        completedSteps: uniqueCompleted,
        progress: Math.round(calculatedProgress),
        status: newStatus,
        planEndDate: new Date(),
        // Mark Planning complete by advancing current_phase_id to Ordering (when present).
        currentPhaseId: orderingPhase?.id ?? currentProjectRun.currentPhaseId,
        updatedAt: new Date(),
      });
    },
    [currentProjectRun, updateProjectRun]
  );
  
  // Check and regenerate schedule on project open
  useEffect(() => {
    if (viewMode === 'workflow' && currentProjectRun && workflowPhases.length > 0 && isKickoffComplete) {
      // Check if schedule needs regeneration
      checkAndRegenerateSchedule();
      // Also refresh estimated finish date
      refreshEstimatedFinishDate(false);
    }
  }, [viewMode, currentProjectRun?.id, workflowPhases.length, isKickoffComplete, checkAndRegenerateSchedule, refreshEstimatedFinishDate]);
  
  // Set up daily check for schedule regeneration (check every hour)
  useEffect(() => {
    if (!currentProjectRun || !isKickoffComplete) return;
    
    const interval = setInterval(() => {
      checkAndRegenerateSchedule();
    }, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(interval);
  }, [currentProjectRun?.id, isKickoffComplete, checkAndRegenerateSchedule]);
  
  // CRITICAL FIX: Calculate progress from actual workflow steps using unified utility
  // This ensures consistent progress calculation everywhere
  // Use progress reporting style from project run (defaults to 'linear')
  const { total: totalSteps, completed: completedStepsCount } = currentProjectRun 
    ? getWorkflowStepsCount(currentProjectRun) 
    : { total: 0, completed: 0 };
  const progress = (() => {
    if (!currentProjectRun) return 0;
    try {
      return calculateProjectProgress(currentProjectRun);
    } catch (error) {
      console.error('Failed to calculate project progress:', error);
      toast.error('Progress reporting style is missing for this project run.');
      return 0;
    }
  })();

  const qualityControlAppTitle = useMemo(() => {
    const override = appOverrides.get('quality-check');
    const native = getNativeAppById('quality-check');
    return override?.app_name ?? native?.appName ?? 'Quality Control';
  }, [appOverrides]);
  
  // Progress calculation
  
  
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
      setCurrentStepIndex(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } else {
      console.error(`❌ Step not found: ${stepId}`);
      return false;
    }
  };

  const navigateToStepInstance = (stepId: string, spaceId?: string | null) => {
    const stepIndex = allSteps.findIndex(step => {
      if (step.id !== stepId) return false;
      if (!spaceId) return true;
      return (step as any).spaceId === spaceId;
    });

    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }

    console.error(`❌ Step instance not found: ${stepId}${spaceId ? ` (space: ${spaceId})` : ''}`);
    return false;
  };

  const handleProjectNameClick = () => {
    setWorkflowMainView('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startUserProjectRuntime = React.useCallback(async (stepId: string, stepKey: string) => {
    if (!currentProjectRun?.id) return;
    const now = new Date().toISOString();
    const { data: existing, error: readError } = await supabase
      .from('user_projects_runtime')
      .select('id, started_at')
      .eq('project_run_id', currentProjectRun.id)
      .eq('step_id', stepKey)
      .maybeSingle();
    if (readError) {
      console.error('Failed reading user_projects_runtime row:', readError);
      return;
    }
    if (!existing) {
      const { error: insertError } = await supabase.from('user_projects_runtime').insert({
        project_run_id: currentProjectRun.id,
        step_id: stepKey,
        canonical_step_id: stepId,
        started_at: now,
      });
      if (insertError) console.error('Failed inserting user_projects_runtime row:', insertError);
      return;
    }
    if (existing.started_at) return;
    const { error: updateError } = await supabase
      .from('user_projects_runtime')
      .update({ started_at: now, updated_at: now })
      .eq('id', existing.id);
    if (updateError) console.error('Failed updating user_projects_runtime start time:', updateError);
  }, [currentProjectRun?.id]);

  const endUserProjectRuntime = React.useCallback(async (stepId: string, stepKey: string) => {
    if (!currentProjectRun?.id) return;
    const now = new Date().toISOString();
    const { data: existing, error: readError } = await supabase
      .from('user_projects_runtime')
      .select('id')
      .eq('project_run_id', currentProjectRun.id)
      .eq('step_id', stepKey)
      .maybeSingle();
    if (readError) {
      console.error('Failed reading user_projects_runtime row for end time:', readError);
      return;
    }
    if (!existing) {
      const { error: insertError } = await supabase.from('user_projects_runtime').insert({
        project_run_id: currentProjectRun.id,
        step_id: stepKey,
        canonical_step_id: stepId,
        ended_at: now,
      });
      if (insertError) console.error('Failed inserting user_projects_runtime end row:', insertError);
      return;
    }
    const { error: updateError } = await supabase
      .from('user_projects_runtime')
      .update({ ended_at: now, updated_at: now })
      .eq('id', existing.id);
    if (updateError) console.error('Failed updating user_projects_runtime end time:', updateError);
  }, [currentProjectRun?.id]);

  // Track step start time when user keeps a step open for 15 seconds
  useEffect(() => {
    if (stepRuntimeStartTimerRef.current) {
      clearTimeout(stepRuntimeStartTimerRef.current);
      stepRuntimeStartTimerRef.current = null;
    }
    pendingRuntimeStepKeyRef.current = null;
    if (workflowMainView !== 'steps' || !currentStep || !currentProjectRun) return;
    const stepKey = getStepCompletionKey(currentStep.id, (currentStep as any).spaceId);
    pendingRuntimeStepKeyRef.current = stepKey;
    stepRuntimeStartTimerRef.current = setTimeout(() => {
      if (pendingRuntimeStepKeyRef.current !== stepKey) return;
      void startUserProjectRuntime(currentStep.id, stepKey);
    }, 15000);
    return () => {
      if (stepRuntimeStartTimerRef.current) {
        clearTimeout(stepRuntimeStartTimerRef.current);
        stepRuntimeStartTimerRef.current = null;
      }
    };
  }, [workflowMainView, currentStep?.id, (currentStep as any)?.spaceId, currentProjectRun?.id, startUserProjectRuntime]); // Track when step or project changes
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

  // Required outputs + optional photo rule for step completion (per project QC settings)
  const areAllOutputsCompleted = (step: typeof currentStep) => {
    if (!step) return true;
    const qc = mergeQualityControlSettings(currentProjectRun?.quality_control_settings);
    const outputs = step.outputs || [];
    const required = outputs.filter((o) => isOutputInQualityScope(o, qc.require_all_outputs));
    if (required.length > 0) {
      const stepOutputs = checkedOutputs[step.id] || new Set();
      if (!required.every((output) => stepOutputs.has(output.id))) {
        return false;
      }
    }
    if (
      qc.require_photos_per_step &&
      currentProjectRun &&
      currentStep &&
      step.id === currentStep.id &&
      (stepPhotoCountForCompletion ?? 0) < 1
    ) {
      return false;
    }
    return true;
  };

  const handleStepComplete = async () => {
    if (!currentStep) return;
    
    // Set flag to prevent useEffect from overwriting state during completion
    isCompletingStepRef.current = true;
    
    try {
      
      const qc = mergeQualityControlSettings(currentProjectRun?.quality_control_settings);
      const stepOutputsList = currentStep.outputs || [];
      const requiredOutputs = stepOutputsList.filter((o) =>
        isOutputInQualityScope(o, qc.require_all_outputs)
      );
      const stepCheckedOutputs = checkedOutputs[currentStep.id] || new Set();
      const allOutputsCompleted =
        requiredOutputs.length === 0 ||
        requiredOutputs.every((output) => stepCheckedOutputs.has(output.id));

      if (qc.require_photos_per_step && currentProjectRun) {
        const { count, error: photoCountError } = await supabase
          .from('project_run_photos')
          .select('id', { count: 'exact', head: true })
          .eq('project_run_id', currentProjectRun.id)
          .eq('step_title', currentStep.step);
        if (photoCountError) {
          console.error('Photo count check failed:', photoCountError);
          toast.error('Could not verify photos for this step. Try again.');
          return;
        }
        if (!count || count < 1) {
          toast.error('Add at least one photo tagged to this step before completing it (Quality Control setting).');
          return;
        }
      }

      if (allOutputsCompleted) {
        
        // Add step to completed steps with immediate persistence
        // Use composite key (stepId:spaceId) when spaceId exists for per-space tracking
        const stepCompletionKey = getStepCompletionKey(
          currentStep.id, 
          (currentStep as any).spaceId
        );
        const newCompletedSteps = [...new Set([...completedSteps, stepCompletionKey])];
        setCompletedSteps(new Set(newCompletedSteps));
        
        
        // Immediately update the project run to persist the step completion
        if (currentProjectRun) {
          // Preserve all kickoff UI step completion keys when persisting other workflow steps
          const preservedKickoffSteps = currentProjectRun.completedSteps.filter(stepId => {
            const extractedStepId = extractStepIdFromCompletionKey(stepId);
            return (KICKOFF_UI_STEP_IDS as readonly string[]).includes(extractedStepId);
          });
          
          // Filter out kickoff steps from new completed steps (handle both simple and composite keys)
          const workflowCompletedSteps = newCompletedSteps.filter(stepId => {
            const extractedStepId = extractStepIdFromCompletionKey(stepId);
            return !extractedStepId.startsWith('kickoff-');
          });
          const allCompletedSteps = [...preservedKickoffSteps, ...workflowCompletedSteps];
          const uniqueCompletedSteps = [...new Set(allCompletedSteps)];
          
          // Use the centralized progress calculation utility (includes ALL steps)
          const tempProjectRun = { ...currentProjectRun, completedSteps: uniqueCompletedSteps };
          let calculatedProgress = 0;
          try {
            calculatedProgress = calculateProjectProgress(tempProjectRun);
          } catch (error) {
            console.error('Failed to calculate project progress:', error);
            toast.error('Progress reporting style is missing for this project run.');
            calculatedProgress = 0;
          }
          
          // Set status to 'complete' if progress is 100%
          const newStatus = calculatedProgress >= 100 ? 'complete' : currentProjectRun.status;
          
          const updatedProjectRun = {
            ...currentProjectRun,
            completedSteps: uniqueCompletedSteps,
            progress: Math.round(calculatedProgress),
            status: newStatus,
            updatedAt: new Date()
          };
          
          // Immediately persisting step completion
          
          // CRITICAL: Wait for database update to complete before clearing flag
          await updateProjectRun(updatedProjectRun);
          
          // NOTE: project_run_steps table does not exist - step completion tracking is disabled
          // Step completion is tracked via project_runs.completed_steps array instead
          
        }
        
        // End time tracking for step
        endTimeTracking('step', currentStep.id);
        const runtimeStepKey = getStepCompletionKey(currentStep.id, (currentStep as any).spaceId);
        await endUserProjectRuntime(currentStep.id, runtimeStepKey);
        
        // Check if this completes a phase - FIXED VERSION
        const currentPhase = getCurrentPhase();
        
        if (currentPhase) {
          const phaseSteps = getAllStepsInPhase(currentPhase);
          
          const newCompletedStepsSet = new Set(newCompletedSteps);
          const isPhaseComplete = phaseSteps.every(step => newCompletedStepsSet.has(step.id));
          
          // Phase completion check
          
          if (isPhaseComplete) {
            
            // CRITICAL FIX: Store completed phase BEFORE navigation changes currentStep
            setCompletedPhase(currentPhase);
            setCurrentCompletedPhaseName(currentPhase.name);
            
            // End time tracking for phase
            endTimeTracking('phase', currentPhase.id);
            
            // Refresh estimated finish date on phase completion
            refreshEstimatedFinishDate(true);
            
            // Auto-regenerate schedule on phase completion
            if (currentProjectRun && currentProject && workflowPhases.length > 0) {
              
              // Use the updated completed steps set (includes the step just completed)
              autoRegenerateSchedule(
                currentProjectRun,
                currentProject,
                workflowPhases,
                newCompletedStepsSet
              ).then(success => {
                if (success) {
                  // Reload project run to get updated schedule
                  supabase
                    .from('project_runs')
                    .select('*')
                    .eq('id', currentProjectRun.id)
                    .single()
                    .then(({ data: updatedRun, error }) => {
                      if (!error && updatedRun) {
                        setCurrentProjectRun(updatedRun as any);
                        refreshEstimatedFinishDate(true);
                      }
                    });
                }
              });
            }
            
            // Automatically mark phase as complete - open PhaseCompletionPopup to verify outputs
            // Phase is considered complete when all steps are done, popup just checks outputs
            setPhaseCompletionOpen(true);
            
            // Note: Phase completion is automatically determined by completed steps
            // No need to store separately - it's inferred from all steps being complete
          } else {
            // Phase not yet complete
          }
        } else {
          // No current phase found for step
        }
        
        // Check if all steps are now complete
        const allStepsComplete = allSteps.every(step => newCompletedSteps.includes(step.id));
        
        if (allStepsComplete) {
          
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
    
    // If phase not found by name, step data is invalid
    console.error("❌ getCurrentPhase: Step phaseName not found in project phases!", {
      stepId: currentStep.id,
      stepName: currentStep.step,
      stepPhaseName: currentStep.phaseName,
      availablePhases: activeProject.phases.map(p => p.name)
    });
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
    
    // Handle external apps (no subscription gate)
    if (app.appType === 'external-link' && app.linkUrl) {
      window.open(app.linkUrl, app.openInNewTab ? '_blank' : '_self');
      return;
    }
    
    if (app.appType === 'external-embed' && app.embedUrl) {
      // TODO: Open embed modal
      console.log('Opening embed for:', app.embedUrl);
      return;
    }
    
    // Native apps: require subscription unless app is free (Home maintenance, Task manager, My tools library)
    if (app.actionKey && !canAccessApp(app.actionKey)) {
      if (app.actionKey === 'risk-management' || app.actionKey === 'risk-focus') {
        setUpgradePromptFeature('Risk-Less');
      } else if (app.actionKey === 'project-catalog') {
        setUpgradePromptFeature('Projects membership');
      } else {
        setUpgradePromptFeature('this app');
      }
      setShowUpgradePrompt(true);
      return;
    }
    
    // Handle native apps
    switch (app.actionKey) {
      case 'home-maintenance':
        window.dispatchEvent(new CustomEvent('show-home-maintenance'));
        break;
      case 'task-manager':
        window.dispatchEvent(new CustomEvent('show-home-task-list'));
        break;
      case 'project-kickoff':
        // Kickoff is handled separately in the workflow
        console.log('Project Kickoff accessed via app');
        break;
      case 'project-planning-wizard':
        setProjectPlanningWizardOpen(true);
        break;
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
      case 'risk-focus':
        window.dispatchEvent(new CustomEvent('open-risk-focus-launcher'));
        break;
      case 'quality-check':
        setQualityCheckExpandSettingsAccordion(false);
        setQualityCheckOpen(true);
        break;
      case 'waste-removal':
        toast.info('Waste Removal is coming soon.');
        break;
      case 'project-catalog':
        navigate('/projects');
        break;
      case 'progress-board':
        window.dispatchEvent(new CustomEvent('force-project-dashboard-listing'));
        navigate('/', { state: { view: 'user' } });
        break;
      default:
        console.warn('Unknown app action:', app.actionKey);
    }
  };

  handleLaunchAppRef.current = handleLaunchApp;

  // Add event listener for open-app custom event
  useEffect(() => {
    const handleOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🎯 UserView: open-app event received', customEvent.detail);
      if (customEvent.detail && customEvent.detail.actionKey) {
        handleLaunchAppRef.current({
          appType: 'native',
          actionKey: customEvent.detail.actionKey
        } as AppReference);
      }
    };

    window.addEventListener('open-app', handleOpenApp as EventListener);

    return () => {
      window.removeEventListener('open-app', handleOpenApp as EventListener);
    };
  }, []);

  useEffect(() => {
    if (membershipLoading || !currentProjectRun) return;
    if (currentProjectRun.status === 'cancelled') return;
    if (currentProjectRun.isManualEntry) return;
    const risk = isRiskFocusRun(currentProjectRun);
    const denied = (risk && !hasRiskLessTier) || (!risk && !hasProjectsTier);
    if (!denied) return;
    setUpgradePromptFeature(risk ? 'Risk-Less' : 'Projects membership');
    setShowUpgradePrompt(true);
    setCurrentProjectRun(null);
    setViewMode('listing');
    navigate('/', { replace: true, state: { view: 'user' } });
    onProjectSelected?.();
  }, [
    membershipLoading,
    currentProjectRun,
    hasProjectsTier,
    hasRiskLessTier,
    setCurrentProjectRun,
    navigate,
    onProjectSelected,
  ]);
  
  // Fetch step instructions based on instruction level
  const { instruction, loading: instructionLoading } = useStepInstructions(
    currentStep?.id || '',
    instructionLevel,
    currentProjectRun?.id
  );

  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;

    // If we have instruction data for this level, render from step_instructions or project_run_step_instructions (via hook).
    if (instruction && !instructionLoading) {
      const sectionRows = Array.isArray(instruction.content.sections) ? instruction.content.sections : [];
      const textRows = instruction.content.text ? [{
        type: 'text' as const,
        title: '',
        content: instruction.content.text,
        display_order: 0
      }] : [];
      const photoRows = (instruction.content.photos || []).map((photo, idx) => ({
        type: 'image' as const,
        title: photo.caption || photo.alt || '',
        content: photo.url,
        display_order: 1000 + idx
      }));
      const videoRows = (instruction.content.videos || []).map((video, idx) => ({
        type: 'video' as const,
        title: video.title || '',
        content: video.embed ? (getSafeEmbedUrl(video.embed) || video.url) : video.url,
        display_order: 2000 + idx
      }));
      const linkRows = (instruction.content.links || []).map((link, idx) => ({
        type: 'link' as const,
        title: link.title || link.url,
        content: link.url,
        display_order: 3000 + idx
      }));

      const normalizedSectionRows = sectionRows.map((section: any, idx: number) => ({
        ...section,
        type: section.type === 'warning' ? 'safety-warning' : section.type,
        display_order: typeof section.display_order === 'number' ? section.display_order : (10 + idx)
      }));

      return <MultiContentRenderer sections={[...textRows, ...normalizedSectionRows, ...photoRows, ...videoRows, ...linkRows]} />;
    }
    
    // Use original content if no instruction data
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
    
    
    const rawContentStr = typeof step.content === 'string' ? step.content : '';
    // For default text content only: show selected instruction level when content has **LEVEL:** segments
    const contentStrForText = (() => {
      if (!rawContentStr) return '';
      const markers = ['**BEGINNER:**', '**INTERMEDIATE:**', '**ADVANCED:**'] as const;
      const hasMarkers = markers.some(m => rawContentStr.includes(m));
      if (!hasMarkers) return rawContentStr;
      const levelIndex = instructionLevel === 'beginner' ? 0 : instructionLevel === 'intermediate' ? 1 : 2;
      const startMarker = markers[levelIndex];
      const start = rawContentStr.indexOf(startMarker);
      if (start === -1) return rawContentStr;
      const afterStart = rawContentStr.slice(start + startMarker.length).trimStart();
      const nextMarker = markers.slice(levelIndex + 1).find(m => afterStart.includes(m));
      const end = nextMarker ? afterStart.indexOf(nextMarker) : afterStart.length;
      return afterStart.slice(0, end).trim();
    })();

    switch (step.contentType) {
      case 'document':
        return <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">External Resource</span>
              </div>
              <div className="text-foreground break-all">
                {rawContentStr}
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
              <div className="whitespace-pre-wrap">{contentStrForText}</div>
            </div>
          </div>;
      case 'video':
        return <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <span className="font-medium">Tutorial Video</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden shadow-card">
              <iframe src={rawContentStr} className="w-full h-full" allowFullScreen title={step.step} />
            </div>
          </div>;
      default:
        return <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {contentStrForText}
            </div>
          </div>;
    }
  };

  // Group steps using the new navigation structure
  // This respects the flow type (Single Piece Flow vs Batch Flow) and space priority
  const groupedSteps = React.useMemo(() => {
    if (organizedNavigation.length === 0 || allSteps.length === 0) {
      return {};
    }
    
    // CRITICAL: Group steps correctly for WorkflowSidebar structure
    // Space containers need nested structure: { "Space": { "Phase": { "Operation": [steps] } } }
    // Regular phases: { "Phase": { "Operation": [steps] } }
    const grouped: Record<string, any> = {};
    
    organizedNavigation.forEach(item => {
      if (item.type === 'space-container' && item.spaces && item.spaces.length > 0) {
        // Space container: Create nested structure Space → Phase → Operation → Steps
        // Each space container contains steps from potentially multiple phases
        const space = item.spaces[0];
        const spaceKey = space.space_name;
        
        // Initialize space if it doesn't exist
        if (!grouped[spaceKey]) {
          grouped[spaceKey] = {}; // Nested structure for space container: { "Phase": { "Operation": [steps] } }
        }
        
        // Group steps by phase name first, then by operation
        // This preserves the phase structure within each space container
        const stepsByPhase = new Map<string, Map<string, WorkflowStep[]>>();
        
        item.steps.forEach(step => {
          const phaseName = (step as any).phaseName || item.phase?.name || 'Workflow';
          const operationName = (step as any).operationName || 'General';
          
          // Initialize phase map if needed
          if (!stepsByPhase.has(phaseName)) {
            stepsByPhase.set(phaseName, new Map<string, WorkflowStep[]>());
          }
          
          // Initialize operation array if needed
          const phaseOps = stepsByPhase.get(phaseName)!;
          if (!phaseOps.has(operationName)) {
            phaseOps.set(operationName, []);
          }
          
          // Add step if not already present (dedupe by step ID)
          const opSteps = phaseOps.get(operationName)!;
          if (!opSteps.some(s => s.id === step.id)) {
            opSteps.push(step);
          }
        });
        
        // Now add the grouped steps to the space container
        // CRITICAL: Filter out phases that don't exist in workflowPhases to prevent orphaned phases
        // Preserve phase order from template by sorting phase names according to original order
        const phaseNamesOrdered = Array.from(stepsByPhase.keys())
          .filter(phaseName => {
            // Only include phases that actually exist in workflowPhases
            const exists = workflowPhases.some(p => p.name === phaseName);
            if (!exists) {
              console.warn(`⚠️ Filtering out orphaned phase "${phaseName}" - not found in workflowPhases`);
            }
            return exists;
          })
          .sort((a, b) => {
            // Find the original order of phases in workflowPhases
            const aIndex = workflowPhases.findIndex(p => p.name === a);
            const bIndex = workflowPhases.findIndex(p => p.name === b);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
        
        phaseNamesOrdered.forEach(phaseName => {
          const operations = stepsByPhase.get(phaseName)!;
          
          if (!grouped[spaceKey][phaseName]) {
            grouped[spaceKey][phaseName] = {};
          }
          
          // Preserve operation order from original phase
          const originalPhase = workflowPhases.find(p => p.name === phaseName);
          if (!originalPhase) {
            console.warn(`⚠️ Phase "${phaseName}" not found in workflowPhases, skipping`);
            return;
          }
          
          const operationNamesOrdered = originalPhase.operations.map(op => op.name);
          
          // Add operations in their original order
          operationNamesOrdered.forEach(operationName => {
            if (operations.has(operationName)) {
              grouped[spaceKey][phaseName][operationName] = operations.get(operationName)!;
            }
          });
        });
      } else if (item.phase) {
        // Regular phase (standard or custom): group by phase name, then operation
        const phaseName = item.phase.name;
        
        if (!grouped[phaseName]) {
          grouped[phaseName] = {}; // Flat structure for regular phase
        }
        
        // Group steps by operation, preserving operation order from original phase
        const stepsByOperation = new Map<string, WorkflowStep[]>();
        item.steps.forEach(step => {
          const operationName = (step as any).operationName || step.operationName || 'General';
          
          if (!stepsByOperation.has(operationName)) {
            stepsByOperation.set(operationName, []);
          }

          // Dedupe by step ID
          const opSteps = stepsByOperation.get(operationName)!;
          if (!opSteps.some(s => s.id === step.id)) {
            opSteps.push(step);
          }
        });
        
        // Add operations in their original order from the phase
        const operationNamesOrdered = item.phase.operations.map(op => op.name);
        operationNamesOrdered.forEach(operationName => {
          if (stepsByOperation.has(operationName)) {
            grouped[phaseName][operationName] = stepsByOperation.get(operationName)!;
          }
        });
      }
    });
    
    console.log('📋 groupedSteps structure:', {
      keys: Object.keys(grouped),
      totalItems: Object.keys(grouped).length,
      sample: Object.entries(grouped).slice(0, 3).map(([key, value]) => {
        const isSpaceContainer = typeof value === 'object' && !Array.isArray(value) && 
          Object.values(value as any).some(v => typeof v === 'object' && !Array.isArray(v) && !Array.isArray(v));
        return {
          key,
          isSpaceContainer,
          structure: isSpaceContainer 
            ? Object.keys(value as any).map(phase => ({
                phase,
                operations: Object.keys((value as any)[phase] || {})
              }))
            : Object.keys(value as any)
        };
      }),
      fullStructure: grouped
    });
    
    return grouped;
  }, [organizedNavigation, allSteps, workflowPhases]);
  
  // Debug the phase structure in detail
  console.log("🔍 WorkflowPhases detailed structure:", {
    workflowPhasesCount: workflowPhases.length,
    allStepsLength: allSteps.length,
    groupedStepsKeys: Object.keys(groupedSteps),
    groupedStepsEmpty: Object.keys(groupedSteps).length === 0,
    groupedStepsSample: Object.entries(groupedSteps).slice(0, 2).map(([phase, ops]) => ({
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
    projectRunsCount: safeProjectRuns.length,
    projectRunsIds: safeProjectRuns.map(pr => pr.id)
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
  if (projectRunId && !currentProjectRun && safeProjectRuns.length > 0) {
    console.log("❌ UserView: Have projectRunId but currentProjectRun not found in loaded runs");
    console.log("Available project run IDs:", safeProjectRuns.map(pr => pr.id));
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
  
  if (projectRunId && !currentProjectRun && safeProjectRuns.length === 0) {
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
  // Include forceListingMode: after clearing currentProjectRun, viewMode can still be 'workflow' for a frame;
  // without this, users with projectRuns.length > 0 skip listing and see a blank workflow shell.
  if (
    viewMode === 'listing' ||
    (forceListingMode && !projectRunId) ||
    (!currentProject && !currentProjectRun && !projectRunId && safeProjectRuns.length === 0)
  ) {
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
  // CRITICAL: Don't show kickoff if planning wizard is open (prevents kickoff from reappearing)
  if (currentProjectRun && currentProjectRun.status !== 'cancelled' && !isKickoffComplete && viewMode === 'workflow' && !projectPlanningWizardOpen) {
    // Fix missing kickoff steps if user has progressed past them
    const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
    const currentCompletedSteps = currentProjectRun.completedSteps || [];
    
    const hasStep4 = currentCompletedSteps.includes('kickoff-step-4');
    const missingEarlierSteps = kickoffStepIds.slice(0, 3).filter(id => !currentCompletedSteps.includes(id));
    
    if (hasStep4 && missingEarlierSteps.length > 0) {
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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden md:h-auto md:min-h-0 md:flex-none md:overflow-visible">
      <KickoffWorkflow 
        onKickoffComplete={async persist => {
          console.log("🎯 onKickoffComplete called - closing kickoff and switching to workflow");
          // Open planning workflow immediately after kickoff completion.
          setProjectPlanningWizardOpen(true);
          
            if (currentProjectRun && updateProjectRun) {
             // Ensure ALL kickoff steps are marked complete (prevent duplicates)
             const existingSteps = currentProjectRun.completedSteps || [];
             
             // UI kickoff step IDs
             const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3', 'kickoff-step-4'];
             
             // Find all actual Kickoff phase operation steps to mark complete
             const kickoffPhase = currentProjectRun.phases.find(p => p.name === 'Kickoff');
             
             // CRITICAL: Collect ALL step IDs from ALL operations in the Kickoff phase
             const allKickoffStepIds: string[] = [];
             if (kickoffPhase) {
               kickoffPhase.operations.forEach(operation => {
                 if (operation.steps && Array.isArray(operation.steps)) {
                   operation.steps.forEach(step => {
                     if (step.id) {
                       allKickoffStepIds.push(step.id);
                     }
                   });
                 }
               });
             }
             
             console.log("🎯 Found Kickoff phase step IDs:", allKickoffStepIds);
             console.log("🎯 UI kickoff step IDs:", kickoffStepIds);
             console.log("🎯 Kickoff phase operations count:", kickoffPhase?.operations?.length || 0);
             
             // Combine kickoff UI step IDs and actual workflow step IDs
             const uniqueSteps = [...new Set([...existingSteps, ...kickoffStepIds, ...allKickoffStepIds])];
             
             console.log("✅ Marking all kickoff steps complete (UI + workflow):", {
               totalSteps: uniqueSteps.length,
               uiSteps: kickoffStepIds.length,
               workflowSteps: allKickoffStepIds.length,
               allStepIds: uniqueSteps
             });
            
            // Automatically mark kickoff outputs as complete
            console.log("📝 Marking kickoff outputs as complete...");
            setCheckedOutputs(prev => {
              const newOutputs = { ...prev };
              
              // Mark outputs for each kickoff step
              newOutputs['kickoff-step-1'] = new Set(['overview-output']);
              newOutputs['kickoff-step-2'] = new Set(['diy-profile-output']);
              newOutputs['kickoff-step-3'] = new Set(['project-profile-output']);
              newOutputs['kickoff-step-4'] = new Set(['tools-output']);
              
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
              
              // CRITICAL: Fetch initial_budget, initial_timeline, initial_sizing from database
              // These values were saved in ProjectProfileStep and must not be lost
              // Fetch from database to ensure we have the latest saved values
              let preservedBudget: string | null = null;
              let preservedTimeline: string | null = null;
              let preservedSizing: string | null = null;
              
              if (currentProjectRun?.id) {
                try {
                  const { data: budgetData, error: budgetError } = await supabase
                    .from('project_runs')
                    .select('initial_budget, initial_timeline, initial_sizing')
                    .eq('id', currentProjectRun.id)
                    .single();
                  
                  if (!budgetError && budgetData) {
                    preservedBudget = budgetData.initial_budget || null;
                    preservedTimeline = budgetData.initial_timeline || null;
                    preservedSizing = budgetData.initial_sizing || null;
                  } else {
                    // Fallback to context if database fetch fails
                    preservedBudget = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
                    preservedTimeline = (currentProjectRun as any)?.initial_timeline ?? (currentProjectRun as any)?.initialTimeline ?? null;
                    preservedSizing = (currentProjectRun as any)?.initial_sizing ?? (currentProjectRun as any)?.initialSizing ?? null;
                  }
                } catch (error) {
                  console.error('Error fetching budget fields from database:', error);
                  // Fallback to context if database fetch fails
                  preservedBudget = (currentProjectRun as any)?.initial_budget ?? (currentProjectRun as any)?.initialBudget ?? null;
                  preservedTimeline = (currentProjectRun as any)?.initial_timeline ?? (currentProjectRun as any)?.initialTimeline ?? null;
                  preservedSizing = (currentProjectRun as any)?.initial_sizing ?? (currentProjectRun as any)?.initialSizing ?? null;
                }
              }
              
              console.log('💾 onKickoffComplete: Preserving budget fields from database:', {
                initial_budget: preservedBudget,
                initial_timeline: preservedTimeline,
                initial_sizing: preservedSizing
              });
              
              // Update project status to in-progress with all steps and phase rating
              const planningPhase = currentProjectRun.phases.find((p) => p?.name === 'Planning');
              const updatedRun = {
                ...currentProjectRun,
                completedSteps: uniqueSteps,
                status: 'in-progress',
                phase_ratings: updatedPhaseRatings,
                // Mark Kickoff phase complete by advancing current_phase_id to Planning.
                currentPhaseId: planningPhase?.id ?? currentProjectRun.currentPhaseId,
                // KickoffWorkflow passes fresh decisions from step 4; closure currentProjectRun is often stale here.
                ...(persist?.customization_decisions !== undefined
                  ? { customization_decisions: persist.customization_decisions }
                  : {}),
                // CRITICAL: Explicitly preserve initial_budget, initial_timeline, initial_sizing
                ...(preservedBudget !== null && { initial_budget: preservedBudget }),
                ...(preservedTimeline !== null && { initial_timeline: preservedTimeline }),
                ...(preservedSizing !== null && { initial_sizing: preservedSizing }),
                progress: Math.round((uniqueSteps.length / (currentProjectRun.phases.reduce((total, phase) => {
                  return total + phase.operations.reduce((opTotal, operation) => {
                    return opTotal + operation.steps.length;
                  }, 0);
                }, 0))) * 100),
                updatedAt: new Date()
              };
              
              // CRITICAL: Wait for database update to complete (kickoff completion is marked as immediate save)
              await updateProjectRun(updatedRun);
              
              // CRITICAL: Small delay to ensure database write completes before refreshing
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // CRITICAL: Refresh project run from database to ensure we have the latest data
              // This ensures isKickoffComplete check uses fresh data from the database
              console.log("🔄 Refreshing project run from database after kickoff completion");
              if (currentProjectRun?.id) {
                const { data: refreshedRun, error: refreshError } = await supabase
                  .from('project_runs')
                  .select('*')
                  .eq('id', currentProjectRun.id)
                  .single();
                
                if (refreshError) {
                  console.error('❌ Error refreshing project run:', refreshError);
                } else if (refreshedRun) {
                  const transformedRun = projectRunFromSupabaseRow(
                    refreshedRun as unknown as Record<string, unknown>
                  );
                  if (!transformedRun) {
                    console.error('❌ Kickoff refresh: could not map project run row', refreshedRun?.id);
                  } else {
                    setCurrentProjectRun(transformedRun);
                    console.log("✅ Refreshed currentProjectRun from database with completedSteps:", transformedRun.completedSteps);
                    console.log("✅ isKickoffComplete should now be:", isKickoffPhaseComplete(transformedRun.completedSteps));
                  }
                }
              }
              
              // CRITICAL: Update local state immediately after database update to ensure UI reflects changes
              // This ensures the completedSteps state is in sync with the database
              console.log("🔄 Refreshing completedSteps state after kickoff completion");
              setCompletedSteps(new Set(uniqueSteps));
            } else {
              // Update project run if kickoff phase not found
              const updatedRun = {
                ...currentProjectRun,
                completedSteps: uniqueSteps,
                status: 'in-progress',
                ...(persist?.customization_decisions !== undefined
                  ? { customization_decisions: persist.customization_decisions }
                  : {}),
                progress: Math.round((uniqueSteps.length / (currentProjectRun.phases.reduce((total, phase) => {
                  return total + phase.operations.reduce((opTotal, operation) => {
                    return opTotal + operation.steps.length;
                  }, 0);
                }, 0))) * 100),
                updatedAt: new Date()
              };
              
              // CRITICAL: Wait for database update to complete (kickoff completion is marked as immediate save)
              await updateProjectRun(updatedRun);
              
              // CRITICAL: Small delay to ensure database write completes before refreshing
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // CRITICAL: Refresh project run from database to ensure we have the latest data
              console.log("🔄 Refreshing project run from database after kickoff completion");
              if (currentProjectRun?.id) {
                const { data: refreshedRun, error: refreshError } = await supabase
                  .from('project_runs')
                  .select('*')
                  .eq('id', currentProjectRun.id)
                  .single();
                
                if (refreshError) {
                  console.error('❌ Error refreshing project run:', refreshError);
                } else if (refreshedRun) {
                  const transformedRun = projectRunFromSupabaseRow(
                    refreshedRun as unknown as Record<string, unknown>
                  );
                  if (!transformedRun) {
                    console.error('❌ Kickoff refresh: could not map project run row', refreshedRun?.id);
                  } else {
                    setCurrentProjectRun(transformedRun);
                    console.log("✅ Refreshed currentProjectRun from database with completedSteps:", transformedRun.completedSteps);
                  }
                }
              }
              
              // CRITICAL: Update local state immediately after database update
              console.log("🔄 Refreshing completedSteps state after kickoff completion");
              setCompletedSteps(new Set(uniqueSteps));
            }
            
            console.log("✅ Kickoff completed - proceeding to main workflow");
            
            // Show post-kickoff notification if user hasn't disabled it
            if (!dontShowPostKickoffNotification) {
              setShowPostKickoffNotification(true);
            }
          }
        }}
        onExit={async () => {
          console.log("🚪 Exit kickoff - returning to project catalog");
          // Delete the project run since user said "not a fit"
          if (currentProjectRun) {
            try {
              await deleteProjectRun(currentProjectRun.id);
              console.log('✅ Project run deleted after "not a fit"');
            } catch (error) {
              console.error('⚠️ Error deleting project run:', error);
            }
          }
          
          // Clear current project run to prevent UserView from trying to load deleted project
          setCurrentProjectRun(null);
          // Clear view mode to show listing
          setViewMode('listing');
          
          if (projectCatalogEnabled) {
            navigate('/projects', { replace: true });
            window.history.replaceState({}, document.title, '/projects');
          } else {
            navigate('/', { replace: true, state: { view: 'user' } });
            window.history.replaceState({ view: 'user' }, document.title, '/');
          }
          
          // Notify parent component to return to listing
          onProjectSelected?.('listing' as any);
          
          // Clear reset flags
          window.dispatchEvent(new CustomEvent('clear-reset-flags'));
        }}
      />
      </div>
    );
  }
  
  // Only show "under construction" if there are literally no phases at all
  // Check multiple sources to ensure we catch all cases:
  // 1. activeProject.phases (direct from project/project run)
  // 2. rawWorkflowPhases (before ordering - most reliable)
  // 3. workflowPhases (after ordering)
  // Count phases for debugging
  let activeProjectPhasesCount = 0;
  if (activeProject?.phases) {
    if (Array.isArray(activeProject.phases)) {
      activeProjectPhasesCount = activeProject.phases.length;
    } else if (typeof activeProject.phases === 'string') {
      try {
        const parsed = JSON.parse(activeProject.phases);
        activeProjectPhasesCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {
        console.error('Error parsing activeProject.phases:', e);
      }
    }
  }
  
  // Count template phases for debugging
  let templatePhasesCount = 0;
  if (currentProjectRun?.projectId) {
    const templateProject = currentProject || projects?.find(p => p.id === currentProjectRun.projectId);
    if (templateProject?.phases) {
      templatePhasesCount = Array.isArray(templateProject.phases) ? templateProject.phases.length : 0;
    }
  }
  
  // UserView ONLY displays project runs (immutable snapshots)
  // Check if the project run has phases in its snapshot
  const hasPhases = activeProjectPhasesCount > 0 || 
                   rawWorkflowPhases.length > 0 || 
                   workflowPhases.length > 0 ||
                   templatePhasesCount > 0;
  
  // CRITICAL: If we have a projectRunId but no currentProjectRun yet, we're still loading
  // Don't show "under construction" while loading - show loading state instead
  // Also check if projectRunId matches currentProjectRun to ensure we're loading the right project
  const isStillLoading = (projectRunId && !currentProjectRun) || 
                         (projectRunId && currentProjectRun && currentProjectRun.id !== projectRunId);
  
  // Check if currentProjectRun has phases data that needs to be processed
  const hasPhasesData = currentProjectRun && (
    (currentProjectRun.phases && Array.isArray(currentProjectRun.phases) && currentProjectRun.phases.length > 0) ||
    (typeof currentProjectRun.phases === 'string' && currentProjectRun.phases.trim() !== '' && currentProjectRun.phases !== '[]')
  );
  
  // Also check if we're waiting for phases to be processed
  // Only consider it processing if we have phases data but they haven't been parsed yet
  const isProcessingPhases = currentProjectRun && hasPhasesData && rawWorkflowPhases.length === 0 && workflowPhases.length === 0;
  
  console.log('🔍 Phase detection check:', {
    activeProjectPhasesCount,
    rawWorkflowPhasesLength: rawWorkflowPhases.length,
    workflowPhasesLength: workflowPhases.length,
    templatePhasesCount,
    hasPhases,
    isStillLoading,
    isProcessingPhases,
    hasPhasesData,
    currentProjectRunId: currentProjectRun?.id,
    activeProjectId: activeProject?.id,
    projectId: currentProjectRun?.projectId,
    projectRunId,
    hasCurrentProjectRun: !!currentProjectRun,
    projectRunIdMatches: projectRunId && currentProjectRun ? currentProjectRun.id === projectRunId : false,
    phasesDataType: typeof currentProjectRun?.phases,
    phasesDataIsArray: Array.isArray(currentProjectRun?.phases),
    phasesDataLength: Array.isArray(currentProjectRun?.phases) ? currentProjectRun.phases.length : (typeof currentProjectRun?.phases === 'string' ? currentProjectRun.phases.length : 0)
  });
  
  // If there are no phases in the project run snapshot, show "under construction"
  // BUT: Don't show it if we're still loading the project run or processing phases
  // Also don't show it if we have phases data that just needs to be parsed
  const shouldShowUnderConstruction = !hasPhases && !isStillLoading && !isProcessingPhases && !hasPhasesData;
  
  if (shouldShowUnderConstruction) {
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

      {/* Planning wizard should render immediately after kickoff on all devices */}
      {projectPlanningWizardOpen && currentProjectRun ? (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden md:h-auto md:min-h-0 md:flex-none md:overflow-visible">
          <ProjectPlanningWizard
            open={projectPlanningWizardOpen}
            layout={isMobile ? 'dialog' : 'fullscreen'}
            onOpenChange={setProjectPlanningWizardOpen}
            onWorkflowFullyComplete={handlePlanningWizardFullyComplete}
            onGoToWorkflow={() => {
              setProjectPlanningWizardOpen(false);
            }}
            onOpenBudgeting={() => setProjectBudgetingOpen(true)}
            onOpenRiskManagement={() => setRiskManagementOpen(true)}
            onOpenQualityControl={() => {
              setQualityCheckExpandSettingsAccordion(true);
              setQualityCheckOpen(true);
            }}
            onOpenToolRentals={() => setToolRentalsOpen(true)}
            onOpenExpertSupport={() => setExpertHelpOpen(true)}
          />
        </div>
      ) : isMobile ? (
        <MobileWorkflowView
          projectName={activeProject?.name || 'Project'}
          projectRunId={currentProjectRun?.id}
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
            }
          }}
          allSteps={allSteps}
          checkedMaterials={checkedMaterials}
          checkedTools={checkedTools}
          onToggleMaterial={toggleMaterialCheck}
          onToggleTool={toggleToolCheck}
          onToolInstructions={(id, name) => setToolInstructions({ id, name })}
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
            groupedSteps={groupedSteps}
            isKickoffComplete={isKickoffComplete}
            instructionLevel={instructionLevel}
            projectName={currentProjectRun?.customProjectName || currentProjectRun?.name || 'Project'}
            projectRunId={currentProjectRun?.id}
            projectRun={currentProjectRun}
            estimatedFinishDate={estimatedFinishDate}
            estimatedFinishDateLoading={estimatedFinishDateLoading}
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
                setWorkflowMainView('steps');
                setCurrentStepIndex(stepIndex);
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
            onNotesClick={() => {
              if (!currentStep?.id) return;
              setNotesGalleryInitialStepId(currentStep.id);
              setNotesGalleryOpen(true);
            }}
            onViewScheduleClick={() => {
              setProjectSchedulerOpen(true);
              // Dispatch event to show calendar view automatically
              window.dispatchEvent(new CustomEvent('show-schedule-calendar'));
            }}
            onProgressViewsClick={() => setProgressViewsOpen(true)}
            onToolRentalsClick={() => setToolRentalsOpen(true)}
            onProjectNameClick={handleProjectNameClick}
            projectPlanningWizardOpen={projectPlanningWizardOpen}
          />

          <main className="flex-1 overflow-auto">
            <div className="w-full px-6 py-8">
              {workflowMainView === 'overview' ? (
                <ProjectWorkflowOverviewPage
                  isKickoffStep1Completed={completedSteps.has('kickoff-step-1')}
                />
              ) : (
                <div className="space-y-6">
              {/* Header */}
              <Card className="gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl" data-tutorial="step-name">{currentStep?.step}</CardTitle>
                  </div>
                  {currentStep?.description && <CardDescription className="text-sm">
                    {currentStep.description}
                  </CardDescription>}
                </div>

              </div>
            </CardHeader>
          </Card>

              {/* Tools & Materials Section - Show for all steps except ordering; show even when empty */}
              {currentStep &&
                !(currentStep.step === 'Tool & Material Ordering' ||
                  currentStep.phaseName === 'Ordering' ||
                  currentStep.id === 'ordering-step-1') && (
                <ToolsMaterialsSection
                  currentStep={currentStep}
                  checkedMaterials={checkedMaterials[currentStep.id] || new Set()}
                  checkedTools={checkedTools[currentStep.id] || new Set()}
                  onToggleMaterial={(materialId) => toggleMaterialCheck(currentStep.id, materialId)}
                  onToggleTool={(toolId) => toggleToolCheck(currentStep.id, toolId)}
                  onToolInstructions={(id, name) => setToolInstructions({ id, name })}
                />
              )}

          {/* Content */}
          <Card 
            key={instructionLevel}
            className="gradient-card border-0 shadow-card"
            data-tutorial="step-instructions"
          >
            <CardContent className="p-8">
              {instructionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading {instructionLevel === 'beginner' ? 'Beginner' : instructionLevel === 'intermediate' ? 'Intermediate' : 'Advanced'} content...</div>
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
          {(() => {
            // Ensure apps is always an array, even if it comes as a string or other type
            let apps = currentStep?.apps || [];
            if (typeof apps === 'string') {
              try {
                apps = JSON.parse(apps);
              } catch (e) {
                console.error('Failed to parse apps JSON for current step:', currentStep?.id, e);
                apps = [];
              }
            }
            if (!Array.isArray(apps)) {
              apps = [];
            }
            
            // Filter out any invalid app objects
            apps = apps.filter(app => app && app.id && app.appName);
            
            // Enrich apps with icon data from registry and overrides if missing
            apps = apps.map(app => {
              // Extract actionKey for lookup
              const actionKey = app.actionKey || app.id?.replace('app-', '');
              
              // Check for app override first (custom names/icons from database)
              const override = actionKey ? appOverrides.get(actionKey) : null;
              
              // Get base app from registry
              const nativeApp = actionKey ? getNativeAppById(actionKey) : null;
              
              // Build enriched app with priority: override > existing app data > native app > fallback
              return {
                ...app,
                icon: app.icon || override?.icon || nativeApp?.icon || 'Sparkles',
                appName: app.appName || override?.app_name || nativeApp?.appName || app.appName,
                description: app.description || override?.description || nativeApp?.description || app.description
              };
            });
            
            if (apps.length === 0) return null;
            
            return (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Apps for This Step
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <CompactAppsSection
                    apps={apps}
                    onAppsChange={() => {}}
                    onAddApp={() => {}}
                    onLaunchApp={handleLaunchApp}
                    editMode={false}
                  />
                </CardContent>
              </Card>
            );
          })()}

          {/* Step Checklist */}
          {currentStep && currentStep.outputs?.length > 0 && (
            <Card className="gradient-card border-0 shadow-card" data-tutorial="step-checklist">
              <CardContent className="p-6">
                <Accordion type="multiple" defaultValue={["step-checklist"]} className="w-full">
                  {(() => {
                    const qc = mergeQualityControlSettings(currentProjectRun?.quality_control_settings);
                    const stepOutputs = checkedOutputs[currentStep.id] || new Set();
                    const allOut = currentStep.outputs || [];
                    const required = allOut.filter((o) => isOutputInQualityScope(o, qc.require_all_outputs));
                    const optional = allOut.filter((o) => !isOutputInQualityScope(o, qc.require_all_outputs));
                    const requiredDone = required.filter((o) => stepOutputs.has(o.id)).length;
                    const isAllCompleted =
                      required.length === 0 ? true : requiredDone === required.length;
                    const badgeText =
                      optional.length === 0
                        ? `${requiredDone}/${required.length || allOut.length}`
                        : required.length === 0
                          ? `${optional.length} optional`
                          : `${requiredDone}/${required.length} req · ${optional.length} opt`;

                    const renderRow = (output: (typeof allOut)[0], optionalTag: boolean) => (
                      <div key={output.id} className="p-2.5 bg-background/50 rounded-lg">
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            id={`output-${output.id}`}
                            checked={stepOutputs.has(output.id)}
                            onCheckedChange={() => toggleOutputCheck(currentStep.id, output.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-medium">{output.name}</div>
                              {optionalTag && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Optional
                                </Badge>
                              )}
                              {output.type !== 'none' &&
                                ['major-aesthetics', 'performance-durability', 'safety'].includes(output.type) && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {output.type.replace('-', ' ')}
                                  </Badge>
                                )}
                              <button
                                type="button"
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
                    );

                    return (
                      <AccordionItem value="step-checklist">
                        <AccordionTrigger className="text-base font-semibold">
                          <div className="flex items-center gap-2">
                            <span>Step Checklist</span>
                            <Badge
                              variant={isAllCompleted ? 'default' : 'outline'}
                              className={isAllCompleted ? 'bg-green-500 text-white text-xs' : 'text-xs'}
                            >
                              {badgeText}
                            </Badge>
                            {isAllCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2.5 pt-2">
                            {required.map((output) => renderRow(output, false))}
                            {optional.length > 0 && (
                              <>
                                <p className="text-xs text-muted-foreground pt-1 font-medium">
                                  Optional outputs (not required to complete this step)
                                </p>
                                {optional.map((output) => renderRow(output, true))}
                              </>
                            )}
                            {qc.require_photos_per_step && (
                              <p className="text-xs text-amber-900 dark:text-amber-100 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1.5 mt-2">
                                Quality Control: add at least one photo tagged to this step before marking it
                                complete.
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between" data-tutorial="navigation-buttons">
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

                <div className="flex items-center gap-3" data-tutorial="photos-notes">
                  {/* Photo Upload and Note Upload Buttons - Always visible for current step */}
                  {currentStep && currentProjectRun && (
                    <>
                      <PhotoUpload
                        projectRunId={currentProjectRun.id}
                        projectId={currentProjectRun.projectId || null}
                        stepId={currentStep.id}
                        stepName={currentStep.step}
                        phaseId={currentStep.phaseId}
                        phaseName={currentStep.phaseName}
                        operationId={currentStep.operationId}
                        operationName={currentStep.operationName}
                        onPhotoUploaded={() => setStepPhotosRefreshNonce((n) => n + 1)}
                      />
                      <NoteUpload
                        projectRunId={currentProjectRun.id}
                        projectId={currentProjectRun.projectId || null}
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

                  {currentStep && !isStepCompleted(completedSteps, currentStep.id, (currentStep as any).spaceId) && (
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
                          data-tutorial="mark-complete"
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
                        title={isMobile ? "Complete Step Checklist First" : undefined}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2 text-xs text-muted-foreground">Complete Step Checklist First</span>}
                      </Button>
                    )
                  )}
                  
                  {/* Report Issue Button */}
                  <Dialog open={issueReportOpen} onOpenChange={setIssueReportOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        data-tutorial="report-issue" 
                        size="sm"
                        className="gap-2 text-xs"
                        title={isMobile ? "Report Issue" : undefined}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {!isMobile && <span className="ml-2 text-xs">Report Issue</span>}
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
            )}
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

      {toolInstructions && (
        <ToolInstructionsPopup
          open={!!toolInstructions}
          onOpenChange={(open) => !open && setToolInstructions(null)}
          toolId={toolInstructions.id}
          toolName={toolInstructions.name}
        />
      )}

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
            
            // If customizer was opened from planning wizard and is now closing, mark step as complete
            if (!open && (window as any).__planningWizardCustomizerComplete) {
              const onComplete = (window as any).__planningWizardCustomizerComplete;
              delete (window as any).__planningWizardCustomizerComplete;
              // Call the completion callback
              if (typeof onComplete === 'function') {
                onComplete();
              }
            }
            
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

      {/* Progress views (Gantt / Kanban) */}
      <ProgressViewsWindow
        open={progressViewsOpen}
        onOpenChange={setProgressViewsOpen}
        allSteps={allSteps}
        completedSteps={completedSteps}
        currentStepId={currentStep?.id}
        workflowPhases={workflowPhases}
        onStepClick={(stepIndex) => {
          if (stepIndex >= 0 && isKickoffComplete) {
            setCurrentStepIndex(stepIndex);
            setProgressViewsOpen(false);
          }
        }}
      />

      {/* Project Scheduler */}
      {projectSchedulerOpen && currentProjectRun && (
        <ProjectScheduler
          open={projectSchedulerOpen}
          onOpenChange={setProjectSchedulerOpen}
          project={activeProject as Project}
          projectRun={currentProjectRun}
        />
      )}

      {/* Project Planning Wizard — dialog on mobile only; desktop uses fullscreen shell above */}
      {isMobile ? (
        <ProjectPlanningWizard
          open={projectPlanningWizardOpen}
          layout="dialog"
          onOpenChange={setProjectPlanningWizardOpen}
          onWorkflowFullyComplete={handlePlanningWizardFullyComplete}
          onGoToWorkflow={() => {
            setProjectPlanningWizardOpen(false);
          }}
          onOpenBudgeting={() => setProjectBudgetingOpen(true)}
          onOpenRiskManagement={() => setRiskManagementOpen(true)}
          onOpenQualityControl={() => {
            setQualityCheckExpandSettingsAccordion(true);
            setQualityCheckOpen(true);
          }}
          onOpenToolRentals={() => setToolRentalsOpen(true)}
          onOpenExpertSupport={() => setExpertHelpOpen(true)}
        />
      ) : null}
      
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

      {/* Critical Points window */}
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
          variant="risk-focus"
        />
      )}

      {/* Quality Control (native app quality-check) */}
      <QualityCheckWindow
        open={qualityCheckOpen}
        onOpenChange={(open) => {
          if (!open) setQualityCheckExpandSettingsAccordion(false);
          setQualityCheckOpen(open);
        }}
        expandSettingsAccordionWhenOpen={qualityCheckExpandSettingsAccordion}
        appTitle={qualityControlAppTitle}
        projectRun={currentProjectRun ?? undefined}
        updateProjectRun={updateProjectRun}
        steps={allSteps as any[]}
        completedSteps={completedSteps}
        checkedOutputs={checkedOutputs}
        onJumpToStep={(stepId, spaceId) => navigateToStepInstance(stepId, spaceId)}
        onToggleOutputComplete={toggleOutputCheck}
        userDisplayName={qualityControlPdfUserLabel}
      />

      {/* Upgrade prompt when launching a paid app without subscription */}
      <UpgradePrompt open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt} feature={upgradePromptFeature} />

      {/* Photo Gallery */}
      {currentProjectRun && (
        <PhotoGallery
          open={photoGalleryOpen}
          onOpenChange={setPhotoGalleryOpen}
          projectRunId={currentProjectRun.id}
          projectId={currentProjectRun.projectId || undefined}
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
          projectId={currentProjectRun.projectId || undefined}
          mode="user"
          title="Project Notes"
          initialStepId={notesGalleryInitialStepId}
        />
      )}

      {/* Post-Kickoff Notification */}
      <PostKickoffNotification
        open={showPostKickoffNotification}
        onOpenChange={setShowPostKickoffNotification}
        onDontShowAgain={(dontShow) => {
          setDontShowPostKickoffNotification(dontShow);
        }}
      />

      {/* Scaled Step Progress Dialog */}
      {currentScaledStep && currentProjectRun && (
        <ScaledStepProgressDialog
          open={scaledProgressDialogOpen}
          onOpenChange={setScaledProgressDialogOpen}
          projectRunId={currentProjectRun.id}
          stepId={currentScaledStep.id}
          stepTitle={currentScaledStep.title}
          scalingUnit={currentProjectRun.scalingUnit}
          onProgressComplete={handleStepComplete}
        />
      )}
    </>
  );
}