import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderKanban, House, ListTodo, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="container mx-auto">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
            Simple pricing for every level of projects
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            Start free and unlock project control when you need it
          </p>
        </div>

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
              <Button variant="outline" className="w-full border-amber-500/50 hover:bg-amber-500/10" onClick={() => navigate('/auth?mode=signup')}>
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

        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Questions about pricing?{' '}
            <a href="mailto:support@toolio.com" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
