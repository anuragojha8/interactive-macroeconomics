# Interactive Macroeconomics — Test Plan

**Version** 0.1
**Date** 2026-09-08
**Companion to** `docs/SPEC.md` v0.1
**Status** Awaiting sign-off before implementation (Step 4)

---

## 0. Strategy

### 0.1 What we are actually protecting

The product's claim is *"you can trust this, and here is the code that proves it."* That claim dies the first time a reader finds a number that is wrong. So the test priority order is:

1. **Engine correctness** — every analytic result in the spec is independently verified against simulation. If algebra and code disagree, the book is lying.
2. **Invariants** — identities that must hold, hold. Always, at every parameter value, in every model.
3. **Dimensional consistency** — stock/flow confusion caught as a type error, in CI, not by a reader.
4. **Trace fidelity** — the causal story shown matches the computation actually performed. A plausible-but-wrong explanation is worse than no explanation.
5. Reader flows, persistence, a11y, performance.

### 0.2 Layers

| Layer | Tool | Scope | Speed target |
|---|---|---|---|
| Engine unit | Vitest | Pure functions, no DOM | < 2 s whole suite |
| Model | Vitest | Each `Model` against analytic reference values | < 3 s |
| Property | Vitest + `fast-check` | Invariants over random parameter draws | < 10 s |
| Golden | Vitest snapshots | Simulated paths, traces, scenario codecs | < 2 s |
| Content lint | Vitest + custom MDX rule | Beat structure, frontmatter, citations, symbol coverage | < 5 s |
| Component | Vitest + Testing Library | Controls, panels, reveals | < 15 s |
| E2E | Playwright | Reader flows across chapters | < 90 s |
| A11y | Playwright + `axe-core` | Every route, both themes | < 30 s |
| Performance | Vitest bench + Playwright trace | Solve time, frame rate, bundle size | < 60 s |

### 0.3 Numeric conventions

- **Relative tolerance** unless stated: `1e-9` for closed-form-vs-simulated agreement within a single solve; `1e-6` for convergence-to-steady-state assertions; `1e-4` for reference values quoted in this document to fewer digits.
- Assertions use a shared `expectClose(actual, expected, relTol)` helper that reports absolute *and* relative error on failure.
- **Closed-form reference values are asserted to relative `1e-12`, not to bit equality.** Verified during implementation: the last two digits of a steady-state value depend on *which* algebraically equivalent expression evaluates it — `Math.pow(x, 1/(1−α))` and `Math.pow(x, 1.5)` differ in the final ulp, as do `Math.cbrt(x)` and `Math.pow(x, 1/3)`. Values quoted here are correct to every digit shown; only the trailing ulp is expression-dependent. Direct simulation outputs (the period-by-period paths) remain exact regression goldens, because those come from the implementation itself.
- **Golden files are authoritative** for multi-period paths. Reference values in this document are hand-computed cross-checks: if a golden file and this document disagree, that is a bug to investigate, not a golden file to regenerate.
- **No test asserts exact floating-point equality on any result of a fractional exponent.** Verified: `Math.pow(1000, 1/3) = 9.999999999999998`, so `Y` at the default calibration computes to `999.9999999999995`, not `1000`. Cobb-Douglas results carry ~1e-16 relative error by construction. Where this document says a value is "exact," it means exact in the algebra and `rel 1e-12` in the assertion.
- No test may depend on wall-clock time, locale, timezone, or network.

### 0.4 Calibration used throughout

Chosen so that reference values are clean and hand-checkable.

| Model | Defaults |
|---|---|
| `production-v1` | `Ā = 1`, `K̄ = 1000`, `L̄ = 1000` → `Y = 1000`, `y = 1`, `k = 1` |
| `solow-v1` | `Ā = 1`, `L̄ = 1000`, `s̄ = 0.2`, `d̄ = 0.1`, `K₀ = 1000`, `T = 500`, `dt = 1` |
| `circular-flow-v1` | `C = 700`, `I = 200`, `G = 200`, `NX = −100`, `T = 250` → `Y = 1000` |
| `bathtub` | `inflow = 10`, `drainRate = 0.1`, `S₀ = 0` → `S* = 100` |

`K̄ = L̄ = 1000` makes `K^(1/3)·L^(2/3) = 1000` and `L̄^(2/3) = 100` in the algebra. Both are deliberate.

**Every reference value in §6–§10 of this document has been machine-verified in double precision and is quoted at full precision.** They are the expected values, not approximations of them.

---

## 1. Engine: unit algebra (T1xx)

