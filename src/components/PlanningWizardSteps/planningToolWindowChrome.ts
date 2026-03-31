/**
 * Shared visual chrome for windows opened from the project planning workflow
 * (and matching partner-tool dialogs): headers, titles, body padding, shell size.
 */

import { cn } from '@/lib/utils';

/** Border, blur, horizontal padding — use under custom header layouts (e.g. multi-row). */
export const PLANNING_TOOL_WINDOW_HEADER_SURFACE_CLASSNAME =
  'border-b border-border bg-background/95 px-4 py-3 text-left backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 md:py-3';

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
