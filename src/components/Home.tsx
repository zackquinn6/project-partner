import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Shield, Users, ArrowRight, CheckCircle, Route, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import generalDiyImage from "@/assets/general-diy.png";
import Autoplay from "embla-carousel-autoplay";
interface HomeProps {
  onViewChange: (view: 'admin' | 'user') => void;
}
export default function Home({
  onViewChange
}: HomeProps) {
  const navigate = useNavigate();
  const projects = ["Interior painting", "Tile flooring", "LVP flooring", "Tile backsplash", "Landscaping", "Power washing", "Smart home", "Drywall", "Lighting", "Home maintenance"];
  // Triple projects for seamless infinite scroll
  const infiniteProjects = [...projects, ...projects, ...projects];
  const features = [{
    icon: Target,
    title: "Your Project, Your Way — From Day One",
    description: "The first move is tailoring every detail to your exact job. Swap, tweak, and adapt your plan before lifting a tool. Millions of pros and DIYers have already paid the tuition in mistakes — you don't have to. And when the inevitable curveball shows up, your plan flexes with you, not against you."
  }, {
    icon: CheckCircle,
    title: "More Than \"How-To,\" It's \"What-Works\"",
    description: "Tech tips and how-to clips are just fragments. Overconfidence thrives in the gaps between them. This is the most complete real‑world knowledge base you'll find — aggregated from countless builds, fixes, and rescues — turning scattered advice into one friction‑free, detail‑rich sequence built for finishing, not floundering."
  }, {
    icon: Users,
    title: "Finish Strong — Or Get Backup Fast",
    description: "Progress is visible in real‑time, so you know exactly where you stand. Stay tethered to a partner who can nudge, check, or jump in when you're stuck. It's not just a \"project tracker\" — it's a pressure‑release valve and a safety net, all in one."
  }];
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Confidently Get {" "}
                  <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    Results You Want
                  </span>
                </h1>
                <h2 className="text-2xl lg:text-3xl font-semibold text-muted-foreground mb-4">
                  A Guided Home Improvement Experience
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl">Expert-designed processes + digital tools + accountability—confidently finish every home improvement project. </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => navigate('/projects')} size="lg" className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-smooth">
                  <Target className="w-5 h-5 mr-2" />
                  Start My Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
              </div>

            </div>
          </div>
        </div>
        
        {/* Projects Carousel - Full Width */}
        <div className="w-full bg-gradient-to-r from-card/20 to-card/40 py-8">
          <Carousel className="w-full" opts={{
          align: "start",
          loop: true,
          skipSnaps: true,
          dragFree: true,
          duration: 10000
        }} plugins={[Autoplay({
          delay: 1500,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
          stopOnFocusIn: false,
          playOnInit: true
        })]}>
            <CarouselContent className="-ml-1">
              {infiniteProjects.map((project, index) => <CarouselItem key={`${project}-${index}`} className="pl-1 basis-1/4 md:basis-1/5 lg:basis-1/6">
                  <div className="p-1">
                    <Card className="border-primary/20 bg-card/70 hover:bg-card transition-smooth">
                      <CardContent className="flex items-center justify-center p-4">
                        <span className="text-sm font-medium text-center leading-tight">
                          {project}
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>)}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">Personalized from Step One</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">The whole playbook - backed every step of the way</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="gradient-card border-0 shadow-card hover:shadow-elegant transition-smooth">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              How It <span className="text-primary">Works</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Select a project</h3>
              <p className="text-muted-foreground">
                Choose from our library of proven home improvement projects designed for DIY success.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Build your DIY profile & customize your project</h3>
              <p className="text-muted-foreground">
                Answer a few questions to tailor the project to your skill level, tools, and specific needs.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Build!</h3>
              <p className="text-muted-foreground">
                The easiest step-by-step instructions ever with accountability to be sure you hit the finish line.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tool Rentals Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center space-y-6">
                <img src="/lovable-uploads/682ce2ee-7a0b-483e-b97a-472ce801a4ee.png" alt="Toolio" className="h-16 w-auto" />
                <div className="space-y-4">
                  <h2 className="text-3xl lg:text-4xl font-bold">
                    <span className="text-primary">Project-based</span> Tool Rentals
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Seamless integration to equip your project
                  </p>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Get professional-grade tools delivered right to your door. Our partnership with Toolio ensures you have everything you need to complete your project successfully.
                  </p>
                </div>
                <Button variant="outline" size="lg" className="mt-6" onClick={() => window.open('https://toolio.us', '_blank')}>
                  Browse Tool Rentals
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="gradient-primary border-0 text-white text-center shadow-elegant">
            <CardContent className="py-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Tackle Your Next Home Project?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of homeowners who've successfully completed their projects with confidence using Project Partner's guided approach.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/projects')} variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90 transition-smooth">
                  Start My First Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>;
}