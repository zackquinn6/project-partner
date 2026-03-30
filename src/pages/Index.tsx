import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/contexts/MembershipContext';
import { useProject } from '@/contexts/ProjectContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProjectOwner } from '@/hooks/useProjectOwner';
import { useIsMobile } from '@/hooks/use-mobile';
import Navigation from "@/components/Navigation";
import Home from "@/components/Home";
import { PostAuthLanding } from "@/components/PostAuthLanding";
import { AdminView } from "@/components/AdminView";
import { PreSignInNavigation } from '@/components/PreSignInNavigation';
import EditWorkflowView from "@/components/EditWorkflowView";
import UserView from "@/components/UserView";
import { ProjectNavigationErrorBoundary } from "@/components/ProjectNavigationErrorBoundary";
import ProjectCatalog from "@/components/ProjectCatalog";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MobileOptimizedHome } from '@/components/MobileOptimizedHome';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileProjectListing } from '@/components/MobileProjectListing';
import { MobileWorkflowView } from '@/components/MobileWorkflowView';
import { ToolRentalsWindow } from '@/components/ToolRentalsWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { HomeManager } from '@/components/HomeManager';
import { HomeMaintenanceWindow } from '@/components/HomeMaintenanceWindow';
import { ToolsMaterialsLibraryView } from '@/components/ToolsMaterialsLibraryView';
import ProfileManager from '@/components/ProfileManager';
import { ExpertHelpWindow } from '@/components/ExpertHelpWindow';
import { HomeTaskList } from '@/components/HomeTaskList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KeyCharacteristicsExplainer } from '@/components/KeyCharacteristicsExplainer';
import { Button } from '@/components/ui/button';
import { useLiabilityAcceptance } from '@/hooks/useLiabilityAcceptance';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { LiabilityAgreementDialog } from '@/components/LiabilityAgreementDialog';
import { RiskFocusLauncherDialog } from '@/components/RiskFocusLauncher';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import { isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { ProjectPortfolioRemindersDialog } from '@/components/ProjectPortfolioRemindersDialog';

// Force rebuild to clear cache

/** True when this page load was a full reload (F5 / refresh). Used to avoid restoring `history.state` (e.g. `view: 'user'` from UserView) so refresh lands on My Workshop. */
function isPageReload(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
  if (nav) return nav.type === 'reload';
  const legacy = (performance as unknown as { navigation?: { type: number } }).navigation;
  return legacy?.type === 1;
}

type IndexLocationState = {
  view?: string;
  mobileView?: string;
  projectRunId?: string;
};

function initialCurrentViewFromLocation(state: unknown): 'home' | 'admin' | 'user' | 'editWorkflow' {
  const v = (state as IndexLocationState)?.view;
  if (v === 'admin' || v === 'user' || v === 'editWorkflow') return v;
  return 'home';
}

function initialMobileViewFromLocation(
  state: unknown,
  isMobile: boolean
): 'home' | 'projects' | 'workflow' | 'catalog' | 'tasks' {
  const st = state as IndexLocationState;
  const mv = st?.mobileView;
  if (mv === 'projects' || mv === 'workflow' || mv === 'catalog' || mv === 'tasks') return mv;
  if (isMobile && typeof st?.projectRunId === 'string' && st.projectRunId.length > 0 && st?.view === 'user') {
    return 'workflow';
  }
  return 'home';
}

const PP_INITIAL_ENTRY_PATH_KEY = 'pp_initial_entry_path';

/** One-time workshop reset per JS document (survives Index unmount when leaving for `/projects`). */
let indexWorkshopReloadResetApplied = false;

const Index = () => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { user } = useAuth();
  const { hasProjectsTier, hasRiskLessTier, loading: membershipLoading } = useMembership();
  const { projectCatalogEnabled } = useGlobalPublicSettings();
  const { accepted: liabilityAccepted, loading: liabilityLoading, refetch: refetchLiability } = useLiabilityAcceptance();
  const { isAdmin } = useUserRole();
  const { hasProjectOwnerRole } = useProjectOwner();
  const showAdminPanel = isAdmin || hasProjectOwnerRole;
  const { setCurrentProject, setCurrentProjectRun, currentProject, currentProjectRun, projects, projectRuns } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'user' | 'editWorkflow'>(() =>
    initialCurrentViewFromLocation(location.state)
  );
  const [mobileView, setMobileView] = useState<'home' | 'projects' | 'workflow' | 'catalog' | 'tasks'>(() =>
    initialMobileViewFromLocation(location.state, isMobile)
  );
  const [resetUserView, setResetUserView] = useState(false);
  const [forceListingMode, setForceListingMode] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'projects' | 'tasks' | 'profile' | 'help' | 'expert'>('home');
  const [mobileUpgradeOpen, setMobileUpgradeOpen] = useState(false);
  const [mobileUpgradeFeature, setMobileUpgradeFeature] = useState('Projects membership');

  // Modal states - moved from Navigation to work on both mobile and desktop
  const [showKCExplainer, setShowKCExplainer] = useState(false);
  const [isHomeManagerOpen, setIsHomeManagerOpen] = useState(false);
  const [isHomeMaintenanceOpen, setIsHomeMaintenanceOpen] = useState(false);
  const [isCommunityPostsOpen, setIsCommunityPostsOpen] = useState(false);
  const [isToolRentalsOpen, setIsToolRentalsOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);
  const [isExpertHelpOpen, setIsExpertHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isToolsLibraryGridOpen, setIsToolsLibraryGridOpen] = useState(false);
  const [isHomeTaskListOpen, setIsHomeTaskListOpen] = useState(false);
  const [isRiskFocusLauncherOpen, setIsRiskFocusLauncherOpen] = useState(false);
  /** Risk-Less: full-screen register only (no workflow); set after Start from launcher. */
  const [riskFocusRegisterRunId, setRiskFocusRegisterRunId] = useState<string | null>(null);
  const [portfolioRemindersOpen, setPortfolioRemindersOpen] = useState(false);

  // CRITICAL: All hooks must be at the top - before any conditional logic
  const handleMobileProjectSelect = useCallback(
    (project: any) => {
      console.log('🎯 Index: Mobile project selected:', project.name);

      if ('progress' in project) {
        const run = project as ProjectRun;
        if (!run.isManualEntry) {
          if (isRiskFocusRun(run)) {
            if (!membershipLoading && !hasRiskLessTier) {
              setMobileUpgradeFeature('Risk-Less');
              setMobileUpgradeOpen(true);
              return;
            }
          } else if (!membershipLoading && !hasProjectsTier) {
            setMobileUpgradeFeature('Projects membership');
            setMobileUpgradeOpen(true);
            return;
          }
        }
        if (isRiskFocusRun(run)) {
          setRiskFocusRegisterRunId(run.id);
          return;
        }
        setCurrentProjectRun(project);
        setMobileView('workflow');
        setCurrentView('user');
        setResetUserView(false);
        setForceListingMode(false);
      } else {
        if (!membershipLoading && !hasProjectsTier) {
          setMobileUpgradeFeature('Projects membership');
          setMobileUpgradeOpen(true);
          return;
        }
        setCurrentProject(project);
        setMobileView('workflow');
        setCurrentView('user');
      }
    },
    [
      setCurrentProjectRun,
      setCurrentProject,
      hasProjectsTier,
      hasRiskLessTier,
      membershipLoading,
    ]
  );

  useEffect(() => {
    if (!projectCatalogEnabled && mobileView === 'catalog') {
      setMobileView('projects');
    }
  }, [projectCatalogEnabled, mobileView]);

  useEffect(() => {
    const openPortfolioReminders = () => setPortfolioRemindersOpen(true);
    window.addEventListener('open-portfolio-reminders', openPortfolioReminders);
    return () =>
      window.removeEventListener('open-portfolio-reminders', openPortfolioReminders);
  }, []);

  // Removed debug logging - no longer tracking duplicate modals

  // Handle navigation state changes (including view parameter)
  useEffect(() => {
    // Full reload (F5) on My Workshop `/` only: clear stale history state once. If the user reloaded on `/projects`
    // or is returning from the catalog with `navigate('/', { state })`, do NOT return early — apply location.state.
    if (isPageReload()) {
      let initialEntryPath = '';
      try {
        initialEntryPath =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(PP_INITIAL_ENTRY_PATH_KEY) ?? ''
            : '';
      } catch {
        initialEntryPath = '';
      }
      const reloadLandedOnWorkshop = initialEntryPath === '/' || initialEntryPath === '';

      if (reloadLandedOnWorkshop && !indexWorkshopReloadResetApplied) {
        indexWorkshopReloadResetApplied = true;
        setCurrentView('home');
        setForceListingMode(false);
        setResetUserView(false);
        setCurrentProjectRun(null);
        setCurrentProject(null);
        navigate('/', { replace: true, state: {} });
        const openFromStorage =
          typeof sessionStorage !== 'undefined' && sessionStorage.getItem('openTaskList') === '1';
        if (openFromStorage) {
          if (isMobile) {
            setMobileView('tasks');
            setMobileActiveTab('tasks');
          } else {
            setIsHomeTaskListOpen(true);
          }
          sessionStorage.removeItem('openTaskList');
        } else {
          setMobileView('home');
          setMobileActiveTab('home');
        }
        return;
      }
    }

    const openFromState = location.state?.openTaskList === true;
    const openFromStorage = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('openTaskList') === '1';
    if (openFromState || openFromStorage) {
      if (isMobile) {
        setMobileView('tasks');
        setMobileActiveTab('tasks');
      } else {
        setIsHomeTaskListOpen(true);
      }
      if (openFromStorage) sessionStorage.removeItem('openTaskList');
      if (openFromState) {
        navigate(location.pathname, { state: { ...location.state, openTaskList: undefined }, replace: true });
      }
    }
    if (location.state?.view) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);

      // Opening a specific project (e.g. from catalog) → go to kickoff, not dashboard
      if (location.state.projectRunId) {
        setForceListingMode(false);
        setResetUserView(false);
        const run = projectRuns.find((r) => r.id === location.state.projectRunId);
        if (run) {
          setCurrentProjectRun(run);
        }
      }

      // Mobile: open workflow (kickoff) immediately when coming from catalog
      if (location.state.projectRunId && isMobile) {
        console.log('📱 Index: Mobile navigation with projectRunId:', location.state.projectRunId);
        // Always open workflow when projectRunId is in state; UserView will fetch run by ID if needed
        setMobileView('workflow');
      }
      
      if (location.state.resetToListing) {
        console.log('🔄 Index: Setting reset flags from navigation state');
        setResetUserView(true);
        setForceListingMode(true);
      }
    }
  }, [location.state, location.pathname, projectRuns, isMobile, setCurrentProjectRun, setCurrentProject, navigate]);

  // Prevent constant re-renders by memoizing navigation handlers
  const [hasHandledInitialState, setHasHandledInitialState] = useState(false);

  // Listen for edit workflow navigation event
  useEffect(() => {
    if (isPageReload()) return;
    // Only handle state changes once per location change
    if (location.state?.view && !hasHandledInitialState) {
      console.log('🎯 Index: Setting view from navigation state:', location.state.view);
      setCurrentView(location.state.view);
      
      // Handle mobile view state
      if (location.state.mobileView && isMobile) {
        console.log('📱 Index: Setting mobile view from state:', location.state.mobileView);
        setMobileView(location.state.mobileView);
      }
      
      if (location.state.resetToListing) {
        console.log('🔄 Index: Setting reset flags from navigation state');
        setResetUserView(true);
        setForceListingMode(true);
      }
      setHasHandledInitialState(true);
    }
  }, [location.state, hasHandledInitialState]);

  // Reset handled state when location changes
  useEffect(() => {
    setHasHandledInitialState(false);
  }, [location.pathname]);

  // Add event listeners for modal windows (works on both mobile and desktop)
  useEffect(() => {
    const handleHomeManagerEvent = (event: Event) => {
      console.log('🏠 Opening Home Manager');
      event.stopPropagation();
      setIsHomeManagerOpen(true);
    };

    const handleHomeMaintenanceEvent = (event: Event) => {
      console.log('🏡 Opening Home Maintenance');
      event.stopPropagation();
      setIsHomeMaintenanceOpen(true);
    };

    const handleProfileManagerEvent = (event: Event) => {
      console.log('👤 Opening Profile Manager');
      event.stopPropagation();
      setIsProfileOpen(true);
    };

    const handleCommunityPostsEvent = (event: Event) => {
      console.log('👥 Opening Community Posts');
      event.stopPropagation();
      setIsCommunityPostsOpen(true);
    };

    const handleToolRentalsEvent = (event: Event) => {
      console.log('🔨 Opening Tool Rentals');
      event.stopPropagation();
      setIsToolRentalsOpen(true);
    };


    const handleAIRepairEvent = (event: Event) => {
      console.log('🤖 Opening AI Repair');
      event.stopPropagation();
      setIsAIRepairOpen(true);
    };

    const handleContractorFinderEvent = (event: Event) => {
      console.log('👷 Opening Contractor Finder');
      event.stopPropagation();
      setIsContractorFinderOpen(true);
    };

    const handleExpertHelpEvent = (event: Event) => {
      console.log('💡 Opening Expert Help');
      event.stopPropagation();
      setIsExpertHelpOpen(true);
    };

    const handleToolsLibraryGridEvent = (event: Event) => {
      console.log('🔧 Opening Tools Library Grid');
      event.stopPropagation();
      setIsToolsLibraryGridOpen(true);
    };

    const handleHomeTaskListEvent = (event: Event) => {
      console.log('📋 Opening Home Task List');
      event.stopPropagation();
      if (isMobile) {
        setMobileView('tasks');
        setMobileActiveTab('tasks');
      } else {
        setIsHomeTaskListOpen(true);
      }
    };

    // Add event listeners
    window.addEventListener('show-home-manager', handleHomeManagerEvent);
    window.addEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
    window.addEventListener('open-profile-manager', handleProfileManagerEvent);
    window.addEventListener('show-community-posts', handleCommunityPostsEvent);
    window.addEventListener('show-tool-rentals', handleToolRentalsEvent);
    window.addEventListener('show-user-tools-materials', handleToolsLibraryGridEvent);
    window.addEventListener('show-tools-materials-editor', handleToolsLibraryGridEvent);
    window.addEventListener('show-ai-repair', handleAIRepairEvent);
    window.addEventListener('show-contractor-finder', handleContractorFinderEvent);
    window.addEventListener('show-expert-help', handleExpertHelpEvent);
    window.addEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
    window.addEventListener('show-home-task-list', handleHomeTaskListEvent);

    const handleOpenRiskFocusLauncher = (event: Event) => {
      event.stopPropagation();
      setIsRiskFocusLauncherOpen(true);
    };
    window.addEventListener('open-risk-focus-launcher', handleOpenRiskFocusLauncher);

    const handleOpenRiskFocusRegisterForRun = (event: Event) => {
      const ce = event as CustomEvent<{ projectRunId?: string }>;
      const id = ce.detail?.projectRunId;
      if (id) setRiskFocusRegisterRunId(id);
    };
    window.addEventListener('open-risk-focus-register-for-run', handleOpenRiskFocusRegisterForRun);

    return () => {
      window.removeEventListener('show-home-manager', handleHomeManagerEvent);
      window.removeEventListener('show-home-maintenance', handleHomeMaintenanceEvent);
      window.removeEventListener('open-profile-manager', handleProfileManagerEvent);
      window.removeEventListener('show-community-posts', handleCommunityPostsEvent);
      window.removeEventListener('show-tool-rentals', handleToolRentalsEvent);
      window.removeEventListener('show-user-tools-materials', handleToolsLibraryGridEvent);
      window.removeEventListener('show-tools-materials-editor', handleToolsLibraryGridEvent);
      window.removeEventListener('show-ai-repair', handleAIRepairEvent);
      window.removeEventListener('show-contractor-finder', handleContractorFinderEvent);
      window.removeEventListener('show-expert-help', handleExpertHelpEvent);
      window.removeEventListener('show-tools-library-grid', handleToolsLibraryGridEvent);
      window.removeEventListener('show-home-task-list', handleHomeTaskListEvent);
      window.removeEventListener('open-risk-focus-launcher', handleOpenRiskFocusLauncher);
      window.removeEventListener('open-risk-focus-register-for-run', handleOpenRiskFocusRegisterForRun);
    };
  }, [isMobile]);

  // Listen for force-project-dashboard-listing event - CRITICAL for Project Dashboard button
  useEffect(() => {
    const handleForceProgressBoardListing = () => {
      console.log('🔄 Index: Force Project Dashboard listing event received - clearing project and forcing listing mode');
      setCurrentProjectRun(null);
      setCurrentProject(null);
      setResetUserView(true);
      setForceListingMode(true);
      setCurrentView('user');
      // Align with handleProjectsView: clear projectRunId from history so UserView opens listing, not a stale run
      navigate('/', { replace: true, state: { view: 'user' } });
    };

    window.addEventListener('force-project-dashboard-listing', handleForceProgressBoardListing);
    return () => window.removeEventListener('force-project-dashboard-listing', handleForceProgressBoardListing);
  }, [setCurrentProjectRun, setCurrentProject, navigate]);

  // Leaving the project workspace clears listing-only flags so we do not auto-reopen the dashboard on next visit
  useEffect(() => {
    if (currentView !== 'user') {
      setForceListingMode(false);
      setResetUserView(false);
    }
  }, [currentView]);

  // Listen for clear reset flags event and sync with Index
  useEffect(() => {
    const handleClearResetFlags = () => {
      console.log('🔄 Index: Clearing reset flags');
      setResetUserView(false);
      setForceListingMode(false);
      
      // Broadcast to MobileProjectListing
      window.dispatchEvent(new CustomEvent('update-reset-flags', {
        detail: { resetUserView: false, forceListingMode: false }
      }));
    };

    window.addEventListener('clear-reset-flags', handleClearResetFlags);
    return () => window.removeEventListener('clear-reset-flags', handleClearResetFlags);
  }, []);

  // Listen for edit workflow navigation event
  useEffect(() => {
    const handleEditWorkflowNavigation = () => {
      console.log('📝 Index: Edit workflow navigation requested');
      // Only switch to edit workflow view if we're in admin mode
      // This prevents accidental triggering when opening project runs
      if (currentView === 'admin' || isAdmin) {
        console.log('✅ Index: Switching to editWorkflow view');
        setCurrentView('editWorkflow');
      } else {
        console.warn('⚠️ Index: Ignoring edit workflow navigation (not in admin mode)');
      }
    };

    const handleKickoffNavigation = (event: CustomEvent) => {
      const { projectRunId } = event.detail;
      console.log("🎯 Index: Received kickoff navigation event:", projectRunId);
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    };

    // Only keep mobile-specific handlers that Navigation.tsx doesn't handle
    const handleShowKCExplainer = () => {
      setShowKCExplainer(true);
    };

    // Mobile-specific projects navigation (Navigation.tsx only handles desktop)
    const handleProjectsNavigationMobile = () => {
      if (!isMobile) return; // Only handle on mobile
      console.log('📱 Index: Mobile "My Projects" clicked - always showing projects listing');
      handleProjectsView();
    };

    const handleProfileNavigation = () => {
      console.log('🔄 Index: "My Profile" clicked - dispatching to Navigation');
      // Let Navigation.tsx handle this
      window.dispatchEvent(new CustomEvent('open-profile-manager'));
    };

    const handleToolLibraryNavigation = (event: Event) => {
      console.log('🔧 Index: Tool Library navigation received');
      event.stopPropagation();
      // Set the view to user to ensure the Navigation component can handle it
      setCurrentView('user');
    };

    const handleAdminPanelNavigation = () => {
      console.log('🛡️ Index: Admin Panel navigation received');
      handleAdminAccess();
    };

    window.addEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
    window.addEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
    // Mobile-specific projects navigation (Navigation.tsx handles desktop)
    if (isMobile) {
      window.addEventListener('navigate-to-projects', handleProjectsNavigationMobile);
    }
    window.addEventListener('show-profile', handleProfileNavigation);
    window.addEventListener('show-tools-materials', handleToolLibraryNavigation);
    window.addEventListener('show-admin-panel', handleAdminPanelNavigation);
    
    // Only add mobile-specific event listeners that Navigation.tsx doesn't handle
    window.addEventListener('show-kc-explainer', handleShowKCExplainer);
    
    return () => {
      window.removeEventListener('navigate-to-edit-workflow', handleEditWorkflowNavigation);
      window.removeEventListener('navigate-to-kickoff', handleKickoffNavigation as EventListener);
      // Clean up mobile projects listener
      if (isMobile) {
        window.removeEventListener('navigate-to-projects', handleProjectsNavigationMobile);
      }
      window.removeEventListener('show-profile', handleProfileNavigation);
      window.removeEventListener('show-tools-materials', handleToolLibraryNavigation);
      window.removeEventListener('show-admin-panel', handleAdminPanelNavigation);
      
      // Clean up mobile-specific listeners
      window.removeEventListener('show-kc-explainer', handleShowKCExplainer);
    };
  }, [isMobile, navigate, currentProjectRun, currentView, isAdmin]);

  // Define functions BEFORE they are used in useEffect
  const handleProjectsView = () => {
    console.log('🔄 Index: handleProjectsView called');
    setResetUserView(true);
    setForceListingMode(true);
    setCurrentView('user');
    
    // Set mobile view for mobile devices
    if (isMobile) {
      console.log('📱 Index: Setting mobile view to projects');
      setMobileView('projects');
    }
    
    // Clear projectRunId by replacing location state
    navigate('/', { replace: true, state: {} });
  };

  const handleAdminAccess = () => {
    if (showAdminPanel) {
      setCurrentView('admin');
    } else {
      toast.error('Access denied. Admin or Project Owner role required.');
    }
  };

  useEffect(() => {
    const onMobileAdmin = () => {
      if (showAdminPanel) {
        setCurrentView('admin');
      } else {
        toast.error('Access denied. Admin or Project Owner role required.');
      }
    };
    window.addEventListener('open-admin-panel-mobile', onMobileAdmin);
    return () => window.removeEventListener('open-admin-panel-mobile', onMobileAdmin);
  }, [showAdminPanel]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  // Show Home component as landing page for non-authenticated users
  if (!user) {
    return <Home onViewChange={() => {}} />;
  }

  // Block app until usage agreement is accepted (after redirect post-signup)
  if (liabilityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!liabilityAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LiabilityAgreementDialog open onAccepted={refetchLiability} />
      </div>
    );
  }

  const handleProjectSelected = () => {
    console.log('🎯 Index: Project selected from dropdown - clearing reset flags');
    setForceListingMode(false);
    setResetUserView(false);
  };

  const mobileNavCurrentView =
    mobileView === 'tasks'
      ? 'tasks'
      : mobileView === 'projects'
        ? 'projects'
        : mobileView === 'workflow'
          ? 'projects'
          : mobileActiveTab;

  // Mobile navigation handlers
  const handleMobileNavigation = (tab: 'home' | 'projects' | 'tasks' | 'profile' | 'help' | 'expert') => {
    setMobileActiveTab(tab);
    switch (tab) {
      case 'home':
        setMobileView('home');
        break;
      case 'projects':
        setMobileView('projects');
        break;
      case 'tasks':
        setMobileView('tasks');
        break;
      case 'profile':
        // Don't set showProfileManager here, Navigation handles this
        break;
      case 'help':
        window.dispatchEvent(new CustomEvent('show-expert-help'));
        break;
      case 'expert':
        setIsExpertHelpOpen(true);
        break;
    }
  };

  const handleMobileQuickAction = () => {
    if (currentProjectRun) {
      setMobileView('workflow');
    } else {
      setMobileView('projects');
    }
  };

  // This useEffect is now at the top with other hooks

  const renderView = () => {
    console.log('Index renderView - currentView:', currentView);
    
    // Mobile-specific rendering
    if (isMobile && user) {
      // Handle admin access on mobile by switching to desktop view
      if (currentView === 'admin') {
        return <AdminView />;
      }
      
      switch (mobileView) {
        case 'catalog':
          console.log('🔍 RENDERING Index ProjectCatalog - mobileView is catalog');
          if (!membershipLoading && !hasProjectsTier) {
            return (
              <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
                <p className="max-w-sm text-center text-muted-foreground">
                  A Projects membership is required to use the project catalog and start new catalog projects.
                </p>
                <Button
                  onClick={() => {
                    setMobileUpgradeFeature('Projects membership');
                    setMobileUpgradeOpen(true);
                  }}
                >
                  View plans
                </Button>
                <Button variant="outline" onClick={() => setMobileView('projects')}>
                  Back to dashboard
                </Button>
              </div>
            );
          }
          return (
            <div className="h-screen flex flex-col">
              <ProjectCatalog onClose={() => {
                console.log('📱 Index: ProjectCatalog closed, returning to projects');
                setMobileView('projects');
              }} />
            </div>
          );
        case 'tasks':
          return (
            <div className="h-screen flex flex-col min-h-0">
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden pb-20">
                <HomeTaskList
                  embedded
                  open
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      setMobileView('home');
                      setMobileActiveTab('home');
                    }
                  }}
                />
              </div>
              <MobileBottomNav
                currentView={mobileNavCurrentView}
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
        case 'projects':
          console.log('🔍 RENDERING Index MobileProjectListing - mobileView is projects');
          return (
            <div className="flex h-screen min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-hidden pb-20">
                <MobileProjectListing
                  onProjectSelect={handleMobileProjectSelect}
                  onNewProject={
                    projectCatalogEnabled
                      ? () => {
                          if (!membershipLoading && !hasProjectsTier) {
                            setMobileUpgradeFeature('Projects membership');
                            setMobileUpgradeOpen(true);
                            return;
                          }
                          setMobileView('catalog');
                        }
                      : undefined
                  }
                  catalogNewProjectEnabled={projectCatalogEnabled}
                  onClose={() => setMobileView('home')}
                />
              </div>
              <MobileBottomNav
                currentView={mobileNavCurrentView}
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
        case 'workflow':
          return (
            <div className="flex h-[100dvh] min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <UserView
                  resetToListing={resetUserView && !currentProjectRun}
                  forceListingMode={forceListingMode}
                  onProjectSelected={() => {
                    console.log('🎯 Index: Mobile workflow - onProjectSelected called');
                    setForceListingMode(false);
                    setResetUserView(false);
                    setMobileView('workflow');
                  }}
                  projectRunId={location.state?.projectRunId}
                  showProfile={location.state?.showProfile}
                />
              </div>
              <MobileBottomNav
                currentView={mobileNavCurrentView}
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
        case 'home':
        default:
          return (
            <div className="h-screen flex flex-col">
              <MobileOptimizedHome />
              <MobileBottomNav
                currentView={mobileNavCurrentView}
                onViewChange={handleMobileNavigation}
                onQuickAction={handleMobileQuickAction}
              />
            </div>
          );
      }
    }
    
    // Desktop rendering
    switch (currentView) {
      case 'admin':
        return <AdminView />;
      case 'user':
        console.log('🎯 Index: Rendering UserView with state:', {
          resetToListing: resetUserView,
          projectRunId: location.state?.projectRunId,
          hasProjectRunId: !!location.state?.projectRunId,
          currentView: currentView
        });
        return (
          <ProjectNavigationErrorBoundary fallbackMessage="Failed to load project view. Please refresh the page.">
            <UserView 
              resetToListing={resetUserView && !currentProjectRun} 
              forceListingMode={forceListingMode}
              onProjectSelected={() => {
                console.log('🎯 Index: onProjectSelected called - clearing all reset flags');
                setForceListingMode(false);
                setResetUserView(false);
                setCurrentView('user');
              }} 
              projectRunId={location.state?.projectRunId}
              showProfile={location.state?.showProfile}
            />
          </ProjectNavigationErrorBoundary>
        );
      case 'editWorkflow':
        return <EditWorkflowView onBackToAdmin={() => setCurrentView('admin')} />;
      case 'home':
      default:
        return <Home onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      {user && !isMobile && <Navigation currentView={currentView} onViewChange={setCurrentView} onAdminAccess={handleAdminAccess} onProjectsView={handleProjectsView} onProjectSelected={handleProjectSelected} />}
      <div className="w-full h-full">
        {renderView()}
      </div>
      
      {/* Modal windows that work on both mobile and desktop */}
      <HomeManager 
        open={isHomeManagerOpen}
        onOpenChange={setIsHomeManagerOpen}
      />
      
      <HomeMaintenanceWindow
        open={isHomeMaintenanceOpen}
        onOpenChange={setIsHomeMaintenanceOpen}
      />
      
      <CommunityPostsWindow 
        open={isCommunityPostsOpen}
        onOpenChange={setIsCommunityPostsOpen}
      />

      <ToolRentalsWindow 
        isOpen={isToolRentalsOpen}
        onClose={() => setIsToolRentalsOpen(false)}
      />
      
      <AIRepairWindow 
        open={isAIRepairOpen}
        onOpenChange={setIsAIRepairOpen}
      />
      
      <ContractorFinderWindow 
        open={isContractorFinderOpen}
        onOpenChange={setIsContractorFinderOpen}
      />
      
      <ExpertHelpWindow 
        isOpen={isExpertHelpOpen}
        onClose={() => setIsExpertHelpOpen(false)}
      />

      <ProfileManager 
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />

      {/* Mobile-specific modals */}
      <KeyCharacteristicsExplainer
        open={showKCExplainer}
        onOpenChange={setShowKCExplainer}
      />

      <ToolsMaterialsLibraryView 
        open={isToolsLibraryGridOpen}
        onOpenChange={setIsToolsLibraryGridOpen}
      />

      {!isMobile && (
        <HomeTaskList
          open={isHomeTaskListOpen}
          onOpenChange={setIsHomeTaskListOpen}
        />
      )}

      <RiskFocusLauncherDialog
        open={isRiskFocusLauncherOpen}
        onOpenChange={setIsRiskFocusLauncherOpen}
        onRiskFocusRunStarted={(runId) => setRiskFocusRegisterRunId(runId)}
      />

      <UpgradePrompt
        open={mobileUpgradeOpen}
        onOpenChange={setMobileUpgradeOpen}
        feature={mobileUpgradeFeature}
      />

      {user && riskFocusRegisterRunId ? (
        <RiskManagementWindow
          open
          onOpenChange={(open) => {
            if (!open) setRiskFocusRegisterRunId(null);
          }}
          projectRunId={riskFocusRegisterRunId}
          mode="run"
          variant="risk-focus"
        />
      ) : null}

      <ProjectPortfolioRemindersDialog
        open={portfolioRemindersOpen}
        onOpenChange={setPortfolioRemindersOpen}
      />
    </div>
  );
};

export default Index;
