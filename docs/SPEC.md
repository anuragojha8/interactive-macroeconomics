# Interactive Macroeconomics — System Specification

**Version** 0.1 (draft for review)
**Date** 2026-09-08
**Status** Awaiting sign-off before test plan (Step 3) and implementation (Step 4)

---

## 1. Product definition

### 1.1 One-sentence description

A client-side web book that teaches macroeconomics as a **single executable model of an economy**, built from five primitives, where every chapter adds relations to the same engine and every claim can be run, shocked, and traced back to the assumption that produced it.

### 1.2 Reader

MBA / executive level. Concretely: **CS graduates with no economics background beyond high school.** This audience is
- comfortable with state, mutation, feedback, invariants, and fixed points;
- comfortable reading code, and *distrustful* of prose that cannot be checked;
- uncomfortable with unexplained notation and with "trust me, the curve shifts right";
- short on time, and will abandon anything that feels like exam prep.

### 1.3 Goal

Not coverage. **Transferable reasoning.** After the book, a reader given a novel macro question they have never seen ("what does a 20% tariff do?", "what does an AI productivity boom do to wages?") should be able to derive a defensible answer from primitives, and — critically — state which parts of their answer are accounting (not arguable) and which are behavioral assumptions (arguable).

### 1.4 Non-goals for v1

- No backend, no accounts, no sync, no analytics server.
- No instructor features, grading, cohorts, or assignments.
- No live data APIs at runtime. All data is a bundled, versioned snapshot.
- No exam-oriented question banks.
- No mobile-first design. Desktop-first, tablet-usable, phone-degraded-but-readable.
- No DSGE, no stochastic simulation, no estimation.

### 1.5 Source alignment

Structure, sequence, and notation follow **Charles I. Jones, *Macroeconomics* (W. W. Norton, 5th ed.)** — Jones is the STANCO 25 Professor of Economics at Stanford GSB and teaches macro to Stanford MBAs. His text is organized around building a small number of models from primitives rather than presenting a catalog of diagrams, which is the same thesis as this project.

Constraints on that alignment:
- **All prose in this book is original.** No text, figures, problem sets, or exhibits are reproduced from Jones. Alignment means shared structure, variable naming, and sequence — not shared words.
- Every chapter carries a `sources` block citing Jones chapter numbers plus primary data sources, so the book is usable as a companion to a real course.
- Notation follows Jones 5e conventions: overbars for exogenous/fixed quantities (`Ā`, `L̄`, `s̄`, `d̄`), capital share `1/3`, lowercase for per-person quantities (`y = Y/L`).
- **Open item:** notation is currently matched from publicly documented material. If the 5th edition is on hand, do a one-pass notation audit before Chapter 2 ships.

---

## 2. Pedagogical architecture

### 2.1 The Kernel: five primitives

Everything in the book reduces to these five. They are introduced in Chapter 0 with no economics, and every later chapter tags its content with which primitives it uses.

| # | Primitive | Formal content | CS translation |
|---|---|---|---|
| P1 | **Stocks and flows** | `S(t+1) = S(t) + inflow − outflow` | State and accumulators. A stock is a variable; a flow is a rate of change. |
| P2 | **Accounting identities** | Equations true by construction of the measurement | Invariants / type constraints. Not falsifiable, not theories, cannot be "wrong". |
| P3 | **Budget constraints** | Sources of funds = uses of funds, per sector, per period | Nobody spends what they do not have or borrow. Conservation law. |
| P4 | **Behavioral rules** | Decision functions: `C = f(Y)`, `I = f(r)`, `i = f(π, Y)` | Swappable strategy objects. **The only place where theories differ.** |
| P5 | **Market clearing** | Prices adjust until excess demand = 0 | A fixed-point solve. |

**The load-bearing distinction is P2 vs P4.** Most confusion in public macro argument comes from treating an identity as a causal claim or a behavioral assumption as a law. The engine encodes this distinction in the type system (`Relation.kind`), the UI renders the two in visually different registers, and the causal trace labels every step with which kind did the work.

### 2.2 The one-simulator thesis

There is **one** economy model per chapter, and each chapter's model is the previous chapter's model plus relations. There is no separate "IS-LM widget" and "AD-AS widget"; named models are *views or special cases* of the accumulated relation set.

