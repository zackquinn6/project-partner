import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    codePermits: 'bg-indigo-500',
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
          {/* DIY Dashboard */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">My Workshop</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Continue where you left off, or start something new
            </p>
            
            {/* At a Glance Stats */}
            <div className="border-t border-border pt-1 mb-1">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">At a Glance</h3>
              <div className="flex justify-center gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-base font-bold text-foreground">{stats.activeProjects || 0}</div>
                  <div className="text-xs text-muted-foreground">active</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-foreground">{stats.completedProjects || 0}</div>
                  <div className="text-xs text-muted-foreground">completed</div>
                </div>
              </div>
            </div>
            <div className="border-b border-border pb-1 mb-6"></div>
            
            {/* Core Apps Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-6 px-2">
              {/* Project Catalog - Reduced Prominence */}
              <div className="col-span-3 mb-2">
                <Button 
                  onClick={() => navigate('/projects')}
                  variant="outline"
                  className="w-full h-10 text-sm font-medium border-primary text-primary hover:bg-primary/10"
                >
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
                <span className="text-xs font-medium text-black text-center leading-tight px-1">My Projects</span>
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
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Home Task List</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-rapid-assessment'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.rapidPlan} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Rapid Costing</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-expert-help'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.expertHelp} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Expert Help</span>
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
                <AccordionItem value="labs" className="border rounded-xl shadow-sm max-w-2xl mx-auto">
                  <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-foreground">🧪 Labs</span>
                      <Badge variant="secondary" className="text-xs">4</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="divide-y divide-border">
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-community-posts'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Community</h3>
                          <p className="text-xs text-muted-foreground">Connect with other DIYers</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-tool-rentals'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Hammer className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Tool Access</h3>
                          <p className="text-xs text-muted-foreground">Find and rent tools nearby</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.dispatchEvent(new CustomEvent('show-ai-repair'))}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Camera className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">AI Repair</h3>
                          <p className="text-xs text-muted-foreground">Diagnose issues with AI</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsCodePermitsOpen(true)}>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-card-foreground">Code & Compliance</h3>
                          <p className="text-xs text-muted-foreground">Building codes and permits</p>
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
    // Non-logged-in users see the marketing homepage
    <>
       {/* Hero Section */}
       <section className="relative overflow-hidden gradient-hero pt-20 pb-16 md:pt-24 md:pb-24">
        {/* Fixed header navigation bar */}
        <nav className="fixed top-0 left-0 right-0 bg-primary/95 backdrop-blur-md z-50 border-b border-primary-foreground/10 shadow-elegant">
          <div className="container mx-auto px-4 flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" alt="Project Partner Logo" className="h-12 w-auto" />
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast" onClick={() => handleScrollToSection('features')}>
                Features
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast" onClick={() => setIsPricingOpen(true)}>
                Pricing
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button variant="accent" size="sm" className="ml-1 text-xs sm:text-sm px-2 sm:px-3" onClick={() => navigate('/auth?mode=signup')}>
                Sign Up
              </Button>
            </div>
          </div>
        </nav>

        <div className="relative container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              
              
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">Personalized DIY Project Playbooks</h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">Run projects with personalized guidance and on-demand human experts.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button variant="secondary" size="lg" className="px-6 md:px-8 text-base md:text-lg bg-orange-500 text-white hover:bg-orange-600 border-0 shadow-elegant" asChild>
                  <Link to="/projects">
                    {user ? "View Projects" : "Explore Projects"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center">
              <img src={heroDIYPerson} alt="DIY Project Partner Platform" className="w-full max-w-sm rounded-lg shadow-lg" style={{
                maxHeight: '400px',
                objectFit: 'cover'
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Three Core Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Do It Yourself, Not Alone</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">A suite of apps to guide you through home improvement projects.
Personalized, success-oriented, and built for real-world usage during a project. </p>
            
            {/* Key Characteristics Section */}
            <div className="bg-gradient-subtle p-6 rounded-lg max-w-4xl mx-auto mb-12">
              <h3 className="text-xl font-semibold text-foreground mb-3">🔑 Personalized Projects Every Step of The Way</h3>
              
              <Button variant="outline" size="default" onClick={() => setIsKCExplainerOpen(true)} className="text-primary border-primary hover:bg-primary/10 mb-4">
                <span className="hidden sm:inline">Learn More About Our Approach to Personalization</span>
                <span className="sm:hidden">Learn More</span>
              </Button>
              
              <div>
                <Button variant="outline" size="default" onClick={() => setIsDIYStyleQuizOpen(true)} className="text-primary border-primary hover:bg-primary/10">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Discover Your DIY Style
                </Button>
              </div>
            </div>
            
            {/* App List */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-12">
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Folder className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">My Projects</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Calculator className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Rapid Costing</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <HomeIcon className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Maintenance</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Wrench className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Tool Library</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Catalog</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <HelpCircle className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Expert Help</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <User className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">My Profile</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Users className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Community</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <MapPin className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">My Homes</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Camera className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">AI Repair</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Building2 className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Permits</span>
              </div>
            </div>
          </div>
          
          <div className="w-full px-4 max-w-4xl mx-auto">
            {coreFeatures.map((feature, index) => <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300 p-8 h-full">
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl lg:text-2xl font-bold mb-4">{feature.title}</CardTitle>
                  <CardDescription className="text-base lg:text-lg leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                    <strong>Your project is not unique - but you are.</strong>
                    <br /><br />
                    Hard lessons of home improvement have been solved by someone- but that doesn't mean you have. Our personalized approach adapts to your speed, learning style, and specific project.
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">Let's Make DIY a Fun and Repeatable Experience</h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">Join the DIYers who've added a partner with them on their next project. </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="px-8 py-4 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent-light border-0 shadow-accent" onClick={() => navigate('/projects')}>
              Explore Project Templates
            </Button>
          </div>
        </div>
      </section>
      </>}

      {/* Modals */}
      <PricingWindow open={isPricingOpen} onOpenChange={open => setIsPricingOpen(open)} />
      
      <DIYStyleQuiz open={isDIYStyleQuizOpen} onOpenChange={open => setIsDIYStyleQuizOpen(open)} />

      <AIRepairWindow open={isAIRepairOpen} onOpenChange={open => setIsAIRepairOpen(open)} />

      <CodePermitsWindow open={isCodePermitsOpen} onOpenChange={setIsCodePermitsOpen} />
      
      <ContractorFinderWindow open={isContractorFinderOpen} onOpenChange={setIsContractorFinderOpen} />
      
      <KeyCharacteristicsExplainer open={isKCExplainerOpen} onOpenChange={setIsKCExplainerOpen} />
    </div>;
}