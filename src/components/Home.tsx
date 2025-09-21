import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PricingWindow } from '@/components/PricingWindow';
import DIYSurveyPopup from '@/components/DIYSurveyPopup';
import { AIRepairWindow } from '@/components/AIRepairWindow';
import { CodePermitsWindow } from '@/components/CodePermitsWindow';
import { ContractorFinderWindow } from '@/components/ContractorFinderWindow';
import { ArrowRight, Home as HomeIcon, Wrench, BookOpen, Calendar, ShoppingCart, Hammer, MapPin, CheckCircle, Star, Target, Zap, Shield, User, Users, Folder, Calculator, HelpCircle, Camera, Building2 } from 'lucide-react';
interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}
const coreFeatures = [{
  icon: Target,
  title: "Personalized Project Management",
  description: "DIY + Home Profile and Project Templates for 100+ Home Improvement Projects = First-time Success.",
  features: ["Home profile tracking & maintenance scheduler", "100+ proven project templates", "Personalized recommendations based on your skills & tools", "Step-by-step guidance from planning to completion"]
}, {
  icon: Star,
  title: "Virtual Expert Platform",
  description: "While our online resources cover a lot - nothing replaces human face-to-face consults with an expert. The ultimate personalization is not AI, it's Human.",
  features: ["One-on-one video consultations with DIY experts", "Real-time problem solving and guidance", "Project-specific expert recommendations", "Human expertise when you need it most"]
}, {
  icon: Hammer,
  title: "Tool Rental Platform",
  description: "If you're in Boston, MA - a fast, accurate, seamless tool rental process through Toolio Rentals. For all other areas, a tool rental search that helps find the best local options.",
  features: ["Boston: Direct rental through Toolio Rentals", "Nationwide: Smart tool rental finder", "Project-based tool recommendations", "Never buy tools you'll only use once"]
}];
export default function Home({
  onViewChange
}: HomeProps) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDIYQuizOpen, setIsDIYQuizOpen] = useState(false);
  const [isAIRepairOpen, setIsAIRepairOpen] = useState(false);
  const [isCodePermitsOpen, setIsCodePermitsOpen] = useState(false);
  const [isContractorFinderOpen, setIsContractorFinderOpen] = useState(false);

  // Sophisticated darker color palette for app icons
  const colorPalette = ['bg-blue-700', 'bg-indigo-700', 'bg-purple-700', 'bg-violet-700', 'bg-emerald-700', 'bg-teal-700', 'bg-cyan-700', 'bg-sky-700', 'bg-orange-700', 'bg-amber-700', 'bg-red-700', 'bg-rose-700', 'bg-pink-700', 'bg-fuchsia-700', 'bg-lime-700', 'bg-green-700'];

  // Function to get random color from palette
  const getRandomColor = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  // Generate random colors for each app (keeping consistent during component lifecycle)
  const [appColors] = useState(() => ({
    myProjects: getRandomColor(),
    rapidPlan: getRandomColor(),
    homeMaintenance: getRandomColor(),
    toolLibrary: getRandomColor(),
    toolAccess: getRandomColor(),
    projectCatalog: getRandomColor(),
    expertHelp: getRandomColor(),
    myProfile: getRandomColor(),
    community: getRandomColor(),
    myHomes: getRandomColor(),
    aiRepair: getRandomColor(),
    codePermits: getRandomColor(),
    contractorFinder: getRandomColor()
  }));
  useEffect(() => {
    const handleOpenQuiz = () => {
      setIsDIYQuizOpen(true);
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
            <h1 className="text-4xl font-bold text-foreground mb-4">Your DIY Homepage</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Your DIY journey continues here. Pick up where you left off or start your next winning project.
            </p>
            
            {/* Stats */}
            <div className="border-t border-border pt-6 mb-6">
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <span className="text-muted-foreground">Active Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-muted-foreground font-bold text-sm">0</span>
                  </div>
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <span className="text-muted-foreground">Hours Saved</span>
                </div>
              </div>
            </div>
            <div className="border-b border-border pb-6 mb-8"></div>
            
            {/* Apps Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto mb-8 px-2">
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
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-rapid-assessment'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.rapidPlan} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Rapid Plan</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-maintenance'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.homeMaintenance} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <HomeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Home Maintenance</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-tools-materials-editor'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.toolLibrary} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Tool Library</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-tool-rentals'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.toolAccess} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Hammer className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Tool Access</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => navigate('/projects')}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.projectCatalog} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Project Catalog</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-help-popup'))}>
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
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-community-posts'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.community} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Community</span>
              </div>
              
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('show-home-manager'))}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.myHomes} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                  <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">My Homes</span>
              </div>

              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setIsAIRepairOpen(true)}>
                <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.aiRepair} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white">
                    BETA
                  </Badge>
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">AI Repair</span>
              </div>

              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setIsCodePermitsOpen(true)}>
                <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.codePermits} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                    <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white">
                    BETA
                  </Badge>
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Code & Permits</span>
              </div>

              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setIsContractorFinderOpen(true)}>
                <div className="relative">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${appColors.contractorFinder} rounded-2xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-lg`}>
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full border-2 border-white">
                    BETA
                  </Badge>
                </div>
                <span className="text-xs font-medium text-black text-center leading-tight px-1">Contractor Finder</span>
              </div>
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
              
              
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">DIY, Delivered</h1>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">Everything You Need in One Place</h2>
              
              <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">Your all‑in‑one app for projects, tools, and expert backup—delivering the right gear and guidance exactly when you need it.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button variant="secondary" size="lg" className="px-6 md:px-8 text-base md:text-lg bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0 shadow-elegant" asChild>
                  <Link to="/projects">
                    {user ? "View Projects" : "Explore Projects"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" className="px-6 md:px-8 text-base md:text-lg bg-accent text-accent-foreground hover:bg-accent-light border-0 shadow-accent" onClick={() => navigate('/auth?mode=signup')}>
                  <Star className="mr-2 h-4 w-4" />
                  Start Your Free Account
                </Button>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center">
              <img src="/lovable-uploads/ced88968-ca61-4fed-bee4-d2ea417c247c.png" alt="DIY Project Partner Platform" className="w-full max-w-md h-auto rounded-lg shadow-lg" style={{
                transform: 'scale(1.15)'
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Three Core Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary">🎯 DIY Apps</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Everything You Need in One Place
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Access all your home management tools with beautiful, intuitive apps designed for homeowners.
            </p>
            
            {/* App List */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-12">
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Folder className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">My Projects</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors">
                <Calculator className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Rapid Plan</span>
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
                <Hammer className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium text-center">Tool Access</span>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
                  <ul className="space-y-3">
                    {feature.features.map((item, itemIndex) => <li key={itemIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm lg:text-base text-muted-foreground">{item}</span>
                      </li>)}
                  </ul>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Home Management?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners who've discovered the power of having everything they need in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="px-8 py-4 text-lg font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-0 shadow-elegant" asChild>
              <Link to="/auth?mode=signup">
                Start Your Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" className="px-8 py-4 text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent-light border-0 shadow-accent" onClick={() => navigate('/projects')}>
              Explore Project Templates
            </Button>
          </div>
        </div>
      </section>
      </>}

      {/* Modals */}
      <PricingWindow open={isPricingOpen} onOpenChange={open => setIsPricingOpen(open)} />
      
      <DIYSurveyPopup open={isDIYQuizOpen} onOpenChange={open => setIsDIYQuizOpen(open)} />

      <AIRepairWindow open={isAIRepairOpen} onOpenChange={open => setIsAIRepairOpen(open)} />

      <CodePermitsWindow open={isCodePermitsOpen} onOpenChange={setIsCodePermitsOpen} />
      
      <ContractorFinderWindow open={isContractorFinderOpen} onOpenChange={setIsContractorFinderOpen} />
    </div>;
}