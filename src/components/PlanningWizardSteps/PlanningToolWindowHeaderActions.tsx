import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Dark green primary for planning-tool window chrome (Save and Close). */
export const PLANNING_TOOL_SAVE_CLOSE_CLASSNAME =
  'bg-green-800 text-white shadow-sm hover:bg-green-900 focus-visible:ring-green-800';

export interface PlanningToolWindowHeaderActionsProps {
  onCancel: () => void;
  onSaveAndClose: () => void | Promise<void>;
  className?: string;
  saveDisabled?: boolean;
}

/**
 * Upper-right actions for planning workflow tool windows: Cancel + Save and Close.
 */
export function PlanningToolWindowHeaderActions({
  onCancel,
  onSaveAndClose,
  className,
  saveDisabled,
}: PlanningToolWindowHeaderActionsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <Button type="button" variant="outline" size="sm" className="text-xs md:text-sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={saveDisabled}
        className={cn('text-xs md:text-sm', PLANNING_TOOL_SAVE_CLOSE_CLASSNAME)}
        onClick={() => void onSaveAndClose()}
      >
        Save and Close
      </Button>
    </div>
  );
}
