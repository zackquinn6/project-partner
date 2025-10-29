import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, FolderOpen, ChevronDown, Settings, LogOut, User, Users, TrendingUp, Shield, Lock, HelpCircle, BookOpen, MessageCircle, Headphones, Crown } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMembership } from '@/contexts/MembershipContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBetaMode } from '@/hooks/useBetaMode';
import { FeedbackDialog } from './FeedbackDialog';
import { UpgradePrompt } from './UpgradePrompt';
import { MembershipWindow } from './MembershipWindow';
import { useState, useEffect } from "react";
import { DataPrivacyManager } from './DataPrivacyManager';
import { FeatureRoadmapWindow } from './FeatureRoadmapWindow';
import { AppDocumentationWindow } from './AppDocumentationWindow';
import { ToolsMaterialsWindow } from './ToolsMaterialsWindow';
import { ExpertHelpWindow } from './ExpertHelpWindow';
import { AchievementNotificationCenter } from './AchievementNotificationCenter';
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
  const handleProjectSelect = (projectRunId: string) => {
    const selectedRun = projectRuns.find(run => run.id === projectRunId);
    if (selectedRun) {
      console.log('🎯 Navigation: Project selected from dropdown:', selectedRun.name);
      setCurrentProjectRun(selectedRun);
      onViewChange('user');
      onProjectSelected?.();
    }
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
                  <Button variant={currentView === 'user' ? 'default' : 'ghost'} size="sm" className="text-xs">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {currentProjectRun ? currentProjectRun.name : "Progress Board"}
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
                          {Math.round(run.progress || 0)}% complete
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