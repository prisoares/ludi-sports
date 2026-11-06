/** Pure helpers for map-fee billing window (unit-tested without Nest schedule ESM). */

export function priorMonthWindow(ref: Date) {
  const year =
    ref.getMonth() === 0 ? ref.getFullYear() - 1 : ref.getFullYear();
  const month = ref.getMonth() === 0 ? 12 : ref.getMonth(); // 1–12 prior
  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const dueAt = new Date(
    Date.UTC(ref.getFullYear(), ref.getMonth(), 10, 23, 59, 59),
  );
  return { year, month, periodStart, periodEnd, dueAt };
}
