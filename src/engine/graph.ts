/**
 * Dependency analysis: validation, strongly connected components, and a
 * deterministic evaluation order.
 *
 * Accumulation relations are excluded from the within-period graph — a stock is
 * *given* inside a period and updated between periods. That is both the correct
 * economics and what keeps `K → Y → K` from looking like a self-loop in the
 * static solve. Loop detection deliberately includes them, because the Solow
 * feedback loop really is inter-temporal.
 */
import type { Model, Relation, VarId, Variable } from './types';
import { auditingScope, makeScope } from './types';

export class ModelValidationError extends Error {}

export class DuplicateTargetError extends ModelValidationError {
  constructor(target: VarId, ids: string[]) {
    super(`Variable "${target}" is determined by more than one relation: ${ids.join(', ')}`);
    this.name = 'DuplicateTargetError';
  }
}

export class ParameterWriteError extends ModelValidationError {
  constructor(relationId: string, target: VarId) {
    super(`Relation "${relationId}" writes to parameter "${target}". Parameters are exogenous.`);
    this.name = 'ParameterWriteError';
  }
}

export class StockWriteError extends ModelValidationError {
  constructor(relationId: string, target: VarId) {
    super(
      `Relation "${relationId}" targets stock "${target}" but is not an accumulation relation. ` +
        `Stocks change only through accumulation.`,
    );
    this.name = 'StockWriteError';
  }
}

export class UnknownVariableError extends ModelValidationError {
  constructor(relationId: string, id: VarId, role: 'target' | 'input') {
    super(`Relation "${relationId}" references undeclared variable "${id}" as ${role}.`);
    this.name = 'UnknownVariableError';
  }
}

export class UnderdeterminedError extends ModelValidationError {
  constructor(ids: VarId[]) {
    super(`No relation determines: ${ids.join(', ')}`);
    this.name = 'UnderdeterminedError';
  }
}

export class MissingDefaultError extends ModelValidationError {
  constructor(ids: VarId[]) {
    super(`Exogenous variables without defaults: ${ids.join(', ')}`);
    this.name = 'MissingDefaultError';
  }
}

export class MissingInputError extends ModelValidationError {
  constructor(relationId: string, undeclared: VarId[]) {
    super(
      `Relation "${relationId}" reads variables it does not declare as inputs: ` +
        `${undeclared.join(', ')}`,
    );
    this.name = 'MissingInputError';
  }
}

export interface Component {
  vars: VarId[];
  relations: Relation[];
  cyclic: boolean;
}

export interface Analysis {
  variables: Map<VarId, Variable>;
  /** Exogenous within a period: parameters, plus stocks for the static block. */
  exogenous: Set<VarId>;
  relationByTarget: Map<VarId, Relation>;
  /** Evaluation order. Inputs always precede targets. */
  components: Component[];
  /** Non-trivial strongly connected components, in evaluation order. */
  cycles: VarId[][];
}

interface GraphOptions {
  includeAccumulation: boolean;
}

/** Sorted adjacency: input → dependents. Sorting is what makes order deterministic. */
function buildEdges(relations: Relation[], nodes: Set<VarId>): Map<VarId, VarId[]> {
  const edges = new Map<VarId, VarId[]>();
  for (const n of nodes) edges.set(n, []);
  for (const r of relations) {
    for (const input of r.inputs) {
      if (!nodes.has(input)) continue;
      edges.get(input)!.push(r.target);
    }
  }
  for (const [k, v] of edges) edges.set(k, [...new Set(v)].sort());
  return edges;
}

/**
 * Tarjan's algorithm. Emits SCCs in reverse topological order of the
 * condensation, so the caller reverses to get sources first.
 */