| ID | Test | Expected |
|---|---|---|
| T101 | `mul` of `$` and `1/year` | `$/year`; dim `{money:1, time:-1}` |
| T102 | `div` of `$/year` by `persons` | `$/(year·person)` |
| T103 | `add` of `$` and `$` | `$` |
| T104 | `add` of `$` and `$/year` | **throws** `UnitMismatchError` naming both units |
| T105 | `add` of `$` and dimensionless | **throws** |
| T106 | Dimensionless ratio: `$/$` | `{}`, label `"ratio"` |
| T107 | Unit equality ignores `label`, respects `dim` | `$/year` labeled two ways compare equal |
| T108 | `real` flag mismatch on `add` | warning diagnostic, not a throw (nominal+real is a modelling smell, not a dimension error) |
| T109 | Every `Variable` in every registered model has a well-formed `Unit` | no `undefined` dims, label non-empty |
| T110 | Every `Relation.unitCheck()` output matches its `target` variable's unit | zero mismatches across all models |
| **T111** | **`solow-v1` accumulation without `dt`** — `K + (s·Y − d·K)` | **throws**: `$` + `$/year`. This is the canonical stock/flow error and must be impossible to ship. |
| T112 | `solow-v1` accumulation with `dt` — `K + (s·Y − d·K)·dt` | passes; result `$` |
| T113 | `dt` declares unit `year` and value `1` | present in every dynamic model |
| T114 | Reader-facing derivation string for T112 | contains `"$/year"` and `"year"` and resolves to `"$"` |

## 2. Engine: dependency graph (T2xx)

| ID | Test | Expected |
|---|---|---|
| T201 | Topological sort of `production-v1` | acyclic; `Y` before `MPK`, `MPK` before `r` |
| T202 | Two relations targeting the same variable | **throws** `DuplicateTargetError` naming both relation ids |
| T203 | Relation targeting a `parameter` | **throws** `ParameterWriteError` |
| T204 | Relation whose `inputs` omit a variable its `compute` actually reads | **throws** at model-registration time (detected via a Proxy `Scope` in dev/test) |
| T205 | Relation with an input that is not a declared variable | **throws** `UnknownVariableError` |
| T206 | Non-parameter, non-stock variable with no relation | **throws** `UnderdeterminedError` |
| T207 | Tarjan SCC on a deliberately cyclic fixture (`r → I → Y → r`) | one SCC of size 3, correct members |
| T208 | Tarjan on acyclic model | zero non-trivial SCCs |
| T209 | Evaluation order is deterministic across runs and insertion orders | identical `Solution.order` for shuffled relation arrays |
| T210 | `extends` resolution: `solow-v1` inherits all `production-v1` variables and relations | superset; no duplicates; inherited ids unchanged |
| T211 | `extends` diff report | 3 added parameters (`s̄`, `d̄`, `dt`) and 5 added relations: `investment`, `depreciation-flow`, `consumption`, `consumption-per-worker`, `capital-accumulation`. **Amended from 2 relations** — investment and depreciation are declared as explicit named *flows* rather than folded into the accumulation expression, because the phase diagram plots them and because stocks-versus-flows is the chapter's entire point. The pedagogical claim is preserved and now tested more strictly, by relation *kind*: exactly one `accumulation`, exactly two `behavior`, nothing removed. |

## 3. Engine: static solver (T3xx)

| ID | Test | Expected |
|---|---|---|
| T301 | `production-v1` at defaults | `Y = 999.9999999999995`, i.e. `1000` to rel 1e-12 |
| T302 | Same | `MPK = 1/3`, `MPL = 2/3`, `r = 1/3`, `w = 2/3` |
| T303 | Same | `y = 1`, `k = 1` |
| T304 | Acyclic solve does exactly one forward pass | `iterations` undefined or 1; no fixed-point iteration invoked |
| T305 | Cyclic fixture converges | `converged: true`, `iterations < 200`, residual `< 1e-10` |
| T306 | Cyclic fixture parameterized to diverge | `converged: false`, diagnostic present, **no throw**, values finite or explicitly flagged |
| T307 | Damping `ω` respected | `ω = 1` and `ω = 0.5` reach the same fixed point within 1e-9 |
| T308 | Non-finite intermediate (`log(0)` fixture) | an error diagnostic naming the relation and the variable, `converged: false`, and the solve **still returns** — it never throws. A *dynamic* run additionally stops at the offending period rather than filling the remaining path with `NaN`. (Amended: "aborts" originally read as "throws," which would have broken T611, where a zero capital stock legitimately makes `MPK` undefined and the reader must still see `Y = 0`.) |
| T309 | Parameter outside declared `domain` | solve proceeds, `domain-violation` diagnostic emitted (do not silently clamp reader input) |
| T310 | Determinism | 1000 repeat solves produce bit-identical values |

## 4. Engine: dynamic solver (T4xx)

| ID | Test | Expected |
|---|---|---|
| T401 | `solow-v1`, `K₀ = 1000`, first three periods | `K₀ = 1000`, `K₁ = 1100`, `K₂ = 1196.4560230912735` |
| T402 | Same, output path | `Y₀ = 999.9999999999995`, `Y₁ = 1032.2801154563667`, `Y₂ = 1061.6114161391636` (rel 1e-12; values machine-verified) |
| T403 | `path.length === T + 1` | off-by-one guard |
| T404 | Stocks carried, not recomputed | mutating `path[5]` does not affect `path[6]` (frozen scopes) |
| T405 | Negative stock guard | `d̄ = 5`, `s̄ = 0` → `K` clamps at 0 with a `stock-clamped` diagnostic, never negative |
| T406 | `dt` scaling | `dt = 0.5` with `2T` periods approximates `dt = 1` with `T` periods to rel 1e-2 (Euler consistency, not exactness) |
| T407 | Shock at `t = 50` applies at 50, not 0 | `path[49]` identical to unshocked baseline; `path[50]` differs |
| T408 | One-time vs permanent shock | `kind: 'one-time'` reverts the parameter at `t+1`; `'permanent'` does not |
| T409 | Determinism over 500 periods | bit-identical across runs |
| T410 | Performance | 200-period solve < 50 ms (see T703) |

