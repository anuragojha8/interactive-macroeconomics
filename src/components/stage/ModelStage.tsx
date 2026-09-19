import { useMemo } from 'react';
import { detectLoops } from '../../engine/loops';
import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, Solution, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { MathText } from '../mdx/MathText';
import { CodeReveal } from './CodeReveal';
import './stage.css';

const KIND_CLASS: Record<string, string> = {
  identity: 'accounting',
  definition: 'accounting',
  budget: 'accounting',
  behavior: 'assumption',
  technology: 'assumption',
  clearing: 'assumption',
  accumulation: 'accumulation',
};

export interface ModelStageProps {
  model: Model;
  overrides: Record<VarId, number>;
  onChange: (varId: VarId, value: number) => void;
  /** Which parameters get a slider. Others stay fixed and out of the way. */
  controls: VarId[];
  /** Which variables to list. Defaults to everything endogenous. */
  show?: VarId[];
  period: number;
  periods: number;
}

export function ModelStage({
  model,
  overrides,
  onChange,
  controls,
  show,
  period,
  periods,
}: ModelStageProps): JSX.Element {
  const solution: Solution = useMemo(
    () =>
      model.timing === 'dynamic'
        ? solveDynamic(model, { overrides, periods })
        : solveStatic(model, { overrides }),
    [model, overrides, periods],
  );

  const values = solution.path
    ? solution.path[Math.min(period, solution.path.length - 1)]!
    : solution.values;

  const loops = useMemo(() => {
    const at: Record<VarId, number> = { ...overrides };
    for (const v of model.variables) {
      if (v.kind === 'stock' && values[v.id] !== undefined) at[v.id] = values[v.id]!;
    }
    return detectLoops(model, at);
  }, [model, overrides, values]);

  const varOf = useMemo(
    () => new Map(model.variables.map((v) => [v.id, v])),
    [model],
  );
  const listed = show ?? model.variables.filter((v) => v.kind !== 'parameter').map((v) => v.id);

  return (
    <aside className="stage">
      <header className="stage__head">
        <span className="mono stage__id">{model.id}</span>
        {model.extends ? <span className="mono stage__ext">extends {model.extends}</span> : null}
      </header>

      <section className="stage__block">
        {controls.map((id) => {
          const v = varOf.get(id)!;
          const value = values[id]!;
          const domain = v.domain ?? { min: 0, max: 1, step: 0.01 };
          return (
            <label key={id} className="control">
              <span className="control__row">
                <span className="mono control__name">
                  <MathText latex={v.symbol} /> <span className="control__label">{v.name}</span>
                </span>
                <span className="mono control__value">{formatValue(value, v)}</span>
              </span>
              <input
                type="range"
                min={domain.min}
                max={domain.max}
                step={domain.step ?? (domain.max - domain.min) / 100}
                value={value}
                aria-label={`${v.name} (${v.unit.label})`}
                onChange={(e) => onChange(id, Number(e.target.value))}
              />
            </label>
          );
        })}
      </section>

      <section className="stage__block">
        <div className="stage__blockhead">
          <span className="eyebrow">Values</span>
          {solution.path ? <span className="mono stage__t">t = {period}</span> : null}
        </div>
        <table className="values">
          <tbody>
            {listed.map((id) => {
              const v = varOf.get(id)!;
              return (
                <tr key={id}>
                  <th scope="row" className="mono">
                    <MathText latex={v.symbol} />
                  </th>
                  <td className="mono values__num">{formatValue(values[id]!, v)}</td>
                  <td className="mono values__unit">{v.unit.label}</td>
                  <td className={`mono values__kind values__kind--${v.kind}`}>{v.kind}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="stage__block">
        <span className="eyebrow">Invariants — must always hold</span>
        <ul className="invariants" aria-live="polite">
          {solution.invariantResults.map((r) => (
            <li key={r.id} className={r.passed ? 'ok' : 'bad'}>
              <span aria-hidden="true">{r.passed ? '✓' : '✗'}</span>
              <span className="invariants__name">{r.name}</span>
              <span className="mono invariants__detail">
                {r.passed ? 'holds' : `off by ${(r.relError * 100).toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stage__block">
        <span className="eyebrow">Relations</span>
        <ul className="relations">
          {model.relations.map((r) => (
            <li key={r.id} className="relations__item">
              <span className="relations__line">
                <span className={`mono relations__kind relations__kind--${KIND_CLASS[r.kind]}`}>
                  {r.kind}
                </span>
                <span className="relations__body">
                  <span className="mono relations__eq">
                    <MathText latex={r.latex} />
                  </span>
                  {r.arguable ? (
                    <span className="relations__flag" title={r.arguable}>
                      arguable
                    </span>
                  ) : null}
                </span>
              </span>
              <CodeReveal relation={r} variables={varOf} />
            </li>
          ))}
        </ul>
        <div className="legend">
          <span className="legend__item legend__item--accounting">accounting — not arguable</span>
          <span className="legend__item legend__item--assumption">assumption — arguable</span>
          <span className="legend__item legend__item--accumulation">accumulation</span>
        </div>
      </section>

      {loops.length > 0 ? (
        <section className="stage__block">
          <span className="eyebrow">Feedback loop</span>
          {loops.map((loop) => (
            <div key={loop.id} className="loop">
              <span className="mono loop__path">
                {[...loop.varIds, loop.varIds[0]!].map((id, i) => (
                  <span key={`${id}-${i}`}>
                    {i > 0 ? ' → ' : ''}
                    <MathText latex={varOf.get(id)?.symbol ?? id} />
                  </span>
                ))}
              </span>
              <span className={`loop__tag loop__tag--${loop.sign}`}>{loop.sign}</span>
              <span className="mono loop__gain">gain {loop.gain.toFixed(4)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {solution.diagnostics.length > 0 ? (
        <section className="stage__block">
          <span className="eyebrow">Diagnostics</span>
          <ul className="diagnostics">
            {solution.diagnostics.slice(0, 4).map((d, i) => (
              <li key={i} className={`diagnostics--${d.severity}`}>
                <span className="mono">[{d.code}]</span> {d.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
