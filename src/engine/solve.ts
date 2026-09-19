/**
 * Solvers.
 *
 * Static models are solved exactly by a single forward pass in dependency
 * order. Simultaneous blocks fall back to damped Gauss-Seidel over the
 * strongly connected component only — the acyclic remainder stays exact.
 * Dynamic models step forward in discrete time with `K_{t+1} = K_t + (…)·dt`,
 * which is the same arithmetic the reader is shown. Nothing here is random.
 */
import { analyze } from './graph';
import type {
  Diagnostic,
  DiagnosticCode,
  Invariant,
  InvariantResult,
  Model,
  Scope,
  Shock,
  Solution,
  VarId,
} from './types';
import { makeScope, relDiff } from './types';

export const DEFAULT_DAMPING = 0.5;
export const DEFAULT_TOLERANCE = 1e-10;
export const DEFAULT_MAX_ITERATIONS = 10_000;
/** Steps below this relative size are floating-point noise, not economics. */
export const NOISE_FLOOR = 1e-12;

export interface StaticOptions {
  overrides?: Record<VarId, number>;
  damping?: number;
  tolerance?: number;
  maxIterations?: number;
}

export interface DynamicOptions extends StaticOptions {
  shocks?: Shock[];
  periods?: number;
  initialStocks?: Record<VarId, number>;
}

function diag(
  code: DiagnosticCode,
  severity: Diagnostic['severity'],
  message: string,
  extra: { relationId?: string; varId?: VarId; period?: number } = {},
): Diagnostic {
  const d: Diagnostic = { code, severity, message };
  if (extra.relationId !== undefined) d.relationId = extra.relationId;
  if (extra.varId !== undefined) d.varId = extra.varId;
  if (extra.period !== undefined) d.period = extra.period;
  return d;
}

export function checkInvariants(
  invariants: Invariant[],
  scope: Scope,
  period?: number,
): InvariantResult[] {
  return invariants.map((inv) => {
    const { lhs, rhs } = inv.check(scope);
    const scale = Math.max(
      Math.abs(lhs),
      Math.abs(rhs),
      inv.scale ? Math.abs(inv.scale(scope)) : 0,
      1e-300,
    );
    const relError = lhs === rhs ? 0 : Math.abs(lhs - rhs) / scale;
    const r: InvariantResult = {
      id: inv.id,
      name: inv.name,
      lhs,
      rhs,
      relError,
      passed: relError <= (inv.tolerance ?? 1e-9),
    };
    if (period !== undefined) r.period = period;
    return r;
  });
}

