/**
 * Shared layout for project planning wizard tool steps:
 * equal card height, header/content padding, description text, and primary actions.
 */

/** Primary "Open …" actions — same height, width cap, and text size. */
export const PLANNING_WIZARD_OPEN_APP_BUTTON_CLASSNAME =
  'h-16 min-h-[4rem] w-full max-w-md justify-center text-base font-semibold whitespace-normal leading-snug px-3 py-3 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0';

/** Outer card: consistent minimum height across all tool steps. */
export const PLANNING_WIZARD_STEP_CARD_CLASSNAME =
  'flex min-h-[20rem] flex-col sm:min-h-[22rem]';

export const PLANNING_WIZARD_STEP_HEADER_CLASSNAME = 'shrink-0 p-3 sm:p-4';

export const PLANNING_WIZARD_STEP_TITLE_CLASSNAME =
  'flex items-center gap-2 text-base sm:text-lg md:text-xl';

export const PLANNING_WIZARD_STEP_CONTENT_CLASSNAME =
  'flex min-h-0 flex-1 flex-col p-3 sm:p-4';

/**
 * Fills space between description and status; centers the primary action in the card body.
 */
export const PLANNING_WIZARD_STEP_ACTION_SLOT_CLASSNAME =
  'flex min-h-0 flex-1 flex-col items-center justify-center';

/** Constrains and centers the Open button horizontally within the action slot. */
export const PLANNING_WIZARD_STEP_BUTTON_WRAP_CLASSNAME = 'mx-auto w-full max-w-md';

export const PLANNING_WIZARD_STEP_BODY_CLASSNAME =
  'flex min-h-0 flex-1 flex-col gap-3 py-4 text-center';

export const PLANNING_WIZARD_STEP_DESCRIPTION_CLASSNAME =
  'mx-auto max-w-2xl shrink-0 text-sm text-muted-foreground sm:text-base';

/** Reserves space for the green completion line so card height does not jump. */
export const PLANNING_WIZARD_STEP_STATUS_ROW_CLASSNAME =
  'shrink-0 min-h-[1.25rem] text-xs font-medium text-green-600 sm:text-sm';
