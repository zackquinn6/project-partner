import React from 'react';
import { AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useActionPriorityTable } from '@/hooks/useActionPriorityTable';
import { actionPriorityLabel } from '@/utils/actionPriorityTable';
import type { StepRiskSummary } from '@/hooks/useRunStepRisk';
import { RISK_COMPONENT_CONSUMER_LABELS } from '@/utils/riskProfileRollup';
import type { ActionPriority } from '@/utils/riskDimensions';

const BADGE_CLASS: Record<ActionPriority, string> = {
  H: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
  M: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  L: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
};

/**
 * What this step demands before it is worked, from the run's applied risk list.
 *
 * Renders nothing when the step has no scored risk. An empty badge would read as "this step is
 * fine", which is a different claim from "nobody analyzed this step".
 */
export const StepRiskPriorityBadge: React.FC<{
  summary: StepRiskSummary | undefined;
  className?: string;
}> = ({ summary, className }) => {
  const { table } = useActionPriorityTable();

  if (!summary || summary.worstActionPriority === null || !table) return null;

  const ap = summary.worstActionPriority;
  const label = actionPriorityLabel(table, ap);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('shrink-0', className)}>
          <Badge variant="outline" className={cn('gap-1 text-xs font-medium', BADGE_CLASS[ap])}>
            {ap === 'L' ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {label.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-sm font-semibold">{label.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label.description}</p>
        <ul className="mt-3 space-y-2">
          {summary.items.map((item) => (
            <li key={item.id} className="text-xs">
              <div className="flex items-start gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-0.5 shrink-0 px-1 py-0 text-[10px]',
                    item.actionPriority ? BADGE_CLASS[item.actionPriority] : ''
                  )}
                >
                  {RISK_COMPONENT_CONSUMER_LABELS[item.dimension]}
                </Badge>
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  {item.description ? (
                    <div className="text-muted-foreground">{item.description}</div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

/**
 * The short list a user should read before starting a High step, inline rather than behind a
 * click, because a warning that needs a click is a warning that gets skipped.
 */
export const StepMustGetRightCallout: React.FC<{ summary: StepRiskSummary | undefined }> = ({
  summary,
}) => {
  if (!summary || summary.highCount === 0) return null;

  const highItems = summary.items.filter((item) => item.actionPriority === 'H');

  return (
    <div className="mt-3 rounded-md border border-red-300 bg-red-50/70 p-3 dark:border-red-800 dark:bg-red-950/30">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-red-900 dark:text-red-200">
        <Info className="h-4 w-4 shrink-0" />
        Get this right the first time
      </div>
      <ul className="mt-2 space-y-1.5">
        {highItems.map((item) => (
          <li key={item.id} className="text-xs text-red-900 dark:text-red-100">
            <span className="font-medium">
              {RISK_COMPONENT_CONSUMER_LABELS[item.dimension]}:
            </span>{' '}
            {item.description ?? item.title}
          </li>
        ))}
      </ul>
    </div>
  );
};
