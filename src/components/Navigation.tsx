import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle, Headphones, Crown } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMembership } from '@/contexts/MembershipContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBetaMode } from '@/hooks/useBetaMode';
import { FeedbackDialog } from './FeedbackDialog';
import { UpgradePrompt } from './UpgradePrompt';
import { MembershipWindow } from './MembershipWindow';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DataPrivacyManager } from './DataPrivacyManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { AchievementNotificationCenter } from './AchievementNotificationCenter';
import { supabase } from '@/integrations/supabase/client';
import { ProjectRun } from '@/interfaces/ProjectRun';
interface NavigationProps {
  currentView: 'home' | 'admin' | 'user' | 'editWorkflow';
  onViewChange: (view: 'home' | 'admin' | 'user' | 'editWorkflow') => void;
  onAdminAccess: () => void;
  onProjectsView?: () => void;
  onProjectSelected?: () => void;
}
export default function Navigation({
  currentView,
  onViewChange,
  onAdminAccess,
  onProjectsView,
  onProjectSelected
}: NavigationProps) {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);
  const [isToolsLibraryOpen, setIsToolsLibraryOpen] = useState(false);
  const [isExpertHelpOpen, setIsExpertHelpOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);

  // Add error boundary for useProject hook
  let projectData;
  try {
    projectData = useProject();
  } catch (error) {
    console.error('Navigation: useProject hook failed:', error);
    // Fallback to empty state if context is not available
    projectData = {
      projectRuns: [],
      currentProjectRun: null,
      setCurrentProjectRun: () => {}
    };
  }
  const {
    projectRuns,
    currentProjectRun,
    setCurrentProjectRun,
    projects,
    setCurrentProject
  } = projectData;
  const { signOut, signingOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { canAccessPaidFeatures } = useMembership();
  const { isBetaMode } = useBetaMode();
  const isMobile = useIsMobile();

  // Listen for user documentation request from admin guide
  useEffect(() => {
    const handleOpenUserDocs = () => {
      setIsDocumentationOpen(true);
    };
    window.addEventListener('open-user-documentation', handleOpenUserDocs);
    return () => window.removeEventListener('open-user-documentation', handleOpenUserDocs);
  }, []);
  useEffect(() => {
    // Only handle Navigation-specific events
    const handleToolsLibraryEvent = (event: Event) => {
      console.log('🔧 Opening Tools Library');
      event.stopPropagation();
      setIsToolsLibraryOpen(true);
    };
    const handleNavigateToProjectsEvent = (event: Event) => {
      console.log('🔄 Navigation: My Projects event - checking access');
      event.stopPropagation();

      // Check if user has access to paid features
      if (!canAccessPaidFeatures) {
        console.log('🔒 Navigation: Access denied - showing upgrade prompt');
        setShowUpgradePrompt(true);
        return;
      }
      console.log('✅ Navigation: Access granted - showing projects listing');
      onViewChange('user');
      onProjectsView?.();
    };
    window.addEventListener('show-tools-materials', handleToolsLibraryEvent);
    window.addEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    return () => {
      window.removeEventListener('show-tools-materials', handleToolsLibraryEvent);
      window.removeEventListener('navigate-to-projects', handleNavigateToProjectsEvent);
    };
  }, [onViewChange, onProjectsView]);
  const activeProjectRuns = projectRuns.filter(run => run.progress && run.progress < 100);
  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks

    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  const handleProjectSelect = async (projectRunId: string) => {
    console.log('🎯 Navigation: Fetching fresh project data from database for:', projectRunId);
    
    // CRITICAL: Clear currentProject to prevent edit workflow from opening
    setCurrentProject(null);
    
    // Fetch fresh data from database to ensure we have latest completedSteps
    const { data: freshRun, error } = await supabase
      .from('project_runs')
      .select('*')
      .eq('id', projectRunId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching fresh project run:', error);
      // Fallback to cached data
      const selectedRun = projectRuns.find(run => run.id === projectRunId);
      if (selectedRun) {
        setCurrentProjectRun(selectedRun);
        onViewChange('user');
        onProjectSelected?.();
      }
      return;
    }
    
    // Parse phases from database
    let parsedPhases = typeof freshRun.phases === 'string' 
      ? JSON.parse(freshRun.phases) 
      : (freshRun.phases || []);
    
    // CRITICAL: Project runs MUST have phases - if missing, this is a data integrity error
    if (!parsedPhases || !Array.isArray(parsedPhases) || parsedPhases.length === 0) {
      const errorMsg = `Project run "${freshRun.name}" (ID: ${projectRunId}) has no phases snapshot. This project run is corrupted and cannot be opened. Please delete and recreate this project.`;
      console.error('❌ CRITICAL ERROR:', errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Transform database data to ProjectRun format
    const projectRun: ProjectRun = {
      id: freshRun.id,
      templateId: freshRun.template_id,
      name: freshRun.name,
      description: freshRun.description || '',
      projectChallenges: freshRun.project_challenges,
      isManualEntry: freshRun.is_manual_entry || false,
      createdAt: new Date(freshRun.created_at),
      updatedAt: new Date(freshRun.updated_at),
      startDate: new Date(freshRun.start_date),
      planEndDate: new Date(freshRun.plan_end_date),
      endDate: freshRun.end_date ? new Date(freshRun.end_date) : undefined,
      status: freshRun.status as 'not-started' | 'in-progress' | 'complete',
      projectLeader: freshRun.project_leader,
      accountabilityPartner: freshRun.accountability_partner,
      customProjectName: freshRun.custom_project_name,
      currentPhaseId: freshRun.current_phase_id,
      currentOperationId: freshRun.current_operation_id,
      currentStepId: freshRun.current_step_id,
      completedSteps: typeof freshRun.completed_steps === 'string' 
        ? JSON.parse(freshRun.completed_steps) 
        : (freshRun.completed_steps || []),
      progress: freshRun.progress,
      phases: parsedPhases,
      category: Array.isArray(freshRun.category) ? freshRun.category : (freshRun.category ? [freshRun.category] : []),
      effortLevel: freshRun.effort_level as 'Low' | 'Medium' | 'High',
      skillLevel: freshRun.skill_level as 'Beginner' | 'Intermediate' | 'Advanced',
      estimatedTime: freshRun.estimated_time,
      customization_decisions: freshRun.customization_decisions 
        ? (typeof freshRun.customization_decisions === 'string' 
          ? JSON.parse(freshRun.customization_decisions) 
          : freshRun.customization_decisions)
        : undefined,
      instruction_level_preference: (freshRun.instruction_level_preference as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
      // Initial project goals from kickoff step 3
      initial_budget: freshRun.initial_budget,
      initial_timeline: freshRun.initial_timeline,
      initial_sizing: freshRun.initial_sizing,
      progress_reporting_style: (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based') || 'linear'
    };
    
    console.log('✅ Navigation: Fresh project data loaded:', {
      name: projectRun.name,
      progress: projectRun.progress,
      completedStepsCount: projectRun.completedSteps.length,
      completedSteps: projectRun.completedSteps,
      phasesCount: projectRun.phases?.length || 0,
      hasPhases: !!(projectRun.phases && Array.isArray(projectRun.phases) && projectRun.phases.length > 0)
    });
    
    // CRITICAL: Clear reset flags immediately BEFORE setting project run
    // This prevents UserView useEffect from forcing listing mode
    window.dispatchEvent(new CustomEvent('clear-reset-flags'));
    
    // CRITICAL: Set project run in context FIRST, before navigation
    // This ensures it's available when UserView checks for currentProjectRun
    setCurrentProjectRun(projectRun);
    
    // CRITICAL: Change view FIRST to ensure UserView is rendered
    onViewChange('user');
    
    // CRITICAL: Update URL state with projectRunId so UserView can properly load it
    // This ensures UserView's useEffect that watches projectRunId will trigger
    // Use a small delay to ensure state updates are processed
    setTimeout(() => {
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRun.id
        },
        replace: true
      });
    }, 0);
    
    // Update projectRuns cache to include this project run if it's not already there
    const existingRun = projectRuns.find(run => run.id === projectRun.id);
    if (!existingRun) {
      // Project run not in cache - add it temporarily
      // UserView will fetch it properly, but having it in context helps
      console.log('⚠️ Navigation: Project run not in cache, will be fetched by UserView');
    }
    
    // Call onProjectSelected to clear forceListingMode in Index.tsx
    onProjectSelected?.();
  };
  console.log('🔧 Navigation rendering with mobile:', isMobile, 'buttons should be visible');
  return <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 relative">
          {/* Beta label - centered */}
          {isBetaMode && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded whitespace-nowrap">
                Project Partner - Beta
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <img src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" alt="Project Partner Logo" className="h-8 w-auto" />
            </div>
            
            <div className="flex items-center space-x-1">
              <Button variant={currentView === 'home' ? 'default' : 'ghost'} size="sm" onClick={() => onViewChange('home')} className="text-xs">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              
              {/* Combined Progress Board / Project Selector Dropdown */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={currentView === 'user' ? 'default' : 'ghost'} size="sm" className="text-xs" onClick={() => {
                      // CRITICAL: Force listing mode when Progress Board button clicked
                      // Clear global context first, then dispatch event (Index.tsx will also handle it)
                      setCurrentProjectRun(null);
                      setCurrentProject(null);
                      window.dispatchEvent(new CustomEvent('force-progress-board-listing'));
                      onViewChange('user');
                    }}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Progress Board
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 z-50 bg-background border shadow-lg" sideOffset={8}>
                  {/* My Projects Link at top */}
                  <DropdownMenuItem onClick={() => {
                  console.log('🔄 Navigation: My Projects clicked - checking access');
                  if (!canAccessPaidFeatures) {
                    console.log('🔒 Navigation: Access denied - showing upgrade prompt');
                    setShowUpgradePrompt(true);
                    return;
                  }
                  console.log('✅ Navigation: Access granted - clearing current project');
                  setCurrentProjectRun(null);
                  setCurrentProject(null);
                  onViewChange('user');
                  onProjectsView?.();
                }} className="font-semibold text-primary hover:text-primary hover:bg-primary/10 py-3">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    My Projects
                  </DropdownMenuItem>
                  
                  {/* Divider */}
                  <div className="h-px bg-border my-1" />
                  
                  {/* Active Projects List */}
                  {activeProjectRuns.length > 0 ? activeProjectRuns.map(run => <DropdownMenuItem key={run.id} onClick={() => handleProjectSelect(run.id)} className="flex flex-col items-start py-3">
                        <div className="font-medium text-sm">{run.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {calculateProjectProgress(run)}% complete
                        </div>
                      </DropdownMenuItem>) : <DropdownMenuItem disabled className="text-muted-foreground italic">
                      No active projects
                    </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Phone Number */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] text-muted-foreground">Qs? Call or Text</span>
              <span className="text-sm font-medium">(617) 545-3367</span>
            </div>
            
            {/* Get Expert Help Button - Always visible */}
            
            
            {/* Achievement Notification Center */}
            <AchievementNotificationCenter />
            
            {/* Settings Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100" sideOffset={5}>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMembershipOpen(true)}>
                  <Crown className="h-4 w-4 mr-2" />
                  Membership
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPrivacyOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Privacy Settings
                </DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onClick={onAdminAccess}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>}
                <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Help Dropdown - Always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100" sideOffset={5}>
                <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  App Roadmap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDocumentationOpen(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Desktop-only modals */}
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
      
      <DataPrivacyManager open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen} />
      
       <FeatureRoadmapWindow open={isRoadmapOpen} onOpenChange={setIsRoadmapOpen} />
       
       <AppDocumentationWindow open={isDocumentationOpen} onOpenChange={setIsDocumentationOpen} />
      
        <ToolsMaterialsWindow open={isToolsLibraryOpen} onOpenChange={setIsToolsLibraryOpen} />
        
        <ExpertHelpWindow isOpen={isExpertHelpOpen} onClose={() => setIsExpertHelpOpen(false)} />
        
         <UpgradePrompt open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt} feature="Project Catalog & Workflows" />
         
         <MembershipWindow open={isMembershipOpen} onOpenChange={setIsMembershipOpen} />
    </>;
}