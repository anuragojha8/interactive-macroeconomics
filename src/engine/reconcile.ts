/**
 * Reconciliation: when an identity breaks, what would put it back?
 *
 * This is what makes Chapter 1's circular flow teach something prose cannot.
 * A reader drags one arrow, an identity fails, and the app answers the only
 * useful question — you cannot change one arrow alone, so which of the others
 * has to move, and to what?
 */
import { exogenousAffecting, invariantInputs } from './graph';
import { solveStatic } from './solve';
import type { Model, VarId } from './types';

export interface ReconcileOption {
  varId: VarId;
  from: number;
  to: number;
}

export interface Reconciliation {
  invariantId: string;
  invariantName: string;
  why: string;
  lhs: number;
  rhs: number;
  relError: number;
  /** Single changes that would each restore the identity on their own. */
  options: ReconcileOption[];
}

/** Secant iteration on a scalar. Returns null rather than a wrong answer. */
function findRoot(f: (x: number) => number, x0: number): number | null {
  let a = x0;
  let b = x0 === 0 ? 1 : x0 * 1.05 + 1e-6;
  let fa = f(a);
  let fb = f(b);
  for (let i = 0; i < 80; i += 1) {
    if (!Number.isFinite(fa) || !Number.isFinite(fb) || fb === fa) return null;
    const c = b - (fb * (b - a)) / (fb - fa);
    if (!Number.isFinite(c)) return null;
    a = b;
    fa = fb;
    b = c;
    fb = f(c);
    if (Math.abs(fb) <= 1e-10 * Math.max(1, Math.abs(c))) return c;
  }
  return Math.abs(fb) <= 1e-6 ? b : null;
}

export function reconcile(
  model: Model,
  overrides: Record<VarId, number> = {},
): Reconciliation[] {
  const solution = solveStatic(model, { overrides });
  const failing = solution.invariantResults.filter((r) => !r.passed);

  return failing.map((result) => {
    const inv = model.invariants.find((i) => i.id === result.id)!;
    const candidates = exogenousAffecting(model, invariantInputs(model, result.id));

    const options: ReconcileOption[] = [];
    for (const varId of candidates) {
      const from = solution.values[varId]!;
      const residual = (x: number): number => {
        const trial = solveStatic(model, { overrides: { ...overrides, [varId]: x } });
        const { lhs, rhs } = inv.check(
          Object.assign((id: VarId) => trial.values[id]!, { values: trial.values }),
        );
        return lhs - rhs;
      };
      const to = findRoot(residual, from);
      if (to === null) continue;
      // A "fix" that changes nothing is not a fix.
      if (Math.abs(to - from) <= 1e-9 * Math.max(1, Math.abs(from))) continue;
      const domain = model.variables.find((v) => v.id === varId)?.domain;
      if (domain && (to < domain.min || to > domain.max)) continue;
      options.push({ varId, from, to });
    }

    return {
      invariantId: result.id,
      invariantName: result.name,
      why: inv.why,
      lhs: result.lhs,
      rhs: result.rhs,
      relError: result.relError,
      options,
    };
  });
}
