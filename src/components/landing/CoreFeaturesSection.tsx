import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wrench, Rocket, Globe } from 'lucide-react';

export const CoreFeaturesSection = () => {
  const coreFeatures = [
    {
      icon: Wrench,
      title: "Plan – Start Smart, Stay in Control",
      features: [
        "Pre‑built, customizable workflows designed for home improvement projects",
        "Smart materials lists that scale with your project size",
        "Time estimates and schedules that adjust automatically",
        "Flexible scheduling with ranges based on your unique scope of work",
        "Personalization features: capture details about your home, your tool library, and your DIY style for tailored guidance",
        "Track both DIY and contractor scopes of work in one place"
      ]
    },
    {
      icon: Rocket,
      title: "Execute – Guidance Every Step of the Way",
      features: [
        "Step‑by‑step instructions with selectable levels of detail",
        "Real‑time progress tracking to keep you on course",
        "Guided workflows that adapt as you go",
        "Access on mobile, with instructions sent via email or text",
        "Video and text formats available for every step",
        "Aerospace‑grade process control: track outputs, key variables, and critical checkpoints",
        "Complete tools and materials lists at your fingertips",
        "Built‑in safety warnings and reminders to keep projects safe",
        "Collaboration tools: share instructions and assign tasks to family, friends, or teammates"
      ]
    },
    {
      icon: Globe,
      title: "Real‑World – Adapt, Adjust, and Keep Moving",
      features: [
        "Call a pro on demand when you need expert help (optional upgrade)",
        "Re‑plan easily if things change mid‑project",
        "Buy additional materials seamlessly when you run short",
        "Content available at different levels of detail—so you get just the right amount of guidance without feeling overwhelmed or tempted to 'skip the manual'"
      ]
    }
  ];

  return (
    <section className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4 max-w-4xl mx-auto">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Every home improvement project carries lessons from those who've done it before—and Project Partner turns that knowledge into a personalized experience tailored to where you are on your journey. Here's how we do it:
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {coreFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-xl transition-all duration-300 hover-lift bg-card border-border">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start">
                        <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
