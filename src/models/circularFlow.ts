/**
 * Chapter 1 — Measuring the macroeconomy.
 *
 * No behaviour anywhere in this model. Every relation is an identity, a
 * definition or a budget constraint, which is exactly the point: before any
 * theory arrives, there are statements about the economy that cannot be false,
 * and they constrain every story anyone will ever tell you.
 *
 * The one a reader should leave with: a trade deficit is an accounting statement
 * about saving and investment before it is anything else.
 */
import type { Invariant, Model, Relation, Variable } from '../engine/types';
import {
  DIMENSIONLESS,
  INDEX,
  MONEY_PER_YEAR,
  MONEY_PER_YEAR_REAL,
  u,
} from '../engine/units';

const flow = (
  id: string,
  symbol: string,
  name: string,
  kind: Variable['kind'],
  gloss: string,
): Variable => ({
  id,
  symbol,
  name,
  unit: MONEY_PER_YEAR,
  kind,
  domain: { min: -800, max: 2000, step: 10 },
  format: 'currency',
  introducedIn: 'ch1-measurement#circular-flow',
  gloss,
});

const variables: Variable[] = [
  flow('C', 'C', 'Consumption', 'parameter', 'What households buy.'),
  flow('I', 'I', 'Investment', 'parameter', 'What firms build. Not the same as buying shares.'),
  flow('G', 'G', 'Government purchases', 'parameter', 'What the state buys. Transfers are not in here.'),
  flow('NX', 'NX', 'Net exports', 'parameter', 'Exports minus imports. Negative means a trade deficit.'),
  flow('T', 'T', 'Net taxes', 'parameter', 'Direct taxes on households, less transfers paid out. This is what households actually lose.'),
  flow(
    'Tprod',
    'T_{prod}',
    'Taxes on production',
    'parameter',
    'Taxes on production and imports, less subsidies. The wedge between what buyers pay and what producers receive.',
  ),
  flow('W', 'W', 'Wages', 'parameter', 'Compensation of employees.'),
  flow(
    'Pi',
    '\\Pi',
    'Gross operating surplus',
    'parameter',
    'What is left for owners of capital before depreciation is taken out.',
  ),

    flow('Y', 'Y', 'Output, expenditure side', 'derived', 'Everything bought, added up.'),
  flow(
    'factorCost',
    'Y^{fc}',
    'Output at factor cost',
    'derived',
    'Output less taxes on production. This is the total that wages and operating surplus divide between them, and the denominator of the factor shares in Chapter 2.',
  ),
  flow('Yincome', 'Y^{inc}', 'Output, income side', 'derived', 'The same total as the expenditure side, counted at a different point in the circle.'),
  flow('Sprivate', 'S_p', 'Private saving', 'derived', 'Income after taxes that households did not spend.'),
  flow('Spublic', 'S_g', 'Public saving', 'derived', 'Net taxes minus government purchases. Negative is a deficit.'),
  flow('netLending', 'NL', 'Net lending to the world', 'derived', 'Saving that did not go into domestic investment.'),
  flow('privateBalance', 'B_p', 'Private sector balance', 'derived', 'What the private sector lends out, net.'),
  flow('publicBalance', 'B_g', 'Government balance', 'derived', 'What the government lends out, net.'),
  flow('foreignBalance', 'B_f', 'Rest of world balance', 'derived', 'Net lending from the rest of the world.'),

  {
    id: 'nominalY',
    symbol: 'Y^{nom}',
    name: 'Nominal output',
    unit: MONEY_PER_YEAR,
    kind: 'parameter',
    domain: { min: 0, max: 40000, step: 100 },
    format: 'currency',
    introducedIn: 'ch1-measurement#real-nominal',
    gloss: 'Measured at this year’s prices. Rises when prices rise, even if nothing more is made.',
  },
  {
    id: 'deflator',
    symbol: 'P',
    name: 'Price level',
    unit: INDEX,
    kind: 'parameter',
    domain: { min: 20, max: 400, step: 1 },
    format: 'index',
    introducedIn: 'ch1-measurement#real-nominal',
    gloss:
      'An index, 100 in the base year. The choice of base year changes the levels it reports.',
  },
  {
    id: 'realY',
    symbol: 'Y^{real}',
    name: 'Real output',
    unit: MONEY_PER_YEAR_REAL,
    kind: 'derived',
    format: 'currency',
    introducedIn: 'ch1-measurement#real-nominal',
    gloss: 'What was actually produced, with price changes divided out.',
  },
];

