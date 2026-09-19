import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { reconcile } from '../../src/engine/reconcile';
import { solveDynamic, solveStatic } from '../../src/engine/solve';
import { circularFlowModel } from '../../src/models/circularFlow';
import { bathtubModel, bathtubSteadyState } from '../../src/models/kernel/bathtub';
import {
  adjustmentFactor,
  clearingPrice,
  fixedPointModel,
} from '../../src/models/kernel/fixedpoint';
import { ledgerModel } from '../../src/models/kernel/ledger';
import { solowModel } from '../../src/models/solow';
import { models } from '../../src/models/registry';
import {
  thermostatBangBangModel,
  thermostatConstantModel,
  thermostatProportionalModel,
  thermostatSteadyStates,
} from '../../src/models/kernel/thermostat';
import { exogenousAffecting, invariantInputs } from '../../src/engine/graph';
import { restate } from '../../src/models/solow';
import {
  inertCandidateModel,
  roundingNoiseModel,
  throwingInvariantModel,
} from '../fixtures';
import { expectClose, expectNear, relErr } from '../helpers';

describe('T8xx — chapter 0: the kernel', () => {
  it('T801 the bathtub fills by inflow minus outflow', () => {
    const { path } = solveDynamic(bathtubModel, { periods: 3 });
    expect(path!.map((p) => Number(p.S!.toFixed(10)))).toEqual([0, 10, 19, 27.1]);
  });

  it('T802 and settles where the drain matches the tap', () => {
    const solution = solveDynamic(bathtubModel, { periods: 200 });
    expectClose(solution.path![200]!.S!, bathtubSteadyState(10, 0.1), 1e-6);
    expectClose(solution.path![200]!.S!, 100, 1e-6);
    // At rest the two flows are equal — which is what "steady state" means.
    expectClose(solution.path![200]!.outflow!, 10, 1e-6);
    expect(solution.converged).toBe(true);
  });

  it('T803 a tub with no drain never settles, and says so', () => {
    const solution = solveDynamic(bathtubModel, { overrides: { drainRate: 0 }, periods: 200 });
    expect(solution.converged).toBe(false);
    expect(solution.diagnostics.some((d) => d.code === 'no-steady-state')).toBe(true);
    expectClose(solution.path![200]!.S!, 2000, 1e-9);
  });

  it('T803b the steady state does not depend on where you start', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 400, noNaN: true }), (S0) => {
        const solution = solveDynamic(bathtubModel, { periods: 300, initialStocks: { S: S0 } });
        return relErr(solution.path![300]!.S!, 100) < 1e-6;
      }),
      { numRuns: 30 },
    );
  });

  it('T804 editing one ledger entry breaks the balance sheet', () => {
    const balanced = solveStatic(ledgerModel);
    expect(balanced.invariantResults.every((r) => r.passed)).toBe(true);
    expectClose(balanced.values.assets!, 60, 1e-12);
    expectClose(balanced.values.funding!, 60, 1e-12);

    const broken = solveStatic(ledgerModel, { overrides: { cash: 50 } });
    const failed = broken.invariantResults.filter((r) => !r.passed);
    expect(failed.map((r) => r.id)).toEqual(['balance-sheet-balances']);
    expectClose(failed[0]!.lhs, 70, 1e-12);
    expectClose(failed[0]!.rhs, 60, 1e-12);
  });

  it('T805 and it balances again once something compensates', () => {
    // Ten more in the tin, funded by ten more borrowed.
    const fixed = solveStatic(ledgerModel, { overrides: { cash: 50, loan: 35 } });
    expect(fixed.invariantResults.every((r) => r.passed)).toBe(true);
  });

  it('T805b the app can say what would put it right', () => {
    const problems = reconcile(ledgerModel, { cash: 50 });
    expect(problems).toHaveLength(1);
    expect(problems[0]!.invariantId).toBe('balance-sheet-balances');
    const byVar = new Map(problems[0]!.options.map((o) => [o.varId, o.to]));
    // Any one of these, on its own, restores the identity.
    expectClose(byVar.get('cash')!, 40, 1e-9);
    expectClose(byVar.get('loan')!, 35, 1e-9);
    expectClose(byVar.get('equity0')!, 40, 1e-9);
    expectClose(byVar.get('revenue')!, 25, 1e-9);
    expectClose(byVar.get('inventory')!, 10, 1e-9);
  });

  it('T806 three thermostats, one physics', () => {
    const physicsIds = ['heat-loss', 'temperature-accumulation'];
    const models = [
      thermostatConstantModel,
      thermostatBangBangModel,
      thermostatProportionalModel,
    ];
    for (const id of physicsIds) {
      const relations = models.map((m) => m.relations.find((r) => r.id === id)!);
      // Not merely equivalent — the identical relation object.
      expect(relations[1]!.compute).toBe(relations[0]!.compute);
      expect(relations[2]!.compute).toBe(relations[0]!.compute);
    }
    // And exactly one relation differs.
    const rules = models.map((m) => m.relations.find((r) => r.id === 'control-rule')!);
    expect(rules[0]!.compute).not.toBe(rules[1]!.compute);
    expect(rules[1]!.compute).not.toBe(rules[2]!.compute);
    for (const rule of rules) expect(rule.kind).toBe('behavior');
  });

  it('T807 swapping only the rule changes where the room ends up', () => {
    const p = { Tout: 5, target: 21, maxHeat: 2, gain: 0.5, loss: 0.1 };
    const at = (m: Parameters<typeof solveDynamic>[0]) =>
      solveDynamic(m, { periods: 400 }).path![400]!.T!;

    // Open loop: half power balances the leak at 15°, and the target is ignored.
    expectClose(at(thermostatConstantModel), thermostatSteadyStates.constant(p), 1e-9);
    expectClose(at(thermostatConstantModel), 15, 1e-9);

    // Proportional: settles short of target, forever. Steady-state error is what
    // this rule does, not a bug in it.
    expectClose(at(thermostatProportionalModel), thermostatSteadyStates.proportional(p), 1e-6);
    expectClose(at(thermostatProportionalModel), 11 / 0.6, 1e-6);
    expect(at(thermostatProportionalModel)).toBeLessThan(p.target);

    // On/off: never rests. It hunts around the target.
    const bang = solveDynamic(thermostatBangBangModel, { periods: 60 });
    const tail = bang.path!.slice(-20).map((s) => s.T!);
    expect(Math.max(...tail) - Math.min(...tail)).toBeGreaterThan(0.5);
    expect(Math.max(...tail)).toBeGreaterThan(p.target);
    expect(Math.min(...tail)).toBeLessThan(p.target);
  });

  it('T808 groping for a price finds the one the algebra names', () => {
    const p = { a: 100, b: 2, c: 20, e: 3 };
    expectClose(clearingPrice(p), 16, 1e-12);
    const solution = solveDynamic(fixedPointModel, { periods: 200 });
    expectClose(solution.path![200]!.p!, 16, 1e-9);
    // And at that price nobody is short of anything. Excess demand genuinely
    // reaches zero, so this one is an absolute comparison, not a relative one.
    expectNear(solution.path![200]!.ED!, 0, 1e-9);
    expect(solution.converged).toBe(true);
  });

  it('T808b it finds it from any starting price', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (p0) => {
        const solution = solveDynamic(fixedPointModel, { periods: 300, initialStocks: { p: p0 } });
        return relErr(solution.path![300]!.p!, 16) < 1e-6;
      }),
      { numRuns: 30 },
    );
  });

  it('T809 adjust too fast and the market never clears', () => {
    expectClose(adjustmentFactor({ b: 2, e: 3, lambda: 0.1, dt: 1 }), 0.5, 1e-12);
    expectClose(adjustmentFactor({ b: 2, e: 3, lambda: 0.5, dt: 1 }), -1.5, 1e-12);

        const solution = solveDynamic(fixedPointModel, { overrides: { lambda: 0.5 }, periods: 60 });
    expect(solution.converged).toBe(false);
    // Divergence is content, not a bug: "the market clears" is an assumption
    // about a process, and here the process does not end. The search drives the
    // price below zero and the run stops rather than clamping it, which would
    // have shown a tidy bounded oscillation that never happened.
    expect(solution.diagnostics.some((d) => d.code === 'infeasible')).toBe(true);
    expect(solution.diagnostics.some((d) => d.code === 'stock-clamped')).toBe(false);
    for (const period of solution.path!) expect(period.p!).toBeGreaterThanOrEqual(0);
  });

  it('T809b the boundary is where the algebra says it is', () => {
    // |1 − λ(b+e)Δt| < 1 ⇔ λ(b+e)Δt < 2.
    const converges = (lambda: number) =>
      solveDynamic(fixedPointModel, { overrides: { lambda }, periods: 400 }).converged;
    expect(converges(0.39)).toBe(true); // factor −0.95
    expect(converges(0.45)).toBe(false); // factor −1.25
  });
});

