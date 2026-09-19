import { describe, expect, it } from 'vitest';
import {
  DIMENSIONLESS,
  MONEY,
  MONEY_PER_YEAR,
  MONEY_REAL,
  PERSON,
  PER_YEAR,
  UnitMismatchError,
  YEAR,
  canonicalLabel,
  dimension,
  formatExponent,
  isDimensionless,
  u,
  unit,
  unitsEqual,
} from '../../src/engine/units';
import { productionModel } from '../../src/models/production';
import { solowModel } from '../../src/models/solow';
import { models } from '../../src/models/registry';
import { auditUnits } from '../../src/engine/graph';

describe('T1xx — unit algebra', () => {
  it('T101 multiplies $ by 1/year to give $/year', () => {
    const r = u(MONEY).mul(PER_YEAR);
    expect(r.unit.dim).toEqual(dimension({ money: 1, time: -1 }));
    expect(r.unit.label).toBe('$/year');
  });

  it('T102 divides $/year by persons', () => {
    const r = u(MONEY_PER_YEAR).div(PERSON);
    expect(r.unit.dim).toEqual(dimension({ money: 1, time: -1, people: -1 }));
    expect(r.unit.label).toBe('$/(year·person)');
  });

  it('T103 adds $ to $', () => {
    expect(u(MONEY).add(MONEY).unit.dim).toEqual(dimension({ money: 1 }));
  });

  it('T104 refuses to add $ to $/year, naming both units', () => {
    let error: unknown;
    try {
      u(MONEY).add(MONEY_PER_YEAR);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(UnitMismatchError);
    expect((error as Error).message).toContain('$');
    expect((error as Error).message).toContain('$/year');
  });

  it('T105 refuses to add $ to a dimensionless quantity', () => {
    expect(() => u(MONEY).add(DIMENSIONLESS)).toThrow(UnitMismatchError);
  });

  it('T106 gives $/$ the label "ratio"', () => {
    const r = u(MONEY).div(MONEY);
    expect(isDimensionless(r.unit.dim)).toBe(true);
    expect(r.unit.label).toBe('ratio');
  });

  it('T107 compares units by dimension, ignoring label', () => {
    const a = unit('$/year', { money: 1, time: -1 });
    const b = unit('bucks per annum', { money: 1, time: -1 });
    expect(unitsEqual(a, b)).toBe(true);
    expect(unitsEqual(a, MONEY)).toBe(false);
  });

  it('T108 warns rather than throws when real meets nominal', () => {
    const r = u(MONEY_REAL).add(MONEY);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/real and nominal/i);
  });

  it('T109 every variable in every model has a well-formed unit', () => {
    for (const model of models) {
      for (const v of model.variables) {
        expect(v.unit.label.length, `${model.id}/${v.id}`).toBeGreaterThan(0);
        for (const axis of ['money', 'time', 'people', 'goods'] as const) {
          expect(Number.isFinite(v.unit.dim[axis]), `${model.id}/${v.id}/${axis}`).toBe(true);
        }
      }
    }
  });

  it('T110 every relation derivation matches its target unit', () => {
    for (const model of models) {
      expect(auditUnits(model), model.id).toEqual([]);
    }
  });

  it('T111 accumulation without dt is a unit error — $ + $/year', () => {
    // The canonical stock/flow confusion. It must be impossible to ship.
    expect(() =>
      u(MONEY_REAL).add(u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR)),
    ).toThrow(UnitMismatchError);
  });

  it('T112 accumulation with dt resolves to $', () => {
    const r = u(MONEY_REAL).add(u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR).mul(YEAR));
    expect(r.unit.label).toBe('$');
  });

  it('T113 every dynamic model declares dt in years, defaulting to 1', () => {
    for (const model of models.filter((m) => m.timing === 'dynamic')) {
      const dt = model.variables.find((v) => v.id === 'dt');
      expect(dt, model.id).toBeDefined();
      expect(dt!.unit.dim).toEqual(dimension({ time: 1 }));
      expect(model.defaults.dt).toBe(1);
    }
  });

  it('T114 the reader-facing derivation shows the whole chain', () => {
    const accumulation = solowModel.relations.find((r) => r.id === 'capital-accumulation')!;
    const description = accumulation.unitCheck().describe();
    expect(description).toContain('$/year');
    expect(description).toContain('year');
    expect(accumulation.unitCheck().unit.label).toBe('$');
  });

  it('formats fractional exponents the way a reader would write them', () => {
    expect(formatExponent(2)).toBe('2');
    expect(formatExponent(2 / 3)).toBe('(2/3)');
    expect(formatExponent(1 / 3)).toBe('(1/3)');
    expect(canonicalLabel(dimension())).toBe('ratio');
    expect(canonicalLabel(dimension({ money: 2 }))).toBe('$^2');
  });

  it('gives total factor productivity its honest residual unit', () => {
    const A = productionModel.variables.find((v) => v.id === 'A')!;
    expect(A.unit.dim).toEqual(dimension({ money: 2 / 3, time: -1, people: -2 / 3 }));
  });
});
