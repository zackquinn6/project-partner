import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { PricingWindow } from '@/components/PricingWindow';
import DIYStyleQuiz from '@/components/DIYStyleQuiz';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { KeyCharacteristicsExplainer } from '@/components/KeyCharacteristicsExplainer';
import { ArrowRight, Home as HomeIcon, Wrench, BookOpen, Calendar, ShoppingCart, Hammer, MapPin, CheckCircle, Star, Target, Zap, Shield, User, Users, Folder, Calculator, HelpCircle, Camera, Building2, ListChecks } from 'lucide-react';
import heroDIYPerson from '@/assets/hero-diy-person.png';
import { HeroSection } from './landing/HeroSection';
import { StatisticsBar } from './landing/StatisticsBar';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { PersonasSection } from './landing/PersonasSection';
import { PricingSection } from './landing/PricingSection';
import { FAQSection } from './landing/FAQSection';
import { FinalCTASection } from './landing/FinalCTASection';
import { Footer } from './landing/Footer';
import { PreSignInNavigation } from '@/components/PreSignInNavigation';
import { TrialBanner } from '@/components/TrialBanner';
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
    projectRuns
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
    completedProjects: 0
  });

  // Calculate stats from context data instead of fetching separately
  useEffect(() => {
    if (projectRuns) {
      const active = projectRuns.filter(run => (run.progress || 0) < 100).length;
      const completed = projectRuns.filter(run => (run.progress || 0) >= 100).length;
      setStats({
        activeProjects: active,
        completedProjects: completed
      });
    }
  }, [projectRuns]);

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
            
            {/* At a Glance Stats */}
            <div className="border-t border-border pt-1 mb-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">At a Glance</h3>
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-base font-bold text-foreground">{stats.activeProjects || 0}</div>
                  <div className="text-xs text-muted-foreground">active projects</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-foreground">{stats.completedProjects || 0}</div>
                  <div className="text-xs text-muted-foreground">completed projects</div>
                </div>
              </div>
            </div>
            <div className="border-b border-border pb-1 mb-6"></div>
            
            {/* Core Apps Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-6 px-2">
              {/* Project Catalog - Reduced Prominence */}
              <div className="col-span-3 mb-2">
                <Button onClick={() => navigate('/projects')} variant="outline" className="w-full h-10 text-sm font-medium border-primary text-primary hover:bg-primary/10">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Explore New Projects
                </Button>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => {
            navigate('/', {
              replace: true,
              state: {
                view: 'user',
                resetToListing: true
              }
            });
          }}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.myProjects} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Folder className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Progress Board</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-maintenance'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeMaintenance} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <HomeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Home Maintenance</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-task-list'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeTaskList} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <ListChecks className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Task Manager</span>
              </div>
              
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
         </div>
       </div> :
    // Non-logged-in users see the new modern landing page
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PreSignInNavigation />
      
      {/* Hero Section */}
      <HeroSection onOpenDemo={() => setIsKCExplainerOpen(true)} />

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

      {/* Footer */}
      <Footer onPricingClick={() => setIsPricingOpen(true)} />
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