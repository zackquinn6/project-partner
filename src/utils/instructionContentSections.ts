import type { ContentSection } from "@/interfaces/Project";

export function isInstructionWarningType(type: ContentSection["type"] | undefined): boolean {
  return type === "safety-warning" || type === "warning";
}

/** Warnings first; preserves relative order within warnings and within non-warnings. */
export function orderSectionsWithSafetyFirst(sections: ContentSection[]): ContentSection[] {
  const safety = sections.filter((s) => isInstructionWarningType(s.type));
  const rest = sections.filter((s) => !isInstructionWarningType(s.type));
  return [...safety, ...rest];
}
