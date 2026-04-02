import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Dark green primary for planning-tool window chrome (Save and Close). */
export const PLANNING_TOOL_SAVE_CLOSE_CLASSNAME =
  'bg-green-800 text-white shadow-sm hover:bg-green-900 focus-visible:ring-green-800';

export interface PlanningToolWindowHeaderActionsProps {
  onCancel: () => void;
  /** Used when `saveButtonType` is `button`. Omit when using `submit` + `saveButtonForm`. */
  onSaveAndClose?: () => void | Promise<void>;
  className?: string;
  saveDisabled?: boolean;
  /** Primary action label (default: Save and Close). */
  saveLabel?: string;
  saveButtonType?: 'button' | 'submit';
  saveButtonForm?: string;
}

/**
 * Upper-right actions for planning workflow tool windows: Cancel + primary save action.
 */
export function PlanningToolWindowHeaderActions({
  onCancel,
  onSaveAndClose,
  className,
  saveDisabled,
  saveLabel = 'Save and Close',
  saveButtonType = 'button',
  saveButtonForm,
}: PlanningToolWindowHeaderActionsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-9 px-3 text-xs md:min-h-8 md:text-sm"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type={saveButtonType}
        form={saveButtonForm}
        size="sm"
        disabled={saveDisabled}
        className={cn(
          'min-h-9 px-3 text-xs md:min-h-8 md:text-sm',
          PLANNING_TOOL_SAVE_CLOSE_CLASSNAME
        )}
        onClick={
          saveButtonType === 'submit'
            ? undefined
            : () => void onSaveAndClose?.()
        }
      >
        {saveLabel}
      </Button>
    </div>
  );
}
