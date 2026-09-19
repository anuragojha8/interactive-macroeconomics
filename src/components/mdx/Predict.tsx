import { useState } from 'react';
import { solveDynamic, solveStatic } from '../../engine/solve';
import type { Model, Shock, VarId } from '../../engine/types';
import { NOISE_FLOOR } from '../../engine/solve';
import { relDiff } from '../../engine/types';
import { formatValue } from '../../format';
import { recordPrediction } from '../../state/progress';
import { MathText } from './MathText';
import './predict.css';

type Direction = 'up' | 'down' | 'none';

const GLYPH: Record<Direction, string> = { up: '↑', none: '–', down: '↓' };

function outcome(before: number, after: number): Direction {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return 'none';
  if (relDiff(before, after) <= NOISE_FLOOR) return 'none';
  return after > before ? 'up' : 'down';
}

export interface PredictProps {
  id: string;
  model: Model;
  overrides: Record<VarId, number>;
  shocks: Shock[];
  /** Which variables to ask about, and at which period each is judged. */
  ask: Array<{ varId: VarId; label: string; at?: number }>;
  question: string;
}

/**
 * Prediction before observation. The model does not run until the reader has
 * committed, because an intuition tested after the fact is not tested at all.
 */
export function Predict({
  id,
  model,
  overrides,
  shocks,
  ask,
  question,
}: PredictProps): JSX.Element {
  const [picks, setPicks] = useState<Record<VarId, Direction>>({});
  const [revealed, setRevealed] = useState(false);

  const maxPeriod = Math.max(1, ...ask.map((a) => a.at ?? 0));
  const solveAt = (extra: Record<VarId, number>, shocked: boolean) => {
    if (model.timing === 'static') {
      const merged = { ...overrides, ...extra };
      if (shocked) for (const s of shocks) merged[s.varId] = s.to;
      return [solveStatic(model, { overrides: merged }).values];
    }
    const opts = shocked
      ? { overrides: { ...overrides, ...extra }, periods: maxPeriod, shocks }
      : { overrides: { ...overrides, ...extra }, periods: maxPeriod };
    return solveDynamic(model, opts).path!;
  };

  const basePath = solveAt({}, false);
  const shockPath = solveAt({}, true);

  const truth: Record<VarId, Direction> = {};
  const values: Record<VarId, { before: number; after: number }> = {};
  for (const a of ask) {
    const t = model.timing === 'static' ? 0 : Math.min(a.at ?? 0, basePath.length - 1);
    const before = basePath[t]![a.varId]!;
    const after = shockPath[t]![a.varId]!;
    truth[a.varId] = outcome(before, after);
    values[a.varId] = { before, after };
  }

  const answered = ask.filter((a) => picks[a.varId]).length;
  const ready = answered === ask.length;
  const varOf = new Map(model.variables.map((v) => [v.id, v]));

  const run = () => {
    if (!ready || revealed) return;
    setRevealed(true);
    const predicted = Object.fromEntries(ask.map((a) => [a.varId, picks[a.varId]!]));
    const actual = Object.fromEntries(ask.map((a) => [a.varId, truth[a.varId]!]));
    recordPrediction({
      id,
      at: new Date().toISOString(),
      predicted,
      actual,
      correct: ask.every((a) => picks[a.varId] === truth[a.varId]),
    });
  };

  return (
    <div className="predict">
      <span className="eyebrow predict__eyebrow">Predict before running</span>
      <p className="predict__question">{question}</p>

      <ul className="predict__rows">
        {ask.map((a) => {
          const picked = picks[a.varId];
          const right = revealed && picked === truth[a.varId];
          return (
            <li
              key={a.varId}
              className={revealed ? (right ? 'predict__row--right' : 'predict__row--wrong') : ''}
            >
              <span className="predict__label">
                <span className="mono predict__sym">
                  <MathText latex={varOf.get(a.varId)?.symbol ?? a.varId} />
                </span>
                {a.label}
              </span>

              {revealed ? (
                <span className="mono predict__actual">
                  {formatValue(values[a.varId]!.before, varOf.get(a.varId))} →{' '}
                  {formatValue(values[a.varId]!.after, varOf.get(a.varId))}
                  <span className="predict__verdict">{right ? 'called it' : 'missed'}</span>
                </span>
              ) : null}

              <span className="predict__options">
                {(['up', 'none', 'down'] as Direction[]).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    disabled={revealed}
                    aria-pressed={picked === dir}
                    aria-label={`${a.label}: ${dir}`}
                    className={`predict__opt ${picked === dir ? 'predict__opt--on' : ''} ${
                      revealed && truth[a.varId] === dir ? 'predict__opt--truth' : ''
                    }`}
                    onClick={() => setPicks((p) => ({ ...p, [a.varId]: dir }))}
                  >
                    {GLYPH[dir]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="predict__foot">
        <button
          type="button"
          className="predict__run"
          disabled={!ready || revealed}
          onClick={run}
        >
          {revealed ? 'answered' : 'run the model'}
        </button>
        <span className="predict__hint">
          {revealed
            ? 'Predictions are kept. The record accumulates across the book.'
            : ready
              ? 'Committed. These cannot be changed once the model runs.'
              : `${answered} of ${ask.length} committed`}
        </span>
      </div>
    </div>
  );
}
