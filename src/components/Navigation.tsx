import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle, Headphones, Crown, FileText, UserPlus, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useProject } from '@/contexts/ProjectContext';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import { parseQualityControlSettingsColumn } from '@/utils/qualityControlSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProjectOwner } from '@/hooks/useProjectOwner';
import { useMembership } from '@/contexts/MembershipContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBetaMode } from '@/hooks/useBetaMode';
import { FeedbackDialog } from './FeedbackDialog';
import { ContactUsWindow } from './ContactUsWindow';
import { UpgradePrompt } from './UpgradePrompt';
import { MembershipWindow } from './MembershipWindow';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DataPrivacyManager } from './DataPrivacyManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { PoliciesWindow } from './PoliciesWindow';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { AchievementNotificationCenter } from './AchievementNotificationCenter';
import { NotificationDropdown } from './NotificationDropdown';
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
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [isToolsLibraryOpen, setIsToolsLibraryOpen] = useState(false);
  const [isExpertHelpOpen, setIsExpertHelpOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
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
  const { hasProjectOwnerRole } = useProjectOwner();
  const showAdminPanel = isAdmin || hasProjectOwnerRole;
  const { canAccessPaidFeatures } = useMembership();
  const { isBetaMode } = useBetaMode();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Listen for user documentation request from admin guide
  useEffect(() => {
    const handleOpenUserDocs = () => {
      setIsDocumentationOpen(true);
    };
    window.addEventListener('open-user-documentation', handleOpenUserDocs);
    return () => window.removeEventListener('open-user-documentation', handleOpenUserDocs);
  }, []);

  // Listen for help menu actions from WorkflowSidebar (and elsewhere)
  useEffect(() => {
    const openPolicies = () => setIsPoliciesOpen(true);
    const openFeedback = () => setShowFeedback(true);
    const openRoadmap = () => setIsRoadmapOpen(true);
    const openDocumentation = () => setIsDocumentationOpen(true);
    const openExpertHelp = () => setIsExpertHelpOpen(true);
    window.addEventListener('open-policies-window', openPolicies);
    window.addEventListener('open-feedback-dialog', openFeedback);
    window.addEventListener('open-roadmap-window', openRoadmap);
    window.addEventListener('open-documentation-window', openDocumentation);
    window.addEventListener('open-expert-help', openExpertHelp);
    return () => {
      window.removeEventListener('open-policies-window', openPolicies);
      window.removeEventListener('open-feedback-dialog', openFeedback);
      window.removeEventListener('open-roadmap-window', openRoadmap);
      window.removeEventListener('open-documentation-window', openDocumentation);
      window.removeEventListener('open-expert-help', openExpertHelp);
    };
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
  const activeProjectRuns = projectRuns.filter((run) => {
    if (run.status === 'complete' || run.status === 'cancelled') return false;
    try {
      return calculateProjectProgress(run) < 100;
    } catch {
      return (run.progress || 0) < 100;
    }
  });
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
    let parsedPhases;
    try {
      if (typeof freshRun.phases === 'string') {
        parsedPhases = freshRun.phases.trim() === '' || freshRun.phases === '[]' 
          ? [] 
          : JSON.parse(freshRun.phases);
      } else {
        parsedPhases = freshRun.phases || [];
      }
    } catch (parseError) {
      console.error('❌ Error parsing phases:', parseError);
      parsedPhases = [];
    }
    
    // CRITICAL: Project runs MUST have phases - if missing, this is a data integrity error
    if (!parsedPhases || !Array.isArray(parsedPhases) || parsedPhases.length === 0) {
      console.error('❌ CRITICAL ERROR: Project run has no phases:', {
        name: freshRun.name,
        id: projectRunId,
        phasesRaw: freshRun.phases,
        phasesType: typeof freshRun.phases,
        parsedPhases
      });
      
      // Try to fetch template and rebuild phases
      if (freshRun.template_id) {
        console.log('🔄 Attempting to fetch template phases for:', freshRun.template_id);
        const template = projects.find(p => p.id === freshRun.template_id);
        if (template?.phases && Array.isArray(template.phases) && template.phases.length > 0) {
          console.log('✅ Found template phases, using template data');
          parsedPhases = template.phases;
        } else {
          const errorMsg = `Project run "${freshRun.name}" has no phases and template is unavailable. Please recreate this project.`;
          console.error('❌ FINAL ERROR:', errorMsg);
          toast.error(errorMsg);
          return; // Don't throw, just return to prevent navigation
        }
      } else {
        const errorMsg = `Project run "${freshRun.name}" has no phases and no template. Please recreate this project.`;
        console.error('❌ FINAL ERROR:', errorMsg);
        toast.error(errorMsg);
        return; // Don't throw, just return to prevent navigation
      }
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
      progress_reporting_style: freshRun.progress_reporting_style
        ? (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based')
        : undefined,
      quality_control_settings: parseQualityControlSettingsColumn(freshRun.quality_control_settings)
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
          {/* Beta release label - centered, visually appealing */}
          {isBetaMode && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 xl:block">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md ring-1 ring-white/20 pointer-events-auto">
                      Welcome to the Beta
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs text-left">
                    <p>
                      This project is designed to make DIY home improvement more successful. We&apos;d gladly appreciate feedback — use
                      <span className="font-semibold"> Send Feedback</span> from the <span className="font-semibold">?</span> dropdown menu in the upper right corner.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              
              {/* Combined Project Dashboard / Project Selector Dropdown */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={currentView === 'user' ? 'default' : 'ghost'} size="sm" className="text-xs" onClick={() => {
                      // CRITICAL: Force listing mode when Project Dashboard button clicked
                      // Clear global context first, then dispatch event (Index.tsx will also handle it)
                      setCurrentProjectRun(null);
                      setCurrentProject(null);
                      window.dispatchEvent(new CustomEvent('force-project-dashboard-listing'));
                      onViewChange('user');
                    }}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Project Dashboard
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
                  {activeProjectRuns.length > 0 ? activeProjectRuns.map(run => {
                        let progress = 0;
                        try {
                          progress = calculateProjectProgress(run);
                        } catch (error) {
                          console.error('Failed to calculate project progress:', error);
                        }
                        
                        return (
                          <DropdownMenuItem
                            key={run.id}
                            onClick={() => handleProjectSelect(run.id)}
                            className="flex flex-col items-start py-3"
                          >
                            <div className="font-medium text-sm">{run.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {progress}% complete
                            </div>
                          </DropdownMenuItem>
                        );
                      }) : <DropdownMenuItem disabled className="text-muted-foreground italic">
                      No active projects
                    </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Get Expert Help Button - Always visible */}
            
            
            {/* Achievement Notification Center */}
            <AchievementNotificationCenter />

            {/* Notifications (project owner alerts) */}
            <NotificationDropdown />
            
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
                  Password & Privacy
                </DropdownMenuItem>
                {showAdminPanel && (
                  <DropdownMenuItem onClick={onAdminAccess}>
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Help Dropdown (upper right): Send Feedback, App Roadmap, Documentation, Policies */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label="Help menu">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[9999] !bg-white dark:!bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl min-w-[200px] !opacity-100 overflow-visible" sideOffset={5}>
                <DropdownMenuItem onClick={() => setShowFeedback(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsContactOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Us
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRoadmapOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  App Roadmap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDocumentationOpen(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPoliciesOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Policies
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/apply-project-owner" className="flex items-center cursor-pointer">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Apply to be a Project Owner
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Desktop-only modals */}
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
      <ContactUsWindow open={isContactOpen} onOpenChange={setIsContactOpen} />
      
      <DataPrivacyManager open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen} />
      
       <FeatureRoadmapWindow open={isRoadmapOpen} onOpenChange={setIsRoadmapOpen} />
       
       <AppDocumentationWindow open={isDocumentationOpen} onOpenChange={setIsDocumentationOpen} />
      
        <PoliciesWindow open={isPoliciesOpen} onOpenChange={setIsPoliciesOpen} />
      
        <ToolsMaterialsWindow open={isToolsLibraryOpen} onOpenChange={setIsToolsLibraryOpen} />
        
        <ExpertHelpWindow isOpen={isExpertHelpOpen} onClose={() => setIsExpertHelpOpen(false)} />
        
         <UpgradePrompt open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt} feature="Project Catalog & Workflows" />
         
         <MembershipWindow open={isMembershipOpen} onOpenChange={setIsMembershipOpen} />
    </>;
}