function tarjan(nodes: VarId[], edges: Map<VarId, VarId[]>): VarId[][] {
  let index = 0;
  const idx = new Map<VarId, number>();
  const low = new Map<VarId, number>();
  const onStack = new Set<VarId>();
  const stack: VarId[] = [];
  const out: VarId[][] = [];

  const strongConnect = (v: VarId): void => {
    // Iterative to survive deep chains without blowing the JS stack.
    const work: Array<{ v: VarId; i: number }> = [{ v, i: 0 }];
    idx.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const neighbours = edges.get(frame.v) ?? [];

      if (frame.i < neighbours.length) {
        const w = neighbours[frame.i]!;
        frame.i += 1;
        if (!idx.has(w)) {
          idx.set(w, index);
          low.set(w, index);
          index += 1;
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v)!, idx.get(w)!));
        }
        continue;
      }

      work.pop();
      if (low.get(frame.v) === idx.get(frame.v)) {
        const scc: VarId[] = [];
        for (;;) {
          const w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
          if (w === frame.v) break;
        }
        out.push(scc.sort());
      }
      const parent = work[work.length - 1];
      if (parent) {
        low.set(parent.v, Math.min(low.get(parent.v)!, low.get(frame.v)!));
      }
    }
  };

  for (const n of nodes) if (!idx.has(n)) strongConnect(n);
  return out;
}

/** Does this SCC of size 1 loop back on itself? */
function isSelfLoop(v: VarId, edges: Map<VarId, VarId[]>): boolean {
  return (edges.get(v) ?? []).includes(v);
}

export function buildAnalysis(model: Model, opts: GraphOptions): Analysis {
  const variables = new Map<VarId, Variable>();
  for (const v of model.variables) variables.set(v.id, v);

  const relations = opts.includeAccumulation
    ? model.relations
    : model.relations.filter((r) => r.kind !== 'accumulation');

  // --- validation -----------------------------------------------------------
    const accumulatedTargets = new Set<VarId>(
    model.relations.filter((r) => r.kind === 'accumulation').map((r) => r.target),
  );

  const relationByTarget = new Map<VarId, Relation>();
  const dupes = new Map<VarId, string[]>();
  for (const r of relations) {
    if (!variables.has(r.target)) throw new UnknownVariableError(r.id, r.target, 'target');
    for (const i of r.inputs) {
      if (!variables.has(i)) throw new UnknownVariableError(r.id, i, 'input');
    }
    const targetKind = variables.get(r.target)!.kind;
    if (targetKind === 'parameter') throw new ParameterWriteError(r.id, r.target);
            if ((accumulatedTargets.has(r.target) || targetKind === 'stock') && r.kind !== 'accumulation') {
      throw new StockWriteError(r.id, r.target);
    }
    const existing = relationByTarget.get(r.target);
    if (existing) {
      dupes.set(r.target, [...(dupes.get(r.target) ?? [existing.id]), r.id]);
    }
    relationByTarget.set(r.target, r);
  }
  for (const [target, ids] of dupes) throw new DuplicateTargetError(target, ids);

  const accumulated = new Set<VarId>(
    model.relations.filter((r) => r.kind === 'accumulation').map((r) => r.target),
  );
  const exogenous = new Set<VarId>();
  for (const v of model.variables) {
    if (v.kind === 'parameter') exogenous.add(v.id);
    // A stock is given inside a period. In the full (inter-temporal) graph it
    // becomes endogenous only if something actually accumulates it — Chapter
    // 2's capital stock never changes because nothing updates it.
        if (accumulated.has(v.id) && !opts.includeAccumulation) exogenous.add(v.id);
    if (v.kind === 'stock' && !accumulated.has(v.id)) exogenous.add(v.id);
  }

  const missingDefaults = [...exogenous].filter((id) => model.defaults[id] === undefined).sort();
  if (missingDefaults.length > 0) throw new MissingDefaultError(missingDefaults);

  const needsRelation = model.variables
    .filter((v) => !exogenous.has(v.id) && !relationByTarget.has(v.id))
    .map((v) => v.id)
    .sort();
  if (needsRelation.length > 0) throw new UnderdeterminedError(needsRelation);

  // --- ordering -------------------------------------------------------------
  const endogenous = new Set<VarId>(relationByTarget.keys());
  const nodes = [...endogenous].sort();
  const edges = buildEdges(relations, endogenous);

  const sccs = tarjan(nodes, edges).reverse();
  const components: Component[] = sccs.map((vars) => {
    const cyclic = vars.length > 1 || isSelfLoop(vars[0]!, edges);
    return {
      vars,
      relations: vars.map((v) => relationByTarget.get(v)!),
      cyclic,
    };
  });

  return {
    variables,
    exogenous,
    relationByTarget,
    components,
    cycles: components.filter((c) => c.cyclic).map((c) => c.vars),
  };
}

