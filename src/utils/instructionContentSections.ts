import type { ContentSection } from "@/interfaces/Project";

export function isInstructionWarningType(type: ContentSection["type"] | undefined): boolean {
  return type === "safety-warning" || type === "warning";
}

/** DB / migration rows may use `standard` or `tip`; render and edit like `text`. */
export function isInstructionProseSectionType(type: ContentSection["type"] | undefined): boolean {
  return type === "text" || type === "standard" || type === "tip";
}

/** Warnings first; preserves relative order within warnings and within non-warnings. */
export function orderSectionsWithSafetyFirst(sections: ContentSection[]): ContentSection[] {
  const safety = sections.filter((s) => isInstructionWarningType(s.type));
  const rest = sections.filter((s) => !isInstructionWarningType(s.type));
  return [...safety, ...rest];
}
