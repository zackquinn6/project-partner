import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PricingWindow } from '@/components/PricingWindow';
import DIYSurveyPopup from '@/components/DIYSurveyPopup';
import { 
  ArrowRight,
  Home as HomeIcon, 
  Wrench, 
  BookOpen,
  Calendar,
  ShoppingCart,
  Hammer,
  MapPin,
  CheckCircle,
  Star,
  Target,
  Zap,
  Shield
} from 'lucide-react';

interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}

const coreApps = [
  {
    icon: HomeIcon,
    title: "Home Tracking",
    description: "Keep detailed records of your home's systems, warranties, and maintenance history."
  },
  {
    icon: Calendar,
    title: "Maintenance Tracker", 
    description: "Never miss important home maintenance tasks with intelligent scheduling and reminders."
  },
  {
    icon: Wrench,
    title: "Tool Library",
    description: "Catalog your tools, track what you need, and manage your DIY arsenal like a pro."
  },
  {
    icon: Target,
    title: "Project Tracker",
    description: "Follow detailed project workflows from planning to completion with step-by-step guidance."
  },
  {
    icon: Star,
    title: "Personalized Project System",
    description: "AI-powered project recommendations tailored to your skills, tools, and home needs."
  },
  {
    icon: BookOpen,
    title: "Pre-built Project Templates",
    description: "Access hundreds of proven project templates for common home improvement tasks."
  },
  {
    icon: ShoppingCart,
    title: "Tool & Material Shopper",
    description: "Get exact shopping lists and find the best deals on everything you need."
  },
  {
    icon: Hammer,
    title: "Project-Based Tool Rentals",
    description: "Rent specialized tools only when you need them. Available in Boston, MA."
  }
];

const valueProps = [
  {
    icon: Zap,
    title: "Save Time & Money",
    description: "Stop making multiple store trips and buying the wrong materials. Our planning system gets it right the first time."
  },
  {
    icon: Shield,
    title: "Reduce Risk",
    description: "Avoid costly mistakes with detailed planning, safety guidelines, and expert-reviewed project workflows."
  },
  {
    icon: CheckCircle,
    title: "Guaranteed Success",
    description: "Our systematic approach ensures every project gets completed to professional standards."
  }
];

export default function Home({ onViewChange }: HomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDIYQuizOpen, setIsDIYQuizOpen] = useState(false);

  useEffect(() => {
    const handleOpenQuiz = () => {
      setIsDIYQuizOpen(true);
    };

    window.addEventListener('open-diy-quiz', handleOpenQuiz);
    return () => window.removeEventListener('open-diy-quiz', handleOpenQuiz);
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero pt-20 pb-16 md:pt-24 md:pb-24">
        {/* Fixed header navigation bar */}
        <nav className="fixed top-0 left-0 right-0 bg-primary/95 backdrop-blur-md z-50 border-b border-primary-foreground/10 shadow-elegant">
          <div className="container mx-auto px-4 flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
                alt="Project Partner Logo" 
                className="h-12 w-auto"
              />
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast"
                onClick={() => handleScrollToSection('core-apps')}
              >
                Features
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast"
                onClick={() => setIsPricingOpen(true)}
              >
                Pricing
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-xs sm:text-sm px-2 sm:px-3 transition-fast"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button 
                variant="accent"
                size="sm"
                className="ml-1 text-xs sm:text-sm px-2 sm:px-3"
                onClick={() => navigate('/auth?mode=signup')}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </nav>

        <div className="relative container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge variant="outline" className="mb-6 text-primary-foreground border-primary-foreground/20 bg-primary-foreground/10">
                🏠 The Ultimate DIY Platform
              </Badge>
              
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
                Your One-Stop Shop for DIY Success
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">
                The Homeowners App: Everything you need to manage your home - including maintenance, projects, tools, and more.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button variant="premium" size="lg" className="px-6 md:px-8 text-base md:text-lg" asChild>
                  <Link to="/projects">
                    {user ? "View Projects" : "Explore Projects"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="px-6 md:px-8 text-base md:text-lg"
                  onClick={() => navigate('/auth?mode=signup')}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Get Started Free
                </Button>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center">
              <img 
                src="/lovable-uploads/ced88968-ca61-4fed-bee4-d2ea417c247c.png" 
                alt="DIY Project Partner Platform" 
                className="w-full max-w-md h-auto rounded-lg shadow-lg"
                style={{ transform: 'scale(1.15)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-gradient-to-br from-secondary via-secondary to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Why Choose Project Partner?
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Stop juggling multiple apps, websites, and tools. We've built the complete DIY ecosystem in one integrated platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, index) => (
              <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <prop.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{prop.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base leading-relaxed">
                    {prop.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Apps */}
      <section id="core-apps" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              🛠️ Complete Toolkit
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Eight Core Apps, One Seamless Experience
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Each app is designed to work together, creating a comprehensive DIY management system that grows with your skills and projects.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreApps.map((app, index) => (
              <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer hover:scale-105">
                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                    <app.icon className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-lg">{app.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-sm leading-relaxed">
                    {app.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Special Feature Callout */}
      <section className="py-16 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary mr-2" />
              <Badge variant="outline" className="text-primary border-primary">
                Boston Area Exclusive
              </Badge>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Project-Based Tool Rentals
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Need a specialized tool for just one project? Our Boston-area tool rental service delivers exactly what you need, when you need it. No more buying expensive tools you'll only use once.
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth?mode=signup')}>
              Learn More About Tool Rentals
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your DIY Experience?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of DIYers who've discovered the power of having everything they need in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="premium" size="lg" className="px-8 py-4 text-lg font-semibold" asChild>
              <Link to="/auth?mode=signup">
                Start Your Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              variant="accent" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold"
              onClick={() => navigate('/projects')}
            >
              Browse Project Templates
            </Button>
          </div>
        </div>
      </section>

      {/* Modals */}
      <PricingWindow 
        open={isPricingOpen}
        onOpenChange={(open) => setIsPricingOpen(open)}
      />
      
      <DIYSurveyPopup 
        open={isDIYQuizOpen}
        onOpenChange={(open) => setIsDIYQuizOpen(open)}
      />
    </div>
  );
}