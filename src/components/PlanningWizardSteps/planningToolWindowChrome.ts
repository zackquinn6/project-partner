/**
 * Shared visual chrome for windows opened from Planning Studio
 * (and matching partner-tool dialogs): headers, titles, body padding, shell size.
 */

import { cn } from '@/lib/utils';

/** Border, blur, horizontal padding — use under custom header layouts (e.g. multi-row). */
export const PLANNING_TOOL_WINDOW_HEADER_SURFACE_CLASSNAME =
  'border-b border-border bg-background/95 px-4 pt-4 pb-3 text-left backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 md:pt-5 md:pb-4';

/** Standard single-row header (title + actions). */
export const PLANNING_TOOL_WINDOW_HEADER_CLASSNAME = cn(
  'flex shrink-0 flex-row items-start justify-between gap-3',
  PLANNING_TOOL_WINDOW_HEADER_SURFACE_CLASSNAME
);

/** Primary title in the window header. */
export const PLANNING_TOOL_WINDOW_TITLE_CLASSNAME =
  'text-lg font-bold leading-tight tracking-tight text-foreground md:text-xl';

/** Muted line under the title (optional). */
export const PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME =
  'mt-1 text-sm font-normal leading-snug text-muted-foreground';

/** Main scrollable content area — matches header horizontal rhythm. */
export const PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME =
  'px-4 py-4 md:px-6 md:py-6';

/**
 * Typical inner tab / toolbar strip under the header (tabs, filters).
 * Slightly tighter vertical padding than the main body.
 */
export const PLANNING_TOOL_WINDOW_SECONDARY_STRIP_CLASSNAME =
  'border-b bg-background px-4 py-3 md:px-6 md:py-3';

/**
 * Shared primary CTA for planning tool windows (Save and Close, Complete, etc.).
 * Keep in sync with PlanningToolWindowHeaderActions.
 */
export const PLANNING_TOOL_PRIMARY_CTA_CLASSNAME =
  'bg-green-800 text-white shadow-sm hover:bg-green-900 focus-visible:ring-green-800';

/** Soft success surface for completed states inside planning tools. */
export const PLANNING_TOOL_SUCCESS_SURFACE_CLASSNAME =
  'border-green-500/30 bg-green-500/5 text-green-800 dark:text-green-300';

/** Soft warning surface for incomplete / attention states. */
export const PLANNING_TOOL_WARNING_SURFACE_CLASSNAME =
  'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200';