export function solveStatic(model: Model, opts: StaticOptions = {}): Solution {
  const a = analyze(model);
  const damping = opts.damping ?? DEFAULT_DAMPING;
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  const diagnostics: Diagnostic[] = [];
  const overrides = opts.overrides ?? {};

  for (const [id, val] of Object.entries(overrides)) {
    const v = a.variables.get(id);
    if (!v) {
      diagnostics.push(
        diag('unknown-variable', 'warning', `Override for unknown variable "${id}" ignored.`, {
          varId: id,
        }),
      );
      continue;
    }
    // A domain is the range of a reader's control, not a law about the model.
    // A stock reaching 20,400 through accumulation is the model working, not
    // the reader doing something out of range, so only parameters are checked.
    if (v.kind === 'parameter' && v.domain && (val < v.domain.min || val > v.domain.max)) {
      diagnostics.push(
        diag(
          'domain-violation',
          'warning',
          `${v.symbol} = ${val} is outside its declared range ` +
            `[${v.domain.min}, ${v.domain.max}]. Solving anyway.`,
          { varId: id },
        ),
      );
    }
  }

  const values: Record<VarId, number> = {};
  for (const v of model.variables) values[v.id] = model.defaults[v.id] ?? 0;
  for (const [id, val] of Object.entries(overrides)) {
    if (a.variables.has(id)) values[id] = val;
  }

  const scope = makeScope(values);
  const order: string[] = [];
  let converged = true;
  let iterations: number | undefined;

  for (const component of a.components) {
    if (!component.cyclic) {
      const r = component.relations[0]!;
      order.push(r.id);
      const next = r.compute(scope);
      values[r.target] = next;
      if (!Number.isFinite(next)) {
        converged = false;
        diagnostics.push(
          diag(
            'non-finite',
            'error',
            `Relation "${r.id}" produced ${String(next)} for ${r.target}.`,
            { relationId: r.id, varId: r.target },
          ),
        );
      }
      continue;
    }

    // Simultaneous block: damped Gauss-Seidel, exact remainder untouched.
    for (const r of component.relations) order.push(r.id);
    let iter = 0;
    let maxChange = Infinity;
    while (iter < maxIterations && maxChange > tolerance) {
      maxChange = 0;
      for (const r of component.relations) {
        const prev = values[r.target]!;
        const raw = r.compute(scope);
        if (!Number.isFinite(raw)) {
          converged = false;
          diagnostics.push(
            diag('non-finite', 'error', `Relation "${r.id}" produced ${String(raw)}.`, {
              relationId: r.id,
              varId: r.target,
            }),
          );
          maxChange = 0;
          break;
        }
        const blended = (1 - damping) * prev + damping * raw;
        maxChange = Math.max(maxChange, relDiff(blended, prev));
        values[r.target] = blended;
      }
      iter += 1;
    }
    iterations = (iterations ?? 0) + iter;
    if (maxChange > tolerance) {
      converged = false;
      diagnostics.push(
        diag(
          'no-convergence',
          'error',
          `Simultaneous block {${component.vars.join(', ')}} did not converge in ` +
            `${maxIterations} iterations (residual ${maxChange.toExponential(2)}).`,
        ),
      );
    }
  }

  const frozen = Object.freeze({ ...values });
  const solution: Solution = {
    values: frozen,
    order,
    invariantResults: checkInvariants(model.invariants, makeScope(frozen)),
    diagnostics,
    converged,
  };
  if (iterations !== undefined) solution.iterations = iterations;
  return solution;
}

/** Parameter overrides implied by the shock list at period `t`. */
export function shockOverridesAt(shocks: Shock[] | undefined, t: number): Record<VarId, number> {
  const out: Record<VarId, number> = {};
  for (const s of shocks ?? []) {
    const at = s.atPeriod ?? 0;
    const active = (s.kind ?? 'permanent') === 'one-time' ? t === at : t >= at;
    if (active) out[s.varId] = s.to;
  }
  return out;
}

