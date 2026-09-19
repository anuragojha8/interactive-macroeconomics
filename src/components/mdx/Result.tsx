import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';

export interface ResultProps {
  model: Model;
  overrides: Record<VarId, number>;
  of: VarId;
  at?: number;
  periods?: number;
  /** Optional transform, for deriving a ratio or a percentage from the value. */
  as?: (value: number) => string;
}

/**
 * A number in prose, resolved from the model.
 *
 * Spec §5.7: prose may state a figure, but never as a literal. Change the
 * calibration and every sentence follows.
 */
export function Result({ model, overrides, of, at, periods, as }: ResultProps): JSX.Element {
  const solution =
    model.timing === 'dynamic'
      ? solveDynamic(model, { overrides, periods: periods ?? (at ?? 0) + 1 })
      : solveStatic(model, { overrides });
  const values = solution.path ? solution.path[Math.min(at ?? 0, solution.path.length - 1)]! : solution.values;
  const variable = model.variables.find((v) => v.id === of);
  const value = values[of]!;
  return <span className="mono result">{as ? as(value) : formatValue(value, variable)}</span>;
}
