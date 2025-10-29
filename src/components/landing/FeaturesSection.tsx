import { useState } from 'react';
import { Card, CardTitle, CardDescription, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calculator, HelpCircle, Home, Calendar, Wrench, ShoppingCart, Users, FileText, TrendingUp, ChevronDown, ChevronUp, Rocket, Globe } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const FeaturesSection = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const coreFeatures = [
    {
      icon: Target,
      title: "Smart Project Planner",
      description: "Get a customized roadmap for any project, adjusted to your experience level",
      badge: "Personalized Workflows",
      color: "bg-primary"
    },
    {
      icon: Calculator,
      title: "Tool & Material Calculator",
      description: "Know exactly what to buy—no waste, no multiple trips to the store",
      badge: "Zero Waste Shopping",
      color: "bg-accent"
    },
    {
      icon: HelpCircle,
      title: "Expert Help on Demand",
      description: "Stuck? Get help from real contractors and experienced DIYers",
      badge: "Human Support",
      color: "bg-purple-600"
    }
  ];

  const additionalFeatures = [
    { icon: Home, label: "Home Maintenance" },
    { icon: Calendar, label: "Project Scheduler" },
    { icon: Wrench, label: "Tool Rentals" },
    { icon: ShoppingCart, label: "Materials Ordering" },
    { icon: Users, label: "Contractor Finder" },
    { icon: FileText, label: "Project Analytics" },
    { icon: TrendingUp, label: "Progress Tracking" },
    { icon: Target, label: "Risk Manager" }
  ];

  return (
    <section className="section-spacing bg-muted/30" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A suite of tools that work together to guide you from start to finish
          </p>
        </div>

        {/* 3 Core Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {coreFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-xl transition-all duration-300 hover-lift bg-card border-border">
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl mb-3 text-foreground">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-base mb-4 text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  {feature.badge}
                </Badge>
              </Card>
            );
          })}
        </div>

        {/* Expandable Features */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="max-w-6xl mx-auto">
          <div className="text-center">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2 hover:bg-muted">
                <span>{isExpanded ? 'Hide' : 'See All Features'}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="space-y-12 mt-8">
              {/* Intro Text */}
              <div className="text-center mb-8 space-y-4 max-w-4xl mx-auto">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Every home improvement project carries lessons from those who've done it before—and Project Partner turns that knowledge into a personalized experience tailored to where you are on your journey. Here's how we do it:
                </p>
              </div>

              {/* Three Core Feature Cards */}
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <Card className="p-6 hover:shadow-xl transition-all duration-300 hover-lift bg-card border-border">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                      <Wrench className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      Plan – Start Smart, Stay in Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Pre‑built, customizable workflows designed for home improvement projects</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Smart materials lists that scale with your project size</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Time estimates and schedules that adjust automatically</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Flexible scheduling with ranges based on your unique scope of work</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Personalization features: capture details about your home, your tool library, and your DIY style for tailored guidance</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Track both DIY and contractor scopes of work in one place</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="p-6 hover:shadow-xl transition-all duration-300 hover-lift bg-card border-border">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                      <Rocket className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      Execute – Guidance Every Step of the Way
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Step‑by‑step instructions with selectable levels of detail</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Real‑time progress tracking to keep you on course</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Guided workflows that adapt as you go</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Access on mobile, with instructions sent via email or text</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Video and text formats available for every step</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Aerospace‑grade process control: track outputs, key variables, and critical checkpoints</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Complete tools and materials lists at your fingertips</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Built‑in safety warnings and reminders to keep projects safe</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Collaboration tools: share instructions and assign tasks to family, friends, or teammates</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="p-6 hover:shadow-xl transition-all duration-300 hover-lift bg-card border-border">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                      <Globe className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      Real‑World – Adapt, Adjust, and Keep Moving
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Call a pro on demand when you need expert help (optional upgrade)</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Re‑plan easily if things change mid‑project</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Buy additional materials seamlessly when you run short</span>
                      </li>
                      <li className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>Content available at different levels of detail—so you get just the right amount of guidance without feeling overwhelmed or tempted to 'skip the manual'</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Features Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {additionalFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center p-4 rounded-lg bg-card/50 hover:bg-card transition-colors border border-border"
                    >
                      <Icon className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium text-center text-foreground">
                        {feature.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};
