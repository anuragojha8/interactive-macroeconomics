/**
 * The chart's data logic is pure and tested like the engine, because a chart
 * that renders NaN into a path is a wrong answer with a picture on it.
 */
import { describe, expect, it } from 'vitest';
import { samplePhase } from '../../src/components/viz/phase';
import { solowModel, solowSteadyState } from '../../src/models/solow';
import { expectClose } from '../helpers';

const opts = { stock: 'K', inflow: 'I', outflow: 'depreciation', max: 6000 };

describe('phase diagram data', () => {
  it('finds the crossing where the closed form says it is', () => {
    const data = samplePhase(solowModel, {}, opts);
    expect(data.plottable).toBe(true);
    expect(data.crossing).not.toBeNull();
    const closed = solowSteadyState({ A: 1, L: 1000, s: 0.2, d: 0.1 });
    expectClose(data.crossing!.k, closed.K, 1e-9);
    // At the crossing the two flows are the same number.
    expectClose(data.crossing!.flow, 0.2 * closed.Y, 1e-9);
  });

  it('emits only finite coordinates', () => {
    const data = samplePhase(solowModel, {}, opts);
    for (const s of data.samples) {
      expect(Number.isFinite(s.k)).toBe(true);
      expect(Number.isFinite(s.inflow)).toBe(true);
      expect(Number.isFinite(s.outflow)).toBe(true);
    }
    expect(Number.isFinite(data.yMax)).toBe(true);
  });

  it('reports no crossing when depreciation is switched off', () => {
    // Regression: the closed form is Infinity here, and feeding that into an
    // axis domain crashed the whole page.
    const data = samplePhase(solowModel, { d: 0 }, opts);
    expect(data.crossing).toBeNull();
    expect(data.plottable).toBe(true);
    for (const s of data.samples) expect(Number.isFinite(s.inflow)).toBe(true);
  });

  it('refuses an infinite or empty range instead of plotting nonsense', () => {
    expect(samplePhase(solowModel, {}, { ...opts, max: Infinity }).plottable).toBe(false);
    expect(samplePhase(solowModel, {}, { ...opts, max: 0 }).plottable).toBe(false);
    expect(samplePhase(solowModel, {}, { ...opts, max: -5 }).plottable).toBe(false);
  });

  it('tracks the crossing as the savings rate moves', () => {
    const wide = { ...opts, max: 12000 };
    const low = samplePhase(solowModel, { s: 0.1 }, wide).crossing!.k;
    const high = samplePhase(solowModel, { s: 0.4 }, wide).crossing!.k;
    expect(high).toBeGreaterThan(low);
    expectClose(low, solowSteadyState({ A: 1, L: 1000, s: 0.1, d: 0.1 }).K, 1e-9);
    expectClose(high, solowSteadyState({ A: 1, L: 1000, s: 0.4, d: 0.1 }).K, 1e-9);
  });

  it('reports no crossing when it lies beyond the plotted range', () => {
    // At s = 0.4 the rest point is 8,000, past a 6,000 axis. The honest answer
    // is "not in view" — which is why the page sizes the axis from the
    // simulated path rather than from a fixed number.
    const cramped = samplePhase(solowModel, { s: 0.4 }, opts);
    expect(cramped.plottable).toBe(true);
    expect(cramped.crossing).toBeNull();
    expectClose(solowSteadyState({ A: 1, L: 1000, s: 0.4, d: 0.1 }).K, 8000, 1e-9);
  });
});
