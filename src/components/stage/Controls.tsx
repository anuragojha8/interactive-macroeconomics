import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { MathText } from '../mdx/MathText';
import './stage.css';

/**
 * Sliders on their own, for a chapter that runs several models and cannot put
 * all of them in one sticky panel. The controls sit beside the interactive they
 * belong to.
 */
export function Controls({
  model,
  overrides,
  onChange,
  controls,
  periods,
}: {
  model: Model;
  overrides: Record<VarId, number>;
  onChange: (varId: VarId, value: number) => void;
  controls: VarId[];
  periods?: number;
}): JSX.Element {
  const values =
    model.timing === 'dynamic'
      ? solveDynamic(model, { overrides, periods: periods ?? 1 }).path![0]!
      : solveStatic(model, { overrides }).values;
  const varOf = new Map(model.variables.map((v) => [v.id, v]));

  return (
    <div className="controls">
      {controls.map((id) => {
        const v = varOf.get(id)!;
        const domain = v.domain ?? { min: 0, max: 1, step: 0.01 };
        return (
          <label key={id} className="control">
            <span className="control__row">
              <span className="mono control__name">
                <MathText latex={v.symbol} /> <span className="control__label">{v.name}</span>
              </span>
              <span className="mono control__value">{formatValue(values[id]!, v)}</span>
            </span>
            <input
              type="range"
              min={domain.min}
              max={domain.max}
              step={domain.step ?? (domain.max - domain.min) / 100}
              value={values[id]!}
              aria-label={`${v.name} (${v.unit.label})`}
              onChange={(e) => onChange(id, Number(e.target.value))}
            />
          </label>
        );
      })}
    </div>
  );
}