## 5. Engine: invariants (T5xx)

| ID | Test | Expected |
|---|---|---|
| T501 | **Euler / factor exhaustion** in `production-v1`: `MPK·K + MPL·L = Y` | holds at defaults, rel 1e-12 |
| T502 | T501 as a **property test** over 1000 random draws `Ā ∈ [0.1,10]`, `K ∈ [1,1e6]`, `L ∈ [1,1e6]` | holds every time, rel 1e-9 |
| T503 | Capital share `= 1/3` and labor share `= 2/3` at all parameter values | property test, 1000 draws, rel 1e-12 |
| T504 | Constant returns to scale: scaling `K` and `L` by `λ` scales `Y` by `λ` | property test over `λ ∈ [0.1, 10]`, rel 1e-9 |
| T505 | `circular-flow-v1`: `Y = C + I + G + NX` | holds at defaults |
| T506 | `circular-flow-v1`: `S_private + S_public − I = NX` | `50 + 50 − 200 = −100` ✓ |
| T507 | T506 as property test over random `C, I, G, NX, T` with `Y` derived | holds every time |
| T508 | Double-entry: every flow appears exactly twice across sector accounts with opposite sign | sector balances sum to exactly 0 |
| T1001b | Solow's loop is `K → Y → I → K` | investment is an explicit flow, so the reported cycle names it. `relationIds` include `production-function` and `capital-accumulation`. Amended from `K → Y → K`. |
| T509 | Solow steady state satisfies `s̄Y* = d̄K*` | `282.84271247461885` vs `282.8427124746189`, rel 1e-12 |
| T510 | Invariant failure is *reported*, not thrown | a deliberately broken fixture yields `InvariantResult{ passed: false, lhs, rhs, relError }` and the solve still returns |
| T511 | Every registered model's invariants pass at its defaults | zero failures across the registry |
| T512 | Invariant tolerance is relative, not absolute | passes at `Y = 1e9` and `Y = 1e-9` scale |

## 6. Models: production (T6xx)

| ID | Test | Expected |
|---|---|---|
| T601 | **Doubling `K` alone** (1000 → 2000) | `Y = 1259.9210498948728`, i.e. `+25.992%` — **not** +100%. The chapter's headline result. |
| T602 | Doubling `K` and `L` together | `Y = 1999.9999999999993`, i.e. `2000` to rel 1e-12 (constant returns to scale) |
| T603 | Doubling `Ā` | `Y` doubles, rel 1e-12 — TFP is not subject to diminishing returns |
| T604 | Ten-fold `Ā` | `Y` × 10, rel 1e-12 |
| T605 | Development accounting: `k` ratio of 27 | `y` ratio = 3 exactly (`27^(1/3)`) |
| T606 | Development accounting inverse: to explain a 30× `y` gap with capital alone | requires `k` ratio `= 27000` (`30³`) — the number that motivates TFP |
| T607 | `y = Ā·k^(1/3)` agrees with `Y/L` computed from levels | property test, 1000 draws, rel 1e-12 |
| T608 | `MPK = (1/3)·Y/K` matches a numeric derivative `∂Y/∂K` | central difference, rel 1e-6 |
| T609 | `MPL = (2/3)·Y/L` matches numeric `∂Y/∂L` | rel 1e-6 |
| T610 | **"Break it"**: exponent set to 1 | `Y` linear in `K`; doubling `K` doubles `Y`; factor-exhaustion invariant now **fails** (labor is paid nothing) — and the failure is *shown*, which is the pedagogical point |
| T611 | `K = 0` | `Y = 0`, `MPK` flagged non-finite with a diagnostic, no crash |
| T612 | `L = 0` | `Y = 0`, handled identically |

## 7. Models: Solow (T7xx — correctness)