Concretely for v1:
- Ch 1 establishes variables and identities (P2, P3) with no behavior at all.
- Ch 2 adds a technology relation and factor pricing (P4-adjacent, P5) → a static solvable model.
- Ch 3 adds one accumulation relation (P1) → the same model, now dynamic. That is the entire content of Solow.

The reader should experience Solow as *three lines added to code they already understand*, not as a new chapter of a textbook.

### 2.3 Three signature features

These are the reasons to build software rather than write a PDF. If any one of them is cut, the project loses its justification.

**F1 — Causal trace ("a stack trace for the economy").**
The reader fires a shock; the app replays the mechanism step by step in dependency order. Each step shows the relation invoked, its inputs before and after, its output before and after, the direction of change, a plain-English `because` string, and the primitive tag (identity / behavior / technology / clearing / accumulation). Textbooks show the before and after picture. This shows the mechanism executing.

**F2 — Predict-then-reveal.**
Before a shock can be run, the reader commits to a prediction: the sign (↑ / ↓ / no change) of the effect on 2–3 named variables, and optionally a magnitude bucket. Only then does the simulation run. Predictions and outcomes are recorded locally and surfaced as a **calibration record** — where the reader's intuition is reliable and where it is not. Prediction-before-observation is the highest-leverage interactive-learning pattern available and it is cheap to implement.

**F3 — Show me the code.**
Every equation has a disclosure that reveals the actual TypeScript relation object that computes it — same `latex`, same `compute`, same units. The math and the running code are literally the same object, and the reader can verify that. For this audience this is the single highest-trust move available, and it also makes the book self-documenting.

Supporting features:
- **F4 — Unit checking.** Every variable declares units. Stock/flow confusion is surfaced as a *type error*, in the UI, at authoring time and in CI.
- **F5 — Feedback loop detection.** Cycles in the dependency graph are found automatically, labeled amplifying or stabilizing by the sign of numerically computed loop gain, and rendered as annotated loops on the model diagram.
- **F6 — Invariant panel.** Identities that must hold are displayed live with a pass/fail indicator during every interaction. A reader who breaks one sees exactly which one broke.
- **F7 — Symbol sheet.** A persistent, always-reachable notation reference — an API reference for the math. Every symbol links to where it was introduced.
- **F8 — Scenario URLs.** Any model state (parameter overrides + shock list) encodes into the URL hash, so a reader can send a friend a link to the exact thing they are confused about. This is how sharing works with no backend.

---

## 3. Simulation engine

The engine is a pure, deterministic, dependency-free TypeScript library. It knows nothing about React, and is the only part of the system with meaningful algorithmic content.

### 3.1 Types

