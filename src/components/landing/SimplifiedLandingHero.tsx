import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { OnboardingDialog } from './OnboardingDialog';

interface SimplifiedLandingHeroProps {
  onLearnMore: () => void;
}

export function SimplifiedLandingHero({ onLearnMore }: SimplifiedLandingHeroProps) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <>
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-muted pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl text-center space-y-8 relative z-10">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Project Management, Pre-Built for Home Improvement.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            One great project not a career.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Button
              size="xl"
              className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto min-h-[48px]"
              onClick={() => setIsOnboardingOpen(true)}
            >
              Get started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground w-full sm:w-auto"
              onClick={onLearnMore}
            >
              Learn more
            </Button>
          </div>
        </div>
      </section>

      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </>
  );
}