describe('T81x — chapter 1: the circular flow', () => {
  const solve = (overrides: Record<string, number> = {}) =>
    solveStatic(circularFlowModel, { overrides });

  it('T810 the identities all hold at the defaults', () => {
    const solution = solve();
    expectClose(solution.values.Y!, 1000, 1e-12);
    expectClose(solution.values.Yincome!, 1000, 1e-12);
    expectClose(solution.values.Sprivate!, 50, 1e-12);
    expectClose(solution.values.Spublic!, 50, 1e-12);
    expect(solution.invariantResults.every((r) => r.passed)).toBe(true);
  });

  it('T506 a trade deficit is a statement about saving and investment', () => {
    const v = solve().values;
    expectClose(v.Sprivate! + v.Spublic! - v.I!, v.NX!, 1e-12);
    expectClose(v.netLending!, -100, 1e-12);
  });

  it('T507 and it holds whatever the numbers are', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 900, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: -300, max: 300, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        (C, I, G, NX, T) => {
          const v = solve({ C, I, G, NX, T }).values;
          return relErr(v.netLending!, NX) < 1e-9 || Math.abs(v.netLending! - NX) < 1e-9;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('T508 the three sector balances always sum to zero', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 900, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: 0, max: 400, noNaN: true }),
        fc.double({ min: -300, max: 300, noNaN: true }),
        (C, I, G, NX) => {
          const r = solve({ C, I, G, NX }).invariantResults.find(
            (x) => x.id === 'sector-balances-sum-to-zero',
          )!;
          return r.passed;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('T811 raising spending with nobody earning more breaks the books', () => {
    const solution = solve({ G: 250 });
    const failed = solution.invariantResults.filter((r) => !r.passed);
    expect(failed.map((r) => r.id)).toEqual(['expenditure-equals-income']);
    expectClose(failed[0]!.lhs, 1050, 1e-12);
    expectClose(failed[0]!.rhs, 1000, 1e-12);

    const problems = reconcile(circularFlowModel, { G: 250 });
    const byVar = new Map(problems[0]!.options.map((o) => [o.varId, o.to]));
    // Any one of these restores it. Somebody has to have earned the extra 50.
    expectClose(byVar.get('W')!, 650, 1e-9);
    expectClose(byVar.get('Pi')!, 350, 1e-9);
    expectClose(byVar.get('G')!, 200, 1e-9);
    expectClose(byVar.get('C')!, 650, 1e-9);
    // Direct taxes cannot repair the income side: they are paid out of wages and
    // surplus, and are not a component of income.
    expect(byVar.has('T')).toBe(false);
  });

  it('T812 you cannot change one arrow alone', () => {
    const editable = ['C', 'I', 'G', 'NX', 'W', 'Pi'];
    for (const varId of editable) {
      const from = circularFlowModel.defaults[varId]!;
      const problems = reconcile(circularFlowModel, { [varId]: from + 40 });
      expect(problems.length, `${varId} broke nothing`).toBeGreaterThan(0);
      for (const problem of problems) {
        expect(problem.options.length, `${varId} → ${problem.invariantId}`).toBeGreaterThan(0);
      }
    }
  });

  it('T813 deflating and reflating returns the number you started with', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 40000, noNaN: true }),
        fc.double({ min: 20, max: 400, noNaN: true }),
        (nominalY, deflator) => {
          const r = solve({ nominalY, deflator }).invariantResults.find(
            (x) => x.id === 'deflator-round-trip',
          )!;
          return r.passed;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('T814 changing the base year changes the levels, never the growth rates', () => {
    const nominal = [1000, 1100, 1210];
    const priceBase1 = [100, 105, 110];
    // Same price history, re-based on the middle year.
    const priceBase2 = priceBase1.map((p) => (p / 105) * 100);

    const realSeries = (prices: number[]) =>
      nominal.map((nominalY, i) => solve({ nominalY, deflator: prices[i]! }).values.realY!);

    const first = realSeries(priceBase1);
    const second = realSeries(priceBase2);

    // Levels differ...
    expect(relErr(first[0]!, second[0]!)).toBeGreaterThan(0.01);
    // ...growth rates do not.
    for (let i = 1; i < nominal.length; i += 1) {
      const g1 = first[i]! / first[i - 1]! - 1;
      const g2 = second[i]! / second[i - 1]! - 1;
      expectClose(g1, g2, 1e-12);
    }
    expectClose(first[1]! / first[0]! - 1, 0.047619047619047616, 1e-9);
  });
});

describe('reconciliation edges', () => {
  it('skips a fix that would leave the variable outside its declared range', () => {
    // Stretching the trading period to 3 years would balance the ledger, but the
    // period is declared as at most 1. An out-of-range "fix" is not a fix.
    const options = reconcile(ledgerModel, { cash: 50 })[0]!.options.map((o) => o.varId);
    expect(options).not.toContain('dt');
    expect(options).toContain('loan');
  });

  it('offers nothing for a variable that cannot affect the identity', () => {
    const problems = reconcile(inertCandidateModel, { x: 5 });
    expect(problems).toHaveLength(1);
    const byVar = problems[0]!.options.map((o) => o.varId);
    expect(byVar).toContain('x');
    expect(byVar).not.toContain('y');
  });

  it('offers nothing when an identity fails only by rounding', () => {
    const problems = reconcile(roundingNoiseModel);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.relError).toBeLessThan(1e-15);
    // The only "fix" is the value it already has, which is no fix at all.
    expect(problems[0]!.options).toEqual([]);
  });

  it('returns nothing when every identity holds', () => {
    expect(reconcile(circularFlowModel)).toEqual([]);
    expect(reconcile(ledgerModel)).toEqual([]);
  });

  it('carries the reason the identity matters', () => {
    const problem = reconcile(circularFlowModel, { G: 250 })[0]!;
    expect(problem.why).toMatch(/counted twice/);
    expect(problem.invariantName).toBe('Spending equals earning');
  });
});

describe('introspection edges', () => {
  it('reports which variables an invariant reads', () => {
    expect(invariantInputs(circularFlowModel, 'expenditure-equals-income')).toEqual([
      'Y',
      'Yincome',
    ]);
  });

  it('survives an invariant whose check throws', () => {
    expect(invariantInputs(throwingInvariantModel, 'explodes')).toEqual(['z']);
  });

  it('refuses to introspect an invariant that does not exist', () => {
    expect(() => invariantInputs(circularFlowModel, 'no-such-invariant')).toThrow(
      /Unknown invariant/,
    );
  });

  it('walks back to the exogenous variables behind a value', () => {
    expect(exogenousAffecting(circularFlowModel, ['netLending'])).toEqual([
      'C',
      'G',
      'I',
      'NX',
      'T',
    ]);
    // A parameter stands for itself.
    expect(exogenousAffecting(circularFlowModel, ['deflator'])).toEqual(['deflator']);
  });

  it('refuses to restate a relation that does not exist', () => {
    expect(() => restate('no-such-relation', 'x = 1')).toThrow(/Cannot restate/);
  });
});

describe('notation hygiene', () => {
  it('no two variables in a model share a symbol', () => {
    // A shared symbol is a notation collision: the reader cannot tell which
    // quantity a page is talking about, and the symbol sheet lists it twice.
    for (const model of models) {
      const bySymbol = new Map<string, string[]>();
      for (const v of model.variables) {
        bySymbol.set(v.symbol, [...(bySymbol.get(v.symbol) ?? []), v.id]);
      }
      const collisions = [...bySymbol.entries()].filter(([, ids]) => ids.length > 1);
      expect(collisions, `${model.id}: ${JSON.stringify(collisions)}`).toEqual([]);
    }
  });

  it('every variable that appears in the symbol sheet declares where it starts', () => {
    for (const model of models) {
      for (const v of model.variables) {
        expect(typeof v.introducedIn, `${model.id}/${v.id}`).toBe('string');
        expect(v.gloss!.length, `${model.id}/${v.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('every behavioural or technological relation says what a critic would say', () => {
    for (const model of models) {
      for (const r of model.relations) {
        if (r.kind !== 'behavior' && r.kind !== 'technology') continue;
        expect(r.arguable, `${model.id}/${r.id}`).toBeDefined();
        expect(r.arguable!.length, `${model.id}/${r.id}`).toBeGreaterThan(20);
      }
    }
  });
});

describe('the two tax variables', () => {
  const income = circularFlowModel.relations.find((r) => r.id === 'income-identity')!;
  const privateSaving = circularFlowModel.relations.find((r) => r.id === 'private-saving')!;
  const publicSaving = circularFlowModel.relations.find((r) => r.id === 'public-saving')!;

  it('keeps taxes on production out of the saving identities', () => {
    // One variable cannot be both. Taxes on production sit between the buyer's
    // price and the producer's receipt; direct taxes come out of income already
    // earned. Using a single T for both double-counts, and the error hides
    // because a calibration can always be made to balance anyway.
    expect(income.inputs).toContain('Tprod');
    expect(income.inputs).not.toContain('T');
    expect(privateSaving.inputs).toContain('T');
    expect(privateSaving.inputs).not.toContain('Tprod');
    expect(publicSaving.inputs).toContain('T');
    expect(publicSaving.inputs).not.toContain('Tprod');
  });

  it('gives factor shares at factor cost that match chapter 2', () => {
    // Chapter 2 assumes a capital share of one third. Chapter 1's accounts have
    // to agree, and they only can once the tax wedge is taken out.
    const v = solveStatic(circularFlowModel).values;
    expectClose(v.Pi! / v.factorCost!, 1 / 3, 1e-9);
    expectClose(v.W! / v.factorCost!, 2 / 3, 1e-9);
    // Measured against output including taxes, the same shares look wrong.
    expect(Math.abs(v.Pi! / v.Y! - 1 / 3)).toBeGreaterThan(0.02);
  });
});

describe('state follows accumulation, not the label', () => {
  it('treats a price carried between rounds as state', () => {
    // The price in the market search is not a stock of anything, but an
    // accumulation relation carries it forward, so the engine has to hold it
    // fixed within a round exactly as it holds capital fixed.
    const p = fixedPointModel.variables.find((v) => v.id === 'p')!;
    expect(p.kind).toBe('price');
    const solution = solveDynamic(fixedPointModel, { periods: 5, initialStocks: { p: 40 } });
    expect(solution.path![0]!.p).toBe(40);
    expect(solution.path![1]!.p).not.toBe(40);
  });

  it('clamps a negative stock but stops on a negative price', () => {
    // A capital stock below zero is a modelling error worth clamping. A price
    // below zero means the search left the region where the model means
    // anything, and clamping it would misreport what happened.
    const clamped = solveDynamic(solowModel, { overrides: { d: 5, s: 0 }, periods: 5 });
    expect(clamped.diagnostics.some((d) => d.code === 'stock-clamped')).toBe(true);

    const stopped = solveDynamic(fixedPointModel, { overrides: { lambda: 0.5 }, periods: 60 });
    const infeasible = stopped.diagnostics.find((d) => d.code === 'infeasible')!;
    expect(infeasible.severity).toBe('error');
    expect(infeasible.message).toMatch(/left the region/);
    expect(stopped.path!.length).toBeLessThan(61);
  });
});
