import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { solveStatic } from '../../src/engine/solve';
import { productionModel } from '../../src/models/production';
import { expectClose, relErr } from '../helpers';

const solve = (overrides: Record<string, number> = {}) =>
  solveStatic(productionModel, { overrides }).values;

const invariant = (id: string, overrides: Record<string, number> = {}) =>
  solveStatic(productionModel, { overrides }).invariantResults.find((r) => r.id === id)!;

describe('T5xx / T6xx — production model', () => {
  it('T501 factor payments exhaust output', () => {
    const r = invariant('factor-exhaustion');
    expect(r.passed).toBe(true);
    expect(r.relError).toBeLessThan(1e-12);
  });

  it('T502 factor exhaustion holds at every parameter value', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        (A, K, L) => {
          const v = solve({ A, K, L });
          return relErr(v.MPK! * v.K! + v.MPL! * v.L!, v.Y!) < 1e-9;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('T503 factor shares are one third and two thirds everywhere', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        (A, K, L) => {
          const v = solve({ A, K, L });
          return (
            relErr(v.capitalShare!, 1 / 3) < 1e-12 && relErr(v.labourShare!, 2 / 3) < 1e-12
          );
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('T504 constant returns to scale: scale both inputs, scale output', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (lambda) => {
          const base = solve();
          const scaled = solve({ K: 1000 * lambda, L: 1000 * lambda });
          return relErr(scaled.Y!, base.Y! * lambda) < 1e-9;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('T512 invariant tolerance is relative, so it works at any scale', () => {
    expect(invariant('factor-exhaustion', { K: 1e9, L: 1e9 }).passed).toBe(true);
    expect(invariant('factor-exhaustion', { K: 1e-9, L: 1e-9 }).passed).toBe(true);
  });

  it('T601 doubling capital alone raises output 26%, not 100%', () => {
    const v = solve({ K: 2000 });
    expect(v.Y!).toBe(1259.9210498948728);
    expectClose(v.Y! / solve().Y!, Math.cbrt(2), 1e-12);
  });

  it('T602 doubling both inputs doubles output', () => {
    expect(solve({ K: 2000, L: 2000 }).Y!).toBe(1999.9999999999993);
    expectClose(solve({ K: 2000, L: 2000 }).Y!, 2000, 1e-12);
  });

  it('T603 doubling productivity doubles output — no diminishing returns to TFP', () => {
    expectClose(solve({ A: 2 }).Y! / solve().Y!, 2, 1e-12);
  });

  it('T604 ten-fold productivity, ten-fold output', () => {
    expectClose(solve({ A: 10 }).Y! / solve().Y!, 10, 1e-12);
  });

  it('T605 a 27-fold capital gap explains only a 3-fold income gap', () => {
    const poor = solve({ K: 1000, L: 1000 });
    const rich = solve({ K: 27000, L: 1000 });
    expectClose(rich.k! / poor.k!, 27, 1e-12);
    expectClose(rich.y! / poor.y!, 3, 1e-12);
  });

  it('T606 explaining a 30-fold income gap with capital alone needs 27,000× capital', () => {
    const poor = solve({ K: 1000, L: 1000 });
    const rich = solve({ K: 1000 * 27000, L: 1000 });
    expectClose(rich.y! / poor.y!, 30, 1e-12);
    expect(Math.pow(30, 3)).toBe(27000);
  });

  it('T607 y = A·k^(1/3) is the same statement as Y/L', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        (A, K, L) => {
          const v = solve({ A, K, L });
          return relErr(v.y!, A * Math.cbrt(v.k!)) < 1e-12;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('T608 MPK equals the numeric derivative of output with respect to capital', () => {
    const K = 1000;
    const h = 1e-4 * K;
    const up = solve({ K: K + h }).Y!;
    const down = solve({ K: K - h }).Y!;
    expectClose(solve().MPK!, (up - down) / (2 * h), 1e-6);
  });

  it('T609 MPL equals the numeric derivative with respect to labour', () => {
    const L = 1000;
    const h = 1e-4 * L;
    const up = solve({ L: L + h }).Y!;
    const down = solve({ L: L - h }).Y!;
    expectClose(solve().MPL!, (up - down) / (2 * h), 1e-6);
  });

  it('T610 break it: increasing returns makes factor payments exceed output', () => {
    // alphaK = 1 with alphaL still 2/3 means the exponents sum to 5/3.
    const broken = solveStatic(productionModel, { overrides: { alphaK: 1 } });
    const exhaustion = broken.invariantResults.find((r) => r.id === 'factor-exhaustion')!;
    const crs = broken.invariantResults.find((r) => r.id === 'constant-returns')!;
    expect(crs.passed).toBe(false);
    expect(exhaustion.passed).toBe(false);
    // Payments now come to 5/3 of output. Somebody has to lose money.
    expectClose(exhaustion.lhs / exhaustion.rhs, 5 / 3, 1e-12);
    // And capital alone now generates unbounded growth.
    const doubled = solveStatic(productionModel, { overrides: { alphaK: 1, K: 2000 } }).values;
    expectClose(doubled.Y! / broken.values.Y!, 2, 1e-12);
  });

  it('T611 zero capital gives zero output and a flagged marginal product', () => {
    const solution = solveStatic(productionModel, { overrides: { K: 0 } });
    expect(solution.values.Y).toBe(0);
    expect(solution.diagnostics.some((d) => d.code === 'non-finite' && d.varId === 'MPK')).toBe(
      true,
    );
  });

  it('T612 zero labour is handled the same way', () => {
    const solution = solveStatic(productionModel, { overrides: { L: 0 } });
    expect(solution.values.Y).toBe(0);
    expect(solution.diagnostics.some((d) => d.code === 'non-finite')).toBe(true);
  });
});
