/** Pad chart data to a fixed slot count — real points stay left, empty slots on the right. */
export const CHART_SLOT_COUNT = 5;
export const EMPTY_SLOT_LABEL = 'N/A';

export function padChartSlotsLeft<T>(points: T[], createEmptySlot: () => T, slotCount = CHART_SLOT_COUNT): T[] {
  const real = points.slice(-slotCount);
  const padded = [...real];
  while (padded.length < slotCount) {
    padded.push(createEmptySlot());
  }
  return padded;
}
