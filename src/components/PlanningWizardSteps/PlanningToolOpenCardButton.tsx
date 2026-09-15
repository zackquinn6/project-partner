import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLANNING_TOOL_GRAPHICS,
  PLANNING_TOOLS,
  type PlanningToolId,
} from '@/components/KickoffSteps/ProjectToolsStep';

interface PlanningToolOpenCardButtonProps {
  toolId: PlanningToolId;
  onClick: () => void;
  className?: string;
}

/**
 * Graphic open control matching kickoff step 4 selected tool cards,
 * with clear button affordances for Planning Studio.
 */
export function PlanningToolOpenCardButton({
  toolId,
  onClick,
  className,
}: PlanningToolOpenCardButtonProps) {
  const meta = PLANNING_TOOLS.find((tool) => tool.id === toolId);
  const label = meta?.label ?? toolId;
  const blurb = toolId === 'scope' ? 'Make key decisions' : meta?.benefit ?? '';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${label}`}
      className={cn(
        'group flex w-full max-w-[16rem] flex-col overflow-hidden rounded-xl border border-primary bg-card text-left shadow-sm ring-2 ring-primary/30 transition-all',
        'hover:shadow-md hover:ring-primary/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'active:scale-[0.99]',
        className
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-muted/40">
        <img
          src={PLANNING_TOOL_GRAPHICS[toolId]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
          draggable={false}
        />
        <span
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-sm"
          aria-hidden
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-3">
        <span className="font-display text-base font-semibold leading-tight text-foreground">
          {label}
        </span>
        <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{blurb}</span>
      </div>
      <div className="flex items-center justify-between border-t border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
        <span>Open</span>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </div>
    </button>
  );
}