| ID | Test | Expected |
|---|---|---|
| T701 | Closed-form `K* = (s̄Ā L̄^(2/3)/d̄)^(3/2)` at defaults | `2828.427124746189` |
| T702 | Closed-form `Y*` | `1414.2135623730942` |
| T703 | Closed-form `y* = Ā^(3/2)(s̄/d̄)^(1/2)` | `1.4142135623730943` — `√2` to rel 6e-16 (`Math.SQRT2` differs in the last bit; compare with tolerance, not `===`) |
| T704 | **Simulation converges to the closed form** — `T = 500` | machine-verified `|K₅₀₀ − K*|/K* = 1.45e-15`; assert `< 1e-9`. *This is the single most important test in the suite: algebra and code must agree in front of the reader.* |
| T705 | T704 as a property test over `s̄ ∈ [0.05,0.5]`, `d̄ ∈ [0.02,0.2]`, `Ā ∈ [0.5,5]` | converges to closed form every time, rel 1e-5 |
| T706 | Convergence from **above**: `K₀ = 2·K*` | converges down to `K*`; `K` monotonically decreasing |
| T707 | Convergence from **below**: `K₀ = K*/2` (capital destruction) | converges up to `K*`; monotonically increasing; same `K*` as T701 |
| T708 | Half-life of convergence | `10.0466` periods (`ln 0.5 / ln(1 + s̄·MPK* − d̄)`), machine-verified, rel 1e-6 |
| T709 | **Long-run growth is zero** | machine-verified `|Y₅₀₀ − Y₄₉₉|/Y₄₉₉ = 0` exactly at `T = 500`; assert `< 1e-9` with `Ā` constant. The result that reframes the whole book. |
| T710 | `s̄` 0.2 → 0.3 | `y*` rises `√2 → √3`, factor `1.224744871391589` (`+22.474%`); `K*` → `5196.152422706629`, factor `1.8371173070873834` (`+83.7%`); **long-run growth rate still 0** |
| T711 | Doubling `s̄` (0.2 → 0.4) | `y*` rises by factor `√2` (`+41.4%`), not 2× |
| T712 | Doubling `Ā` | `y*` rises by factor `2^(3/2) = 2.8284271247461903` — *more* than proportionally, because higher `Ā` also raises `K*`. A result readers reliably get wrong. |
| T713 | **Golden rule**: `s` maximizing steady-state `C` | `s = 1/3 = α`; grid search at 1e-4 resolution returns `0.3333`, machine-verified |
| T714 | Golden-rule consumption dominates | `C*(s=1/3) = 1217.1612389003685` > `C*(s=0.2) = 1131.3708498984754` > `C*(s=0.5) = 1118.0339887498942` |
| T715 | `s̄ = 0` | `K` decays geometrically: `1000 × 0.9^500 ≈ 1.3e-20`. But **output only decays as the cube root of capital**, so `Y ≈ 2.4e-5` — still measurably positive after 500 years of zero investment. Amended from "`Y → 0`": diminishing returns cut both ways, and this is the direction nobody expects. Converges, no crash. |
| T716 | `s̄ = 1` | converges to `K*` with `C = 0` — feasible arithmetic, absurd economics; must run and be labeled |
| T717 | `d̄ = 0` | `K` grows without bound; **no steady state**; solver reports non-convergence rather than a bogus `K*` |
| T718 | `d̄ = 2` with `dt = 1`, started at `1.2·K*` | the update map's slope is `1 − (2/3)d̄ = −1/3`, so capital alternates around `K*`. An `oscillation` diagnostic is raised naming the stock. `converged` is **not** flipped — a damped oscillation genuinely does converge, and the diagnostic is what carries the warning. (`d̄ ≥ 5` instead drives capital negative on the first step, which is the `stock-clamped` path in T405.) |

## 8. Models: kernel and circular flow (T8xx)

| ID | Test | Expected |
|---|---|---|
| T801 | `bathtub` first four periods | `S = 0, 10, 19, 27.1` |
| T802 | `bathtub` steady state | `S* = inflow/drainRate = 100`; simulation reaches it within 1e-6 by `t = 200` |
| T803 | `bathtub` with `drainRate = 0` | unbounded growth, non-convergence reported |
| T804 | `ledger`: reader edits one entry | at least one identity fails; the failing identity's id is returned |
| T805 | `ledger`: identity restored by the compensating entry | all identities pass again |
| T806 | `thermostat`: three control rules, identical physics | identical `Model` physics relations; different `behavior` relation; measurably different paths |
| T807 | `thermostat`: swapping only the behavior relation changes outcomes | asserts the chapter's thesis — the rule is the assumption |
| T808 | `fixedpoint`: `p* = (a−c)/(b+e)` | closed form matches tâtonnement iteration, rel 1e-9 |
| T809 | `fixedpoint` with `λ(b+e) > 2` | oscillates and diverges; `converged: false`; the divergence is *displayable*, since "clearing sometimes fails" is content, not a bug |
| T810 | `circular-flow-v1` at defaults | `Y = 1000`; all identities pass |
| T811 | Reader raises `G` by 50 with `T` fixed and nothing else | `Y = C+I+G+NX` now requires `Y = 1050`; the app reports **which** identities are violated and **which** variables could restore each |
| T812 | "You cannot change one arrow alone" | for every single-flow edit, the returned reconciliation set is non-empty |
| T813 | Nominal vs real: deflator identity `nominal = real × (P/100)` | holds for every bundled series and every base year |
| T814 | Re-basing a real series changes levels but not growth rates | growth rates identical across base years, rel 1e-9 |

## 9. Engine: causal trace (T9xx)

