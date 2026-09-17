import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { useAiFeatureSettings } from '@/hooks/useAiFeatureSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { PricingWindow } from '@/components/PricingWindow';
import DIYStyleQuiz from '@/components/DIYStyleQuiz';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { KeyCharacteristicsExplainer } from '@/components/KeyCharacteristicsExplainer';
import { ArrowRight, Home as HomeIcon, Wrench, BookOpen, Calendar, ShoppingCart, Hammer, MapPin, CheckCircle, Star, Target, Zap, Crosshair, User, Users, Calculator, HelpCircle, Camera, Building2, ListChecks, Loader2 } from 'lucide-react';
import heroDIYPerson from '@/assets/hero-diy-person.png';
import { HeroSection } from './landing/HeroSection';
import { ValuePropSection } from './landing/ValuePropSection';
import { StatisticsBar } from './landing/StatisticsBar';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { PersonasSection } from './landing/PersonasSection';
import { PricingSection } from './landing/PricingSection';
import { FounderInfoDialog } from './landing/FounderInfoDialog';
import { FAQSection } from './landing/FAQSection';
import { FinalCTASection } from './landing/FinalCTASection';
import { SimplifiedLandingHero } from './landing/SimplifiedLandingHero';
import { PreSignInNavigation } from '@/components/PreSignInNavigation';
import { TrialBanner } from '@/components/TrialBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { countDueSoon } from '@/utils/maintenanceProgress';
import { countProjectRunsInProgressOnDashboard } from '@/utils/projectDashboardStatus';
interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}
const coreFeatures = [{
  icon: Target,
  title: "Build Smarter. Build Your Way.",
  description: "At Toolio, we believe two truths about DIY:",
  features: ["🔨 Your project is not a snowflake. The hard lessons have already been solved—why waste weekends reinventing plans or repeating mistakes? We bring those lessons straight to you.", "✨ You are a maker's mark. Every builder leaves a distinct imprint. Your pace, your tools, your support system—they're yours alone. Toolio learns how you work and adapts over time, so every project feels like it was designed for you.", "👉 Proven playbooks. Personalized delivery. That's DIY Done Smarter."]
}];
export default function Home({
  onViewChange
}: HomeProps) {
  const {
    user
  } = useAuth();
  const {
    projectRuns,
    setCurrentProjectRun
  } = useProject();
  const navigate = useNavigate();
  const {
    simplifiedPublicLanding,
    projectCatalogEnabled,
    workshopLabsAccordionEnabled,
    loading: publicSettingsLoading,
  } = useGlobalPublicSettings();
  const { aiRepairEnabled } = useAiFeatureSettings();
  const [showFullMarketingLanding, setShowFullMarketingLanding] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDIYStyleQuizOpen, setIsDIYStyleQuizOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isCodePermitsOpen, setIsCodePermitsOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);
  const [isKCExplainerOpen, setIsKCExplainerOpen] = useState(false);
  const [isFounderDialogOpen, setIsFounderDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    openTasks: 0,
    maintenanceDueSoon: 0
  });

  // Project stats from context; lifecycle completion stays on project runs
  useEffect(() => {
    if (projectRuns) {
      const completed = projectRuns.filter(run => run.status !== 'cancelled' && (run.progress || 0) >= 100).length;
      setStats(prev => ({
        ...prev,
        completedProjects: completed,
        activeProjects: countProjectRunsInProgressOnDashboard(projectRuns),
      }));
    }
  }, [projectRuns]);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data: homeTasks, error: homeTasksError } = await supabase
        .from('home_tasks')
        .select('id, status, project_run_id')
        .eq('user_id', user.id);

      if (homeTasksError) {
        console.error('Error loading home_tasks for dashboard stats', homeTasksError);
      }

      let openTasksCount = 0;

      if (homeTasks && Array.isArray(homeTasks)) {
        const openTasks = homeTasks.filter((t: any) => t.status !== 'closed');
        openTasksCount = openTasks.length;
      }

      // Maintenance due soon: same definition as Home Maintenance tracker (90–99% toward due)
      let maintenanceDueSoon = 0;
      const { data: homes } = await supabase
        .from('homes')
        .select('id')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });
      const firstHomeId = homes?.[0]?.id;
      if (firstHomeId) {
        const { data: maintTasks } = await supabase
          .from('user_maintenance_tasks')
          .select('id, last_completed, next_due, frequency_days, progress_percentage')
          .eq('user_id', user.id)
          .eq('home_id', firstHomeId)
          .eq('is_active', true);
        if (maintTasks?.length) {
          maintenanceDueSoon = countDueSoon(maintTasks);
        }
      }

      setStats(prev => ({
        ...prev,
        openTasks: openTasksCount,
        maintenanceDueSoon,
      }));
    })();
  }, [user?.id]);

  // Semantic color system for app icons
  const appColors = {
    // Projects & Planning (Blue shades)
    rapidPlan: 'bg-info text-info-foreground',
    projectCatalog: 'bg-info text-info-foreground',
    // Home & Maintenance (Green shades)
    homeMaintenance: 'bg-success text-success-foreground',
    homeTaskList: 'bg-success text-success-foreground',
    myHomes: 'bg-success text-success-foreground',
    riskFocus: 'bg-success text-success-foreground',
    // Tools & Resources (Orange/Amber shades)
    toolLibrary: 'bg-warning-soft text-warning-soft-foreground',
    toolAccess: 'bg-warning-soft text-warning-soft-foreground',
    // Help & Learning (Purple shades)
    expertHelp: 'bg-category-3 text-category-3-foreground',
    community: 'bg-category-3 text-category-3-foreground',
    // Profile & Settings (Gray shades)
    myProfile: 'bg-muted-foreground text-background',
    // Beta/Experimental (Indigo/Pink)
    contractorFinder: 'bg-category-1 text-category-1-foreground',
    aiRepair: 'bg-category-5 text-category-5-foreground',
    codePermits: 'bg-category-1 text-category-1-foreground'
  };
  useEffect(() => {
    const handleOpenQuiz = () => {
      setIsDIYStyleQuizOpen(true);
    };
    const handleOpenAIRepair = () => {
      if (!aiRepairEnabled) return;
      setIsAIRepairOpen(true);
    };
    window.addEventListener('open-diy-quiz', handleOpenQuiz);
    window.addEventListener('show-ai-repair', handleOpenAIRepair);
    return () => {
      window.removeEventListener('open-diy-quiz', handleOpenQuiz);
      window.removeEventListener('show-ai-repair', handleOpenAIRepair);
    };
  }, [aiRepairEnabled]);
  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return <div className="min-h-screen">
      {user ?
    // Logged-in user sees the DIY Dashboard
    <div className="container mx-auto px-6 py-8 space-y-6">
          {/* Trial Banner */}
          <TrialBanner />
          
          {/* DIY Dashboard */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">My Workshop</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Continue where you left off, or start something new
            </p>
            
            {/* Your work at a glance */}
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-4 sm:px-4 mb-5 max-w-4xl mx-auto">
              <h3 className="text-xs tracking-wide font-semibold text-muted-foreground mb-3 text-center uppercase">
                Your work at a glance
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('force-project-dashboard-listing'))}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[hsl(222_47%_20%/0.95)] via-[hsl(222_47%_17%)] to-[hsl(222_47%_15%)] px-1.5 py-1.5 md:px-2 md:py-2 shadow-sm cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-soft/50"
                      >
                        <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-warning-soft/30 to-transparent pointer-events-none" />
                        <div className="relative flex h-full flex-col items-center gap-0.5 text-center">
                          <span className="flex min-h-[1.25rem] items-center justify-center text-[11px] uppercase tracking-wide text-white md:whitespace-nowrap">
                            Active projects
                          </span>
                          <span className="mt-auto text-2xl md:text-[1.7rem] font-semibold leading-none text-white">
                            {stats.activeProjects ?? 0}
                          </span>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                      <p>Open projects currently in progress</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('show-home-task-list'))}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[hsl(161_55%_22%/0.95)] via-[hsl(161_55%_18%)] to-[hsl(161_55%_16%)] px-1.5 py-1.5 md:px-2 md:py-2 shadow-sm cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50"
                      >
                        <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-success/30 to-transparent pointer-events-none" />
                        <div className="relative flex h-full flex-col items-center gap-0.5 text-center">
                          <span className="flex min-h-[1.25rem] items-center justify-center text-[11px] uppercase tracking-wide text-white md:whitespace-nowrap">
                            Open tasks
                          </span>
                          <span className="mt-auto text-2xl md:text-[1.7rem] font-semibold leading-none text-white">
                            {stats.openTasks ?? 0}
                          </span>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                      <p>See tasks still waiting to get done</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('show-home-maintenance'))}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[hsl(201_70%_24%/0.95)] via-[hsl(201_70%_20%)] to-[hsl(201_70%_17%)] px-1.5 py-1.5 md:px-2 md:py-2 shadow-sm cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50"
                      >
                        <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-info/30 to-transparent pointer-events-none" />
                        <div className="relative flex h-full flex-col items-center gap-0.5 text-center">
                          <span className="flex min-h-[1.25rem] items-center justify-center text-[11px] uppercase tracking-wide text-white md:whitespace-nowrap">
                            Maintenance due soon
                          </span>
                          <span className="mt-auto text-2xl md:text-[1.7rem] font-semibold leading-none text-white">
                            {stats.maintenanceDueSoon ?? 0}
                          </span>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                      <p>Number of maintenance tasks nearly due</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('force-project-dashboard-listing'))}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[hsl(263_50%_26%/0.95)] via-[hsl(263_50%_22%)] to-[hsl(263_50%_18%)] px-1.5 py-1.5 md:px-2 md:py-2 shadow-sm cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-category-3/50"
                      >
                        <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-category-3/30 to-transparent pointer-events-none" />
                        <div className="relative flex h-full flex-col items-center gap-0.5 text-center">
                          <span className="flex min-h-[1.25rem] items-center justify-center text-[11px] uppercase tracking-wide text-white md:whitespace-nowrap">
                            Projects completed
                          </span>
                          <span className="mt-auto text-2xl md:text-[1.7rem] font-semibold leading-none text-white">
                            {stats.completedProjects ?? 0}
                          </span>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                      <p>Projects you've finished</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Start Here */}
            <h3 className="text-sm font-semibold text-foreground mb-3 max-w-xl mx-auto px-2 md:hidden">Start Here</h3>
            <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm sm:max-w-xl md:max-w-2xl mx-auto mb-6 px-2">
              {projectCatalogEnabled && (
              <div className="col-span-3 mb-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => { navigate('/projects'); }} variant="default" className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold border border-[#5c0000] bg-[#800000] text-white shadow-card hover:bg-[#6d0000] hover:text-white hover:shadow-elegant">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2.5 shrink-0" />
                      Explore New Projects
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-center">
                    <p>Browse DIY projects to start next</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-maintenance'))}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeMaintenance} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <HomeIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight px-1">Home Maintenance</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>Stay on top of home upkeep</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-task-list'))}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeTaskList} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <ListChecks className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight px-1">Project & Task Manager</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>Organize tasks and link them to projects</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-risk-focus-launcher'))}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.riskFocus} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <Crosshair className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight px-1">Risk Radar</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>Plan and track risks for a project</p>
                </TooltipContent>
              </Tooltip>
            </div>
            </TooltipProvider>

            {/* Setup Workshop — single entry to Profile, Homes, Tools */}
            <div className="mb-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="setup-workshop" className="border rounded-xl shadow-sm max-w-md mx-auto">
                  <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">Setup Workshop</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="divide-y divide-border">
                      <div
                        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}
                      >
                        <div className={`w-10 h-10 ${appColors.myProfile} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">My Profile</h3>
                          <p className="text-[10px] text-muted-foreground">Account details and preferences</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div
                        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('show-home-manager'))}
                      >
                        <div className={`w-10 h-10 ${appColors.myHomes} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">My Homes</h3>
                          <p className="text-[10px] text-muted-foreground">Properties linked to your workshop</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div
                        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))}
                      >
                        <div className={`w-10 h-10 ${appColors.toolLibrary} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Wrench className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">My Tools</h3>
                          <p className="text-[10px] text-muted-foreground">Your tool library</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {workshopLabsAccordionEnabled && (
            <div className="mb-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="labs" className="border rounded-xl shadow-sm max-w-md mx-auto">
                  <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">🧪 Labs</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="divide-y divide-border">
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-community-posts'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">Community</h3>
                          <p className="text-[10px] text-muted-foreground">Connect with other DIYers</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-tool-rentals'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Hammer className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">Tool Rental</h3>
                          <p className="text-[10px] text-muted-foreground">Find and rent tools nearby</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      {aiRepairEnabled && (
                        <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-ai-repair'))}>
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Camera className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-xs text-card-foreground">AI Repair</h3>
                            <p className="text-[10px] text-muted-foreground">Diagnose issues with AI</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsCodePermitsOpen(true)}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs text-card-foreground">Code & Compliance</h3>
                          <p className="text-[10px] text-muted-foreground">Building codes and permits</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            )}

          <footer className="text-center py-6 mt-4">
            <p className="text-[10px] text-muted-foreground">Project Partner - 2026</p>
          </footer>
         </div>
       </div> :
    publicSettingsLoading ? (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
    </div>
    ) : simplifiedPublicLanding && !showFullMarketingLanding ? (
    <div className="min-h-screen bg-background">
      <PreSignInNavigation />
      <SimplifiedLandingHero onLearnMore={() => setShowFullMarketingLanding(true)} />
    </div>
    ) : (
    <div className="min-h-screen bg-background">
      <PreSignInNavigation />

      <HeroSection onOpenDemo={() => setIsKCExplainerOpen(true)} onScrollToSection={handleScrollToSection} />

      <ValuePropSection />

      <StatisticsBar />

      <HowItWorksSection onOpenDemo={() => setIsKCExplainerOpen(true)} />

      <PersonasSection />

      <section className="py-8 px-4 text-center">
        <Button
          type="button"
          onClick={() => setIsFounderDialogOpen(true)}
          size="lg"
          className="h-14 px-10 text-base sm:text-lg font-semibold rounded-full shadow-md hover:shadow-lg transition-shadow bg-primary text-primary-foreground"
        >
          See Our Story
        </Button>
      </section>

      <PricingSection />

      <FAQSection />

      <FinalCTASection />
    </div>
    )}

      {/* Modals */}
      <PricingWindow open={isPricingOpen} onOpenChange={open => setIsPricingOpen(open)} />
      
      <DIYStyleQuiz open={isDIYStyleQuizOpen} onOpenChange={open => setIsDIYStyleQuizOpen(open)} />

      {aiRepairEnabled && (
        <AIRepairWindow open={isAIRepairOpen} onOpenChange={open => setIsAIRepairOpen(open)} />
      )}

      <CodePermitsWindow open={isCodePermitsOpen} onOpenChange={setIsCodePermitsOpen} />
      
      <ContractorFinderWindow open={isContractorFinderOpen} onOpenChange={setIsContractorFinderOpen} />
      
      <KeyCharacteristicsExplainer open={isKCExplainerOpen} onOpenChange={setIsKCExplainerOpen} />

      <FounderInfoDialog open={isFounderDialogOpen} onOpenChange={setIsFounderDialogOpen} />
    </div>;
}