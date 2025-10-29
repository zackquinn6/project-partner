import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { FounderInfoDialog } from './FounderInfoDialog';

interface HowItWorksSectionProps {
  onOpenDemo?: () => void;
}

export const HowItWorksSection = ({ onOpenDemo }: HowItWorksSectionProps) => {
  const [isFounderDialogOpen, setIsFounderDialogOpen] = useState(false);
  const steps = [
    {
      icon: BookOpen,
      number: 1,
      title: "Choose Your Project",
      description: "Browse 50+ proven templates or describe your own custom project",
      color: "bg-primary text-primary-foreground",
      badgeColor: "bg-primary text-primary-foreground"
    },
    {
      icon: Zap,
      number: 2,
      title: "Get Your Personalized Plan",
      description: "Answer 3 quick questions about your skills, tools, and timeline",
      color: "bg-accent text-accent-foreground",
      badgeColor: "bg-accent text-accent-foreground"
    },
    {
      icon: CheckCircle,
      number: 3,
      title: "Build with Confidence",
      description: "Follow your custom workflow with photos, videos, and expert support",
      color: "bg-green-600 text-white",
      badgeColor: "bg-green-600 text-white"
    }
  ];

  return (
    <section className="section-spacing bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Designed to run one great project - not a career of building
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
            In 30min or less - build a project framework that leads to success
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative text-center">
                <div className={`w-20 h-20 ${step.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                  <Icon className="h-10 w-10" />
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="absolute top-10 left-1/2 transform translate-x-12 hidden md:block lg:translate-x-16">
                    <ArrowRight className="h-8 w-8 text-accent" />
                  </div>
                )}

                <Badge className={`mb-4 ${step.badgeColor}`}>
                  Step {step.number}
                </Badge>
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Interactive Demo CTA */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setIsFounderDialogOpen(true)}
          >
            Learn More
          </Button>
        </div>
      </div>
      
      <FounderInfoDialog 
        open={isFounderDialogOpen} 
        onOpenChange={setIsFounderDialogOpen} 
      />
    </section>
  );
};
