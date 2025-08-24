import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Wrench, 
  Home as HomeIcon, 
  Star,
  ArrowRight,
  CheckCircle2,
  Play,
  LogIn,
  Trophy,
  MapPin,
  ShieldCheck,
  Zap,
  CheckCircle,
  Eye
} from 'lucide-react';

// Import placeholder images
import generalDiy from "@/assets/general-diy.png";
import interiorPainting from "@/assets/interior-painting-placeholder.jpg";
import landscaping from "@/assets/landscaping-placeholder.jpg";
import lighting from "@/assets/lighting-placeholder.jpg";
import lvpFlooring from "@/assets/lvp-flooring-placeholder.jpg";
import tilBacksplash from "@/assets/tile-backsplash-placeholder.jpg";
import heroWorkflow from "@/assets/hero-workflow.jpg";
import projectPartnerLogo from "@/assets/project-partner-logo.png";
import iphoneMessage from "@/assets/iphone-accountability-message.jpg";
import videoCallContractor from "@/assets/video-call-contractor.jpg";

interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}

const projectImages = [
  { src: interiorPainting, alt: "Interior Painting Project" },
  { src: landscaping, alt: "Landscaping Project" },
  { src: lighting, alt: "Lighting Installation" },
  { src: lvpFlooring, alt: "LVP Flooring Installation" },
  { src: tilBacksplash, alt: "Tile Backsplash Installation" },
  { src: generalDiy, alt: "General DIY Projects" },
];

const features = [
  {
    icon: Target,
    title: "Every Champion Starts with a Gameplan",
    description: "DIY Profile: Understand your skills, tools, and time. Project Profile: Define scope, budget, and risk factors. Step-by-Step Plan: Clear plays to follow, no guesswork."
  },
  {
    icon: Wrench,
    title: "Gear Up and Get It Done",
    description: "The Right Tools: Rent or source exactly what you need. Materials in Hand: No wasted trips to the store. Know-How at Your Fingertips: Clear instructions, pro tips, and safety guidance."
  },
  {
    icon: Trophy,
    title: "Cross the Finish Line Like a Pro",
    description: "Stay Motivated: Progress tracking and quick wins. Overcome Roadblocks: Fast answers and problem-solving. Final Touches: Ensure quality and safety before you call it done."
  }
];

const userTypes = [
  {
    icon: "🐣",
    title: "Newbies",
    description: "Start small, learn the ropes, and build confidence with guided, low risk projects."
  },
  {
    icon: "🚀", 
    title: "Intermediate DIYers",
    description: "Ready for bigger challenges but missing a few tools or tricks? We fill the gaps so you can take on advanced builds with confidence."
  },
  {
    icon: "🏆",
    title: "Advanced DIYers", 
    description: "You've got the skills, but even pros benefit from structured plans, the right gear, and a partner to keep momentum high."
  }
];

const roadblocks = [
  {
    icon: Target,
    title: "Shaky Project Quality",
    description: "No more \"good enough.\" We guide you to pro‑level results you can be proud of."
  },
  {
    icon: Wrench,
    title: "Missing the Right Tools",
    description: "Stop improvising with the wrong gear. We make sure you've got exactly what the job needs."
  },
  {
    icon: MapPin,
    title: "Endless Store Runs",
    description: "Plan once, shop once. We help you get everything in hand before you start."
  },
  {
    icon: ShieldCheck,
    title: "Unwelcome Surprises",
    description: "We can't erase every curveball, but our prep means you'll face far fewer than most DIYers."
  },
  {
    icon: Clock,
    title: "Losing Momentum",
    description: "Stay on track with progress check‑ins, quick wins, and a clear finish line."
  }
];

const howItWorksSteps = [
  {
    step: "1",
    title: "Gameplan",
    description: "We create your DIY and project profiles, then map your step-by-step plan."
  },
  {
    step: "2", 
    title: "Execute",
    description: "Get the right tools, materials, and know-how exactly when you need them."
  },
  {
    step: "3",
    title: "Finish Strong", 
    description: "Stay on track, solve problems fast, and wrap up with confidence."
  }
];

