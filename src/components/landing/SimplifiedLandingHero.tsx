import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, FolderKanban, House, ListTodo, Shield } from 'lucide-react';
import { OnboardingDialog } from './OnboardingDialog';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SimplifiedLandingHeroProps {
  onLearnMore: () => void;
}

function AppIconTile({
  icon: Icon,
  label,
  tileClassName,
}: {
  icon: LucideIcon;
  label: string;
  tileClassName: string;
}) {
  return (
    <div className="flex w-[5.75rem] flex-col items-center gap-2 sm:w-24">
      <div
        className={cn(
          'flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.35rem] shadow-md ring-1 ring-black/10 dark:ring-white/15 sm:h-[4.75rem] sm:w-[4.75rem]',
          tileClassName
        )}
      >
        <Icon className="h-8 w-8 text-white sm:h-9 sm:w-9" strokeWidth={1.65} aria-hidden />
      </div>
      <span className="text-center text-[11px] font-semibold leading-snug tracking-tight text-foreground sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function SimplifiedLandingHero({ onLearnMore }: SimplifiedLandingHeroProps) {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const navigate = useNavigate();

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

          <div className="mx-auto mt-12 w-full max-w-4xl text-left">
            <Accordion type="single" collapsible>
              <AccordionItem value="products" className="border rounded-lg bg-background/60 backdrop-blur">
                <AccordionTrigger className="px-4 text-sm font-semibold">
                  Show Products
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* Free */}
                    <Card className="flex flex-col border-2 shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="space-y-1 pb-2 pt-6 text-center">
                        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free</p>
                        <div className="pt-1">
                          <span className="text-4xl font-bold">$0</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-2 sm:px-6">
                        <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-5">
                          <AppIconTile
                            icon={ListTodo}
                            label="Task & Project Manager"
                            tileClassName="bg-gradient-to-br from-sky-500 to-blue-700"
                          />
                          <AppIconTile
                            icon={House}
                            label="Home Maintenance"
                            tileClassName="bg-gradient-to-br from-emerald-500 to-teal-700"
                          />
                        </div>
                        <p className="flex-1 text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                          Sleek & lightweight tools to manage general tasks and recurring home maintenance.
                        </p>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/auth?mode=signup')}>
                          Get started free
                        </Button>
                      </CardContent>
                    </Card>

                    {/* $15 / yr — Risk-less */}
                    <Card className="flex flex-col border-2 border-amber-500/40 shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="space-y-1 pb-2 pt-6 text-center">
                        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk-less</p>
                        <div className="pt-1">
                          <span className="text-4xl font-bold">$15</span>
                          <span className="text-muted-foreground">/yr</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-2 sm:px-6">
                        <div className="flex justify-center">
                          <AppIconTile
                            icon={Shield}
                            label="Risk-less"
                            tileClassName="bg-gradient-to-br from-amber-500 to-orange-700"
                          />
                        </div>
                        <p className="flex-1 text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                          Managing risk is the key to a successful project - get the core app for just $15.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full border-amber-500/50 hover:bg-amber-500/10"
                          onClick={() => navigate('/auth?mode=signup')}
                        >
                          Choose Risk-less
                        </Button>
                      </CardContent>
                    </Card>

                    {/* $59 / yr — Projects */}
                    <Card className="relative flex flex-col border-2 border-primary shadow-md transition-shadow hover:shadow-lg">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                        Full suite
                      </div>
                      <CardHeader className="space-y-1 pb-2 pt-7 text-center">
                        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projects</p>
                        <div className="pt-1">
                          <span className="text-4xl font-bold">$59</span>
                          <span className="text-muted-foreground">/yr</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-2 sm:px-6">
                        <div className="flex justify-center">
                          <AppIconTile
                            icon={FolderKanban}
                            label="Projects"
                            tileClassName="bg-gradient-to-br from-violet-600 to-indigo-800"
                          />
                        </div>
                        <p className="flex-1 text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                          A complete suite of apps and tools to run one great project.
                        </p>
                        <Button className="w-full" onClick={() => navigate('/auth?mode=signup')}>
                          Get full access
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </>
  );
}
