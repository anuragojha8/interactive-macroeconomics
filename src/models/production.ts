/**
 * Chapter 2 — A model of production.
 *
 * The first genuinely solvable model in the book: one technology relation, two
 * factor prices, and two definitions. Everything else in Part I is this model
 * plus something.
 *
 * Capital is declared as a `stock` even though nothing here changes it. That is
 * deliberate and it is the chapter's parting observation: Chapter 2's capital
 * stock is frozen because no relation accumulates it. Chapter 3 adds that one
 * relation and the whole thing comes alive.
 */
import type { Invariant, Model, Relation, Variable } from '../engine/types';
import {
  DIMENSIONLESS,
  MONEY_PER_PERSON,
  MONEY_PER_PERSON_YEAR,
  MONEY_PER_YEAR_REAL,
  MONEY_REAL,
  PERSON,
  PER_YEAR,
  u,
  unit,
} from '../engine/units';

/**
 * Calibrated exponents. `unitCheck` uses these constants rather than the
 * `alphaK` / `alphaL` parameters, because a dimensional derivation describes the
 * declared technology, not whatever a reader has dragged a slider to. The
 * "break it" exercise deliberately leaves that consistent world.
 */
export const ALPHA_K = 1 / 3;
export const ALPHA_L = 2 / 3;

/**
 * Total factor productivity carries a fractional-dimension unit. That is not a
 * bug in the model — it is what it looks like when a quantity is defined as a
 * residual, and it is worth showing the reader rather than hiding.
 */
export const TFP_UNIT = unit('$^(2/3)/(year·person^(2/3))', {
  money: ALPHA_L,
  time: -1,
  people: -ALPHA_L,
});

const variables: Variable[] = [
  {
    id: 'A',
    symbol: '\\bar{A}',
    name: 'Total factor productivity',
    unit: TFP_UNIT,
    kind: 'parameter',
    domain: { min: 0.1, max: 10, step: 0.05 },
    format: 'index',
    introducedIn: 'ch2-production#tfp',
    gloss: 'How much output the economy gets from a given amount of capital and labour.',
  },
  {
    id: 'K',
    symbol: '\\bar{K}',
    name: 'Capital stock',
    unit: MONEY_REAL,
    kind: 'stock',
    domain: { min: 0, max: 20000, step: 50 },
    format: 'currency',
    introducedIn: 'ch2-production#capital',
    gloss: 'Machines, buildings, infrastructure. A stock: measured at a moment, in dollars.',
  },
  {
    id: 'L',
    symbol: '\\bar{L}',
    name: 'Labour',
    unit: PERSON,
    kind: 'parameter',
    domain: { min: 1, max: 5000, step: 50 },
    format: 'count',
    introducedIn: 'ch2-production#labour',
    gloss: 'People working.',
  },
  {
    id: 'alphaK',
    symbol: '\\alpha_K',
    name: 'Capital exponent',
    unit: DIMENSIONLESS,
    kind: 'parameter',
    domain: { min: 0, max: 1.5, step: 1 / 60 },
    format: 'ratio',
    introducedIn: 'ch2-production#exponents',
    gloss:
      'The elasticity of output with respect to capital. It equals capital’s share of output only if capital is paid its marginal product, which is an assumption rather than a measurement.',
  },
  {
    id: 'alphaL',
    symbol: '\\alpha_L',
    name: 'Labour exponent',
    unit: DIMENSIONLESS,
    kind: 'parameter',
    domain: { min: 0, max: 1.5, step: 1 / 60 },
    format: 'ratio',
    introducedIn: 'ch2-production#exponents',
    gloss:
      'The elasticity of output with respect to labour. It equals labour’s share on the same competitive assumption, and with the same caveat.',
  },
  {
    id: 'Y',
    symbol: 'Y',
    name: 'Output',
    unit: MONEY_PER_YEAR_REAL,
    kind: 'flow',
    format: 'currency',
    introducedIn: 'ch2-production#output',
    gloss: 'Everything the economy produces in a year. A flow.',
  },
  {
    id: 'MPK',
    symbol: 'MPK',
    name: 'Marginal product of capital',
    unit: PER_YEAR,
    kind: 'derived',
    format: 'percent',
    introducedIn: 'ch2-production#mpk',
    gloss: 'Extra output from one more dollar of capital, per year.',
  },
  {
    id: 'MPL',
    symbol: 'MPL',
    name: 'Marginal product of labour',
    unit: MONEY_PER_PERSON_YEAR,
    kind: 'derived',
    format: 'currency',
    introducedIn: 'ch2-production#mpl',
    gloss: 'Extra output from one more worker, per year.',
  },
  {
    id: 'r',
    symbol: 'r',
        name: 'Rental rate of capital',
    unit: PER_YEAR,
    kind: 'price',
    format: 'percent',
    introducedIn: 'ch2-production#factor-prices',
        gloss:
      'What a unit of capital earns in a year before wear and tear. The return to whoever owns the machine is this less the depreciation rate.',
  },
  {
    id: 'w',
    symbol: 'w',
    name: 'Wage',
    unit: MONEY_PER_PERSON_YEAR,
    kind: 'price',
    format: 'currency',
    introducedIn: 'ch2-production#factor-prices',
    gloss: 'What a worker earns in a year.',
  },
  {
    id: 'y',
    symbol: 'y',
    name: 'Output per worker',
    unit: MONEY_PER_PERSON_YEAR,
    kind: 'derived',
    format: 'currency',
    introducedIn: 'ch2-production#per-worker',
        gloss:
      'Output divided by the number of workers. Closer to living standards than the total is, though it says nothing about how the output is shared.',
  },
  {
    id: 'k',
    symbol: 'k',
    name: 'Capital per worker',
    unit: MONEY_PER_PERSON,
    kind: 'derived',
    format: 'currency',
    introducedIn: 'ch2-production#per-worker',
    gloss: 'How much equipment each worker has to work with.',
  },
  {
    id: 'capitalShare',
    symbol: 's_K',
    name: 'Capital share of output',
    unit: DIMENSIONLESS,
    kind: 'derived',
    format: 'percent',
    introducedIn: 'ch2-production#shares',
    gloss: 'The fraction of output paid out to owners of capital.',
  },
  {
    id: 'labourShare',
    symbol: 's_L',
    name: 'Labour share of output',
    unit: DIMENSIONLESS,
    kind: 'derived',
    format: 'percent',
    introducedIn: 'ch2-production#shares',
    gloss: 'The fraction of output paid out as wages.',
  },
];

