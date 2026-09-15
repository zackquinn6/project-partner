/**
 * Shared layout for Planning Studio tool steps:
 * equal card height, header/content padding, description text, and primary open card.
 */

/** Outer card: consistent minimum height across all tool steps. */
export const PLANNING_WIZARD_STEP_CARD_CLASSNAME =
  'flex min-h-[20rem] flex-col sm:min-h-[22rem]';

export const PLANNING_WIZARD_STEP_HEADER_CLASSNAME = 'shrink-0 p-3 sm:p-4';

export const PLANNING_WIZARD_STEP_TITLE_CLASSNAME =
  'flex items-center gap-2 text-base sm:text-lg md:text-xl';

export const PLANNING_WIZARD_STEP_CONTENT_CLASSNAME =
  'flex min-h-0 flex-1 flex-col p-3 sm:p-4';

/**
 * Fills space between header and status; centers description + open card.
 */
export const PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME =
  'flex min-h-0 flex-1 flex-col items-center justify-center';

/** Constrains and centers the open card horizontally within the action slot. */
export const PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME =
  'mx-auto flex w-full max-w-md flex-col items-center';

export const PLANNING_WIZARD_STEP_BODY_CLASSNAME =
  'flex min-h-0 flex-1 flex-col gap-4 py-4 text-center';

/** Descriptor sits directly above the open card. */
export const PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME =
  'mx-auto mb-1 max-w-md shrink-0 px-1 text-sm text-muted-foreground sm:mb-2 sm:text-base';

/** Reserves space for the green completion line so card height does not jump. */
export const PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME =
  'shrink-0 min-h-[1.25rem] text-xs font-medium text-green-600 sm:text-sm';
