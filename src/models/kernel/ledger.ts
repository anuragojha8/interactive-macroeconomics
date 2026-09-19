/**
 * Chapter 0, P2 and P3 — identities and budget constraints.
 *
 * A lemonade stand's books. Nothing here is a theory: every relation is true by
 * construction, and the reader's job is to break one and discover that they
 * cannot fix it by changing a single number.
 */
import type { Invariant, Model, Relation, Variable } from '../../engine/types';
import { MONEY, MONEY_PER_YEAR, YEAR, u } from '../../engine/units';

const money = (
  id: string,
  symbol: string,
  name: string,
  kind: Variable['kind'],
  gloss: string,
): Variable => ({
  id,
  symbol,
  name,
  unit: MONEY,
  kind,
  domain: { min: -200, max: 400, step: 1 },
  format: 'currency',
  introducedIn: 'ch0-kernel#identities',
  gloss,
});

const flow = (id: string, symbol: string, name: string, gloss: string): Variable => ({
  id,
  symbol,
  name,
  unit: MONEY_PER_YEAR,
  kind: 'flow',
  domain: { min: -200, max: 400, step: 1 },
  format: 'currency',
  introducedIn: 'ch0-kernel#identities',
  gloss,
});

const variables: Variable[] = [
  money('cash', 'cash', 'Cash', 'parameter', 'Money in the tin. A stock.'),
  money('inventory', 'inv', 'Inventory', 'parameter', 'Lemons and sugar, at cost.'),
  money('loan', 'loan', 'Loan from a parent', 'parameter', 'One party’s asset is another party’s liability.'),
  money('equity0', 'E_0', 'Opening equity', 'parameter', 'What the owner had in it to begin with.'),
  { ...flow('revenue', 'rev', 'Revenue', 'Money coming in from selling lemonade.'), kind: 'parameter' },
  { ...flow('cost', 'cost', 'Costs', 'Money going out to make it.'), kind: 'parameter' },
  {
    id: 'dt',
    symbol: '\\Delta t',
    name: 'Period length',
    unit: YEAR,
    kind: 'parameter',
    domain: { min: 0.1, max: 1, step: 0.1 },
    introducedIn: 'ch0-kernel#identities',
    gloss: 'How long the trading period lasts. Revenue is a rate; equity is a level.',
  },
  money('assets', 'A', 'Total assets', 'derived', 'Everything the stand owns.'),
  money('liabilities', 'L', 'Total liabilities', 'derived', 'Everything it owes.'),
  money('equity', 'E', 'Closing equity', 'derived', 'Opening equity plus what was earned.'),
  money('funding', 'L+E', 'Liabilities plus equity', 'derived', 'Where the money came from.'),
  flow('profit', 'π', 'Profit', 'Revenue minus costs. A flow, not a pile.'),
];

const relations: Relation[] = [
  {
    id: 'total-assets',
    kind: 'identity',
    target: 'assets',
    inputs: ['cash', 'inventory'],
    latex: 'A = \\text{cash} + \\text{inv}',
    compute: (s) => s('cash') + s('inventory'),
    unitCheck: () => u(MONEY).add(MONEY),
    because: 'Assets are the list of what the business owns, added up.',
  },
  {
    id: 'total-liabilities',
    kind: 'identity',
    target: 'liabilities',
    inputs: ['loan'],
    latex: 'L = \\text{loan}',
    compute: (s) => s('loan'),
    unitCheck: () => u(MONEY),
    because: 'The only thing owed is the loan.',
  },
  {
    id: 'profit-definition',
    kind: 'definition',
    target: 'profit',
    inputs: ['revenue', 'cost'],
    latex: '\\pi = \\text{rev} - \\text{cost}',
    compute: (s) => s('revenue') - s('cost'),
    unitCheck: () => u(MONEY_PER_YEAR).sub(MONEY_PER_YEAR),
    because: 'Profit is what is left of revenue after paying the costs.',
  },
  {
    id: 'closing-equity',
    kind: 'identity',
    target: 'equity',
    inputs: ['equity0', 'profit', 'dt'],
    latex: 'E = E_0 + \\pi\\,\\Delta t',
    compute: (s) => s('equity0') + s('profit') * s('dt'),
    unitCheck: () => u(MONEY).add(u(MONEY_PER_YEAR).mul(u(YEAR))),
    because: 'The owner’s stake grows by whatever the period earned.',
  },
  {
    id: 'total-funding',
    kind: 'identity',
    target: 'funding',
    inputs: ['liabilities', 'equity'],
    latex: 'L + E',
    compute: (s) => s('liabilities') + s('equity'),
    unitCheck: () => u(MONEY).add(MONEY),
    because: 'Every asset was paid for by someone: a lender, or the owner.',
  },
];

const invariants: Invariant[] = [
  {
    id: 'balance-sheet-balances',
    name: 'The balance sheet balances',
    latex: 'A = L + E',
    check: (s) => ({ lhs: s('assets'), rhs: s('funding') }),
    tolerance: 1e-12,
    why:
      'Not a rule of accounting practice — a consequence of how the two sides are ' +
      'defined. Every asset had to be funded by someone. Change one entry and ' +
      'something else must move, which is the whole lesson of this chapter.',
  },
];

export const ledgerModel: Model = {
  id: 'ledger',
  title: 'A lemonade stand’s books',
  timing: 'static',
  variables,
  relations,
  invariants,
  // Chosen to balance: assets 60 = loan 25 + equity (30 + 5).
  defaults: {
    cash: 40,
    inventory: 20,
    loan: 25,
    equity0: 30,
    revenue: 15,
    cost: 10,
    dt: 1,
  },
};
