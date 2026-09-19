/**
 * The causal trace — a stack trace for the economy.
 *
 * Every textbook shows the before and the after. This shows the mechanism
 * executing: which relation fired, on what inputs, in what order, and whether
 * the step was accounting (not arguable) or an assumption (arguable).
 *
 * Variables that did *not* move are reported explicitly, because that is
 * frequently the whole lesson. Raising the savings rate does nothing to output
 * today, and a reader who does not see that stated will not notice it.
 */
import { analyze, analyzeFull } from './graph';
import { detectLoops } from './loops';
import { NOISE_FLOOR, solveDynamic, solveStatic } from './solve';
import type { Model, Relation, Shock, Trace, TraceStep, VarId } from './types';
import { PRIMITIVE_OF, relDiff } from './types';

export interface TraceOptions {
  overrides?: Record<VarId, number>;
  /** Dynamic models: which period to explain. Defaults to 0, the impact period. */
  period?: number;
  /** How far to simulate. Defaults to just past `period`. */
  periods?: number;
}

/** `\bar{A}` → `A`, for generated prose. */
export function plainSymbol(symbol: string): string {
  return symbol
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\/g, '')
    .trim();
}

/**
 * Did this variable actually move? A transition to or from a non-finite value
 * (capital going from zero, where the marginal product is undefined) is a real
 * change even though `relDiff` cannot measure it.
 */
function moved(before: number, after: number): boolean {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return !Object.is(before, after);
  return relDiff(before, after) > NOISE_FLOOR;
}

function direction(before: number, after: number): TraceStep['direction'] {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return 'none';
  if (relDiff(before, after) <= NOISE_FLOOR) return 'none';
  return after > before ? 'up' : 'down';
}

function makeStep(
  order: number,
  relation: Relation,
  before: Readonly<Record<VarId, number>>,
  after: Readonly<Record<VarId, number>>,
  period?: number,
): TraceStep {
  const b = before[relation.target]!;
  const a = after[relation.target]!;
  const step: TraceStep = {
    order,
    relationId: relation.id,
    relationKind: relation.kind,
    targetId: relation.target,
    before: b,
    after: a,
    pctChange: b === 0 || !Number.isFinite(b) || !Number.isFinite(a) ? null : (a - b) / Math.abs(b),
    direction: direction(b, a),
    inputDeltas: relation.inputs
      .filter((id) => moved(before[id] ?? 0, after[id] ?? 0))
      .map((id) => ({ varId: id, before: before[id]!, after: after[id]! })),
    because: relation.because,
    primitive: PRIMITIVE_OF[relation.kind],
  };
  if (period !== undefined) step.period = period;
  return step;
}

function summarise(
  model: Model,
  shocks: Shock[],
  steps: TraceStep[],
): string {
  const symbol = (id: VarId) => {
    const v = model.variables.find((x) => x.id === id);
    return v ? plainSymbol(v.symbol) : id;
  };
  const arrow = (d: TraceStep['direction']) => (d === 'up' ? '↑' : d === 'down' ? '↓' : '→');
  const causes = shocks.map((s) => symbol(s.varId)).join(', ');

  if (steps.length === 0) return `${causes} changed, and nothing else moved.`;

  const headline = steps.reduce((best, s) => {
    const candidate = Math.abs(s.pctChange ?? 0);
    const incumbent = Math.abs(best.pctChange ?? 0);
    return candidate > incumbent * (1 + 1e-9) ? s : best;
  });
  const pct =
    headline.pctChange === null
      ? ''
      : ` ${(Math.abs(headline.pctChange) * 100).toFixed(1)}%`;
  return (
    `${causes} → ${symbol(headline.targetId)} ${arrow(headline.direction)}${pct}` +
    ` (${steps.length} step${steps.length === 1 ? '' : 's'})`
  );
}

/** Values before and after, for one period, plus the prior period for stocks. */
interface Comparison {
  before: Readonly<Record<VarId, number>>;
  after: Readonly<Record<VarId, number>>;
  beforePrior?: Readonly<Record<VarId, number>>;
  afterPrior?: Readonly<Record<VarId, number>>;
}

function compare(model: Model, shocks: Shock[], opts: TraceOptions): Comparison {
  const overrides = opts.overrides ?? {};
  if (model.timing === 'static') {
    const shocked = { ...overrides };
    for (const s of shocks) shocked[s.varId] = s.to;
    return {
      before: solveStatic(model, { overrides }).values,
      after: solveStatic(model, { overrides: shocked }).values,
    };
  }

  const period = opts.period ?? 0;
  const periods = opts.periods ?? period + 1;
  const base = solveDynamic(model, { overrides, periods });
  const shocked = solveDynamic(model, { overrides, periods, shocks });
  const c: Comparison = {
    before: base.path![period]!,
    after: shocked.path![period]!,
  };
  if (period > 0) {
    c.beforePrior = base.path![period - 1]!;
    c.afterPrior = shocked.path![period - 1]!;
  }
  return c;
}

export function trace(model: Model, shocks: Shock[], opts: TraceOptions = {}): Trace {
  const analysis = analyze(model);
  const { before, after, beforePrior, afterPrior } = compare(model, shocks, opts);
  const period = model.timing === 'dynamic' ? (opts.period ?? 0) : undefined;

  const steps: TraceStep[] = [];
  let order = 0;

  // In a dynamic model past the impact period, the stock moved first — and the
  // relation responsible is the accumulation relation, one period back.
  if (beforePrior && afterPrior) {
    for (const r of model.relations.filter((x) => x.kind === 'accumulation')) {
      if (!moved(before[r.target]!, after[r.target]!)) continue;
      const step = makeStep(order, r, before, after, period);
      step.inputDeltas = r.inputs
        .filter((id) => moved(beforePrior[id] ?? 0, afterPrior[id] ?? 0))
        .map((id) => ({ varId: id, before: beforePrior[id]!, after: afterPrior[id]! }));
      steps.push(step);
      order += 1;
    }
  }

  for (const component of analysis.components) {
    for (const r of component.relations) {
      if (!moved(before[r.target]!, after[r.target]!)) continue;
      steps.push(makeStep(order, r, before, after, period));
      order += 1;
    }
  }

  // Attribute each step to the shocks that move it on their own.
  if (shocks.length > 1) {
    const movedBy = shocks.map((s) => {
      const solo = compare(model, [s], opts);
      return new Set(
        Object.keys(solo.after).filter((id) => moved(solo.before[id]!, solo.after[id]!)),
      );
    });
    for (const step of steps) {
      step.attributedTo = shocks
        .filter((_, i) => movedBy[i]!.has(step.targetId))
        .map((s) => s.varId);
    }
  }

  const shockedIds = new Set(shocks.map((s) => s.varId));
  const changed = new Set(steps.map((s) => s.targetId));
  // From the full graph, so an accumulated stock can be reported as unchanged.
  const unchanged = [...analyzeFull(model).relationByTarget.keys()]
    .filter((id) => !changed.has(id) && !shockedIds.has(id))
    .sort();

  return {
    shocks,
    steps,
    loops: detectLoops(model, opts.overrides ?? {}),
    unchanged,
    summary: summarise(model, shocks, steps),
  };
}
