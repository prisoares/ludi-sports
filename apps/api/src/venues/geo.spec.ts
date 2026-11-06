import { distanceKm } from './geo';

describe('distanceKm', () => {
  it('computes POA downtown to Partenon roughly', () => {
    const km = distanceKm(-30.0346, -51.2177, -30.0585, -51.1736);
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(8);
  });
});
