/**
 * Chapter 0, P1 — stocks and flows.
 *
 * A bathtub. The water in it is a stock, measured at a moment. The tap and the
 * drain are flows, measured per minute. Confusing the two is the most common
 * error in macroeconomics and this is where a reader stops making it.
 */
import type { Model, Relation, Variable } from '../../engine/types';
import { u } from '../../engine/units';
import { LITRE, LITRE_PER_MIN, MINUTE, PER_MIN } from './units';

const variables: Variable[] = [
  {
    id: 'S',
    symbol: 'S',
    name: 'Water in the tub',
    unit: LITRE,
    kind: 'stock',
    domain: { min: 0, max: 400, step: 5 },
    introducedIn: 'ch0-kernel#stocks',
    gloss: 'A stock. Ask "how much is there right now?" and this is the answer.',
  },
  {
    id: 'inflow',
    symbol: 'in',
    name: 'Tap',
    unit: LITRE_PER_MIN,
    kind: 'parameter',
    domain: { min: 0, max: 40, step: 1 },
    introducedIn: 'ch0-kernel#stocks',
    gloss: 'A flow. Ask "how fast?" and this is the answer.',
  },
  {
    id: 'drainRate',
    symbol: 'k',
    name: 'Drain rate',
    unit: PER_MIN,
    kind: 'parameter',
    domain: { min: 0, max: 1, step: 0.01 },
    format: 'percent',
    introducedIn: 'ch0-kernel#stocks',
    gloss: 'The fraction of what is in the tub that leaves each minute.',
  },
  {
    id: 'dt',
    symbol: '\\Delta t',
    name: 'Period length',
    unit: MINUTE,
    kind: 'parameter',
    domain: { min: 0.05, max: 1, step: 0.05 },
    introducedIn: 'ch0-kernel#stocks',
    gloss: 'How long one step lasts.',
  },
  {
    id: 'outflow',
    symbol: 'out',
    name: 'Drain',
    unit: LITRE_PER_MIN,
    kind: 'flow',
    introducedIn: 'ch0-kernel#stocks',
    gloss: 'The fuller the tub, the faster it drains.',
  },
];

const relations: Relation[] = [
  {
    id: 'drain',
    kind: 'behavior',
    target: 'outflow',
    inputs: ['drainRate', 'S'],
    latex: '\\text{out} = k\\,S',
    compute: (s) => s('drainRate') * s('S'),
    unitCheck: () => u(PER_MIN).mul(u(LITRE)),
    because: 'A fuller tub pushes harder on the drain, so more leaves per minute.',
    arguable:
      'That the drain is proportional to the level. A real plughole is closer to ' +
      'the square root of the depth. Proportional is a choice, made because it is simple.',
  },
  {
    id: 'water-accumulation',
    kind: 'accumulation',
    target: 'S',
    inputs: ['S', 'inflow', 'outflow', 'dt'],
    latex: 'S_{t+1} = S_t + (\\text{in} - \\text{out})\\,\\Delta t',
    compute: (s) => s('S') + (s('inflow') - s('outflow')) * s('dt'),
    unitCheck: () => u(LITRE).add(u(LITRE_PER_MIN).sub(u(LITRE_PER_MIN)).mul(u(MINUTE))),
    because: 'What is in the tub next minute is what is in it now, plus what came in, minus what left.',
  },
];

export const bathtubModel: Model = {
  id: 'bathtub',
  title: 'A bathtub',
  timing: 'dynamic',
  variables,
  relations,
  invariants: [],
  defaults: { S: 0, inflow: 10, drainRate: 0.1, dt: 1 },
  periods: 200,
};

/** Where the level settles: inflow divided by the drain rate. */
export function bathtubSteadyState(inflow: number, drainRate: number): number {
  return inflow / drainRate;
}
