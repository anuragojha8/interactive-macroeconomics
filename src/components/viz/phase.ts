import { solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';

export interface PhaseSample {
  k: number;
  inflow: number;
  outflow: number;
}

export interface PhaseData {
  samples: PhaseSample[];
  /** Where the two flows cross, or null when they never do. */
  crossing: { k: number; flow: number } | null;
  yMax: number;
  /** False when the model cannot be plotted over this range at all. */
  plottable: boolean;
}

/**
 * Samples both flows across a range of the stock, and locates their crossing by
 * bisection on the engine itself — no separate plotting formula that could
 * drift from the model (spec §5.7).
 *
 * Returns `plottable: false` rather than emitting non-finite coordinates. With
 * no depreciation the closed-form rest point is infinite, and a chart that
 * quietly renders `NaN` into a path is worse than one that says so.
 */
export function samplePhase(
  model: Model,
  overrides: Record<VarId, number>,
  opts: { stock: VarId; inflow: VarId; outflow: VarId; max: number; steps?: number },
): PhaseData {
  const empty: PhaseData = { samples: [], crossing: null, yMax: 0, plottable: false };
  if (!Number.isFinite(opts.max) || opts.max <= 0) return empty;

  const n = opts.steps ?? 90;
  const at = (k: number) =>
    solveStatic(model, { overrides: { ...overrides, [opts.stock]: k } }).values;

  const samples: PhaseSample[] = [];
  for (let i = 0; i <= n; i += 1) {
    const k = (i / n) * opts.max;
    const v = at(k);
    const inflow = v[opts.inflow]!;
    const outflow = v[opts.outflow]!;
    if (!Number.isFinite(inflow) || !Number.isFinite(outflow)) continue;
    samples.push({ k, inflow, outflow });
  }
  if (samples.length < 2) return empty;

  const yMax = Math.max(...samples.map((s) => Math.max(s.inflow, s.outflow)));
  if (!Number.isFinite(yMax) || yMax <= 0) return empty;

  const gap = (k: number) => {
    const v = at(k);
    return v[opts.inflow]! - v[opts.outflow]!;
  };
  let crossing: PhaseData['crossing'] = null;
  let lo = opts.max / n;
  let hi = opts.max;
  if (Number.isFinite(gap(lo)) && Number.isFinite(gap(hi)) && gap(lo) > 0 && gap(hi) < 0) {
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      if (gap(mid) > 0) lo = mid;
      else hi = mid;
    }
    const k = (lo + hi) / 2;
    crossing = { k, flow: at(k)[opts.outflow]! };
  }

  return { samples, crossing, yMax, plottable: true };
}