| ID | Test | Expected |
|---|---|---|
| T901 | Trace of `Ā` 1 → 1.1 in `production-v1` | steps ordered: `Y` → (`MPK`, `MPL`) → (`r`, `w`) → (`y`) — never a dependent before its dependency |
| T902 | Every step's `before`/`after` match the two solves | cross-checked against independent baseline and shocked solves |
| T903 | Unchanged variables are listed, not silently dropped | `k` appears in `Trace.unchanged` for T901 |
| T904 | **Shocking `s̄` in `solow-v1` at `t = 0`** | `Y` appears in `unchanged`; only `C` (and `K₁`) change. *Raising the savings rate does nothing to output today.* This is the trace test that carries the most teaching weight. |
| T905 | Same shock at `t = 1` | `Y` now changes, via `K` |
| T906 | Every step carries a non-empty `because` and a correct `primitive` tag | P1–P5 mapping matches `relationKind` |
| T907 | `direction` matches the sign of `after − before` | property test over 200 random shocks |
| T908 | `pctChange` is `null` when `before === 0` | no `Infinity`, no `NaN`, ever, in reader-facing output |
| T909 | Steps below the `1e-12` relative threshold are excluded | floating-point noise does not generate spurious "the economy changed" steps |
| T910 | Generated `summary` names the shocked variable and the headline outcome | contains both symbols |
| T911 | Trace determinism | golden snapshot for the four canonical shocks |
| T912 | Zero-magnitude shock (`to` equals current value) | empty `steps`, all variables in `unchanged`, no crash |
| T913 | Multi-shock trace | steps attributed to the correct originating shock |

## 10. Engine: feedback loops (T10xx)

| ID | Test | Expected |
|---|---|---|
| T1001 | `solow-v1` loop detected | one loop: `K → Y → K` via `technology` + `accumulation` |
| T1002 | Loop gain at `K = 1000` | `0.9666666666666667`, rel 1e-6 |
| T1003 | Loop gain at steady state | `0.9333333333333332`, rel 1e-6 |
| T1004 | Classification | `|gain| < 1` → `stable: true`, `sign: 'stabilizing'` |
| T1005 | `d̄ = 0` → gain `> 1` | `stable: false`, `sign: 'amplifying'` — and this correctly predicts T717's non-convergence |
| T1006 | Numeric partials use central differences with scale-aware `h` | matches analytic partials for `production-v1`, rel 1e-6 |
| T1007 | `production-v1` (static, acyclic) | zero loops reported |
| T1008 | Loop `narrative` names every variable in the cycle, in order | string assertion |
| T1009 | Loop detection is stable under variable renaming/reordering | same loops found |

## 11. Engine: scenario codec (T11xx)

| ID | Test | Expected |
|---|---|---|
| T1101 | Round-trip: encode → decode | deep-equal to the original scenario |
| T1102 | Round-trip through a real URL hash | survives `encodeURIComponent`, copy, paste |
| T1103 | Unknown `varId` in payload | dropped with a diagnostic; **decode succeeds** |
| T1104 | Value outside declared `domain` | clamped with a diagnostic; decode succeeds |
| T1105 | Corrupt base64 | returns model defaults plus a diagnostic; **never throws** |
| T1106 | Version prefix mismatch (`v2` payload, `v1` reader) | falls back to defaults with a user-visible notice |
| T1107 | Encoded length for a typical Solow scenario | < 200 characters (pasteable in a chat message) |
| T1108 | Determinism | identical scenario encodes to an identical string across runs |
| T1109 | Float precision | round-trip preserves values to rel 1e-9 |

## 12. Content lint (T12xx)

| ID | Test | Expected |
|---|---|---|
| T1201 | Every section satisfies the §4.2 beat structure | all 8 beats present, in order; **Break it** and **Carry forward** are non-optional |
| T1202 | Every chapter's frontmatter validates against the schema | typed parse, no `any` |
| T1203 | `primitives` frontmatter matches the primitives actually used by the chapter's model | computed from `Relation.kind`, compared to declaration |
| T1204 | Every chapter has ≥ 1 `sources` entry | and Ch 1–3 each cite a Jones chapter |
| T1205 | Every symbol rendered anywhere appears in the symbol sheet with an `introducedIn` | no orphan notation |
| T1206 | Every symbol's `introducedIn` precedes its first use in reading order | notation is never used before it is defined |
| T1207 | Every `<Equation id>` resolves to a real relation or invariant | no dangling references |
| T1208 | Every `<ModelStage model>` resolves to a registered model | no dangling references |
| T1209 | Every `<Predict>` names variables that exist in the referenced model | no unanswerable predictions |
| T1210 | Every `behavior` and `technology` relation has a non-empty `arguable` | assumptions must be labeled as contestable |
| T1211 | `prereqs` form a DAG | no circular prerequisites |
| T1212 | No prose contains reproduced source text | fuzzy-match check against a stored list of any quoted passages; quotes must be ≤ 15 words, attributed, and in quotation marks |
| T1213 | `readingMinutes` within 25% of a word-count estimate | keeps the nav honest |
| **T1214** | **No hand-typed numbers in the interface** (§5.7) | no numeric literal in a component, chart annotation, tooltip, caption, or prose asserts a computed result; every displayed figure resolves from a `Solution`, a `Trace`, a closed-form helper, or a `<Result of="..." />` binding. Added after three wrong figures shipped in the design canvas, each typed by hand beside geometry that was generated correctly. |

## 13. Components (T13xx)