const staticCache = new WeakMap<Model, Analysis>();
const fullCache = new WeakMap<Model, Analysis>();

/** Within-period analysis: accumulation excluded, stocks exogenous. */
export function analyze(model: Model): Analysis {
  let a = staticCache.get(model);
  if (!a) {
    a = buildAnalysis(model, { includeAccumulation: false });
    staticCache.set(model, a);
  }
  return a;
}

/** Full analysis including inter-temporal edges. Used for loop detection. */
export function analyzeFull(model: Model): Analysis {
  let a = fullCache.get(model);
  if (!a) {
    a = buildAnalysis(model, { includeAccumulation: true });
    fullCache.set(model, a);
  }
  return a;
}

/**
 * Verifies that each relation's declared `inputs` cover everything its
 * `compute` actually reads. Run in tests and in dev, not in production.
 */
export function auditInputs(model: Model): void {
  const seed: Record<VarId, number> = {};
  for (const v of model.variables) {
    // Values that keep `pow`, `log` and division defined for every relation.
    seed[v.id] = model.defaults[v.id] ?? 1;
  }
  const base = makeScope(seed);
  for (const r of model.relations) {
    const { scope, reads } = auditingScope(base);
    try {
      r.compute(scope);
    } catch {
      // A relation that throws at seed values still reveals its reads.
    }
    const declared = new Set(r.inputs);
    const undeclared = [...reads].filter((id) => !declared.has(id)).sort();
    if (undeclared.length > 0) throw new MissingInputError(r.id, undeclared);
  }
}

/** Verifies every relation's dimensional derivation against its target unit. */
export function auditUnits(model: Model): string[] {
  const problems: string[] = [];
  const variables = new Map(model.variables.map((v) => [v.id, v]));
  for (const r of model.relations) {
    const target = variables.get(r.target);
    if (!target) {
      problems.push(`${r.id}: unknown target "${r.target}"`);
      continue;
    }
    let expr;
    try {
      expr = r.unitCheck();
    } catch (e) {
      problems.push(`${r.id}: unitCheck threw — ${(e as Error).message}`);
      continue;
    }
    const a = expr.unit.dim;
    const b = target.unit.dim;
    const equal =
      a.money === b.money && a.time === b.time && a.people === b.people && a.goods === b.goods;
    if (!equal) {
      problems.push(
        `${r.id}: derivation yields ${expr.unit.label} but target "${r.target}" is ${target.unit.label}`,
      );
    }
  }
  return problems;
}

/**
 * The exogenous variables that can influence `targets`, found by walking the
 * dependency graph backwards. Used to answer "what would I have to change to
 * make this identity hold again?"
 */
export function exogenousAffecting(model: Model, targets: VarId[]): VarId[] {
  const a = analyze(model);
  const seen = new Set<VarId>();
  const out = new Set<VarId>();
  const queue = [...targets];
  while (queue.length > 0) {
    const v = queue.pop()!;
    if (seen.has(v)) continue;
    seen.add(v);
    if (a.exogenous.has(v)) {
      out.add(v);
      continue;
    }
    const r = a.relationByTarget.get(v);
    if (!r) continue;
    for (const input of r.inputs) queue.push(input);
  }
  return [...out].sort();
}

/** Which variables an invariant's `check` actually reads. */
export function invariantInputs(model: Model, invariantId: string): VarId[] {
  const inv = model.invariants.find((i) => i.id === invariantId);
  if (!inv) throw new Error(`Unknown invariant "${invariantId}"`);
  const seed: Record<VarId, number> = {};
  for (const v of model.variables) seed[v.id] = model.defaults[v.id] ?? 1;
  const { scope, reads } = auditingScope(makeScope(seed));
  try {
    inv.check(scope);
  } catch {
    // A throwing check still reveals what it read.
  }
  return [...reads].sort();
}
