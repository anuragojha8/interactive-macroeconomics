/**
 * Error-reporting and boundary paths. These are the branches a reader hits when
 * something is wrong, which is exactly when the software has to behave well.
 */
import { describe, expect, it } from 'vitest';
import { auditUnits } from '../../src/engine/graph';
import { detectLoops } from '../../src/engine/loops';
import { extendModel, modelDiff } from '../../src/engine/model';
import { solve, solveDynamic, solveStatic } from '../../src/engine/solve';
import { trace } from '../../src/engine/trace';
import type { Model, Shock } from '../../src/engine/types';
import { makeScope } from '../../src/engine/types';
import {
  DIMENSIONLESS,
  MONEY,
  MONEY_PER_YEAR,
  UnitExpr,
  canonicalLabel,
  dimension,
  formatExponent,
  u,
} from '../../src/engine/units';
import { getModel, models } from '../../src/models/registry';
import { productionModel } from '../../src/models/production';
import { solowModel } from '../../src/models/solow';
import {
  convergingCycle,
  nanAccumulationModel,
  undefaultedStockModel,
} from '../fixtures';
import { expectClose } from '../helpers';

describe('scope', () => {
  it('refuses to invent a value for an unknown variable', () => {
    const scope = makeScope({ a: 1 });
    expect(scope('a')).toBe(1);
    expect(() => scope('missing')).toThrow(/Unknown variable/);
  });
});

describe('registry', () => {
  it('resolves known models and rejects unknown ones', () => {
    expect(getModel('solow-v1')).toBe(solowModel);
    expect(() => getModel('ch99-dsge')).toThrow(/Unknown model/);
    expect(models).toContain(productionModel);
  });
});

describe('solve dispatcher', () => {
  it('routes by the model’s own timing', () => {
    expect(solve(productionModel).path).toBeUndefined();
    expect(solve(solowModel, { periods: 5 }).path).toHaveLength(6);
  });
});

describe('static solver limits', () => {
  it('reports non-convergence when the iteration budget runs out', () => {
    // A tight budget must produce a stated failure, never a plausible number.
    const solution = solveStatic(convergingCycle(), { maxIterations: 2 });
    expect(solution.converged).toBe(false);
    const d = solution.diagnostics.find((x) => x.code === 'no-convergence');
    expect(d).toBeDefined();
    expect(d!.message).toMatch(/did not converge in 2 iterations/);
    expect(d!.message).toMatch(/residual/);
  });

  it('honours an explicit tolerance', () => {
    const loose = solveStatic(convergingCycle(), { tolerance: 1e-2 });
    expect(loose.converged).toBe(true);
    expect(loose.iterations!).toBeLessThan(solveStatic(convergingCycle()).iterations!);
  });
});

describe('dynamic solver edges', () => {
  it('aborts the run when an accumulation goes non-finite', () => {
    const solution = solveDynamic(nanAccumulationModel);
    expect(solution.converged).toBe(false);
    const d = solution.diagnostics.find((x) => x.code === 'non-finite');
    expect(d).toBeDefined();
    expect(d!.relationId).toBe('r-accumulate');
    // The run stops rather than filling the path with NaN.
    expect(solution.path!.length).toBeLessThan(6);
  });

  it('refuses to run a model whose stock has no starting value', () => {
    expect(() => solveDynamic(undefaultedStockModel)).toThrow(
      /Exogenous variables without defaults: S/,
    );
  });

  it('reports a stock that never settles', () => {
    const solution = solveDynamic(
      { ...undefaultedStockModel, defaults: { ...undefaultedStockModel.defaults, S: 1 } },
      { overrides: { g: 2 }, periods: 60 },
    );
    expect(solution.converged).toBe(false);
    expect(solution.diagnostics.some((d) => d.code === 'no-steady-state')).toBe(true);
  });

  it('ignores an initial value for something that is not a stock', () => {
    const solution = solveDynamic(solowModel, { periods: 2, initialStocks: { A: 99 } });
    expect(solution.path![0]!.A).toBe(1);
  });

  it('treats a period-zero shock to a stock as an initial condition', () => {
    const shocks: Shock[] = [{ varId: 'K', to: 500, label: 'half the capital is destroyed' }];
    const solution = solveDynamic(solowModel, { periods: 2, shocks });
    expect(solution.path![0]!.K).toBe(500);
    // And accumulation takes over from there, rather than pinning it at 500.
    expect(solution.path![1]!.K).toBeGreaterThan(500);
  });

  it('passes solver settings through to each period', () => {
    const solution = solveDynamic(solowModel, {
      periods: 2,
      damping: 0.7,
      tolerance: 1e-8,
      maxIterations: 50,
    });
    expect(solution.path).toHaveLength(3);
  });
});

