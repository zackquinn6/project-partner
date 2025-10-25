import { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calculator, HelpCircle, Home, Calendar, Wrench, ShoppingCart, Users, FileText, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
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
            Powerful tools that work together to guide you from start to finish
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

        {/* Expandable Additional Features */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="max-w-4xl mx-auto">
          <div className="text-center">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2 hover:bg-muted">
                <span>{isExpanded ? 'Hide' : 'See All 11 Features'}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};
