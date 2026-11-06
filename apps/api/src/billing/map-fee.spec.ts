import { priorMonthWindow } from './map-fee.util';

describe('priorMonthWindow', () => {
  it('January ref → December prior year', () => {
    const w = priorMonthWindow(new Date('2026-01-15T12:00:00Z'));
    expect(w.year).toBe(2025);
    expect(w.month).toBe(12);
  });

  it('September ref → August same year', () => {
    const w = priorMonthWindow(new Date('2026-09-22T12:00:00Z'));
    expect(w.year).toBe(2026);
    expect(w.month).toBe(8);
  });
});