const relations: Relation[] = [
  {
    id: 'expenditure-identity',
    kind: 'identity',
    target: 'Y',
    inputs: ['C', 'I', 'G', 'NX'],
    latex: 'Y = C + I + G + NX',
    compute: (s) => s('C') + s('I') + s('G') + s('NX'),
    unitCheck: () => u(MONEY_PER_YEAR).add(MONEY_PER_YEAR).add(MONEY_PER_YEAR).add(MONEY_PER_YEAR),
    because: 'Everything produced was bought by somebody: a household, a firm, the state, or a foreigner.',
    citation: 'Jones 5e, ch. 2',
  },
  {
        id: 'income-identity',
    kind: 'identity',
    target: 'Yincome',
    inputs: ['W', 'Pi', 'Tprod'],
    latex: 'Y^{inc} = W + \\Pi + T_{prod}',
    compute: (s) => s('W') + s('Pi') + s('Tprod'),
    unitCheck: () => u(MONEY_PER_YEAR).add(MONEY_PER_YEAR).add(MONEY_PER_YEAR),
    because:
      'Every unit spent is earned by someone: as wages, as operating surplus, or as tax on the ' +
      'transaction itself. Direct taxes are left out because they are paid out of wages and ' +
      'surplus, and adding them again would count the same income twice.',
    citation: 'Jones 5e, ch. 2',
  },
    {
    id: 'output-at-factor-cost',
    kind: 'definition',
    target: 'factorCost',
    inputs: ['Y', 'Tprod'],
    latex: 'Y^{fc} = Y - T_{prod}',
    compute: (s) => s('Y') - s('Tprod'),
    unitCheck: () => u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because:
      'Strip out the tax wedge and what remains is what the factors of production actually received.',
  },
  {
    id: 'private-saving',
    kind: 'budget',
    target: 'Sprivate',
    inputs: ['Y', 'T', 'C'],
    latex: 'S_p = Y - T - C',
    compute: (s) => s('Y') - s('T') - s('C'),
    unitCheck: () => u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because: 'Households save whatever is left of income after tax and consumption.',
  },
  {
    id: 'public-saving',
    kind: 'budget',
    target: 'Spublic',
    inputs: ['T', 'G'],
    latex: 'S_g = T - G',
    compute: (s) => s('T') - s('G'),
    unitCheck: () => u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because: 'The government saves what it collects and does not spend.',
  },
  {
    id: 'net-lending',
    kind: 'identity',
    target: 'netLending',
    inputs: ['Sprivate', 'Spublic', 'I'],
    latex: 'S_p + S_g - I',
    compute: (s) => s('Sprivate') + s('Spublic') - s('I'),
    unitCheck: () => u(MONEY_PER_YEAR).add(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because: 'Saving that was not invested at home has to go somewhere: abroad.',
  },
  {
    id: 'private-balance',
    kind: 'identity',
    target: 'privateBalance',
    inputs: ['Sprivate', 'I'],
    latex: 'S_p - I',
    compute: (s) => s('Sprivate') - s('I'),
    unitCheck: () => u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because: 'The private sector’s surplus, after funding its own investment.',
  },
  {
    id: 'public-balance',
    kind: 'identity',
    target: 'publicBalance',
    inputs: ['Spublic'],
    latex: 'S_g',
    compute: (s) => s('Spublic'),
    unitCheck: () => u(MONEY_PER_YEAR),
    because: 'The government’s surplus is its saving.',
  },
  {
    id: 'foreign-balance',
    kind: 'identity',
    target: 'foreignBalance',
    inputs: ['NX'],
    latex: '-NX',
    compute: (s) => -s('NX'),
    unitCheck: () => u(MONEY_PER_YEAR),
    because: 'A domestic trade deficit is the rest of the world’s surplus, by construction.',
  },
  {
    id: 'real-output',
    kind: 'definition',
    target: 'realY',
    inputs: ['nominalY', 'deflator'],
    latex: 'Y^{real} = \\frac{Y^{nom}}{P/100}',
    compute: (s) => s('nominalY') / (s('deflator') / 100),
    unitCheck: () => u(MONEY_PER_YEAR).div(u(INDEX).div(u(DIMENSIONLESS))),
    because: 'Divide out the price change and what is left is the change in quantity.',
  },
];

const invariants: Invariant[] = [
  {
    id: 'expenditure-equals-income',
    name: 'Spending equals earning',
    latex: 'Y = W + \\Pi + T_{prod}',
    check: (s) => ({ lhs: s('Y'), rhs: s('Yincome') }),
    tolerance: 1e-12,
    why:
      'The same flow measured at two different points in the circle. Every dollar ' +
      'of spending lands in somebody’s income, so the two totals are the same number ' +
      'counted twice. If they differ, one of them is mismeasured.',
  },
  {
    id: 'net-lending-is-the-current-account',
    name: 'Saving minus investment is the trade balance',
    latex: 'S_p + S_g - I = NX',
    check: (s) => ({ lhs: s('netLending'), rhs: s('NX') }),
    tolerance: 1e-12,
    why:
            'A trade deficit means the country invested more than it saved and borrowed the ' +
      'difference from abroad. Whatever else anyone says about it, that part is arithmetic. ' +
      'Strictly speaking the left side equals the current account, which is the trade balance ' +
      'plus net income from abroad; the two coincide only while a country owes nothing.',
    // Jones 5e, ch. 19
  },
  {
    id: 'sector-balances-sum-to-zero',
    name: 'The three sector balances sum to zero',
    latex: 'B_p + B_g + B_f = 0',
    check: (s) => ({
      lhs: s('privateBalance') + s('publicBalance') + s('foreignBalance'),
      rhs: 0,
    }),
    // Netting to zero: judge the residue against the size of what was netted.
    scale: (s) =>
      Math.abs(s('privateBalance')) + Math.abs(s('publicBalance')) + Math.abs(s('foreignBalance')),
    tolerance: 1e-9,
    why:
      'One sector can only run a surplus if another runs a deficit. There is no ' +
      'arrangement in which everybody saves more at once. The arrows have two ends.',
  },
  {
    id: 'deflator-round-trip',
    name: 'Nominal equals real times the price level',
    latex: 'Y^{nom} = Y^{real}\\cdot P/100',
    check: (s) => ({ lhs: s('nominalY'), rhs: (s('realY') * s('deflator')) / 100 }),
    tolerance: 1e-12,
    why: 'Deflating and reflating must return the original number.',
  },
];

export const circularFlowModel: Model = {
  id: 'circular-flow-v1',
  title: 'The circular flow',
  timing: 'static',
  variables,
  relations,
  invariants,
    // Calibrated so the factor shares at factor cost are the two thirds and one
  // third that Chapter 2 assumes: W/Yfc = 600/900, Pi/Yfc = 300/900.
  defaults: {
    C: 700,
    I: 200,
    G: 200,
    NX: -100,
    T: 250,
    Tprod: 100,
    W: 600,
    Pi: 300,
    nominalY: 1000,
    deflator: 100,
  },
};