| ID | Test | Expected |
|---|---|---|
| T1301 | `ControlPanel` slider drag | solve invoked on rAF, not per input event; solve count `<` event count |
| T1302 | Slider keyboard operation | arrow keys step by `domain.step`, Home/End reach bounds, PageUp/Down step ×10 |
| T1303 | `InvariantPanel` renders pass/fail per invariant | fail state has a text label, not colour alone |
| T1304 | `InvariantPanel` failure announced | `role="status"` / `aria-live="polite"` fires |
| T1305 | `RelationList` colours by `kind` and shows the primitive tag | identity and behavior visually and textually distinct |
| T1306 | `CodeReveal` (F3) shows the actual relation source | rendered `latex` and shown `compute` come from the same object; test asserts identity, not similarity |
| T1307 | `Predict` gates the run (F2) | Run disabled until a prediction is submitted for every named variable |
| T1308 | `Predict` scores correctly and persists | correct/incorrect recorded; survives reload |
| T1309 | `Predict` cannot be re-answered after reveal | no retro-scoring of your own intuition |
| T1310 | `Trace` renders steps in `order` with before/after values | order matches `Trace.steps` exactly |
| T1311 | `Trace` shows the `unchanged` list | present and labeled |
| T1312 | `mathDetail` preference | `intuition` hides algebra globally; `full` reveals derivations globally; single control, whole-book effect |
| T1313 | `SymbolSheet` entry links to `introducedIn` | navigates and scrolls to the anchor |
| T1314 | Every chart has a `DataTable` equivalent | reachable by keyboard, same numbers |
| T1315 | `PhaseDiagram` marks the steady state where `s̄Y` crosses `d̄K` | rendered intersection matches `K*` to within 1px at default scale |
| T1316 | Non-convergence surfaced in the UI | `converged: false` renders a visible notice; never a blank or stale chart |

## 14. E2E reader flows (T14xx)

| ID | Flow | Expected |
|---|---|---|
| T1401 | Cold start → Ch 0 → complete the sorting exercise | 10 equations sortable; score shown; persisted |
| T1402 | Ch 0 → Ch 3 in reading order | no dead links, no missing models, no console errors |
| T1403 | Ch 1: drag a single flow in `CircularFlowStage` | invariant panel goes red, names the broken identity, lists what must move |
| T1404 | Ch 2: predict → run → trace on doubling `K` | prediction gate works; result shows +26%; trace explains diminishing returns |
| T1405 | Ch 3: raise `s̄`, inspect the `t = 0` trace | `Y` shown as unchanged today; the reader sees why |
| T1406 | Ch 3: `SteadyStateCheck` — enter `K*` by hand | correct value accepted; wrong value offers the trace, not the answer |
| T1407 | Copy a scenario URL, open in a fresh context | identical parameter values, shocks, and rendered charts |
| T1408 | Reload mid-chapter | progress, scroll position, predictions, preferences all restored |
| T1409 | `localStorage` blocked (private mode) | book fully functional; in-memory fallback; one non-blocking notice; **no crash** |
| T1410 | Corrupt `localStorage` payload | resets to defaults with a notice, does not white-screen |
| T1411 | Schema migration `v1 → v2` fixture | progress and predictions preserved |
| T1412 | Offline after first load | every visited chapter and interactive still works |
| T1413 | Deep link directly to a mid-book section | renders standalone; prerequisites surfaced as a hint, not a blocker |
| T1414 | Theme toggle and `prefers-color-scheme` | both work; charts legible in both; no unstyled flash |
| T1415 | Served from a subdirectory (`/book/`) | all assets resolve (relative paths) |
| T1416 | "Show me the code" on every equation in Ch 2–3 | opens, shows source, closes; no runtime errors |

## 15. Accessibility (T15xx)

| ID | Test | Expected |
|---|---|---|
| T1501 | `axe-core` on every route, both themes | zero critical or serious violations |
| T1502 | Full keyboard traverse of every interactive | every control reachable and operable; no focus traps |
| T1503 | Focus visible on all interactive elements | ≥ 3:1 contrast against adjacent colours |
| T1504 | Text contrast | ≥ 4.5:1 body, ≥ 3:1 large text and chart strokes, both themes |
| T1505 | Chart information is never colour-only | shape, label, or pattern also encodes it |
| T1506 | `prefers-reduced-motion` | transitions and animated paths disabled; content still complete |
| T1507 | Screen-reader pass on one full section | equations have readable labels; trace steps announced in order |
| T1508 | Zoom to 200% | no horizontal page scroll; wide charts scroll inside their own container |
| T1509 | Headings form a valid outline | no skipped levels |

## 16. Performance (T16xx)

| ID | Test | Budget |
|---|---|---|
| T1601 | `production-v1` static solve | < 5 ms |
| T1602 | `solow-v1`, 200 periods | < 50 ms |
| T1603 | `solow-v1`, 500 periods | < 120 ms |
| T1604 | Trace generation, `solow-v1` | < 20 ms |
| T1605 | Loop detection + numeric Jacobian | < 10 ms |
| T1606 | Slider drag, 3 s sustained | ≥ 55 fps median, no frame > 50 ms |
| T1607 | Initial JS, gzipped | < 250 KB (CI-enforced, fails the build) |
| T1608 | Per-chapter lazy chunk | < 120 KB gzipped each |
| T1609 | Time to interactive, throttled 4× CPU | < 2 s |
| T1610 | No memory growth over 200 shock cycles | heap returns to within 10% of baseline |

