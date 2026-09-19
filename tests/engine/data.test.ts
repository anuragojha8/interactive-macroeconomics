import { describe, expect, it } from 'vitest';
import { datasets, getDataset } from '../../src/data/manifest';

describe('T17xx — data provenance', () => {
  it('T1701 every bundled dataset carries a complete manifest', () => {
    for (const d of datasets) {
      const m = d.manifest;
      for (const field of [
        'id',
        'title',
        'source',
        'seriesId',
        'retrieved',
        'units',
        'transformation',
        'license',
      ] as const) {
        expect(m[field], `${m.id ?? 'unknown'} is missing ${field}`).toBeTruthy();
      }
      expect(Date.parse(m.retrieved), `${m.id} has an unparseable retrieval date`).not.toBeNaN();
    }
  });

  it('T1704 observations run forward in time with no duplicates', () => {
    for (const d of datasets) {
      const periods = d.observations.map((o) => o.period);
      expect(new Set(periods).size, `${d.manifest.id} repeats a period`).toBe(periods.length);
      expect([...periods].sort(), `${d.manifest.id} is out of order`).toEqual(periods);
      for (const o of d.observations) {
        expect(Number.isFinite(o.value), `${d.manifest.id} has a non-finite value`).toBe(true);
      }
    }
  });

  it('refuses to serve a dataset that was never fetched', () => {
    expect(() => getDataset('us-gdp')).toThrow(/must be fetched, not typed/);
  });
});
