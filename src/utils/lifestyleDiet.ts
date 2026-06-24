/** Food-group chip fields stored together in patient_lifestyle.diet_food_groups JSON. */

export const DIET_FOOD_GROUP_FIELDS = [
  'dietGroupFruitsVeg',
  'dietGroupWholeGrains',
  'dietGroupProtein',
  'dietGroupDairy',
  'dietGroupProcessed',
  'dietGroupFastFood',
  'dietGroupSugary',
] as const;

export type DietFoodGroupField = (typeof DIET_FOOD_GROUP_FIELDS)[number];

export function buildDietFoodGroups(data: Record<string, unknown>): Record<string, string> {
  const groups: Record<string, string> = {};
  for (const field of DIET_FOOD_GROUP_FIELDS) {
    groups[field] = String(data[field] ?? 'unknown');
  }
  return groups;
}

export function flattenDietFoodGroups(raw: Record<string, unknown>): Record<string, string> {
  const stored = raw.dietFoodGroups;
  const parsed =
    typeof stored === 'string'
      ? (() => {
          try {
            return JSON.parse(stored);
          } catch {
            return {};
          }
        })()
      : (stored as Record<string, string> | null | undefined) ?? {};

  const flat: Record<string, string> = {};
  for (const field of DIET_FOOD_GROUP_FIELDS) {
    flat[field] = parsed[field] ?? 'unknown';
  }
  return flat;
}

export function stripDietFoodGroupFields(payload: Record<string, unknown>): void {
  for (const field of DIET_FOOD_GROUP_FIELDS) {
    delete payload[field];
  }
}
