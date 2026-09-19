# Interactive Macroeconomics

**Live:** https://anurag-interactice-macroeconomics.netlify.app — redeploys on every push to `main`.

A client-side web book that teaches macroeconomics as a **single executable model
of an economy**, built from five primitives, where every chapter adds relations to
the same engine and every claim can be run, shocked, and traced back to the
assumption that produced it.

Written for readers with a CS background and no economics beyond high school.
Structure, sequence, and notation follow Charles I. Jones, *Macroeconomics*
(Norton, 5th ed.); all prose is original.

- [`docs/SPEC.md`](docs/SPEC.md) — system specification
- [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md) — test plan, amendments, and current status

## The five primitives

| | Primitive | CS translation |
|---|---|---|
| P1 | Stocks and flows | state and accumulators |
| P2 | Accounting identities | invariants — not falsifiable, not theories |
| P3 | Budget constraints | conservation laws |
| P4 | Behavioural rules | swappable strategies — the only place theories differ |
| P5 | Market clearing | a fixed-point solve |

## Status

Chapters 0 to 3 are built and navigable, running on a shared engine: unit
algebra, dependency analysis, static and dynamic solvers, invariant checking,
causal tracing, feedback-loop detection, reconciliation of broken identities,
shareable scenario links, and offline reading.

Nine models — Chapter 0's four kernel models (bathtub, ledger, three
thermostats, tâtonnement), Chapter 1's circular flow, Chapter 2's production
model, and Chapter 3's Solow model.

209 unit tests and 25 end-to-end tests. No serious accessibility violations on
any route. 110 KB of JavaScript and 5 KB of CSS gzipped, against budgets of 250
and 60.

Not done: no dataset is bundled (the provenance gate is in place and waiting),
chapters are TSX rather than MDX, there is no dark mode, and chapters 4 onward
are unwritten. Chapter 1 does not yet cover value added, the CPI/deflator
distinction, or the current account as against the trade balance; Chapter 2
notes that human capital is missing from its development accounting rather than
measuring it.

## The case of Verano

One case study runs through all four chapters. Verano is a middle-income island
economy debating a National Investment Plan, and each chapter ends by answering
the part of that debate its own tools can reach: sorting the Minister's claims
into what can and cannot be disputed, finding the fifty that is missing from the
published accounts, pricing a sovereign fund that turns out to buy less than it
promises, and finally judging the plan itself and a hurricane.

Verano is invented. A case on a real country would need real figures, and this
project does not hand-type figures — so Verano is a calibration, and every
number in the case is computed from it by the same engine that runs the
chapters.

## Playing with it

There is no reading surface yet. `npm run play` is a terminal stand-in for the
book's model stage: it prints the relation list with primitive tags, the solved
values with units, live invariant checks, feedback loops with measured gain, the
causal trace of any shock, and an ASCII path chart.

```bash
npm run play                                    # the Solow model at its defaults
```

```bash
npm run play -- production                      # chapter 2: the static model
```

Override any parameter or starting stock with `var=value`:

```bash
npm run play -- production K=2000               # doubling capital gives +26%, not +100%
```

Shock it and read the mechanism:

```bash
npm run play -- solow --shock s=0.3 --period 0
```

That last one is the chapter's punchline. Raising the investment rate moves `I`
and `C` immediately and leaves output completely alone — `Y` shows up under
**Did not move**, along with wages, the return on capital, and everything else.
Output only responds from the next period, through accumulated capital.

Chart a path, or break the model on purpose:

```bash
npm run play -- solow --chart K --periods 120   # the transition to the steady state
```

```bash
npm run play -- solow d=0                       # no depreciation: no steady state, and it says so
```

```bash
npm run play -- production alphaK=1             # increasing returns: factor payments hit 167% of output
```

`npm run play -- --help` lists everything.

## Commands

```bash
npm test          # engine test suite
```

```bash
npm run test:cov  # with the 95% coverage gate
```

```bash
npm run typecheck # tsc --strict, including scripts/
```

```bash
npm run test:e2e  # Playwright: reading flows, offline, accessibility
```

```bash
npm run verify    # the whole gate: types, prose, tests, build, budget, e2e
```

The same end-to-end suite runs against the live site:

```bash
BASE_URL=https://anurag-interactice-macroeconomics.netlify.app npm run test:e2e
```
