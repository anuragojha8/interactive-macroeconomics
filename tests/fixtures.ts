/** Small hand-built models for testing solver machinery in isolation. */
import type { Model, Relation, Variable } from '../src/engine/types';
import { DIMENSIONLESS, u } from '../src/engine/units';

const p = (id: string): Variable => ({
  id,
  symbol: id,
  name: id,
  unit: DIMENSIONLESS,
  kind: 'parameter',
});
const d = (id: string): Variable => ({
  id,
  symbol: id,
  name: id,
  unit: DIMENSIONLESS,
  kind: 'derived',
});

export const rel = (
  id: string,
  target: string,
  inputs: string[],
  compute: Relation['compute'],
): Relation => ({
  id,
  kind: 'definition',
  target,
  inputs,
  latex: id,
  compute,
  unitCheck: () => u(DIMENSIONLESS),
  because: id,
});

/** Acyclic chain: a → x → y → z. */
export const chainModel: Model = {
  id: 'fixture-chain',
  title: 'chain',
  timing: 'static',
  variables: [p('a'), d('x'), d('y'), d('z')],
  relations: [
    rel('r-x', 'x', ['a'], (s) => s('a') * 2),
    rel('r-y', 'y', ['x'], (s) => s('x') + 1),
    rel('r-z', 'z', ['y'], (s) => s('y') * 10),
  ],
  invariants: [],
  defaults: { a: 1, x: 0, y: 0, z: 0 },
};

/**
 * Simultaneous block with loop gain 0.125, so it converges.
 * x = a + 0.5z, y = 0.5x, z = 0.5y  ⇒  x = a / 0.875.
 */
export function convergingCycle(gain = 0.5): Model {
  return {
    id: `fixture-cycle-${gain}`,
    title: 'cycle',
    timing: 'static',
    variables: [p('a'), d('x'), d('y'), d('z')],
    relations: [
      rel('r-x', 'x', ['a', 'z'], (s) => s('a') + gain * s('z')),
      rel('r-y', 'y', ['x'], (s) => gain * s('x')),
      rel('r-z', 'z', ['y'], (s) => gain * s('y')),
    ],
    invariants: [],
    defaults: { a: 1, x: 1, y: 1, z: 1 },
  };
}

/** Loop gain 4 — diverges, and must say so. */
export const divergingCycle: Model = {
  id: 'fixture-diverging',
  title: 'diverging',
  timing: 'static',
  variables: [p('a'), d('x'), d('y'), d('z')],
  relations: [
    rel('r-x', 'x', ['a', 'z'], (s) => s('a') + 4 * s('z')),
    rel('r-y', 'y', ['x'], (s) => s('x')),
    rel('r-z', 'z', ['y'], (s) => s('y')),
  ],
  invariants: [],
  defaults: { a: 1, x: 1, y: 1, z: 1 },
};

/** log(0) — a relation that legitimately produces a non-finite value. */
export const logZeroModel: Model = {
  id: 'fixture-log-zero',
  title: 'log zero',
  timing: 'static',
  variables: [p('a'), d('x')],
  relations: [rel('r-log', 'x', ['a'], (s) => Math.log(s('a')))],
  invariants: [],
  defaults: { a: 0, x: 0 },
};

/** A dynamic fixture whose accumulation relation produces a non-finite value. */
export const nanAccumulationModel: Model = {
  id: 'fixture-nan-accumulation',
  title: 'nan accumulation',
  timing: 'dynamic',
  variables: [
    { id: 'S', symbol: 'S', name: 'Stock', unit: DIMENSIONLESS, kind: 'stock' },
    { id: 'f', symbol: 'f', name: 'Flow', unit: DIMENSIONLESS, kind: 'derived' },
  ],
  relations: [
    rel('r-f', 'f', ['S'], (s) => s('S')),
    {
      ...rel('r-accumulate', 'S', ['S', 'f'], (s) => Math.sqrt(-1) + s('S') + s('f')),
      kind: 'accumulation',
    },
  ],
  invariants: [],
  defaults: { S: 1, f: 1 },
  periods: 5,
};

/** A dynamic fixture with no default for its stock, exercising the fallback. */
export const undefaultedStockModel: Model = {
  id: 'fixture-undefaulted-stock',
  title: 'undefaulted stock',
  timing: 'dynamic',
  variables: [
    { id: 'S', symbol: 'S', name: 'Stock', unit: DIMENSIONLESS, kind: 'stock' },
    { id: 'g', symbol: 'g', name: 'Growth', unit: DIMENSIONLESS, kind: 'parameter' },
    { id: 'f', symbol: 'f', name: 'Flow', unit: DIMENSIONLESS, kind: 'derived' },
  ],
  relations: [
    rel('r-f', 'f', ['S', 'g'], (s) => s('S') * s('g') + 1),
    { ...rel('r-accumulate', 'S', ['f'], (s) => s('f')), kind: 'accumulation' },
  ],
  invariants: [],
  defaults: { g: 0.5 },
  periods: 60,
};

/** An invariant with a candidate variable that provably cannot affect it. */
export const inertCandidateModel: Model = {
  id: 'fixture-inert-candidate',
  title: 'inert candidate',
  timing: 'static',
  variables: [p('x'), p('y'), d('z')],
  relations: [rel('r-z', 'z', ['x', 'y'], (s) => s('x') + 0 * s('y'))],
  invariants: [
    {
      id: 'z-is-one',
      name: 'z is one',
      latex: 'z = 1',
      check: (s) => ({ lhs: s('z'), rhs: 1 }),
      why: 'A fixture.',
    },
  ],
  defaults: { x: 5, y: 5, z: 0 },
};

/** An identity that "fails" only by floating-point rounding. */
export const roundingNoiseModel: Model = {
  id: 'fixture-rounding-noise',
  title: 'rounding noise',
  timing: 'static',
  variables: [p('a'), d('z1'), d('z2')],
  relations: [
    rel('r-z1', 'z1', ['a'], (s) => s('a') * 0.1 + 0.2),
    rel('r-z2', 'z2', ['a'], (s) => s('a') * 0.3),
  ],
  invariants: [
    {
      id: 'z1-equals-z2',
      name: 'z1 equals z2',
      latex: 'z_1 = z_2',
      check: (s) => ({ lhs: s('z1'), rhs: s('z2') }),
      tolerance: 1e-18,
      why: 'A fixture with an absurdly tight tolerance.',
    },
  ],
  defaults: { a: 1, z1: 0, z2: 0 },
};

/** An invariant whose check throws. */
export const throwingInvariantModel: Model = {
  id: 'fixture-throwing-invariant',
  title: 'throwing invariant',
  timing: 'static',
  variables: [p('x'), d('z')],
  relations: [rel('r-z', 'z', ['x'], (s) => s('x'))],
  invariants: [
    {
      id: 'explodes',
      name: 'explodes',
      latex: '?',
      check: (s) => {
        s('z');
        throw new Error('boom');
      },
      why: 'A fixture.',
    },
  ],
  defaults: { x: 1, z: 0 },
};
