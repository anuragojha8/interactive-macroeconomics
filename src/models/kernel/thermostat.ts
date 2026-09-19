/**
 * Chapter 0, P4 — behavioural rules.
 *
 * Three thermostats with identical physics. The room loses heat the same way in
 * all three; only the control rule differs. One holds the wrong temperature
 * forever, one oscillates, one settles short of the target and stays there.
 *
 * This is the chapter's key move: the rule is the assumption. Everything the
 * three models disagree about comes from one swapped relation, and the reader
 * can see that the disagreement is not about physics.
 */
import { extendModel } from '../../engine/model';
import type { Model, Relation, Variable } from '../../engine/types';
import { DIMENSIONLESS, u } from '../../engine/units';
import { DEGREE, DEGREE_PER_MIN, MINUTE, PER_MIN } from './units';

const variables: Variable[] = [
  {
    id: 'T',
    symbol: 'T',
    name: 'Room temperature',
    unit: DEGREE,
    kind: 'stock',
    domain: { min: -10, max: 40, step: 0.5 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'A stock. Heat accumulates in the room like water in the tub.',
  },
  {
    id: 'Tout',
    symbol: 'T_{out}',
    name: 'Outside temperature',
    unit: DEGREE,
    kind: 'parameter',
    domain: { min: -20, max: 30, step: 1 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'Where the heat leaks to.',
  },
  {
    id: 'target',
    symbol: 'T^*',
    name: 'Target temperature',
    unit: DEGREE,
    kind: 'parameter',
    domain: { min: 10, max: 30, step: 0.5 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'The temperature the dial requests. The control rule decides what to do about it.',
  },
  {
    id: 'maxHeat',
    symbol: 'h_{max}',
    name: 'Heater capacity',
    unit: DEGREE_PER_MIN,
    kind: 'parameter',
    domain: { min: 0, max: 5, step: 0.1 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'The most the heater can deliver.',
  },
  {
    id: 'gain',
    symbol: 'g',
    name: 'Control gain',
    unit: PER_MIN,
    kind: 'parameter',
    domain: { min: 0, max: 3, step: 0.05 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'How hard the proportional rule reacts to being off target.',
  },
  {
    id: 'loss',
    symbol: '\\ell',
    name: 'Heat loss coefficient',
    unit: PER_MIN,
    kind: 'parameter',
    domain: { min: 0.01, max: 1, step: 0.01 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'How leaky the room is. This is physics, not a choice.',
  },
  {
    id: 'dt',
    symbol: '\\Delta t',
    name: 'Period length',
    unit: MINUTE,
    kind: 'parameter',
    domain: { min: 0.05, max: 1, step: 0.05 },
    introducedIn: 'ch0-kernel#rules',
    gloss: 'How long one step lasts.',
  },
  {
    id: 'heat',
    symbol: 'h',
    name: 'Heater output',
    unit: DEGREE_PER_MIN,
    kind: 'flow',
    introducedIn: 'ch0-kernel#rules',
    gloss: 'What the control rule decides to deliver. The only thing that differs between the three.',
  },
  {
    id: 'lossFlow',
    symbol: '\\ell(T-T_{out})',
    name: 'Heat lost',
    unit: DEGREE_PER_MIN,
    kind: 'flow',
    introducedIn: 'ch0-kernel#rules',
    gloss: 'Leaks out faster the colder it is outside. Identical in all three models.',
  },
];

/** Physics. Shared, unchanged, by every rule. */
const physics: Relation[] = [
  {
    id: 'heat-loss',
    kind: 'technology',
    target: 'lossFlow',
    inputs: ['loss', 'T', 'Tout'],
    latex: '\\ell\\,(T - T_{out})',
    compute: (s) => s('loss') * (s('T') - s('Tout')),
    unitCheck: () => u(PER_MIN).mul(u(DEGREE).sub(DEGREE)),
    because: 'Heat leaks out in proportion to how much warmer the room is than outside.',
    arguable:
      'Newton’s law of cooling, which is an approximation — radiative loss goes as the ' +
      'fourth power of temperature — though over a domestic range the linear form is close.',
  },
  {
    id: 'temperature-accumulation',
    kind: 'accumulation',
    target: 'T',
    inputs: ['T', 'heat', 'lossFlow', 'dt'],
    latex: 'T_{t+1} = T_t + (h - \\ell(T_t - T_{out}))\\,\\Delta t',
    compute: (s) => s('T') + (s('heat') - s('lossFlow')) * s('dt'),
    unitCheck: () => u(DEGREE).add(u(DEGREE_PER_MIN).sub(DEGREE_PER_MIN).mul(u(MINUTE))),
    because: 'The room warms by whatever the heater adds beyond what leaks away.',
  },
];

const constantRule: Relation = {
  id: 'control-rule',
  kind: 'behavior',
  target: 'heat',
  inputs: ['maxHeat'],
  latex: 'h = \\tfrac{1}{2}h_{max}',
  compute: (s) => 0.5 * s('maxHeat'),
  unitCheck: () => u(DIMENSIONLESS).mul(u(DEGREE_PER_MIN)),
  because: 'The heater runs at half power no matter what the room is doing.',
  arguable:
    'It ignores the target entirely. Every open-loop policy works this way: set the ' +
      'instrument and accept wherever the system lands.',
};

/** Baseline: no feedback at all. */
export const thermostatConstantModel: Model = {
  id: 'thermostat-constant',
  title: 'Thermostat — constant heat',
  timing: 'dynamic',
  variables,
  relations: [...physics, constantRule],
  invariants: [],
  // T starts below the constant rule's resting point of 15, so that panel shows a
  // rule converging to the wrong temperature rather than a flat line a reader
  // cannot distinguish from a broken chart.
  defaults: { T: 8, Tout: 5, target: 21, maxHeat: 2, gain: 0.5, loss: 0.1, dt: 1 },
  periods: 200,
};

/** Full power below target, off above it. */
export const thermostatBangBangModel: Model = extendModel(thermostatConstantModel, {
  id: 'thermostat-bang-bang',
  title: 'Thermostat — on or off',
  relations: [
    {
      ...constantRule,
      inputs: ['T', 'target', 'maxHeat'],
      latex: 'h = h_{max} \\text{ if } T < T^*,\\ 0 \\text{ otherwise}',
      compute: (s) => (s('T') < s('target') ? s('maxHeat') : 0),
      unitCheck: () => u(DEGREE_PER_MIN),
      because: 'Full power while the room is below target, nothing once it is above.',
      arguable:
        'It is always wrong in one direction or the other, so it never rests and hunts around ' +
        'the target forever. Most household thermostats work this way, with a small deadband ' +
        'so the boiler does not click on and off every minute.',
    },
  ],
});

/** React in proportion to the error. */
export const thermostatProportionalModel: Model = extendModel(thermostatConstantModel, {
  id: 'thermostat-proportional',
  title: 'Thermostat — proportional',
  relations: [
    {
      ...constantRule,
      inputs: ['gain', 'target', 'T', 'maxHeat'],
      latex: 'h = \\min(h_{max},\\ \\max(0,\\ g\\,(T^* - T)))',
      compute: (s) => Math.min(s('maxHeat'), Math.max(0, s('gain') * (s('target') - s('T')))),
      unitCheck: () => u(DEGREE_PER_MIN),
      because: 'The further from target, the harder the heater works.',
      arguable:
        'It settles short of the target and stays there: at the target the rule ' +
        'asks for no heat, but the room is still leaking. Engineers call the gap steady-state ' +
        'error, and every thermostat running this rule has it.',
    },
  ],
});

export const thermostatModels = [
  thermostatConstantModel,
  thermostatBangBangModel,
  thermostatProportionalModel,
];

/** Where each rule leaves the room, solved by hand for comparison. */
export const thermostatSteadyStates = {
  /** Half power balances the leak at this temperature, wherever the target is. */
  constant: (p: { Tout: number; maxHeat: number; loss: number }) =>
    p.Tout + (0.5 * p.maxHeat) / p.loss,
  /** g(T* − T) = ℓ(T − Tout) ⇒ T = (g·T* + ℓ·Tout)/(g + ℓ). */
  proportional: (p: { Tout: number; target: number; gain: number; loss: number }) =>
    (p.gain * p.target + p.loss * p.Tout) / (p.gain + p.loss),
};
