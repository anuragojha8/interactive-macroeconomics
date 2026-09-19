import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';

type Mode = 'percent' | 'times' | 'difference' | 'ratio';

/**
 * A change between two calibrations, computed rather than asserted.
 *
 * Prose constantly wants to say "about a quarter more" or "twenty-seven times".
 * Those are model results, and §5.7 forbids typing one in. This resolves them
 * from the engine, so the sentence stays true when the calibration moves.
 */
export function Delta({
  model,
  from,
  to,
  of,
  as = 'percent',
  at,
  periods,
  digits,
}: {
  model: Model;
  from: Record<VarId, number>;
  to: Record<VarId, number>;
  of: VarId;
  as?: Mode;
  at?: number;
  periods?: number;
  digits?: number;
}): JSX.Element {
  const valueOf = (overrides: Record<VarId, number>): number => {
    if (model.timing === 'dynamic') {
      const horizon = periods ?? (at ?? 0) + 1;
      const path = solveDynamic(model, { overrides, periods: horizon }).path!;
      return path[Math.min(at ?? 0, path.length - 1)]![of]!;
    }
    return solveStatic(model, { overrides }).values[of]!;
  };

  const before = valueOf(from);
  const after = valueOf(to);
  const variable = model.variables.find((v) => v.id === of);

  let text: string;
  switch (as) {
    case 'times':
      text = `${(after / before).toFixed(digits ?? 2)}×`;
      break;
    case 'ratio':
      text = `${(after / before).toLocaleString('en-US', { maximumFractionDigits: digits ?? 0 })}`;
      break;
    case 'difference':
      text = formatValue(after - before, variable);
      break;
    default: {
      const change = (after - before) / Math.abs(before);
      const sign = change > 0 ? '+' : change < 0 ? '−' : '';
      text = `${sign}${Math.abs(change * 100).toFixed(digits ?? 1)}%`;
    }
  }

  return <span className="mono result">{text}</span>;
}
