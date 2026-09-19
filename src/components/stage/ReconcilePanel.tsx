import { useMemo } from 'react';
import { reconcile } from '../../engine/reconcile';
import { solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { MathText } from '../mdx/MathText';
import './stage.css';

/**
 * What broke, and what would put it right.
 *
 * Chapter 1's argument is that a single flow cannot be changed on its own. This
 * panel is that argument as a demonstration: every failing identity is listed
 * with the individual changes that would each restore it.
 */
export function ReconcilePanel({
  model,
  overrides,
  onChange,
}: {
  model: Model;
  overrides: Record<VarId, number>;
  onChange: (varId: VarId, value: number) => void;
}): JSX.Element {
  const problems = useMemo(() => reconcile(model, overrides), [model, overrides]);
  const solution = useMemo(() => solveStatic(model, { overrides }), [model, overrides]);
  const varOf = useMemo(() => new Map(model.variables.map((v) => [v.id, v])), [model]);

  if (problems.length === 0) {
    return (
      <div className="reconcile reconcile--ok">
        <span className="eyebrow">Every identity holds</span>
        <p>
          Output measured by spending equals output measured by income, saving less investment
          equals the trade balance, and the three sector balances sum to zero. Change any single
          flow to break one.
        </p>
      </div>
    );
  }

  return (
    <div className="reconcile">
      {problems.map((p) => (
        <div key={p.invariantId} className="reconcile__problem">
          <span className="eyebrow reconcile__head">{p.invariantName} no longer holds</span>
          <p className="mono reconcile__values">
            {formatValue(p.lhs)} ≠ {formatValue(p.rhs)}
          </p>
          <p className="reconcile__why">{p.why}</p>
          {p.options.length > 0 ? (
            <>
              <span className="eyebrow">Any one of these restores it</span>
              <ul className="reconcile__options">
                {p.options.map((o) => (
                  <li key={o.varId}>
                    <button type="button" onClick={() => onChange(o.varId, o.to)}>
                      <span className="mono">
                        <MathText latex={varOf.get(o.varId)?.symbol ?? o.varId} />
                      </span>
                      <span className="mono reconcile__move">
                        {formatValue(o.from, varOf.get(o.varId))} →{' '}
                        {formatValue(o.to, varOf.get(o.varId))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="reconcile__why">No single change restores this one.</p>
          )}
        </div>
      ))}
      <p className="mono reconcile__total">
        output {formatValue(solution.values.Y!)} by spending ·{' '}
        {formatValue(solution.values.Yincome!)} by income
      </p>
    </div>
  );
}