export const Home = () => {
  const { user } = useAuth();
  
  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartGameplan = () => {
    // Navigate to projects page for both logged in and non-logged in users
    window.location.href = '/projects';
  };

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-primary pt-32 pb-20 md:pt-40 md:pb-32">
        {/* Fixed header navigation bar */}
        <nav className="fixed top-0 left-0 right-0 bg-primary/95 backdrop-blur-sm z-50 border-b border-primary-foreground/20">
          <div className="container mx-auto px-4 flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/1a837ddc-50ca-40f7-b975-0ad92fdf9882.png" 
                alt="Project Partner Logo" 
                className="h-8 w-auto"
              />
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-sm"
                onClick={() => handleScrollToSection('features')}
              >
                Features
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-sm"
                onClick={() => handleScrollToSection('about')}
              >
                About
              </Button>
              {user ? (
                <Button 
                  variant="secondary"
                  size="sm"
                  className="ml-1"
                  asChild
                >
                  <Link to="/projects">My Projects</Link>
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-sm"
                    asChild
                  >
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="ml-1"
                    asChild
                  >
                    <Link to="/auth?mode=signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>
        <div className="relative container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
                🏆 Win the Game of DIY
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">
                Your home projects aren't just tasks — they're challenges to conquer.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="px-6 md:px-8 text-base md:text-lg" asChild>
                  <Link to="/projects">
                    {user ? "Go to My Projects" : "Browse Projects"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="px-6 md:px-8 text-base md:text-lg border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="relative flex justify-center items-center">
              <img 
                src="/lovable-uploads/ced88968-ca61-4fed-bee4-d2ea417c247c.png" 
                alt="DIY Project Partner" 
                className="w-full max-w-md h-auto rounded-lg shadow-lg"
                style={{ transform: 'scale(1.15)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Project Carousel */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Tackle Your Next Challenge?
            </h2>
            <p className="text-xl text-muted-foreground">
              From simple fixes to major transformations
            </p>
          </div>
          
          <div className="flex overflow-x-auto gap-4 md:gap-6 pb-4 scrollbar-hide">
            {projectImages.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-72 md:w-80">
                <Card className="overflow-hidden hover:shadow-card transition-all duration-300 hover:scale-105 cursor-pointer"
                      onClick={() => window.location.href = '/projects'}>
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-base md:text-lg">{image.alt}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Click to explore projects</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          
          {/* Start Your Gameplan Button */}
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold"
              onClick={() => window.location.href = '/projects'}
            >
              Start Your Gameplan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* The Playbook: Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              📋 The Playbook 
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Every Champion Starts with a Gameplan
            </h2>
            <p className="text-xl text-muted-foreground italic">
              "A good plan turns a weekend warrior into a project MVP."
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* On the Field Quote */}
      <section className="py-16 bg-accent/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            🔧 On the Field: Execution
          </h2>
          <p className="text-xl text-muted-foreground italic">
            "Confidence comes from knowing you've got the right gear and the right moves."
          </p>
        </div>
      </section>

      {/* Strong Finish Quote */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            🏁 The Strong Finish
          </h2>
          <p className="text-xl text-muted-foreground italic">
            "Finishing strong means no loose ends — just results you're proud of."
          </p>
        </div>
      </section>

      {/* Personalized Projects */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-accent border-accent">
              🎯 Your Project, Your Playbook
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              AI-Powered Personalization
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8">
              Build to your schedule, your skillset, your unique home. Our AI learns your style and makes every project better than the last.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">Adaptive Guidance Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  Instructions match your skill and pace in real time. Novice tilers get extra visuals; experienced builders get tight checklists—both finish faster.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">Proactive Delay Prevention</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  Avoid project frustration with early warnings and recovery plans. Weather sensing included: "Rain in 2 days—seal deck today, paint after."
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">Auto-Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  Each project is smoother than the last because the system learns from your feedback and others'. Step order changes to reduce tool swaps, saving 20% time.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <p className="text-xl text-accent font-semibold italic">
              "Personalized projects mean fewer mistakes, faster progress, and better results."
            </p>
            <div className="bg-card rounded-lg p-6 max-w-3xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">Real-World Data Insights</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">73%</div>
                  <div className="text-muted-foreground">Faster completion with AI guidance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">45%</div>
                  <div className="text-muted-foreground">Fewer mistakes with personalized instructions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">89%</div>
                  <div className="text-muted-foreground">User satisfaction with adaptive features</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              🙌 Every DIYer Has a Place on the Team
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Whether you're picking up a hammer for the first time or you've been building for years, Project Partner meets you where you are — and helps you level up.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {userTypes.map((userType, index) => (
              <Card key={index} className="text-center gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
                <CardHeader>
                  <div className="text-4xl mb-4">{userType.icon}</div>
                  <CardTitle className="text-xl">{userType.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {userType.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-xl text-accent font-semibold italic">
              "No matter your starting point, we help you finish stronger."
            </p>
          </div>
        </div>
      </section>

      {/* 5 Biggest Roadblocks */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-destructive border-destructive">
              💥 Roadblock Crusher
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              🚫 We Take the Frustration Out of DIY
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Every DIYer hits the same walls — but with Project Partner, you'll break through them faster and with fewer headaches.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadblocks.map((roadblock, index) => (
              <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mb-3">
                    <roadblock.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-lg">{roadblock.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {roadblock.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              📈 The Process
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              From Kickoff to Victory in 3 Steps
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary-foreground">{step.step}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Gametime Enablers */}
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              Gametime Enablers
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="mb-4">
                  <img 
                    src={iphoneMessage} 
                    alt="iPhone accountability text message" 
                    className="w-32 h-32 object-cover rounded-lg mx-auto shadow-md"
                  />
                </div>
                <CardTitle className="text-xl">Team Mate</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  Automated texting alerts throughout the project allows you to seamlessly share your progress and feel the comfort of a team on your side.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="mb-4">
                  <img 
                    src={videoCallContractor} 
                    alt="Video call with professional contractor" 
                    className="w-32 h-32 object-cover rounded-lg mx-auto shadow-md"
                  />
                </div>
                <CardTitle className="text-xl">Calls with Coach</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base leading-relaxed">
                  If you just want to talk to a pro or you get stuck mid-project, we offer a video-call service.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Tools and Materials Info */}
          <div className="bg-secondary rounded-xl p-8 mb-8">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Where do tools and materials come from?
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Our partner network with your favorite retailers and tool rental agencies.
            </p>
            
            <div className="bg-accent/10 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-foreground mb-3">
                Why Not Just Use YouTube?
              </h4>
              <p className="text-muted-foreground mb-4">
                Sure, most internet content is free — but it's also a maze. Project Partner blends AI smarts with real‑world contractor expertise to hand‑pick the best content from across the web.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  When there's a great video out there, we'll include it.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                  When there isn't, we'll fill the gap with clear, field‑tested guidance.
                </li>
              </ul>
              <p className="text-accent font-semibold mt-4">
                Our mission is to keep you on the field with a winning gameplan — not stuck on the sidelines searching for hours to find the details that matter.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-6">
              Video-calls with experts are one of our most popular features
            </p>
            <Button 
              size="lg" 
              onClick={handleStartGameplan}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-4 text-lg"
            >
              Start Your Gameplan Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              About Project Partner
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Project Partner was created by a team of aerospace engineers with a passion for DIY. We're on a mission to make projects more accessible and with higher success.
              </p>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                <strong>How?</strong> By taking techniques used for building aircraft and applying a sports-like experience of winning, we enable DIYers to achieve consistent success.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <Users className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Serving Customers</h3>
                  <p className="text-muted-foreground">We deeply value our customers and their success</p>
                </div>
                <div className="text-center">
                  <Zap className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Sustainability</h3>
                  <p className="text-muted-foreground">Better projects = lower waste</p>
                </div>
                <div className="text-center">
                  <Target className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Crushing Challenges</h3>
                  <p className="text-muted-foreground">We help you overcome every obstacle</p>
                </div>
              </div>
              
              <p className="text-xl font-semibold text-accent">
                Get started with us today!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
            🏆 Your Next DIY Win Starts Here
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
            Don't just start a project — win it. With Project Partner, you'll have the strategy, support, and tools to make every project a victory.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleStartGameplan}
              className="bg-primary-foreground text-primary border-primary-foreground/20 hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg"
            >
              See Example Gameplans
              <Star className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;