## 17. Data integrity (T17xx)

| ID | Test | Expected |
|---|---|---|
| T1701 | Every dataset has a `manifest.json` | source, series id, retrieval date, units, transformation, license |
| T1702 | Every chart citing data resolves to a manifest entry | no uncited numbers anywhere in the book |
| T1703 | No runtime network calls | Playwright asserts zero outbound requests after load |
| T1704 | Series monotonic in time, no duplicate periods, no unexplained gaps | gaps must be declared in the manifest |
| T1705 | Units in the manifest match the `Unit` used to render | e.g. billions of chained 2017 dollars |
| T1706 | Bundled figures spot-checked against the cited source | a fixed list of ~10 hand-verified values |
| T1707 | `scripts/fetch-data.ts` is excluded from the bundle | not present in build output |

---

## 18. Gates

CI fails on any of:

- any failing test in any layer;
- engine line **or branch** coverage `< 95%` (`src/engine/**`, `src/models/**`);
- any unit-check mismatch (T110–T114);
- any invariant failing at any model's defaults (T511);
- any content-lint violation (§12);
- bundle over budget (T1607–T1608);
- any critical/serious `axe` violation (T1501);
- a golden-file diff without an accompanying explanation in the commit message.

**Golden files may not be regenerated to make a test pass.** A changed golden file is a claim that the economics changed, and must be justified in review.

## 19. Ordering for implementation

Tests are written before or alongside each unit, in this order — this is also the build order for Step 4:

1. `units` + `graph` (T1xx, T2xx) — no product code depends on anything else.
2. Static solver + `production-v1` (T3xx, T5xx-static, T6xx) — first real chapter model.
3. Dynamic solver + `solow-v1` (T4xx, T7xx) — **T704 is the milestone**: algebra and simulation agree.
4. Trace + loops (T9xx, T10xx) — the signature features.
5. Kernel models + circular flow (T8xx) — Ch 0 and Ch 1.
6. Scenario codec (T11xx).
7. Components (T13xx), then content + lint (T12xx).
8. E2E, a11y, performance, data (T14xx–T17xx).

## 20. Known gaps in this plan

1. **Prose quality is untested.** No automated check tells us the writing is good, and that is the largest risk in the project. Mitigation: a human read-through gate per chapter, and one non-economist CS-grad reader per chapter before it ships.
2. **Pedagogical effectiveness is untested.** The calibration record gives self-report data only. Real validation is a friend attempting the Chapter 8 "novel shock" task — which is out of v1 scope, so v1 cannot prove the thesis, only build for it.
3. **Euler discretization error is bounded by convention, not analysis** (T406 is a consistency check, not an accuracy proof). Acceptable at v1 parameter values; revisit if a chapter needs fine time resolution.
4. **Cross-browser rendering of hand-built SVG** is checked visually, not by pixel diff. Consider adding Playwright screenshot baselines once the diagram vocabulary stops changing.


---

## 21. Amendments and findings from implementation

Recorded as they happened, per §18's rule that a changed expectation must be justified rather than quietly regenerated.

### 21.1 Bugs the tests caught

| Found by | Bug |
|---|---|
| **T110**, on its first run | `c` (consumption per worker) was declared `$/year` when it is `$/(year·person)`. The unit checker caught it before a single line of UI existed. This is precisely the class of error §1 of the spec was built to make impossible, and it took one run to justify the machinery. |
| **Trace edge case** | `Trace.unchanged` was built from the *static* dependency graph, whose targets exclude accumulated stocks — so a capital stock could never be reported as unchanged, in a model where "capital has not moved yet" is the single most important thing to say. Now built from the full graph. |
| **T508**, a property test over random flows | **An invariant whose right-hand side is zero could never pass.** "The three sector balances sum to zero" held exactly at the defaults, so it passed; on random values floating point left a residue of ~1e-14, and a *relative* comparison of that against exact zero has an error of 1. Every netting identity in the book would have reported failure to readers. `Invariant` now takes an optional `scale`, the natural magnitude of what is being netted, so the question becomes "how close to zero relative to the flows involved" — which is the question that was always meant. |
| **T808** | The same trap in a test: `expectClose(ED, 0)` can never pass, because relative error against zero is meaningless. Tests now use `expectNear` for quantities that genuinely reach zero. |
| **Coverage pass** | `stocks[id] = model.defaults[id] ?? 0` in the dynamic solver was unreachable: validation already requires a default for every exogenous variable, stocks included. Replaced with an explicit up-front `analyze()` call so the model is validated before any stepping, and the dead fallback removed. |

### 21.2 Design decisions settled during implementation