const relations: Relation[] = [
  {
    id: 'production-function',
    kind: 'technology',
    target: 'Y',
    inputs: ['A', 'K', 'L', 'alphaK', 'alphaL'],
    latex: 'Y = \\bar{A}\\,\\bar{K}^{\\alpha_K}\\,\\bar{L}^{\\alpha_L}',
    compute: (s) => s('A') * Math.pow(s('K'), s('alphaK')) * Math.pow(s('L'), s('alphaL')),
    unitCheck: () => u(TFP_UNIT).mul(u(MONEY_REAL).pow(ALPHA_K)).mul(u(PERSON).pow(ALPHA_L)),
        because:
      'The most an economy can make from the capital and labour it has, given what it knows how to do.',
        arguable:
      'That output depends on capital and labour through this form, with constant exponents. ' +
      'The exponents are read off observed factor shares, which equal the elasticities only if ' +
      'factors are paid their marginal products \u2014 so this assumption and the competitive one ' +
      'below are not independent, and the evidence for the form is weaker than it looks.',
    citation: 'Jones 5e, ch. 4',
  },
  {
        id: 'mpk',
    kind: 'technology',
    target: 'MPK',
    inputs: ['Y', 'K', 'alphaK'],
    latex: 'MPK = \\alpha_K\\,\\frac{Y}{K}',
    compute: (s) => (s('alphaK') * s('Y')) / s('K'),
    unitCheck: () => u(DIMENSIONLESS).mul(u(MONEY_PER_YEAR_REAL).div(u(MONEY_REAL))),
    because: 'The extra output from one more unit of capital, holding labour fixed.',
    arguable:
      'The definition of a marginal product is the derivative of output with respect to that ' +
      'input. That it comes out here as a fixed fraction of the average product is a property ' +
      'of this functional form and of no other. Under a CES technology the marginal product is ' +
      'not a fixed share of output, and the factor shares move with the capital-labour ratio ' +
      'instead of staying put.',
  },
  {
        id: 'mpl',
    kind: 'technology',
    target: 'MPL',
    inputs: ['Y', 'L', 'alphaL'],
    latex: 'MPL = \\alpha_L\\,\\frac{Y}{L}',
    compute: (s) => (s('alphaL') * s('Y')) / s('L'),
    unitCheck: () => u(DIMENSIONLESS).mul(u(MONEY_PER_YEAR_REAL).div(u(PERSON))),
    because: 'The extra output from one more worker, holding capital fixed.',
    arguable: 'The same property of the Cobb-Douglas form, read off the other factor.',
  },
  {
    id: 'capital-market-clearing',
    kind: 'clearing',
    target: 'r',
    inputs: ['MPK'],
    latex: 'r = MPK',
    compute: (s) => s('MPK'),
    unitCheck: () => u(PER_YEAR),
        because:
      'Competition drives the rental rate to what the last unit of capital produces, from above as well as from below.',
    arguable:
      'Assumes competitive factor markets and no market power. Where firms have monopsony ' +
      'or monopoly power, factors are paid less than their marginal product.',
    citation: 'Jones 5e, ch. 4',
  },
  {
    id: 'labour-market-clearing',
    kind: 'clearing',
    target: 'w',
    inputs: ['MPL'],
    latex: 'w = MPL',
    compute: (s) => s('MPL'),
    unitCheck: () => u(MONEY_PER_PERSON_YEAR),
    because: 'Competition bids the wage up to what the last worker produces.',
        arguable:
      'Assumes employers compete for workers. Where a few employers dominate a local labour ' +
      'market the wage sits below the marginal product, and the difference is kept as profit ' +
      '\u2014 which the arithmetic here cannot detect, because it never observes the marginal ' +
      'product independently of the wage.',
    citation: 'Jones 5e, ch. 4',
  },
  {
    id: 'output-per-worker',
    kind: 'definition',
    target: 'y',
    inputs: ['Y', 'L'],
    latex: 'y = \\frac{Y}{\\bar{L}}',
    compute: (s) => s('Y') / s('L'),
    unitCheck: () => u(MONEY_PER_YEAR_REAL).div(u(PERSON)),
        because: 'Comparisons between economies of different size need output per worker, not output.',
  },
  {
    id: 'capital-per-worker',
    kind: 'definition',
    target: 'k',
    inputs: ['K', 'L'],
    latex: 'k = \\frac{\\bar{K}}{\\bar{L}}',
    compute: (s) => s('K') / s('L'),
    unitCheck: () => u(MONEY_REAL).div(u(PERSON)),
    because: 'How much capital each worker has to work with.',
  },
  {
    id: 'capital-share',
    kind: 'definition',
    target: 'capitalShare',
    inputs: ['r', 'K', 'Y'],
    latex: 's_K = \\frac{rK}{Y}',
    compute: (s) => (s('r') * s('K')) / s('Y'),
    unitCheck: () => u(PER_YEAR).mul(u(MONEY_REAL)).div(u(MONEY_PER_YEAR_REAL)),
    because: 'Total payments to capital, as a fraction of output.',
  },
  {
    id: 'labour-share',
    kind: 'definition',
    target: 'labourShare',
    inputs: ['w', 'L', 'Y'],
    latex: 's_L = \\frac{wL}{Y}',
    compute: (s) => (s('w') * s('L')) / s('Y'),
    unitCheck: () => u(MONEY_PER_PERSON_YEAR).mul(u(PERSON)).div(u(MONEY_PER_YEAR_REAL)),
    because: 'Total wage payments, as a fraction of output.',
  },
];

