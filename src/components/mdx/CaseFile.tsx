import type { ReactNode } from 'react';
import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import './case.css';

/**
 * One part of the running case. Marked off from the chapter's exposition,
 * because applying a tool is a different activity from learning it.
 */
export function CaseFile({
  part,
  title,
  question,
  anchor,
  children,
}: {
  part: number;
  title: string;
  question: string;
  /** Set on the first case in a chapter, so the contents rail can reach it. */
  anchor?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="case" id={anchor} aria-labelledby={`case-${part}`}>
      <header className="case__head">
        <span className="mono case__badge">Case · Verano · Part {part}</span>
        <h3 id={`case-${part}`} className="case__title">
          {title}
        </h3>
        <p className="case__question">{question}</p>
      </header>
      <div className="case__body">{children}</div>
    </section>
  );
}

/** The answer, held back until the reader asks for it. */
export function CaseAnswer({ children }: { children: ReactNode }): JSX.Element {
  return (
    <details className="case__answer">
      <summary className="mono">the answer</summary>
      <div className="case__answerbody">{children}</div>
    </details>
  );
}

/**
 * Figures for a case, resolved from the engine at render time. Nothing here is
 * a literal, so a change to the calibration rewrites every number on the page.
 */
export function CaseFigures({
  model,
  overrides,
  show,
  at,
  periods,
}: {
  model: Model;
  overrides: Record<VarId, number>;
  show: Array<{ varId: VarId; label: string }>;
  at?: number;
  periods?: number;
}): JSX.Element {
  const values =
    model.timing === 'dynamic'
      ? solveDynamic(model, { overrides, periods: periods ?? (at ?? 0) + 1 }).path![
          Math.min(at ?? 0, periods ?? (at ?? 0))
        ]!
      : solveStatic(model, { overrides }).values;
  const varOf = new Map(model.variables.map((v) => [v.id, v]));

  return (
    <dl className="case__figures">
      {show.map((s) => (
        <div key={s.varId} className="case__figure">
          <dt>{s.label}</dt>
          <dd>{formatValue(values[s.varId]!, varOf.get(s.varId))}</dd>
        </div>
      ))}
    </dl>
  );
}
