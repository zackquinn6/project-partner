import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanningJourneyStage = 'discover' | 'plan';

export interface PlanningJourneyHeaderProps {
  /** Which stage of the planning journey is active. */
  activeStage: PlanningJourneyStage;
  className?: string;
  /** When on Plan, lets the user return to Kickoff (Discover). */
  onDiscoverClick?: () => void;
  /** When on Discover after kickoff is done, lets the user return to Planning Studio (Plan). */
  onPlanClick?: () => void;
}

type ArcStageId = 'pick' | 'discover' | 'plan' | 'build';

const ARC_STAGES: { id: ArcStageId; label: string }[] = [
  { id: 'pick', label: 'Pick' },
  { id: 'discover', label: 'Discover' },
  { id: 'plan', label: 'Plan' },
  { id: 'build', label: 'Build' },
];

const STAGE_ORDER: ArcStageId[] = ['pick', 'discover', 'plan', 'build'];

/**
 * Quiet four-stage journey context shared by Kickoff (Discover) and Planning Studio (Plan).
 * Pick / Build are context only; Discover / Plan can be return targets when handlers exist.
 */
export function PlanningJourneyHeader({
  activeStage,
  className,
  onDiscoverClick,
  onPlanClick,
}: PlanningJourneyHeaderProps) {
  const activeId: ArcStageId = activeStage === 'plan' ? 'plan' : 'discover';
  const activeIndex = STAGE_ORDER.indexOf(activeId);
  const discoverClickable = Boolean(onDiscoverClick) && activeStage === 'plan';
  const planClickable = Boolean(onPlanClick) && activeStage === 'discover';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center gap-1.5 sm:gap-2',
        className
      )}
      role="navigation"
      aria-label={activeStage === 'discover' ? 'Discover journey' : 'Plan journey'}
    >
      {ARC_STAGES.map((stage, index) => {
        const isActive = stage.id === activeId;
        const isPast = index < activeIndex;
        const isClickable =
          (stage.id === 'discover' && discoverClickable) ||
          (stage.id === 'plan' && planClickable);
        const onClick =
          stage.id === 'discover' && discoverClickable
            ? onDiscoverClick
            : stage.id === 'plan' && planClickable
              ? onPlanClick
              : undefined;

        const labelClass = cn(
          'inline-flex items-center gap-0.5 text-[11px] uppercase tracking-wide',
          isActive && 'font-semibold text-primary',
          isPast && !isActive && 'text-muted-foreground/70',
          !isActive && !isPast && 'text-muted-foreground/70',
          isClickable &&
            'cursor-pointer underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        );

        const content = (
          <>
            {isPast ? <Check className="h-2.5 w-2.5 shrink-0" aria-hidden /> : null}
            <span>{stage.label}</span>
          </>
        );

        return (
          <span key={stage.id} className="inline-flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-[11px] text-muted-foreground/40" aria-hidden>
                ·
              </span>
            ) : null}
            {onClick ? (
              <button
                type="button"
                className={labelClass}
                onClick={onClick}
                aria-label={`Return to ${stage.label}`}
              >
                {content}
              </button>
            ) : (
              <span className={labelClass} aria-current={isActive ? 'step' : undefined}>
                {content}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