1. **Capital is a `stock` in `production-v1`, not a parameter.** Nothing accumulates it there, so it is exogenous within the period and never moves — which turns Chapter 2's closing observation into a fact about the model rather than a promise about Chapter 3. Chapter 3 adds the one relation that makes it move. Verified by T211b.
2. **Accumulation relations are excluded from the within-period graph.** A stock is *given* inside a period and updated between periods. This is both the correct economics and what stops `K → Y → K` from looking like a self-loop in the static solve. Loop detection deliberately uses the full graph, because the Solow feedback loop really is inter-temporal.
3. **Loop gain is measured as a total derivative, not a path product,** wherever the loop is anchored on a stock. Perturb `K`, re-solve the period, apply the accumulation relation: that captures every channel at once (`1 + s̄·MPK·dt − d̄·dt`) rather than one arbitrary route through the cycle. Algebraic loops still use the product of partials along the cycle.
4. **The exponents `αK` and `αL` are separate parameters.** This makes the Chapter 2 "break it" exercise sharper than planned: setting `αK = 1` while `αL` stays at `2/3` puts the economy at increasing returns, and factor payments then come to `5/3` of output. Two invariants fail together and the reader can see that somebody has to lose money. Tested in T610.
5. **Steady-state convergence is judged against the initial level,** not only the period-on-period change. A stock decaying toward zero has a constant *relative* change forever; scaling by where it started correctly calls that settled, while still catching a stock that genuinely grows without bound (T717).
6. **Percentage change reports `null`** whenever the baseline is zero *or* either value is non-finite, and a transition to or from a non-finite value still counts as a step. Readers never see `NaN%` or `Infinity%`, and they also never silently lose a step.
7. **Summary tie-breaks toward the earlier step.** With `Y` and `MPL` both moving exactly 10%, floating-point noise otherwise decided the headline. Ties within `1e-9` now resolve by dependency order, which is also the more intuitive answer.

### 21.3 Status against §19's build order

| Step | Status |
|---|---|
| 1. `units` + `graph` | Done — T1xx, T2xx passing |
| 2. Static solver + `production-v1` | Done — T3xx, T5xx, T6xx passing |
| 3. Dynamic solver + `solow-v1` | Done — **T704 passing at 1.4e-15 relative error** |
| 4. Trace + loops | Done — T9xx, T10xx passing |
| 5. Kernel models + circular flow | Done — T8xx passing, plus reconciliation |
| 6. Scenario codec | Done — T11xx passing |
| 7. Components, content, lint | Chapters 0–3 built and navigable; prose lint (`npm run lint:prose`) enforcing `docs/STYLE.md`; MDX authoring and the beat-structure lint still to come |
| 8. E2E, a11y, performance, data | Playwright suite (19 tests) and `axe` pass on every route; bundle budget enforced; data plumbing and its gate in place, but no dataset is bundled yet |

**205 unit tests and 21 end-to-end tests passing. `tsc --strict` clean. 100.6 KB of JavaScript gzipped against a 250 KB budget. `npm run verify` runs the whole gate.**

### 21.5 What the end-to-end suite found

Writing the accessibility tests turned up **62 contrast violations across the book** — the muted inks and the amber that marks assumptions were all below 4.5:1 on the paper background. They were not close: the amber measured 4.00 and the faint ink 3.60. Every muted token was re-derived against the *panel* surface, which is the darker of the two backgrounds text sits on, and the palette now passes AA everywhere while keeping the hue relationships the pedagogy depends on.

The same pass found every chart had `role="img"` with no accessible name. Each now carries a sentence describing what it shows and where the curves cross, generated from the same solve that drew it.

### 21.6 What the case study found

Calibrating Verano exposed an engine bug that no chapter had reached: **an override naming a stock was silently ignored by the dynamic solver.** Verano starts with a capital stock of 4,000, far below its own steady state, and passing that as an override left the simulation running on the default 1,000 — a calibration that appeared to be applied and was not. Stocks now take their starting value from an override, with an explicit `initialStocks` still winning over it. Three tests cover it, including that the same steady state is reached whether the stock starts above or below it.

### 21.7 Still open at the close of v1

1. **No dataset is bundled.** `src/data/manifest.ts` defines the provenance record and `tests/engine/data.test.ts` enforces it, so the gate exists and passes vacuously. Real figures must arrive through `scripts/fetch-data.ts` and never by hand — a number typed in and labelled "US GDP" is worse than no chart, which §5.7 records the project already learning once.
2. **Chapters are TSX, not MDX.** The authoring format works but the beat-structure lint (§4.2) cannot run against it yet, so beats are followed by care rather than enforced.
3. **No dark mode.** The palette is committed to paper. Adding one means re-validating every contrast pair against the dark surface, not inverting the tokens.
4. **Pedagogical effectiveness remains untested,** as §20 said it would. The calibration record is self-report. The real test is a reader deriving a novel shock in a chapter that does not exist yet.

### 21.4 Added beyond the plan

- **`reconcile()`** (`src/engine/reconcile.ts`). The plan asked (T811) for the app to report *which* variables could restore a broken identity; it did not say how. The engine now walks the dependency graph back to the exogenous variables an identity depends on and secant-solves each one for the value that would restore it, rejecting fixes that fall outside a declared range and fixes that change nothing. This is what makes "you cannot change one arrow alone" a demonstration rather than an assertion.
- **Three thermostats instead of one** (T806/T807). Identical physics relations — the same relation *objects*, asserted by identity — with one swapped behavioural rule each. Constant heat holds the room at 15° and ignores the target entirely; on/off never rests; proportional settles at 18.33° and stays there. Steady-state error is not a bug in the thermostat, it is what that rule does, and a reader who sees this will recognise it again in every policy rule in the book.
