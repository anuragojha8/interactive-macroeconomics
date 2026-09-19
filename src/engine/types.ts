import type { Unit, UnitExpr } from './units';

export type VarId = string;

export type VarKind =
  | 'parameter' // exogenous, reader-adjustable
  | 'stock' // state, carried across periods
  | 'flow' // rate per period
  | 'derived' // computed within a period
  | 'price'; // clears a market

export interface Variable {
  id: VarId;
  /** LaTeX, e.g. `\bar{A}`. */
  symbol: string;
  name: string;
  unit: Unit;
  kind: VarKind;
  domain?: { min: number; max: number; step?: number };
  format?: 'currency' | 'percent' | 'index' | 'ratio' | 'count';
  /** Section id where this symbol is introduced, for the symbol sheet. */
  introducedIn?: string;
  gloss?: string;
}

/**
 * The pedagogically load-bearing type in the whole system.
 *
 * `identity` / `definition` / `budget` are true by construction and are not
 * arguable. `behavior` / `technology` are assumptions, and are the only place
 * where theories legitimately differ. The UI renders the two in different
 * registers and the causal trace labels which kind did the work at each step.
 */
export type RelationKind =
  | 'identity'
  | 'definition'
  | 'budget'
  | 'behavior'
  | 'technology'
  | 'clearing'
  | 'accumulation';

export type Primitive = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export const PRIMITIVE_OF: Record<RelationKind, Primitive> = {
  accumulation: 'P1',
  identity: 'P2',
  definition: 'P2',
  budget: 'P3',
  behavior: 'P4',
  technology: 'P4',
  clearing: 'P5',
};

/** A read-only view of one period's values. Throws on unknown ids. */
export type Scope = ((id: VarId) => number) & {
  readonly values: Readonly<Record<VarId, number>>;
};

export interface Relation {
  id: string;
  kind: RelationKind;
  /** The variable this relation determines. */
  target: VarId;
  /** Declared dependencies. Audited against what `compute` actually reads. */
  inputs: VarId[];
  latex: string;
  compute: (s: Scope) => number;
  /** Dimensional derivation. Must resolve to the target variable's unit. */
  unitCheck: () => UnitExpr;
  /** One line, present tense, for the causal trace. */
  because: string;
  /** For `behavior` / `technology`: what a critic would say. Required by lint. */
  arguable?: string;
  citation?: string;
}

export interface Invariant {
  id: string;
  name: string;
  latex: string;
  check: (s: Scope) => { lhs: number; rhs: number };
  /** Relative tolerance. Default 1e-9. */
  tolerance?: number;
  /**
   * The natural magnitude of the quantities being compared.
   *
   * Required whenever the identity nets to zero. "The sector balances sum to
   * zero" can never pass a purely relative test — floating-point leaves a
   * residue of ~1e-14 and any comparison of that against exact zero has a
   * relative error of 1. The right question is not "how close to zero" but
   * "how close to zero relative to the flows being netted", and this supplies
   * that denominator.
   */
  scale?: (s: Scope) => number;
  why: string;
}

export interface InvariantResult {
  id: string;
  name: string;
  lhs: number;
  rhs: number;
  relError: number;
  passed: boolean;
  period?: number;
}

export interface Model {
  id: string;
  title: string;
  timing: 'static' | 'dynamic';
  variables: Variable[];
  relations: Relation[];
  invariants: Invariant[];
  /** Required for every `parameter` and `stock`; optional seeds for others. */
  defaults: Record<VarId, number>;
  periods?: number;
  /** Model id this one builds on, for the reader-facing diff view. */
  extends?: string;
}

export type DiagnosticCode =
  | 'domain-violation'
  | 'non-finite'
  | 'no-convergence'
  | 'no-steady-state'
  | 'oscillation'
    | 'stock-clamped'
  | 'infeasible'
  | 'unit-warning'
  | 'unknown-variable'
  | 'scenario-dropped'
  | 'scenario-clamped'
  | 'scenario-version';

export interface Diagnostic {
  code: DiagnosticCode;
  severity: 'info' | 'warning' | 'error';
  message: string;
  relationId?: string;
  varId?: VarId;
  period?: number;
}

export interface Solution {
  values: Readonly<Record<VarId, number>>;
  /** Dynamic models only: `path[t]` for t = 0..T. */
  path?: Array<Readonly<Record<VarId, number>>>;
  /** Relation ids in evaluation order. */
  order: string[];
  invariantResults: InvariantResult[];
  diagnostics: Diagnostic[];
  converged: boolean;
  iterations?: number;
}

export interface Shock {
  varId: VarId;
  to: number;
  atPeriod?: number;
  label: string;
  kind?: 'permanent' | 'one-time';
}

export interface TraceStep {
  order: number;
  relationId: string;
  relationKind: RelationKind;
  targetId: VarId;
  before: number;
  after: number;
  pctChange: number | null;
  direction: 'up' | 'down' | 'none';
  inputDeltas: Array<{ varId: VarId; before: number; after: number }>;
  because: string;
  primitive: Primitive;
  period?: number;
  /** With more than one shock: which of them move this variable on their own. */
  attributedTo?: string[];
}

export interface Trace {
  shocks: Shock[];
  steps: TraceStep[];
  loops: LoopReport[];
  /** Variables that did not move. Listed explicitly — this teaches too. */
  unchanged: VarId[];
  summary: string;
}

export interface LoopReport {
  id: string;
  varIds: VarId[];
  relationIds: string[];
  gain: number;
  sign: 'amplifying' | 'stabilizing';
  stable: boolean;
  narrative: string;
}

/** Relative difference, safe at every scale and at zero. */
export function relDiff(a: number, b: number): number {
  if (a === b) return 0;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-300);
  return Math.abs(a - b) / scale;
}

export function makeScope(values: Readonly<Record<VarId, number>>): Scope {
  const fn = ((id: VarId): number => {
    const v = values[id];
    if (v === undefined) {
      throw new Error(`Unknown variable read from scope: "${id}"`);
    }
    return v;
  }) as Scope;
  Object.defineProperty(fn, 'values', { value: values, enumerable: true });
  return fn;
}

/** Wraps a scope to record which variables a `compute` actually reads. */
export function auditingScope(base: Scope): { scope: Scope; reads: Set<VarId> } {
  const reads = new Set<VarId>();
  const fn = ((id: VarId): number => {
    reads.add(id);
    return base(id);
  }) as Scope;
  Object.defineProperty(fn, 'values', { value: base.values, enumerable: true });
  return { scope: fn, reads };
}
