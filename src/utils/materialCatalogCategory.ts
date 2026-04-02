export const MATERIALS_LIBRARY_CATEGORIES = ['Consumables', 'PPE', 'Components'] as const;

export type MaterialsLibraryCategory = (typeof MATERIALS_LIBRARY_CATEGORIES)[number];

export function isMaterialsLibraryCategory(value: string): value is MaterialsLibraryCategory {
  return (MATERIALS_LIBRARY_CATEGORIES as readonly string[]).includes(value);
}