const invariants: Invariant[] = [
  {
    id: 'factor-exhaustion',
    name: 'Marginal products exhaust output',
    latex: 'MPK\\cdot K + MPL\\cdot L = Y',
    check: (s) => ({ lhs: s('MPK') * s('K') + s('MPL') * s('L'), rhs: s('Y') }),
    tolerance: 1e-12,
    why:
      'This is Euler’s theorem for functions homogeneous of degree one. It is mathematics, ' +
      'and it depends on that degree and on nothing else. It becomes a statement about what ' +
      'anyone is actually paid only once the two clearing relations are assumed, and those are ' +
      'assumptions about competition rather than results.',
  },
  {
    id: 'shares-sum-to-one',
    name: 'Factor shares sum to one',
    latex: 's_K + s_L = 1',
    check: (s) => ({ lhs: s('capitalShare') + s('labourShare'), rhs: 1 }),
    tolerance: 1e-12,
    why: 'The same statement as factor exhaustion, expressed as shares of output.',
  },
  {
    id: 'constant-returns',
    name: 'Constant returns to scale',
    latex: '\\alpha_K + \\alpha_L = 1',
    check: (s) => ({ lhs: s('alphaK') + s('alphaL'), rhs: 1 }),
    tolerance: 1e-12,
    why:
      'Doubling every input doubles output. Break this and factor payments no longer add ' +
      'up to output, which is why the two invariants above fail together.',
  },
];

export const productionModel: Model = {
  id: 'production-v1',
  title: 'A model of production',
  timing: 'static',
  variables,
  relations,
  invariants,
  defaults: {
    A: 1,
    K: 1000,
    L: 1000,
    alphaK: ALPHA_K,
    alphaL: ALPHA_L,
  },
};
