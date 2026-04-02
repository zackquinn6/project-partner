/** Must match DB `tools_category_required_chk` and admin Tools Library select options. */
export const TOOLS_LIBRARY_CATEGORIES = ['PPE', 'Hand Tool', 'Power Tool', 'Other'] as const;

export type ToolsLibraryCategory = (typeof TOOLS_LIBRARY_CATEGORIES)[number];

export function isValidToolsLibraryCategory(value: string): value is ToolsLibraryCategory {
  return (TOOLS_LIBRARY_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Infer a valid catalog category for inserts/imports when the row has no explicit category.
 * Uses tool name and optional hint text (description, import category column, etc.).
 */
export function inferToolsLibraryCategoryFromNameAndHints(
  toolName: string,
  hints?: string | null
): ToolsLibraryCategory {
  const text = `${hints ?? ''} ${toolName}`.toLowerCase();
  if (
    /\b(ppe|glove|goggles|safety glasses|hard hat|respirator|ear plug|earplug|vest|high-vis|mask)\b/.test(
      text
    )
  ) {
    return 'PPE';
  }
  if (
    /\b(drill|saw|circular|jigsaw|miter|table saw|router|planer|sander|grinder|oscillating|impact driver|nail gun|rotary|multitool|power tool|powered|battery|circular|reciprocating)\b/.test(
      text
    )
  ) {
    return 'Power Tool';
  }
  if (/\b(bucket|sponge|paper towels?|flashlight)\b/.test(text)) {
    return 'Other';
  }
  if (
    /\b(wrench|hammer|plier|pliers|chisel|screwdriver|pry|bar clamp|level|square|knife|trowel|float|mallet|stud finder|tape measure|putty knife)\b/.test(
      text
    )
  ) {
    return 'Hand Tool';
  }
  return 'Other';
}

export function resolveToolsLibraryCategoryForInsert(
  toolName: string,
  explicitCategory?: string | null,
  hints?: string | null
): ToolsLibraryCategory {
  const trimmed = explicitCategory?.trim();
  if (trimmed && isValidToolsLibraryCategory(trimmed)) return trimmed;
  return inferToolsLibraryCategoryFromNameAndHints(toolName, hints ?? explicitCategory);
}
