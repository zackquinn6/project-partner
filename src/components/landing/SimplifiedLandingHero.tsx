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
      <section
        className="relative flex min-h-[85dvh] flex-col justify-center overflow-hidden px-6 py-28 md:px-8 md:py-32"
        aria-labelledby="simplified-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[min(100%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-2xl text-center">
          <h1
            id="simplified-hero-heading"
            className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Project Management,
            <br />
            Pre-Built for Home Improvement.
          </h1>

          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Helping you run one great project.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5 sm:mt-12">
            <Button
              size="lg"
              variant="default"
              className="h-12 w-full min-h-[48px] px-8 text-base shadow-md transition-shadow hover:shadow-lg sm:w-auto sm:min-w-[200px]"
              onClick={() => setIsOnboardingOpen(true)}
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={onLearnMore}
            >
              Learn how it works
            </Button>
          </div>
        </div>
      </section>

      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </>
  );
}
