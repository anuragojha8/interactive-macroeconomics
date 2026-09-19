import { describe, expect, it } from 'vitest';
import {
  DuplicateTargetError,
  MissingDefaultError,
  MissingInputError,
  ParameterWriteError,
  StockWriteError,
  UnderdeterminedError,
  UnknownVariableError,
  analyze,
  analyzeFull,
  auditInputs,
} from '../../src/engine/graph';
import { modelDiff } from '../../src/engine/model';
import { solveStatic } from '../../src/engine/solve';
import type { Model, Relation } from '../../src/engine/types';
import { DIMENSIONLESS, u } from '../../src/engine/units';
import { productionModel } from '../../src/models/production';
import { solowModel } from '../../src/models/solow';
import { models } from '../../src/models/registry';
import { chainModel, convergingCycle } from '../fixtures';

const clone = (m: Model): Model => ({
  ...m,
  variables: [...m.variables],
  relations: [...m.relations],
  invariants: [...m.invariants],
  defaults: { ...m.defaults },
});

const noopRelation = (over: Partial<Relation>): Relation => ({
  id: 'extra',
  kind: 'definition',
  target: 'Y',
  inputs: [],
  latex: '',
  compute: () => 1,
  unitCheck: () => u(DIMENSIONLESS),
  because: '',
  ...over,
});

describe('T2xx — dependency graph', () => {
  it('T201 orders production so that inputs precede targets', () => {
    const { order } = solveStatic(productionModel);
    expect(order.indexOf('production-function')).toBeLessThan(order.indexOf('mpk'));
    expect(order.indexOf('mpk')).toBeLessThan(order.indexOf('capital-market-clearing'));
    expect(order.indexOf('capital-market-clearing')).toBeLessThan(order.indexOf('capital-share'));
  });

  it('T202 rejects two relations determining the same variable', () => {
    const m = clone(productionModel);
    m.relations.push(noopRelation({ id: 'second-Y', target: 'Y' }));
    expect(() => analyze(m)).toThrow(DuplicateTargetError);
    expect(() => analyze(m)).toThrow(/production-function/);
  });

  it('T203 rejects a relation that writes to a parameter', () => {
    const m = clone(productionModel);
    m.relations.push(noopRelation({ id: 'writes-A', target: 'A' }));
    expect(() => analyze(m)).toThrow(ParameterWriteError);
  });

  it('T203b rejects a non-accumulation relation targeting a stock', () => {
    const m = clone(productionModel);
    m.relations.push(noopRelation({ id: 'writes-K', target: 'K', kind: 'definition' }));
    expect(() => analyze(m)).toThrow(StockWriteError);
  });

  it('T204 catches a relation that reads a variable it does not declare', () => {
    const m = clone(productionModel);
    m.relations = m.relations.map((r) =>
      r.id === 'output-per-worker' ? { ...r, inputs: ['Y'] } : r,
    );
    expect(() => auditInputs(m)).toThrow(MissingInputError);
    expect(() => auditInputs(m)).toThrow(/L/);
  });

  it('T204b every shipped model declares its inputs honestly', () => {
    for (const model of models) {
      expect(() => auditInputs(model), model.id).not.toThrow();
    }
  });

  it('T205 rejects an input that is not a declared variable', () => {
    const m = clone(productionModel);
    m.relations.push(noopRelation({ id: 'ghost', target: 'y', inputs: ['nonexistent'] }));
    expect(() => analyze(m)).toThrow(UnknownVariableError);
  });

  it('T206 rejects an endogenous variable that nothing determines', () => {
    const m = clone(productionModel);
    m.variables = [
      ...m.variables,
      { id: 'orphan', symbol: 'o', name: 'orphan', unit: DIMENSIONLESS, kind: 'derived' },
    ];
    expect(() => analyze(m)).toThrow(UnderdeterminedError);
    expect(() => analyze(m)).toThrow(/orphan/);
  });

  it('T206b rejects an exogenous variable with no default', () => {
    const m = clone(productionModel);
    m.variables = [
      ...m.variables,
      { id: 'undefaulted', symbol: 'z', name: 'z', unit: DIMENSIONLESS, kind: 'parameter' },
    ];
    expect(() => analyze(m)).toThrow(MissingDefaultError);
  });

  it('T207 finds the strongly connected component in a cyclic model', () => {
    const a = analyze(convergingCycle());
    expect(a.cycles).toHaveLength(1);
    expect(a.cycles[0]).toEqual(['x', 'y', 'z']);
  });

  it('T208 reports no cycles for an acyclic model', () => {
    expect(analyze(chainModel).cycles).toEqual([]);
    expect(analyze(productionModel).cycles).toEqual([]);
  });

  it('T209 evaluation order is independent of relation array order', () => {
    const forward = clone(productionModel);
    const reversed = clone(productionModel);
    reversed.relations.reverse();
    expect(solveStatic(reversed).order).toEqual(solveStatic(forward).order);
  });

  it('T210 solow inherits every production variable and relation', () => {
    const baseVars = new Set(productionModel.variables.map((v) => v.id));
    const solowVars = new Set(solowModel.variables.map((v) => v.id));
    for (const id of baseVars) expect(solowVars.has(id), id).toBe(true);
    const ids = solowModel.relations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(solowModel.extends).toBe('production-v1');
  });

  it('T211 the chapter 2 → 3 diff is one accumulation and one new assumption', () => {
    const diff = modelDiff(productionModel, solowModel);
    expect(diff.addedParameters).toEqual(['s', 'd', 'dt']);
    expect(diff.removedVariables).toEqual([]);
    expect(diff.removedRelations).toEqual([]);
    expect(diff.addedRelations).toEqual([
      'investment',
      'depreciation-flow',
      'consumption',
      'consumption-per-worker',
      'capital-accumulation',
    ]);
    // The pedagogical claim: exactly one stock update, and the only genuinely
    // new economics is the investment rule. The rest are named flows.
    const added = solowModel.relations.filter((r) => diff.addedRelations.includes(r.id));
    expect(added.filter((r) => r.kind === 'accumulation').map((r) => r.id)).toEqual([
      'capital-accumulation',
    ]);
        // Exactly one new assumption. Consumption is derived from the expenditure
    // identity rather than assumed, so the accounting holds whatever rule sets
    // investment.
    expect(added.filter((r) => r.kind === 'behavior').map((r) => r.id)).toEqual(['investment']);
    expect(added.filter((r) => r.kind === 'identity').map((r) => r.id)).toEqual(['consumption']);
  });

  it('T211b capital is endogenous only once something accumulates it', () => {
    // Chapter 2's capital stock is frozen because no relation updates it.
    expect(analyzeFull(productionModel).exogenous.has('K')).toBe(true);
    expect(analyzeFull(solowModel).exogenous.has('K')).toBe(false);
  });
});
