/**
 * Feedback loop detection.
 *
 * Cycles come from the strongly connected components of the *full* graph,
 * including the inter-temporal edge that accumulation relations create — the
 * Solow feedback loop really does run through time, and pretending otherwise
 * would hide the mechanism.
 *
 * Loop gain is measured, not derived: perturb the anchor variable, let the rest
 * of the loop respond, and see how much comes back. `|gain| < 1` means
 * disturbances die away; `> 1` means they grow.
 */
import { analyzeFull } from './graph';
import { solveStatic } from './solve';
import type { LoopReport, Model, VarId } from './types';
import { makeScope } from './types';

/** Scale-aware step for central differences. */
function stepFor(x: number): number {
  return Math.max(1e-6, 1e-6 * Math.abs(x));
}

/** Enumerates simple cycles through `anchor`, capped to keep this cheap. */
function simpleCycles(
  anchor: VarId,
  members: Set<VarId>,
  edges: Map<VarId, VarId[]>,
  limit = 32,
): VarId[][] {
  const out: VarId[][] = [];
  const path: VarId[] = [anchor];
  const onPath = new Set<VarId>([anchor]);

  const walk = (v: VarId): void => {
    if (out.length >= limit) return;
    for (const w of edges.get(v) ?? []) {
      if (!members.has(w)) continue;
      if (w === anchor) {
        out.push([...path]);
        continue;
      }
      if (onPath.has(w)) continue;
      onPath.add(w);
      path.push(w);
      walk(w);
      path.pop();
      onPath.delete(w);
    }
  };

  walk(anchor);
  return out;
}

function sortedAdjacency(model: Model, members: Set<VarId>): Map<VarId, VarId[]> {
  const edges = new Map<VarId, VarId[]>();
  for (const m of members) edges.set(m, []);
  for (const r of model.relations) {
    if (!members.has(r.target)) continue;
    for (const input of r.inputs) {
      if (!members.has(input)) continue;
      edges.get(input)!.push(r.target);
    }
  }
  for (const [k, v] of edges) edges.set(k, [...new Set(v)].sort());
  return edges;
}

export function detectLoops(
  model: Model,
  at: Readonly<Record<VarId, number>> = {},
): LoopReport[] {
  const full = analyzeFull(model);
  if (full.cycles.length === 0) return [];

  const base = solveStatic(model, { overrides: at }).values;
  const stocks = new Set(model.variables.filter((v) => v.kind === 'stock').map((v) => v.id));

  return full.cycles.map((members, i) => {
    const memberSet = new Set(members);
    const edges = sortedAdjacency(model, memberSet);

    // Anchor on a stock where there is one: the loop's memory lives there.
    const anchor = members.find((m) => stocks.has(m)) ?? members[0]!;
    const cycles = simpleCycles(anchor, memberSet, edges);

    // The longest simple cycle is the informative one. `K → depreciation → K`
    // is real but tells the reader much less than `K → Y → I → K`.
    const primary =
      cycles.slice().sort((a, b) => b.length - a.length || a.join().localeCompare(b.join()))[0] ??
      [anchor];

    const anchorRelation = full.relationByTarget.get(anchor)!;
    let gain: number;

    if (stocks.has(anchor)) {
      // Stocks are exogenous inside a period, so overriding the anchor and
      // re-solving gives the *total* derivative through every channel at once.
      const x = base[anchor]!;
      const h = stepFor(x);
      const next = (value: number): number => {
        const solved = solveStatic(model, { overrides: { ...at, [anchor]: value } }).values;
        return anchorRelation.compute(makeScope(solved));
      };
      gain = (next(x + h) - next(x - h)) / (2 * h);
    } else {
      // Algebraic loop: multiply the partial derivatives along the cycle.
      gain = 1;
      for (let j = 0; j < primary.length; j += 1) {
        const from = primary[j]!;
        const to = primary[(j + 1) % primary.length]!;
        const relation = full.relationByTarget.get(to)!;
        const x = base[from]!;
        const h = stepFor(x);
        const at1 = makeScope({ ...base, [from]: x + h });
        const at2 = makeScope({ ...base, [from]: x - h });
        gain *= (relation.compute(at1) - relation.compute(at2)) / (2 * h);
      }
    }

    const names = primary.map((id) => full.variables.get(id)!.name);
    const relationIds = [...new Set(primary.map((id) => full.relationByTarget.get(id)!.id))].sort();
    const stable = Math.abs(gain) < 1;

    return {
      id: `loop-${i + 1}`,
      varIds: primary,
      relationIds,
      gain,
      sign: stable ? 'stabilizing' : 'amplifying',
      stable,
      narrative:
        `${[...names, names[0]!].join(' → ')} — loop gain ${gain.toFixed(4)}, ` +
        (stable
          ? 'so a disturbance dies away and the system settles.'
          : 'so a disturbance grows and the system does not settle.'),
    } satisfies LoopReport;
  });
}
