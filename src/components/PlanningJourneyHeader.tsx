import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanningJourneyStage = 'discover' | 'plan';

export interface PlanningJourneyHeaderProps {
  /** Which stage of the planning journey is active. */
  activeStage: PlanningJourneyStage;
  className?: string;
}

/**
 * Two-stage journey chrome shared by Kickoff (Discover) and Planning Studio (Plan).
 */
export function PlanningJourneyHeader({
  activeStage,
  className,
}: PlanningJourneyHeaderProps) {
  const discoverDone = activeStage === 'plan';
  const planActive = activeStage === 'plan';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center gap-1.5 sm:gap-2',
        className
      )}
      role="navigation"
      aria-label="Planning Studio journey"
    >
      <JourneyStagePill
        label="Discover"
        active={activeStage === 'discover'}
        complete={discoverDone}
        stepNumber={1}
      />
      <div
        className="h-px w-4 shrink-0 bg-muted-foreground/30 sm:w-6"
        aria-hidden
      />
      <JourneyStagePill
        label="Plan"
        active={planActive}
        complete={false}
        stepNumber={2}
      />
    </div>
  );
}

function JourneyStagePill({
  label,
  active,
  complete,
  stepNumber,
}: {
  label: string;
  active: boolean;
  complete: boolean;
  stepNumber: number;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs',
        active && 'border-primary bg-primary/10 text-primary',
        complete && !active && 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
        !active && !complete && 'border-muted-foreground/25 bg-muted/40 text-muted-foreground'
      )}
      aria-current={active ? 'step' : undefined}
    >
      {complete ? (
        <CheckCircle className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
      ) : (
        <span
          className={cn(
            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold sm:h-4 sm:w-4 sm:text-[10px]',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
          )}
          aria-hidden
        >
          {stepNumber}
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