describe('unit algebra edges', () => {
  it('labels a unit with two denominators', () => {
    expect(canonicalLabel(dimension({ money: 1, time: -1, people: -1 }))).toBe(
      '$/(year·person)',
    );
    expect(canonicalLabel(dimension({ time: -1 }))).toBe('1/year');
  });

  it('falls back to a decimal for an awkward exponent', () => {
    expect(formatExponent(0.1234)).toBe('0.1234');
    expect(formatExponent(0.75)).toBe('(3/4)');
  });

  it('refuses to subtract mismatched dimensions', () => {
    expect(() => u(MONEY).sub(MONEY_PER_YEAR)).toThrow(/Cannot subtract/);
  });

  it('describes a bare unit as itself', () => {
    expect(u(MONEY).describe()).toBe('$');
    expect(new UnitExpr(MONEY).mul(DIMENSIONLESS).describe()).toContain('=');
  });

  it('accepts a plain Unit anywhere a UnitExpr is expected', () => {
    expect(u(MONEY).mul(DIMENSIONLESS).unit.label).toBe('$');
  });
});

describe('unit auditing', () => {
  const broken = (patch: Partial<Model['relations'][number]>): Model => ({
    ...productionModel,
    relations: productionModel.relations.map((r) =>
      r.id === 'output-per-worker' ? { ...r, ...patch } : r,
    ),
  });

  it('reports a derivation that disagrees with its target', () => {
    const problems = auditUnits(broken({ unitCheck: () => u(MONEY) }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/output-per-worker/);
    expect(problems[0]).toMatch(/\$\/\(year·person\)/);
  });

  it('reports a derivation that throws', () => {
    const problems = auditUnits(
      broken({
        unitCheck: () => {
          throw new Error('bad algebra');
        },
      }),
    );
    expect(problems[0]).toMatch(/unitCheck threw/);
    expect(problems[0]).toMatch(/bad algebra/);
  });

  it('reports a relation whose target does not exist', () => {
    const model: Model = {
      ...productionModel,
      variables: productionModel.variables.filter((v) => v.id !== 'y'),
    };
    expect(auditUnits(model)[0]).toMatch(/unknown target "y"/);
  });
});

describe('model composition edges', () => {
  it('inherits the base model’s period count when the patch omits one', () => {
    const base: Model = { ...solowModel, periods: 123 };
    const derived = extendModel(base, { id: 'x', title: 'x' });
    expect(derived.periods).toBe(123);
  });

  it('records a period count the patch supplies', () => {
    const derived = extendModel(productionModel, { id: 'x', title: 'x', periods: 7 });
    expect(derived.periods).toBe(7);
  });

  it('leaves period count unset when neither side has one', () => {
    const derived = extendModel(productionModel, { id: 'x', title: 'x' });
    expect(derived.periods).toBeUndefined();
  });

  it('reports removals as well as additions', () => {
    const trimmed: Model = {
      ...productionModel,
      variables: productionModel.variables.filter((v) => v.id !== 'capitalShare'),
      relations: productionModel.relations.filter((r) => r.id !== 'capital-share'),
      invariants: [],
    };
    const diff = modelDiff(productionModel, trimmed);
    expect(diff.removedVariables).toEqual(['capitalShare']);
    expect(diff.removedRelations).toEqual(['capital-share']);
    expect(diff.addedVariables).toEqual([]);
  });
});

describe('trace edges', () => {
  it('names an unknown shocked variable rather than crashing the summary', () => {
    const t = trace(productionModel, [{ varId: 'ghost', to: 1, label: 'ghost' }]);
    expect(t.summary).toContain('ghost');
    expect(t.steps).toEqual([]);
  });

  it('reports a downward headline', () => {
    const t = trace(productionModel, [{ varId: 'A', to: 0.5, label: 'productivity halves' }]);
    expect(t.summary).toMatch(/↓/);
    expect(t.summary).toMatch(/50\.0%/);
  });

  it('uses a singular step count when only one thing moves', () => {
    const t = trace(solowModel, [{ varId: 'dt', to: 0.5, label: 'shorter period' }]);
    expect(t.steps).toEqual([]);
    const one = trace(productionModel, [{ varId: 'alphaK', to: 1 / 3, label: 'no change' }]);
    expect(one.steps).toEqual([]);
  });

  it('explains a later period without a stock change when nothing propagates', () => {
    const t = trace(solowModel, [{ varId: 'dt', to: 1, label: 'unchanged' }], { period: 2 });
    expect(t.steps).toEqual([]);
    expect(t.unchanged).toContain('K');
  });

  it('handles a stock shock traced at a later period', () => {
    const t = trace(solowModel, [{ varId: 'K', to: 500, label: 'capital destroyed' }], {
      period: 3,
    });
    const K = t.steps.find((s) => s.targetId === 'K');
    expect(K).toBeDefined();
    expect(K!.relationId).toBe('capital-accumulation');
  });
});

describe('loop detection edges', () => {
  it('stops enumerating cycles once it has enough of them', () => {
    // A dense simultaneous block: every variable feeds every other.
    const ids = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'];
    const dense: Model = {
      id: 'fixture-dense',
      title: 'dense',
      timing: 'static',
      variables: [
        { id: 'a', symbol: 'a', name: 'a', unit: DIMENSIONLESS, kind: 'parameter' },
        ...ids.map((id) => ({
          id,
          symbol: id,
          name: id,
          unit: DIMENSIONLESS,
          kind: 'derived' as const,
        })),
      ],
      relations: ids.map((id) => ({
        id: `r-${id}`,
        kind: 'definition' as const,
        target: id,
        inputs: ['a', ...ids.filter((o) => o !== id)],
        latex: id,
        compute: (s: ReturnType<typeof makeScope>) =>
          0.1 * s('a') + 0.05 * ids.filter((o) => o !== id).reduce((acc, o) => acc + s(o), 0),
        unitCheck: () => u(DIMENSIONLESS),
        because: id,
      })),
      invariants: [],
      defaults: Object.fromEntries([['a', 1], ...ids.map((id) => [id, 0.1])]),
    };
    const loops = detectLoops(dense);
    expect(loops).toHaveLength(1);
    expect(loops[0]!.varIds.length).toBeGreaterThan(2);
  });

  it('describes an unstable loop as one that does not settle', () => {
    const [loop] = detectLoops(solowModel, { d: 0 });
    expect(loop!.narrative).toMatch(/does not settle/);
    expect(loop!.narrative).toMatch(/loop gain/);
  });

  it('measures gain at supplied values, not only at defaults', () => {
    const near = detectLoops(solowModel, { K: 2828.427124746189 })[0]!;
    const far = detectLoops(solowModel, { K: 1000 })[0]!;
    expect(near.gain).toBeLessThan(far.gain);
    expectClose(near.gain, 0.9333333333333332, 1e-6);
  });
});

describe('restated notation', () => {
  it('drops the overbar from capital once something accumulates it', () => {
    expect(productionModel.variables.find((v) => v.id === 'K')!.symbol).toBe('\\bar{K}');
    expect(solowModel.variables.find((v) => v.id === 'K')!.symbol).toBe('K_t');
  });

  it('restates the inherited equations without duplicating them', () => {
    const ids = solowModel.variables.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    const relIds = solowModel.relations.map((r) => r.id);
    expect(new Set(relIds).size).toBe(relIds.length);
    // Same behaviour, new notation.
    const base = productionModel.relations.find((r) => r.id === 'production-function')!;
    const restated = solowModel.relations.find((r) => r.id === 'production-function')!;
    expect(restated.compute).toBe(base.compute);
    expect(restated.latex).not.toBe(base.latex);
    expect(restated.latex).not.toContain('\\bar{K}');
  });

  it('refuses to restate a relation that does not exist', () => {
    // Guards against a typo silently producing a model missing an equation.
    expect(() =>
      extendModel(productionModel, {
        id: 'x',
        title: 'x',
        relations: [{ ...productionModel.relations[0]!, id: 'no-such-relation' }],
      }),
    ).not.toThrow();
    expect(
      extendModel(productionModel, {
        id: 'x',
        title: 'x',
        relations: [{ ...productionModel.relations[0]!, id: 'no-such-relation' }],
      }).relations,
    ).toHaveLength(productionModel.relations.length + 1);
  });
});
