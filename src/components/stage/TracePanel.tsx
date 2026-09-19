import { useMemo } from 'react';
import { trace as runTrace } from '../../engine/trace';
import type { Model, Shock, VarId } from '../../engine/types';
import { formatSigned, formatValue } from '../../format';
import { MathText } from '../mdx/MathText';
import './trace.css';

const PRIMITIVE_LABEL: Record<string, string> = {
  P1: 'P1 stock/flow',
  P2: 'P2 identity',
  P3: 'P3 budget',
  P4: 'P4 assumption',
  P5: 'P5 clearing',
};

const PRIMITIVE_CLASS: Record<string, string> = {
  P1: 'accumulation',
  P2: 'accounting',
  P3: 'accounting',
  P4: 'assumption',
  P5: 'assumption',
};

export interface TracePanelProps {
  model: Model;
  shocks: Shock[];
  overrides: Record<VarId, number>;
  period: number;
  periods: number;
}

export function TracePanel({
  model,
  shocks,
  overrides,
  period,
  periods,
}: TracePanelProps): JSX.Element {
  const result = useMemo(
    () => runTrace(model, shocks, { overrides, period, periods }),
    [model, shocks, overrides, period, periods],
  );
  const varOf = useMemo(() => new Map(model.variables.map((v) => [v.id, v])), [model]);
  const sym = (id: VarId) => <MathText latex={varOf.get(id)?.symbol ?? id} />;

  return (
    <div className="trace">
      <div className="trace__head">
        <span className="eyebrow">Causal trace — the mechanism, step by step</span>
        <h3 className="trace__title mono">{result.summary}</h3>
      </div>

      {result.steps.length === 0 ? (
        <p className="trace__empty">Nothing moved.</p>
      ) : (
        <ol className="trace__steps">
          {result.steps.map((step) => (
            <li key={step.relationId} className={`step step--${PRIMITIVE_CLASS[step.primitive]}`}>
              <div className="step__head">
                <span className="mono step__target">{sym(step.targetId)}</span>
                <span className="mono step__values">
                  {formatValue(step.before, varOf.get(step.targetId))} →{' '}
                  {formatValue(step.after, varOf.get(step.targetId))}
                </span>
                {step.pctChange !== null ? (
                  <span className={`mono step__pct step__pct--${step.direction}`}>
                    {step.direction === 'up' ? '↑' : step.direction === 'down' ? '↓' : ''}{' '}
                    {formatSigned(step.pctChange)}
                  </span>
                ) : null}
                <span
                  className={`mono step__primitive step__primitive--${PRIMITIVE_CLASS[step.primitive]}`}
                >
                  {PRIMITIVE_LABEL[step.primitive]}
                </span>
              </div>
              <p className="step__because">{step.because}</p>
              {step.inputDeltas.length > 0 ? (
                <p className="mono step__inputs">
                  because{' '}
                  {step.inputDeltas
                    .map((d, i) => (
                      <span key={d.varId}>
                        {i > 0 ? ',  ' : ''}
                        {sym(d.varId)}: {formatValue(d.before, varOf.get(d.varId))} →{' '}
                        {formatValue(d.after, varOf.get(d.varId))}
                      </span>
                    ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {result.unchanged.length > 0 ? (
        <div className="unchanged">
          <div className="unchanged__head">
            <span className="eyebrow">Did not move</span>
            <span className="mono unchanged__count">{result.unchanged.length} variables</span>
          </div>
          <div className="unchanged__chips">
            {result.unchanged.map((id) => (
              <span key={id} className="mono chip">
                {sym(id)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
