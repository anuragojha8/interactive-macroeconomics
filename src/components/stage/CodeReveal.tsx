import { useState } from 'react';
import type { Relation, Variable } from '../../engine/types';
import { PRIMITIVE_OF } from '../../engine/types';
import { MathText } from '../mdx/MathText';
import './code.css';

/**
 * The equation and the running code are the same object.
 *
 * `compute.toString()` returns the function the solver actually calls — not a
 * transcription of it, not a comment describing it. A reader who suspects the
 * prose can check the arithmetic that produced the number beside it.
 */
export function CodeReveal({
  relation,
  variables,
}: {
  relation: Relation;
  variables: Map<string, Variable>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const target = variables.get(relation.target);

  let derivation = '';
  let derived = '';
  try {
    const expr = relation.unitCheck();
    derivation = expr.describe();
    derived = expr.unit.label;
  } catch (e) {
    derivation = `unitCheck threw: ${(e as Error).message}`;
  }

  return (
    <div className={`reveal ${open ? 'reveal--open' : ''}`}>
      <button type="button" className="reveal__toggle" onClick={() => setOpen((o) => !o)}>
        <span className="mono">{open ? 'hide the code' : 'show the code'}</span>
      </button>

      {open ? (
        <div className="reveal__body">
          <dl className="reveal__meta">
            <dt className="mono">determines</dt>
            <dd className="mono">
              <MathText latex={target?.symbol ?? relation.target} /> — {target?.name} (
              {target?.unit.label})
            </dd>
            <dt className="mono">kind</dt>
            <dd className="mono">
              {relation.kind} · {PRIMITIVE_OF[relation.kind]}
            </dd>
            <dt className="mono">reads</dt>
            <dd className="mono">{relation.inputs.join(', ') || 'nothing'}</dd>
            {relation.citation ? (
              <>
                <dt className="mono">source</dt>
                <dd className="mono">{relation.citation}</dd>
              </>
            ) : null}
          </dl>

          <pre className="reveal__code">
            <code>{relation.compute.toString()}</code>
          </pre>

          <div className="reveal__units">
            <span className="eyebrow">Dimensions</span>
            <p className="mono">
              {derivation} <span className="reveal__result">→ {derived}</span>
            </p>
          </div>

          {relation.arguable ? (
            <div className="reveal__arguable">
              <span className="eyebrow">What a critic would say</span>
              <p>{relation.arguable}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