export function solveDynamic(model: Model, opts: DynamicOptions = {}): Solution {
  // Validate up front: every exogenous variable, stocks included, must have a
  // default, so there is no need to invent one below.
  analyze(model);
  const periods = opts.periods ?? model.periods ?? 200;
  const accumulation = model.relations.filter((r) => r.kind === 'accumulation');
  // State is whatever an accumulation relation carries forward, whether it is
  // labelled a stock or a price.
  const stockIds = [...new Set(accumulation.map((r) => r.target))];

  const stocks: Record<VarId, number> = {};
  for (const id of stockIds) stocks[id] = model.defaults[id]!;
  // An override naming a stock sets where it starts. Without this the override
  // is silently ignored, because the per-period stock values overwrite it — a
  // calibration would appear to be applied and would not be.
  for (const [id, val] of Object.entries(opts.overrides ?? {})) {
    if (stockIds.includes(id)) stocks[id] = val;
  }
  for (const [id, val] of Object.entries(opts.initialStocks ?? {})) {
    if (stockIds.includes(id)) stocks[id] = val;
  }
  // A shock to a stock sets its initial level; permanent shocks to stocks are
  // meaningless (accumulation would overwrite them next period).
  for (const s of opts.shocks ?? []) {
    if (stockIds.includes(s.varId) && (s.atPeriod ?? 0) === 0) stocks[s.varId] = s.to;
  }

  const path: Array<Readonly<Record<VarId, number>>> = [];
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  const pushDiag = (d: Diagnostic) => {
    const key = `${d.code}|${d.relationId ?? ''}|${d.varId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    diagnostics.push(d);
  };

  const worstInvariant = new Map<string, InvariantResult>();
  let order: string[] = [];
  let converged = true;
  let aborted = false;

  const stockDeltas: Record<VarId, number[]> = {};
  for (const id of stockIds) stockDeltas[id] = [];

  for (let t = 0; t <= periods; t += 1) {
    const overrides: Record<VarId, number> = {
      ...(opts.overrides ?? {}),
      ...shockOverridesAt(opts.shocks, t),
      ...stocks,
    };
    const staticOpts: StaticOptions = { overrides };
    if (opts.damping !== undefined) staticOpts.damping = opts.damping;
    if (opts.tolerance !== undefined) staticOpts.tolerance = opts.tolerance;
    if (opts.maxIterations !== undefined) staticOpts.maxIterations = opts.maxIterations;

    const sol = solveStatic(model, staticOpts);
    if (t === 0) order = sol.order;
    if (!sol.converged) converged = false;
    for (const d of sol.diagnostics) pushDiag({ ...d, period: t });

    for (const r of sol.invariantResults) {
      const prev = worstInvariant.get(r.id);
      if (!prev || r.relError > prev.relError) worstInvariant.set(r.id, { ...r, period: t });
    }

    path.push(sol.values);

    if (t === periods) break;

    const scope = makeScope(sol.values);
    const next: Record<VarId, number> = {};
    for (const r of accumulation) {
      let value = r.compute(scope);
      if (!Number.isFinite(value)) {
        pushDiag(
          diag('non-finite', 'error', `Accumulation "${r.id}" produced ${String(value)}.`, {
            relationId: r.id,
            varId: r.target,
            period: t,
          }),
        );
        converged = false;
        aborted = true;
        break;
      }
            if (value < 0) {
        const kind = model.variables.find((v) => v.id === r.target)?.kind;
        if (kind === 'stock') {
          pushDiag(
            diag(
              'stock-clamped',
              'warning',
              `${r.target} would have gone negative and was clamped at 0. ` +
                `A negative stock is a modelling error, not a result.`,
              { relationId: r.id, varId: r.target, period: t },
            ),
          );
          value = 0;
        } else {
          pushDiag(
            diag(
              'infeasible',
              'error',
              `${r.target} went negative at t = ${t}. The process has left the region ` +
                `where the model means anything, so the run stops here rather than ` +
                `reporting numbers from outside it.`,
              { relationId: r.id, varId: r.target, period: t },
            ),
          );
          converged = false;
          aborted = true;
          break;
        }
      }
      stockDeltas[r.target]!.push(value - stocks[r.target]!);
      next[r.target] = value;
    }
    if (aborted) break;
    Object.assign(stocks, next);
  }

  // Did we settle? Compare the last two periods' stocks.
  const last = path[path.length - 1];
  const prior = path[path.length - 2];
  if (last && prior && stockIds.length > 0) {
    const first = path[0]!;
    let maxRel = 0;
    for (const id of stockIds) {
      // Scale by the initial level too: a stock decaying to zero has settled,
      // even though its period-on-period *relative* change stays constant.
      const scale = Math.max(Math.abs(last[id]!), Math.abs(prior[id]!), Math.abs(first[id]!), 1e-300);
      maxRel = Math.max(maxRel, Math.abs(last[id]! - prior[id]!) / scale);
    }
    if (maxRel > 1e-6) {
      converged = false;
      pushDiag(
        diag(
          'no-steady-state',
          'warning',
          `Stocks were still moving at t = ${periods} (relative change ` +
            `${maxRel.toExponential(2)}). This model may have no steady state at these values.`,
        ),
      );
    }
  }

  // Alternating signs in the stock update mean discrete-time instability.
  for (const id of stockIds) {
    const tail = stockDeltas[id]!.slice(-20);
    let flips = 0;
    for (let i = 1; i < tail.length; i += 1) {
      if (Math.sign(tail[i]!) !== 0 && Math.sign(tail[i]!) === -Math.sign(tail[i - 1]!)) flips += 1;
    }
    if (flips >= 8) {
      pushDiag(
        diag(
          'oscillation',
          'warning',
          `${id} oscillates period to period (${flips} sign changes in the last 20). ` +
            `With dt = 1 this is discrete-time instability, not a business cycle.`,
          { varId: id },
        ),
      );
    }
  }

  const final = path[path.length - 1]!;
  return {
    values: final,
    path,
    order,
    invariantResults: [...worstInvariant.values()],
    diagnostics,
    converged,
  };
}

/** Solves whichever way the model is timed. */
export function solve(model: Model, opts: DynamicOptions = {}): Solution {
  return model.timing === 'dynamic' ? solveDynamic(model, opts) : solveStatic(model, opts);
}