```ts
// ---------- units ----------
// Dimensional analysis over a small fixed basis.
type Dimension = {
  money?: number;   // $
  time?: number;    // years  (a flow is money=1, time=-1)
  people?: number;  // persons
  goods?: number;   // real units / index
};

interface Unit {
  dim: Dimension;
  label: string;          // "$/year", "$", "index (2017=100)", "ratio"
  real?: boolean;         // real vs nominal — tracked, not part of dim algebra
}

// ---------- variables ----------
type VarId = string;

type VarKind =
  | 'parameter'   // exogenous, reader-adjustable
  | 'stock'       // state, carried across periods
  | 'flow'        // rate per period
  | 'derived'     // computed within a period
  | 'price';      // clears a market

interface Variable {
  id: VarId;
  symbol: string;              // LaTeX: "\\bar{A}", "K", "y"
  name: string;                // "Total factor productivity"
  unit: Unit;
  kind: VarKind;
  domain?: { min: number; max: number; step?: number };
  format?: 'currency' | 'percent' | 'index' | 'ratio' | 'count';
  introducedIn?: string;       // chapter/section id, for the symbol sheet
  gloss?: string;              // one-line plain-English meaning
}

// ---------- relations ----------
type RelationKind =
  | 'identity'      // P2 — true by construction. Not arguable.
  | 'definition'    // P2 — naming, e.g. y = Y/L
  | 'budget'        // P3 — sources = uses
  | 'behavior'      // P4 — an assumption about choice. Arguable.
  | 'technology'    // P4-adjacent — an assumption about feasibility.
  | 'clearing'      // P5 — a market-clearing condition
  | 'accumulation'; // P1 — stock update law

interface Relation {
  id: string;
  kind: RelationKind;
  target: VarId;                       // the variable this relation determines
  inputs: VarId[];                     // declared dependencies (validated against compute)
  latex: string;
  compute: (s: Scope) => number;       // pure
  because: string;                     // one line, present tense, for the trace
  arguable?: string;                   // for kind 'behavior'/'technology': what a critic would say
  citation?: string;                   // e.g. "Jones 5e, ch. 4"
}

// ---------- invariants ----------
interface Invariant {
  id: string;
  latex: string;
  name: string;                        // "Factor payments exhaust output"
  check: (s: Scope) => { lhs: number; rhs: number };
  tolerance?: number;                  // relative, default 1e-9
  why: string;                         // why this must hold, in one line
}

// ---------- model ----------
interface Model {
  id: string;
  title: string;
  timing: 'static' | 'dynamic';
  variables: Variable[];
  relations: Relation[];
  invariants: Invariant[];
  defaults: Record<VarId, number>;
  periods?: number;                    // dynamic only, default 200
  extends?: string;                    // model id this one builds on
}

// ---------- solving ----------
type Scope = Readonly<Record<VarId, number>>;

interface Solution {
  values: Scope;                        // static: the solved period
  path?: Scope[];                       // dynamic: values[t], t = 0..T
  order: string[];                      // relation ids, in evaluation order
  cycles: Cycle[];
  invariantResults: InvariantResult[];
  diagnostics: Diagnostic[];            // convergence, clamping, unit warnings
  converged: boolean;
  iterations?: number;
}
```

### 3.2 Solver

