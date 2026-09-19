import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { solveDynamic } from '../../src/engine/solve';
import type { Shock } from '../../src/engine/types';
import { GOLDEN_RULE_S, solowModel, solowSteadyState } from '../../src/models/solow';
import { expectClose, relErr } from '../helpers';

const run = (
  overrides: Record<string, number> = {},
  opts: { periods?: number; initialStocks?: Record<string, number>; shocks?: Shock[] } = {},
) => solveDynamic(solowModel, { overrides, ...opts });

const BASE = { A: 1, L: 1000, s: 0.2, d: 0.1 };
const SS = solowSteadyState(BASE);

describe('T4xx — dynamic solver', () => {
  it('T401 steps capital forward by the accumulation relation', () => {
    const { path } = run({}, { periods: 3 });
    expect(path![0]!.K).toBe(1000);
    expect(path![1]!.K).toBe(1100);
    expect(path![2]!.K).toBe(1196.4560230912734);
  });

  it('T402 output follows capital', () => {
    const { path } = run({}, { periods: 3 });
    expect(path![0]!.Y).toBe(999.9999999999995);
    expect(path![1]!.Y).toBe(1032.2801154563667);
    expect(path![2]!.Y).toBe(1061.6114161391636);
  });

  it('T403 the path has T + 1 entries', () => {
    expect(run({}, { periods: 10 }).path).toHaveLength(11);
    expect(run({}, { periods: 0 }).path).toHaveLength(1);
  });

  it('T404 each period is frozen, so periods cannot contaminate each other', () => {
    const { path } = run({}, { periods: 10 });
    expect(Object.isFrozen(path![5]!)).toBe(true);
    expect(() => {
      (path![5]! as Record<string, number>).K = 1;
    }).toThrow(TypeError);
    expect(path![6]!.K).toBe(run({}, { periods: 10 }).path![6]!.K);
  });

  it('T405 a stock never goes negative, and says when it was clamped', () => {
    const solution = run({ d: 5, s: 0 }, { periods: 10 });
    for (const period of solution.path!) expect(period.K!).toBeGreaterThanOrEqual(0);
    expect(solution.diagnostics.some((d) => d.code === 'stock-clamped' && d.varId === 'K')).toBe(
      true,
    );
  });

  it('T406 halving dt and doubling the periods traces the same transition', () => {
    const coarse = run({}, { periods: 10 }).path![10]!.K!;
    const fine = run({ dt: 0.5 }, { periods: 20 }).path![20]!.K!;
    expect(relErr(fine, coarse)).toBeLessThan(1e-2);
  });

  it('T407 a shock at t = 50 leaves t = 49 untouched', () => {
    const shocks: Shock[] = [{ varId: 's', to: 0.3, atPeriod: 50, label: 's rises to 30%' }];
    const base = run({}, { periods: 60 });
    const shocked = run({}, { periods: 60, shocks });
    expect(shocked.path![49]!).toEqual(base.path![49]!);
    expect(shocked.path![50]!.C).not.toBe(base.path![50]!.C);
    // Capital cannot move on impact — only next period.
    expect(shocked.path![50]!.K).toBe(base.path![50]!.K);
    expect(shocked.path![51]!.K).not.toBe(base.path![51]!.K);
  });

  it('T408 a one-time shock reverts, a permanent one does not', () => {
    const at = 20;
    const once = run({}, {
      periods: 30,
      shocks: [{ varId: 's', to: 0.5, atPeriod: at, label: 'one year of thrift', kind: 'one-time' }],
    });
    const forever = run({}, {
      periods: 30,
      shocks: [{ varId: 's', to: 0.5, atPeriod: at, label: 'permanent thrift', kind: 'permanent' }],
    });
    expect(once.path![at]!.s).toBe(0.5);
    expect(once.path![at + 1]!.s).toBe(0.2);
    expect(forever.path![at + 1]!.s).toBe(0.5);
  });

  it('T409 is deterministic over 500 periods', () => {
    const a = run({}, { periods: 500 }).path!;
    const b = run({}, { periods: 500 }).path!;
    expect(a).toEqual(b);
  });

  it('T410 solves 200 periods well inside budget', () => {
    const t0 = performance.now();
    run({}, { periods: 200 });
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('T7xx — the Solow model', () => {
  it('T701 closed-form steady-state capital', () => {
    expectClose(SS.K, 2828.427124746189, 1e-12);
  });

  it('T702 closed-form steady-state output', () => {
    expectClose(SS.Y, 1414.2135623730942, 1e-12);
  });

  it('T703 steady-state output per worker is the square root of s/d', () => {
    expectClose(SS.y, 1.4142135623730943, 1e-12);
    expectClose(SS.y, Math.SQRT2, 1e-12);
    expectClose(SS.y, Math.pow(BASE.A, 1.5) * Math.sqrt(BASE.s / BASE.d), 1e-12);
  });

  it('T509 investment equals depreciation at the steady state', () => {
    expectClose(BASE.s * SS.Y, BASE.d * SS.K, 1e-12);
    expectClose(BASE.s * SS.Y, 282.84271247461885, 1e-12);
  });

  it('T704 MILESTONE: the simulation reaches the algebra', () => {
    const solution = run({}, { periods: 500 });
    const final = solution.path![500]!;
    expect(relErr(final.K!, SS.K)).toBeLessThan(1e-9);
    expect(relErr(final.y!, SS.y)).toBeLessThan(1e-9);
    expect(solution.converged).toBe(true);
  });

  it('T705 and it does so at every calibration', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.05, max: 0.5, noNaN: true }),
        fc.double({ min: 0.02, max: 0.2, noNaN: true }),
        fc.double({ min: 0.5, max: 5, noNaN: true }),
        (s, d, A) => {
          const closed = solowSteadyState({ A, L: 1000, s, d });
          const simulated = run({ A, s, d }, { periods: 3000 }).path![3000]!;
          return relErr(simulated.K!, closed.K) < 1e-5;
        },
      ),
      { numRuns: 25 },
    );
  });

  it('T706 converges down from above, monotonically', () => {
    const { path } = run({}, { periods: 300, initialStocks: { K: 2 * SS.K } });
    for (let t = 1; t < path!.length; t += 1) {
      expect(path![t]!.K!).toBeLessThanOrEqual(path![t - 1]!.K!);
    }
    expect(relErr(path![300]!.K!, SS.K)).toBeLessThan(1e-6);
  });

  it('T707 recovers from capital destruction to the same steady state', () => {
    const { path } = run({}, { periods: 300, initialStocks: { K: SS.K / 2 } });
    for (let t = 1; t < path!.length; t += 1) {
      expect(path![t]!.K!).toBeGreaterThanOrEqual(path![t - 1]!.K!);
    }
    expect(relErr(path![300]!.K!, SS.K)).toBeLessThan(1e-6);
  });

  it('T708 the half-life of convergence is about ten years', () => {
    const mpkStar = (1 / 3) * (SS.Y / SS.K);
    const gain = 1 + BASE.s * mpkStar - BASE.d;
    const analytic = Math.log(0.5) / Math.log(gain);
    expectClose(analytic, 10.04664924971326, 1e-6);

    // Empirically, starting near the steady state so the linear rate applies.
    const K0 = 0.99 * SS.K;
    const { path } = run({}, { periods: 40, initialStocks: { K: K0 } });
    const halfway = K0 + (SS.K - K0) / 2;
    const t = path!.findIndex((p) => p.K! >= halfway);
    expect(Math.abs(t - analytic)).toBeLessThan(1);
  });

  it('T709 long-run growth is zero without productivity growth', () => {
    const { path } = run({}, { periods: 500 });
    const growth = relErr(path![500]!.Y!, path![499]!.Y!);
    expect(growth).toBe(0);
  });

  it('T710 a 50% higher savings rate buys 22% more output, and no growth', () => {
    const higher = solowSteadyState({ ...BASE, s: 0.3 });
    expectClose(higher.K, 5196.152422706629, 1e-12);
    expectClose(higher.y / SS.y, 1.224744871391589, 1e-12);
    expectClose(higher.K / SS.K, 1.8371173070873834, 1e-12);
    expectClose(higher.y, Math.sqrt(3), 1e-12);

    const { path } = run({ s: 0.3 }, { periods: 500 });
    expect(relErr(path![500]!.Y!, path![499]!.Y!)).toBe(0);
  });

  it('T711 doubling the savings rate raises output per worker by only 41%', () => {
    const doubled = solowSteadyState({ ...BASE, s: 0.4 });
    expectClose(doubled.y / SS.y, Math.SQRT2, 1e-12);
  });

  it('T712 doubling productivity raises output per worker more than twofold', () => {
    const doubled = solowSteadyState({ ...BASE, A: 2 });
    expectClose(doubled.y / SS.y, Math.pow(2, 1.5), 1e-12);
    expectClose(doubled.y / SS.y, 2.8284271247461903, 1e-12);
  });

  it('T713 the golden-rule savings rate equals the capital share', () => {
    let best = 0;
    let bestS = 0;
    for (let s = 1e-4; s < 1; s += 1e-4) {
      const c = solowSteadyState({ ...BASE, s }).c;
      if (c > best) {
        best = c;
        bestS = s;
      }
    }
    expect(Number(bestS.toFixed(4))).toBe(0.3333);
    expectClose(bestS, GOLDEN_RULE_S, 1e-3);
  });

  it('T714 golden-rule consumption beats both saving too little and too much', () => {
    const golden = solowSteadyState({ ...BASE, s: 1 / 3 }).C;
    const thrifty = solowSteadyState({ ...BASE, s: 0.5 }).C;
    expectClose(golden, 1217.1612389003685, 1e-12);
    expectClose(SS.C, 1131.3708498984754, 1e-12);
    expectClose(thrifty, 1118.0339887498942, 1e-12);
    expect(golden).toBeGreaterThan(SS.C);
    expect(golden).toBeGreaterThan(thrifty);
  });

  it('T715 saving nothing runs the capital stock down to nothing', () => {
    const solution = run({ s: 0 }, { periods: 500 });
    // K decays geometrically at (1 - d) per year: 1000 × 0.9^500 ≈ 1.3e-20.
    expect(solution.path![500]!.K!).toBeLessThan(1e-19);
    // Output only decays as the cube root of capital, so it is still ~2e-5 here.
    // Diminishing returns cut both ways, and this is the direction nobody expects.
    expect(solution.path![500]!.Y!).toBeLessThan(1e-4);
    expect(solution.path![500]!.Y!).toBeGreaterThan(0);
    expect(solution.converged).toBe(true);
  });

  it('T716 saving everything is arithmetically fine and economically absurd', () => {
    const solution = run({ s: 1 }, { periods: 500 });
    const closed = solowSteadyState({ ...BASE, s: 1 });
    expect(relErr(solution.path![500]!.K!, closed.K)).toBeLessThan(1e-9);
    expect(solution.path![500]!.C!).toBe(0);
  });

  it('T717 with no depreciation there is no steady state, and it says so', () => {
    const solution = run({ d: 0 }, { periods: 200 });
    expect(solution.converged).toBe(false);
    expect(solution.diagnostics.some((d) => d.code === 'no-steady-state')).toBe(true);
    expect(solution.path![200]!.K!).toBeGreaterThan(SS.K * 10);
  });

  it('T718 too much depreciation for a one-year step oscillates, and says so', () => {
    const closed = solowSteadyState({ ...BASE, d: 2 });
    const solution = run({ d: 2 }, { periods: 25, initialStocks: { K: 1.2 * closed.K } });
    expect(solution.diagnostics.some((d) => d.code === 'oscillation' && d.varId === 'K')).toBe(
      true,
    );
  });
});

describe('stocks supplied as overrides', () => {
  it('an override on a stock sets where it starts', () => {
    // Silently ignoring this made a calibration look applied when it was not.
    const solution = run({ K: 4000 }, { periods: 3 });
    expect(solution.path![0]!.K).toBe(4000);
    // 4,000 sits above this calibration's steady state of 2,828, so capital
    // falls from there. Starting high and starting low both work.
    expect(solution.path![1]!.K!).toBeLessThan(4000);
    expect(run({ K: 500 }, { periods: 3 }).path![1]!.K!).toBeGreaterThan(500);
  });

  it('an explicit initial stock still wins over the override', () => {
    const solution = run({ K: 4000 }, { periods: 1, initialStocks: { K: 500 } });
    expect(solution.path![0]!.K).toBe(500);
  });

  it('and it converges to the same steady state either way', () => {
    const fromLow = run({ K: 400 }, { periods: 500 }).path![500]!.K!;
    const fromHigh = run({ K: 9000 }, { periods: 500 }).path![500]!.K!;
    expectClose(fromLow, SS.K, 1e-9);
    expectClose(fromHigh, SS.K, 1e-9);
  });
});
