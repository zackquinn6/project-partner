import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { ArrowRight, Home as HomeIcon, Wrench, BookOpen, Calendar, ShoppingCart, Hammer, MapPin, CheckCircle, Star, Target, Zap, Shield, User, Users, Folder, Calculator, HelpCircle, Camera, Building2, ListChecks } from 'lucide-react';
import heroDIYPerson from '@/assets/hero-diy-person.png';
import { HeroSection } from './landing/HeroSection';
import { ValuePropSection } from './landing/ValuePropSection';
import { StatisticsBar } from './landing/StatisticsBar';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { PersonasSection } from './landing/PersonasSection';
import { PricingSection } from './landing/PricingSection';
import { FAQSection } from './landing/FAQSection';
import { FinalCTASection } from './landing/FinalCTASection';
import { PreSignInNavigation } from '@/components/PreSignInNavigation';
import { TrialBanner } from '@/components/TrialBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDIYStyleQuizOpen, setIsDIYStyleQuizOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isCodePermitsOpen, setIsCodePermitsOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);
  const [isKCExplainerOpen, setIsKCExplainerOpen] = useState(false);
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
        completedProjects: completed
      }));
    }
  }, [projectRuns]);

  useEffect(() => {
    if (!user?.id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonEnd = new Date(today);
    soonEnd.setDate(soonEnd.getDate() + 30);
    const soonEndIso = soonEnd.toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);

    (async () => {
      const { data: homeTasks, error: homeTasksError } = await supabase
        .from('home_tasks')
        .select('id, status, project_run_id')
        .eq('user_id', user.id);

      if (homeTasksError) {
        console.error('Error loading home_tasks for dashboard stats', homeTasksError);
      }

      let openTasksCount = 0;
      let activeProjectsFromTasks = 0;

      if (homeTasks && Array.isArray(homeTasks)) {
        const openTasks = homeTasks.filter((t: any) => t.status !== 'closed');
        openTasksCount = openTasks.length;
        const projectIds = new Set<string>();
        openTasks.forEach((t: any) => {
          if (t.project_run_id) {
            projectIds.add(t.project_run_id);
          }
        });
        activeProjectsFromTasks = projectIds.size;
      }

      const { count: maintCount } = await supabase
        .from('user_maintenance_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('next_due', todayIso)
        .lte('next_due', soonEndIso);
      setStats(prev => ({
        ...prev,
        openTasks: openTasksCount,
        activeProjects: activeProjectsFromTasks,
        maintenanceDueSoon: maintCount ?? 0
      }));
    })();
  }, [user?.id]);

  // Semantic color system for app icons
  const appColors = {
    // Projects & Planning (Blue shades)
    myProjects: 'bg-blue-600',
    rapidPlan: 'bg-blue-500',
    projectCatalog: 'bg-blue-700',
    // Home & Maintenance (Green shades)
    homeMaintenance: 'bg-green-600',
    homeTaskList: 'bg-green-500',
    myHomes: 'bg-green-700',
    // Tools & Resources (Orange/Amber shades)
    toolLibrary: 'bg-orange-600',
    toolAccess: 'bg-orange-500',
    // Help & Learning (Purple shades)
    expertHelp: 'bg-purple-600',
    community: 'bg-purple-500',
    // Profile & Settings (Gray shades)
    myProfile: 'bg-slate-600',
    // Beta/Experimental (Indigo/Pink)
    contractorFinder: 'bg-indigo-600',
    aiRepair: 'bg-pink-600',
    codePermits: 'bg-indigo-500'
  };
  useEffect(() => {
    const handleOpenQuiz = () => {
      setIsDIYStyleQuizOpen(true);
    };
    const handleOpenAIRepair = () => {
      setIsAIRepairOpen(true);
    };
    window.addEventListener('open-diy-quiz', handleOpenQuiz);
    window.addEventListener('show-ai-repair', handleOpenAIRepair);
    return () => {
      window.removeEventListener('open-diy-quiz', handleOpenQuiz);
      window.removeEventListener('show-ai-repair', handleOpenAIRepair);
    };
  }, []);
  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
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
            <div className="border-t border-border/60 pt-4 pb-4 mb-5">
              <h3 className="text-xs tracking-wide font-semibold text-muted-foreground mb-3 text-center uppercase">
                Your work at a glance
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-900/90 px-2.5 py-2 md:px-3 md:py-2.5 shadow-sm min-h-[84px]">
                  <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-amber-500/30 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col items-center gap-1 text-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] uppercase tracking-wide text-amber-300/80 cursor-default">
                            Active projects
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                          <p>Unique projects that currently have at least one open task linked to them.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-2xl md:text-[1.7rem] font-semibold leading-none text-amber-50">
                      {stats.activeProjects ?? 0}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-emerald-900/80 via-emerald-900 to-emerald-900/90 px-2.5 py-2 md:px-3 md:py-2.5 shadow-sm min-h-[84px]">
                  <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-emerald-500/30 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col items-center gap-1 text-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] uppercase tracking-wide text-emerald-200/80 cursor-default">
                            Open tasks
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                          <p>All tasks in Task Manager that are not marked complete.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-2xl md:text-[1.7rem] font-semibold leading-none text-emerald-50">
                      {stats.openTasks ?? 0}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-sky-900/80 via-sky-900 to-sky-900/90 px-2.5 py-2 md:px-3 md:py-2.5 shadow-sm min-h-[84px]">
                  <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-sky-500/30 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col items-center gap-1 text-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] uppercase tracking-wide text-sky-200/80 cursor-default">
                            Maintenance due soon
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                          <p>Active home maintenance tasks with a due date in the next 30 days.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-2xl md:text-[1.7rem] font-semibold leading-none text-sky-50">
                      {stats.maintenanceDueSoon ?? 0}
                    </span>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-violet-900/80 via-violet-900 to-violet-900/90 px-2.5 py-2 md:px-3 md:py-2.5 shadow-sm min-h-[84px]">
                  <div className="absolute inset-x-0 -top-6 h-12 bg-gradient-to-b from-violet-500/30 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col items-center gap-1 text-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[11px] uppercase tracking-wide text-violet-200/80 cursor-default">
                            Projects completed
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                          <p>Project runs in your workshop that are finished (100% complete).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-2xl md:text-[1.7rem] font-semibold leading-none text-violet-50">
                      {stats.completedProjects ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Start Here */}
            <h3 className="text-sm font-semibold text-foreground mb-3 max-w-xl mx-auto px-2 md:hidden">Start Here</h3>
            <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-6 px-2">
              <div className="col-span-3 mb-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => { console.log('Navigating to project catalog'); navigate('/projects'); }} variant="outline" className="w-full h-10 text-sm font-medium border-primary bg-slate-600 hover:bg-slate-500 text-slate-50">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Explore New Projects
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">Beta</Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-center">
                    <p>Project catalog for detailed multi-step projects like painting, tile, or carpentry.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => { setCurrentProjectRun(null); window.dispatchEvent(new CustomEvent('force-project-dashboard-listing')); navigate('/', { state: { view: 'user' }, replace: true }); onViewChange('user'); }}>
                    <div className="relative">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.myProjects} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                        <Folder className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 rounded-full border-2 border-background bg-amber-500 px-1.5 py-0 text-[9px] font-semibold text-white shadow-sm" aria-hidden>Beta</span>
                    </div>
                    <span className="text-xs font-medium text-black text-center leading-tight px-1">Project Dashboard</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>A view of active projects.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-maintenance'))}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeMaintenance} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <HomeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <span className="text-xs font-medium text-black text-center leading-tight px-1">Home Maintenance</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>Track ongoing maintenance tasks for homes.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-task-list'))}>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeTaskList} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                      <ListChecks className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <span className="text-xs font-medium text-black text-center leading-tight px-1">Task Manager</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-center">
                  <p>A lightweight home improvement task tracker, with ability to link to projects. Best for managing a portfolio of projects, like renovations.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            </TooltipProvider>

            {/* Browse Tools */}
            <h3 className="text-sm font-semibold text-foreground mb-3 max-w-xl mx-auto px-2 md:hidden">Browse Tools</h3>
            <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-6 px-2">
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-profile-manager'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.myProfile} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">My Profile</span>
              </div>
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-manager'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.myHomes} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">My Homes</span>
              </div>
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-tools-library-grid'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.toolLibrary} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">My Tools</span>
              </div>
            </div>
            </TooltipProvider>

            {/* Labs - Experimental Features - Collapsed by default */}
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
                          <h3 className="font-medium text-xs text-card-foreground">Tool Access</h3>
                          <p className="text-[10px] text-muted-foreground">Find and rent tools nearby</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
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

          <footer className="text-center py-6 mt-4">
            <p className="text-[10px] text-muted-foreground">Project Partner - 2026</p>
          </footer>
         </div>
       </div> :
    // Non-logged-in users see the new modern landing page
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PreSignInNavigation />
      
      {/* Hero Section */}
      <HeroSection onOpenDemo={() => setIsKCExplainerOpen(true)} />

      {/* Value Prop Section */}
      <ValuePropSection />

      {/* Statistics Bar */}
      <StatisticsBar />

      {/* How It Works Section */}
      <HowItWorksSection onOpenDemo={() => setIsKCExplainerOpen(true)} />

      {/* Features Section */}
      <FeaturesSection />

      {/* Personas Section */}
      <PersonasSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <FinalCTASection />
    </div>}

      {/* Modals */}
      <PricingWindow open={isPricingOpen} onOpenChange={open => setIsPricingOpen(open)} />
      
      <DIYStyleQuiz open={isDIYStyleQuizOpen} onOpenChange={open => setIsDIYStyleQuizOpen(open)} />

      <AIRepairWindow open={isAIRepairOpen} onOpenChange={open => setIsAIRepairOpen(open)} />

      <CodePermitsWindow open={isCodePermitsOpen} onOpenChange={setIsCodePermitsOpen} />
      
      <ContractorFinderWindow open={isContractorFinderOpen} onOpenChange={setIsContractorFinderOpen} />
      
      <KeyCharacteristicsExplainer open={isKCExplainerOpen} onOpenChange={setIsKCExplainerOpen} />
    </div>;
}