**Static models.**
1. Build a dependency graph: edge `inputs[i] → target` for each relation.
2. Validate: exactly one relation per non-parameter target; every input is a declared variable; no relation writes a `parameter`.
3. Topologically sort. If acyclic → single forward evaluation pass. This is the common case and must be exact, not iterative.
4. If cyclic (simultaneous determination, e.g. later chapters' `r ↔ I ↔ Y`) → damped Gauss–Seidel fixed-point iteration over the strongly connected components only, acyclic parts still evaluated exactly.
   - `x_{n+1} = (1−ω)·x_n + ω·f(x_n)`, default `ω = 0.5`
   - convergence: max relative change `< 1e-10`
   - `maxIterations = 10_000`
   - **Non-convergence is reported, never hidden.** `converged: false` plus a diagnostic. The UI must show it.

**Dynamic models.**
1. Initialize stocks from `defaults` (or from a supplied initial state).
2. For each period `t = 0 … T`: solve the static block given current stocks → apply every `accumulation` relation to produce `t+1` stocks.
3. Discrete-time forward Euler, period = 1 year. Chosen over higher-order integrators deliberately: the update `K_{t+1} = K_t + s̄Y_t − d̄K_t` *is* the economics, and the reader should see the same arithmetic the code runs. Integration error is not a pedagogical concern at these parameter values; if a future chapter needs it, add RK4 behind the same interface.
4. Guardrails: stocks clamp at 0 with a diagnostic (a negative capital stock is a modeling error, not a result); non-finite values abort the run with the offending relation id.

**Determinism.** No `Math.random` anywhere in the engine. Any future stochastic content takes an injected seeded PRNG. Identical inputs must produce bit-identical outputs, on every platform — this is what makes scenario URLs and the test suite meaningful.

### 3.3 Causal trace (F1)

```ts
interface Shock {
  varId: VarId;              // must be a parameter or a stock
  to: number;
  atPeriod?: number;         // dynamic models; default 0
  label: string;             // "Savings rate rises from 20% to 30%"
  kind?: 'permanent' | 'one-time';
}

interface TraceStep {
  order: number;
  relationId: string;
  relationKind: RelationKind;
  targetId: VarId;
  before: number;
  after: number;
  pctChange: number | null;      // null when before === 0
  direction: 'up' | 'down' | 'none';
  inputDeltas: Array<{ varId: VarId; before: number; after: number }>;
  because: string;
  primitive: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  period?: number;               // dynamic models
}

interface Trace {
  shocks: Shock[];
  steps: TraceStep[];
  loops: LoopReport[];
  unchanged: VarId[];            // explicitly listed — "what did NOT move" teaches as much
  summary: string;               // generated, e.g. "K̄ ↑ 10% → Y ↑ 3.2% (diminishing returns)"
}
```

Algorithm: solve baseline → apply shocks → solve again → walk the topological order from the shocked variables through their transitive dependents, emitting a step for every relation whose target actually changed by more than `1e-12` relative. Steps for variables that did not change are omitted from `steps` and listed in `unchanged`.

For dynamic models the trace is generated per period, with the UI defaulting to `t = 0` (impact) and offering "and then over time" to expand later periods. Round-based framing ("first round", "second round") is used where a multiplier process exists.

### 3.4 Feedback loop detection (F5)

```ts
interface LoopReport {
  id: string;
  varIds: VarId[];               // the cycle, in order
  relationIds: string[];
  gain: number;                  // product of numeric partial derivatives around the solution
  sign: 'amplifying' | 'stabilizing';
  stable: boolean;               // |gain| < 1
  narrative: string;             // "Higher output → more investment → more capital → higher output"
}
```

Cycles come from Tarjan's SCC on the dependency graph. Loop gain is the product of numerically estimated partials `∂target/∂input` (central difference, step `h = max(1e-6, 1e-6·|x|)`) taken around the solved point. `|gain| < 1` → stabilizing/convergent; `> 1` → amplifying/explosive, which is itself an important teachable outcome.

### 3.5 Unit checking (F4)

- Every relation's declared `target` unit must be dimensionally consistent with a symbolic annotation supplied alongside `compute`. Because arbitrary JS cannot be dimension-inferred, each relation additionally declares `unitCheck: () => Unit` built from a tiny unit algebra (`mul`, `div`, `add` — where `add` *requires* matching dimensions).
- Mismatches are (a) a thrown error in development, (b) a **failing CI test**, (c) never a silent runtime problem in production.
- The reader-facing payoff: hovering any equation shows its dimensional derivation, e.g. `s̄·Y [1 × $/yr] − d̄·K [1/yr × $] = $/yr ✓`.

### 3.6 Scenario encoding (F8)

`#/ch3/solow?s=v1.<base64url(msgpack-ish compact JSON)>` containing `{ m: modelId, p: {varId: value}, k: [shocks], t: focusPeriod }`. Decoding validates against the model's declared variables and domains, and silently drops unknown keys with a diagnostic rather than throwing — a stale link should degrade, not error.

---

## 4. Content model

### 4.1 Authoring format

Chapters are **MDX**: prose in Markdown, interactives as React components, frontmatter as typed metadata. Rationale — prose is the majority of the artifact and must be pleasant to write and diff; interactives must sit inline exactly where the argument needs them.

```mdx
---
id: ch3-solow
number: 3
title: The Solow Model
subtitle: What one accumulator does to everything
primitives: [P1, P2, P4]
model: solow-v1
readingMinutes: 28
sources:
  - "Jones, Macroeconomics 5e, ch. 5"
  - "Penn World Table 10.01 (bundled snapshot)"
prereqs: [ch2-production]
---

Chapter 2 left us with an economy that has no memory...

<Equation id="solow-accumulation" reveal="code units derivation" />

<Predict
  shock="s: 0.20 -> 0.30"
  variables={["K*", "Y*", "growth rate of Y in the long run"]}
/>

<ModelStage model="solow-v1" view="phase-diagram" controls={["s","d","A"]} />

<Trace shock="s: 0.20 -> 0.30" />

<CaseFile id="postwar-convergence" />
```

### 4.2 Section beat structure

Every section follows the same beat sequence, enforced by lint. This is what makes the book feel like one book rather than an anthology.

1. **Puzzle** — a concrete question with a non-obvious answer, ideally from the reader's own world.
2. **Primitives invoked** — which of P1–P5, stated explicitly.
3. **Build** — the relation(s) added, with derivation available but collapsed.
4. **Predict** — reader commits before seeing the answer (F2).
5. **Run** — the interactive.
6. **Trace** — the mechanism, step by step (F1).
7. **Break it** — a parameter regime where the model gives a wrong or absurd answer, and *why that is informative*. Non-optional. A model whose limits are hidden teaches false confidence.
8. **Carry forward** — the one sentence that survives into the next chapter.

### 4.3 Chapter specifications, v1

#### Chapter 0 — The Kernel
**No economics.** Teaches P1–P5 on systems the reader already understands, so that when economics arrives the machinery is already familiar.

| Primitive | Vehicle | Interactive |
|---|---|---|
| P1 stocks/flows | A bathtub. Then: "your bank balance is a stock, your salary is a flow." | `BathtubModel` — dynamic, one stock, one inflow, one outflow. Reader discovers that a constant positive inflow with proportional outflow converges. |
| P2 identities | A double-entry ledger for a lemonade stand. Every asset is someone's liability. | `LedgerModel` — reader edits any entry; the app shows which identity breaks and refuses to proceed until reconciled. |
| P3 budget constraints | A monthly budget line. | Same ledger, extended over two periods with borrowing. |
| P4 behavioral rules | A thermostat. Then swap the control rule and watch behavior change while physics does not. | `ThermostatModel` — swap between three control rules; identical physics, different outcomes. This is the chapter's key move: *the rule is the assumption*. |
| P5 clearing | Concert tickets: one price, excess demand, adjustment. | `FixedPointDemo` — visualize the iteration converging, and a parameterization where it does not. |

**Terminal objective, testable:** given 10 unlabeled equations, the reader correctly sorts each as identity vs. behavioral assumption. This is the graded exercise, and it is the most important exercise in the book.

#### Chapter 1 — Measuring the macroeconomy
**Model:** `circular-flow-v1` — five sectors (households, firms, government, rest of world, financial), flows between them, no behavior whatsoever. Pure P2/P3.

Content: GDP three ways (expenditure, income, production) and why they must agree; what is and is not counted, and the resulting distortions; nominal vs. real, price indices, why the deflator and CPI differ; the circular flow as a closed graph in which every arrow is simultaneously someone's expense and someone's income.

Identities implemented as live invariants:
- `Y = C + I + G + NX`
- `Y = W + Π + T_net` (simplified income side)
- `S_private + S_public − I = NX` → **a trade deficit is an accounting statement about saving and investment before it is anything else.** This single result is worth the chapter for this audience.

Signature interactive — `CircularFlowStage`: the reader drags any single flow. The app immediately shows which identities break, and which *other* flows must move to restore them. The lesson is structural and impossible to convey in prose: **you cannot change one arrow alone.**

Second interactive — `NominalRealExplorer` over bundled US data: the same series in nominal and real terms, with the reader choosing the base year and discovering that the choice changes the story.

#### Chapter 2 — A model of production
**Model:** `production-v1`. First genuinely solvable model. Static.

```
Y = Ā · K̄^(1/3) · L̄^(2/3)      technology (Cobb–Douglas, CRS)
MPK = (1/3)·Y/K                   derived
MPL = (2/3)·Y/L                   derived
r = MPK,  w = MPL                 clearing (competitive factor markets)
y = Y/L                           definition
k = K/L                           definition
y = Ā · k^(1/3)                   derived — same statement, per person
```

Invariants: `MPK·K + MPL·L = Y` (factor payments exhaust output — Euler's theorem under CRS, checked numerically every solve, and one of the most satisfying things in economics to watch hold); capital share `= 1/3` exactly; labor share `= 2/3` exactly.

Key results the reader derives rather than reads: doubling `K` raises `Y` by **26%**, not 100% (`2^(1/3) = 1.2599`) — diminishing returns as arithmetic, not as a curve someone drew; constant returns to *both* inputs together; why a 30-fold income gap across countries cannot be explained by capital alone (development accounting), which motivates `Ā` and therefore the entire growth literature.

**Break it:** set `1/3` to `1` and watch the model claim capital alone can generate unbounded growth. Then explain why that is the actual disagreement in some real policy debates.

#### Chapter 3 — The Solow model
**Model:** `solow-v1 extends production-v1`. Adds exactly one relation and one parameter pair:

```
K_{t+1} = K_t + s̄·Y_t − d̄·K_t     accumulation  (P1)
C_t = (1 − s̄)·Y_t                  behavior      (P4)
```

That is the whole chapter. The engine's `extends` mechanism makes this visible in the UI: a diff view showing "Chapter 2's model + 2 relations."

Analytic results, each of which is also a test that simulation and algebra agree:
- `K* = (s̄·Ā·L̄^(2/3) / d̄)^(3/2)`
- `y* = Ā^(3/2)·(s̄/d̄)^(1/2)`
- Long-run growth of `y` is **zero** without growth in `Ā` — the result that reframes everything, and the reason Chapter 4 exists.
- Golden-rule savings rate `s = α = 1/3`, derived by maximizing steady-state consumption `(1−s)·s^(1/2)`.

Interactives: `PhaseDiagram` (`s̄Y` against `d̄K`, steady state where they cross, with the reader dragging `s̄` and watching `K*` move); `TimePath` (levels and growth rates, with a shock injectable at any `t`); `SteadyStateCheck` — the reader solves for `K*` algebraically, enters it, and the app confirms by simulation. Algebra and code agreeing in front of the reader is the trust-building moment of the chapter.

Case files (bundled real data): postwar Germany and Japan convergence; China's growth and slowdown as a transition-dynamics story rather than a miracle; one-time capital destruction and recovery.

**Break it:** the model says a country recovering from capital destruction should grow fast and converge. Show a case where that did not happen, and identify which primitive the model is missing.

### 4.3a The running case

One case study runs through every chapter. **Verano** is a middle-income island
economy of two million workers, debating a National Investment Plan that would
raise its investment rate by ten points of output. Each chapter closes by
answering the part of that debate its own tools can reach, and no chapter can
answer the part before it:

| Part | Chapter | Question |
|---|---|---|
| 1 | 0 — the Kernel | Which of the Finance Minister's six statements could be disputed, and which could not? |
| 2 | 1 — Measurement | The published accounts do not close. Which figure is wrong, and by how much? |
| 3 | 2 — Production | A sovereign fund would double the capital stock. What does that buy, and does it close the gap with the neighbour? |
| 4 | 3 — Solow | What does the plan deliver, and when? |
| 5 | 3 — Solow | A hurricane destroys two fifths of the capital stock. How long until recovery? |

The parts are linked by more than a setting. Part 1 sorts three assumptions out
of the briefing note; Part 4 depends on all three at once and says so. Part 3's
disappointing sovereign fund and Part 5's survivable hurricane are the same
diminishing returns read in opposite directions.

**Verano is invented, and that is a requirement rather than a shortcut.** A case
built on a real country needs real figures, and §5.7 forbids hand-typed ones.
Everything in `src/case/verano.ts` is a *calibration* — a set of model inputs —
and every figure in the case text is computed from it by the engine that runs the
chapters. Changing a number there rewrites the case.

### 4.4 Assessment model

Three types, all local, none graded in an academic sense:

1. **Predictions (F2)** — sign/magnitude commitments before each interactive. Recorded, scored, aggregated into a calibration record.
2. **Sorting exercises** — classify relations as identity vs. behavior. The Chapter 0 terminal objective and recurring thereafter.
3. **Derivations** — the reader enters a numeric answer computed by hand; the app verifies against the engine and, on mismatch, offers the trace rather than the answer.

Explicitly **not** multiple-choice recall.

---

## 5. Application architecture

### 5.1 Stack

| Concern | Choice | Rationale |
|---|---|---|
| Build | Vite 5 | Fast, static output, first-class MDX plugin |
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess` | The engine's correctness is the product |
| UI | React 18 | MDX component embedding |
| Content | MDX (`@mdx-js/rollup`) | Prose-first authoring with inline interactives |
| Routing | React Router, hash-based | Works on any static host and in a file:// context |
| Math | KaTeX (`react-katex`) | Fast, deterministic, no MathJax weight |
| Charts | **Hand-built SVG on `d3-scale`** | No chart library. Economic diagrams need annotated equilibria, shifted curves, phase portraits, and labeled intersections — every general-purpose chart library fights this. `d3-scale` is 4KB and does the only hard part. |
| Reader state | Zustand + `persist` | Small, no boilerplate, trivially serializable |
| Engine | Zero dependencies | Pure TS, independently testable, no framework coupling |
| Unit tests | Vitest | Engine, invariants, unit algebra, analytic-vs-simulated agreement |
| E2E | Playwright | Interaction flows, trace rendering, persistence, a11y |
| Lint | ESLint + Prettier + a custom `beat-structure` MDX lint rule | Enforce §4.2 mechanically |

### 5.2 Layout

```
/
├── docs/
│   ├── SPEC.md
│   └── TEST-PLAN.md
├── src/
│   ├── engine/                     # zero-dependency, pure
│   │   ├── types.ts
│   │   ├── units.ts                # dimension algebra + checker
│   │   ├── graph.ts                # topo sort, Tarjan SCC
│   │   ├── solve.ts                # static + dynamic solvers
│   │   ├── trace.ts                # F1
│   │   ├── loops.ts                # F5
│   │   ├── invariants.ts           # F6
│   │   ├── scenario.ts             # F8 encode/decode
│   │   └── index.ts
│   ├── models/
│   │   ├── kernel/{bathtub,ledger,thermostat,fixedpoint}.ts
│   │   ├── circularFlow.ts
│   │   ├── production.ts
│   │   ├── solow.ts
│   │   └── registry.ts
│   ├── components/
│   │   ├── book/                   # Shell, Nav, Progress, SymbolSheet, Glossary
│   │   ├── mdx/                    # Equation, Predict, Trace, CaseFile, BreakIt,
│   │   │                           #   PrimitiveTag, Reveal, CarryForward
│   │   ├── stage/                  # ModelStage, ControlPanel, InvariantPanel,
│   │   │                           #   RelationList, CodeReveal, ShockBar
│   │   └── viz/                    # Axis, Curve, PhaseDiagram, TimePath,
│   │                               #   SankeyFlow, LoopOverlay, DataTable
│   ├── content/
│   │   ├── ch0-kernel/*.mdx
│   │   ├── ch1-measurement/*.mdx
│   │   ├── ch2-production/*.mdx
│   │   └── ch3-solow/*.mdx
│   ├── data/                       # bundled snapshots + provenance manifests
│   ├── state/                      # progress, predictions, preferences
│   └── styles/
├── tests/
│   ├── engine/
│   └── e2e/
└── scripts/
    └── fetch-data.ts               # build-time only, never runtime
```

### 5.3 Reading surface

Three-region desktop layout:

- **Left rail (collapsible)** — chapter/section nav with progress, plus the symbol sheet (F7).
- **Center column** — prose, max ~68ch measure, with inline interactives that may bleed wider.
- **Right rail (sticky, appears when a model is in scope)** — the model stage: controls, current values, invariant panel, relation list with primitive tags, "show me the code."

Below ~1100px the right rail becomes a docked bottom sheet. Below ~700px interactives become full-bleed cards with controls beneath; nav becomes a drawer.

**Sticky model context** is the single most important layout decision: while reading about `s̄`, the reader can see and move `s̄`. Prose and model must never be on separate pages.

### 5.4 Persistence

`localStorage`, one namespaced key, versioned with forward migrations. Wrapped in try/catch on every access — private windows and blocked site data must degrade to an in-memory store, not break the book.

```ts
interface PersistedState {
  schemaVersion: 1;
  progress: Record<string, { visited: boolean; completedAt?: string; scrollPct?: number }>;
  predictions: Array<{
    id: string; sectionId: string; at: string;
    predicted: Record<VarId, 'up' | 'down' | 'none'>;
    actual: Record<VarId, 'up' | 'down' | 'none'>;
    correct: boolean;
  }>;
  sorting: Array<{ id: string; at: string; score: number; total: number }>;
  savedScenarios: Array<{ id: string; label: string; url: string; at: string }>;
  preferences: {
    mathDetail: 'intuition' | 'algebra' | 'full';
    theme: 'system' | 'light' | 'dark';
    reducedMotion: boolean;
    showUnits: boolean;
  };
}
```

`mathDetail` is a global three-position control, not a per-equation toggle: the reader sets their tolerance for algebra once, and the whole book responds.

### 5.5 Data

All data is a **bundled, versioned snapshot**. No runtime network calls — this keeps the book offline-capable, deterministic, key-free, and immune to an upstream API changing shape.

- `scripts/fetch-data.ts` is run manually, writes to `src/data/`, and is never shipped.
- Every dataset ships a `manifest.json`: source, series id, retrieval date, units, transformation applied, license.
- Every chart citing data links to its manifest entry. A reader who does not trust a number can find out exactly where it came from.
- v1 datasets: US GDP components and deflators (BEA/FRED); a Penn World Table snapshot for cross-country capital and output per worker; postwar Germany/Japan/China output and capital series.

### 5.6 Non-functional requirements

| Requirement | Target |
|---|---|
| Initial JS (gzipped) | < 250 KB; content lazily loaded per chapter |
| Static solve | < 5 ms |
| Dynamic solve, 200 periods | < 50 ms |
| Slider drag | 60 fps — solve on `requestAnimationFrame`, never on raw input events |
| Time to interactive, mid-tier laptop | < 2 s |
| Offline | Fully functional after first load |
| Accessibility | WCAG 2.2 AA: keyboard-operable controls, every chart has a data-table equivalent, `prefers-reduced-motion` respected, focus visible, invariant failures announced via live region |
| Theming | Light and dark, both first-class, `prefers-color-scheme` plus explicit override |
| Browsers | Evergreen Chrome/Firefox/Safari/Edge. No IE, no polyfill budget. |
| Deployment | Any static host (GitHub Pages / Netlify). Relative asset paths so it also works from a subdirectory. |

---

### 5.7 No hand-typed numbers in the interface

**Every number the reader sees comes from the engine at runtime.** No literal
figure appears in a component, a chart annotation, a tooltip, a caption, or
prose that asserts a computed result — it is read from a `Solution`, a `Trace`,
or a closed-form helper, and formatted by the shared formatter.

This is a hard rule with a specific origin. The design canvas for this book was
built with chart *geometry* generated from the engine but chart *annotations*
typed by hand, and three of them were wrong: a tooltip claiming 82% of the
convergence gap had closed when the real figure is 71.5%; a caption asserting
growth was "exactly zero" at year 120 when it is 0.0005% a year; and a predict
gate showing next year's capital as 1,100 — the *baseline* path — on the one
question whose entire purpose is to show what the shock does. Every one of them
survived review by the person who had just computed the correct value.

Prose may of course state a number, but only where a lint rule can check it:
inline results are written as `<Result of="K*" />` or `<Result of="Y" at="0" />`
and resolved from the model at build time, so a changed calibration updates the
sentence or fails the build. A bare numeral asserting a model result is a
content-lint failure (§12).

## 6. Definition of done for v1

1. Chapters 0–3 complete, every section satisfying the §4.2 beat structure (lint-enforced).
2. Four kernel models plus `circular-flow-v1`, `production-v1`, `solow-v1` implemented and passing the test plan.
3. F1–F8 all working in every chapter where they apply.
4. Engine test coverage ≥ 95% on lines and branches; every analytic result in §4.3 verified against simulation.
5. Zero unit-check failures in CI.
6. Playwright suite green on the flows in the test plan.
7. Reader can complete Chapter 0's sorting exercise, and their calibration record persists across a reload.
8. A scenario URL round-trips: copy, paste in a fresh browser, identical state.
9. Static build deploys and runs offline.
10. Every data point traceable to a manifest entry; every chapter carries its citations.

## 7. Deliberately deferred

Chapters 4–8 (growth & ideas, labor, inflation, short run, central banks, open economy); the "assemble it yourself" sandbox where a reader composes relations freely; expectations and forward-looking behavior; any stochastic content; accounts, sync, instructor tooling; a print/PDF export.

## 8. Open items for sign-off

1. **Notation audit** against Jones 5e if the book is available (§1.5).
2. **Chapter 0 length.** It has no economics in it. If it runs long, motivation suffers — target 15 minutes, and consider interleaving a teaser of Chapter 1's trade-deficit result as the hook.
3. ~~**Voice.**~~ Settled — see [`docs/STYLE.md`](STYLE.md). Third-person exposition with the economic objects as the actors; second person reserved for operations (instructions, predictions, observations); "we" and "let's" banned outright. Accounting claims stated flatly, assumption-dependent claims naming the assumption in the same sentence.
4. **Distribution.** Static host, or publish as a shareable page? The scenario-URL design works either way, but affects nothing until v1 ships.
