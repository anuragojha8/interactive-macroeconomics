import { describe, expect, it } from 'vitest';
import { solveStatic } from '../../src/engine/solve';
import { productionModel } from '../../src/models/production';
import { convergingCycle, divergingCycle, logZeroModel } from '../fixtures';
import { expectClose } from '../helpers';

describe('T3xx — static solver', () => {
  it('T301 solves production at its defaults', () => {
    const { values } = solveStatic(productionModel);
    expectClose(values.Y!, 1000, 1e-12);
    expect(values.Y!).toBe(999.9999999999995);
  });

  it('T302 prices factors at their marginal products', () => {
    const { values } = solveStatic(productionModel);
    expectClose(values.MPK!, 1 / 3, 1e-12);
    expectClose(values.MPL!, 2 / 3, 1e-12);
    expectClose(values.r!, 1 / 3, 1e-12);
    expectClose(values.w!, 2 / 3, 1e-12);
  });

  it('T303 gives per-worker quantities', () => {
    const { values } = solveStatic(productionModel);
    expectClose(values.y!, 1, 1e-12);
    expectClose(values.k!, 1, 1e-12);
  });

  it('T304 an acyclic model takes exactly one forward pass', () => {
    const solution = solveStatic(productionModel);
    expect(solution.iterations).toBeUndefined();
    expect(solution.converged).toBe(true);
  });

  it('T305 a simultaneous block converges', () => {
    const solution = solveStatic(convergingCycle());
    expect(solution.converged).toBe(true);
    expect(solution.iterations).toBeLessThan(200);
    expectClose(solution.values.x!, 1 / 0.875, 1e-9);
    expectClose(solution.values.y!, 0.5 / 0.875, 1e-9);
    expectClose(solution.values.z!, 0.25 / 0.875, 1e-9);
  });

  it('T306 a diverging block says so instead of returning nonsense', () => {
    const solution = solveStatic(divergingCycle);
    expect(solution.converged).toBe(false);
    expect(solution.diagnostics.length).toBeGreaterThan(0);
    expect(solution.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('T307 damping changes the path, not the fixed point', () => {
    const half = solveStatic(convergingCycle(), { damping: 0.5 });
    const full = solveStatic(convergingCycle(), { damping: 1 });
    expectClose(half.values.x!, full.values.x!, 1e-9);
  });

  it('T308 a non-finite value is reported with the offending relation', () => {
    const solution = solveStatic(logZeroModel);
    const d = solution.diagnostics.find((x) => x.code === 'non-finite');
    expect(d).toBeDefined();
    expect(d!.relationId).toBe('r-log');
    expect(d!.varId).toBe('x');
    expect(solution.converged).toBe(false);
  });

  it('T309 an out-of-range parameter is flagged but used as given', () => {
    const solution = solveStatic(productionModel, { overrides: { A: 50 } });
    const d = solution.diagnostics.find((x) => x.code === 'domain-violation');
    expect(d).toBeDefined();
    expect(d!.varId).toBe('A');
    // Not silently clamped — the reader asked for 50.
    expect(solution.values.A).toBe(50);
  });

  it('T309b an override for an unknown variable is dropped with a warning', () => {
    const solution = solveStatic(productionModel, { overrides: { nonsense: 1 } });
    expect(solution.diagnostics.some((d) => d.code === 'unknown-variable')).toBe(true);
    expect(solution.values.nonsense).toBeUndefined();
  });

  it('T309c a stock that accumulates past its slider range is not a violation', () => {
    // The range on a stock describes a control, not a constraint. Capital
    // climbing past it under its own accumulation is the model working.
    const solution = solveStatic(productionModel, { overrides: { K: 99999 } });
    expect(solution.diagnostics.some((d) => d.code === 'domain-violation')).toBe(false);
    expect(solution.values.K).toBe(99999);
  });

  it('T310 is deterministic', () => {
    const first = solveStatic(productionModel).values;
    for (let i = 0; i < 1000; i += 1) {
      expect(solveStatic(productionModel).values).toEqual(first);
    }
  });

  it('T310b returns frozen values', () => {
    const { values } = solveStatic(productionModel);
    expect(Object.isFrozen(values)).toBe(true);
  });
});
