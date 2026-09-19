import { useMemo } from 'react';
import { solveStatic } from '../../engine/solve';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { PLOT, makeScales, ticks } from './scales';
import './viz.css';

/**
 * One variable against a swept parameter, evaluated by the engine at every
 * sample. Used where the shape of a response is the argument — the bend in
 * output as capital rises is diminishing returns, drawn.
 */
export function ResponseCurve({
  model,
  overrides,
  sweep,
  of,
  from,
  to,
  markAt,
  title,
  subtitle,
}: {
  model: Model;
  overrides: Record<VarId, number>;
  sweep: VarId;
  of: VarId;
  from: number;
  to: number;
  markAt?: number[];
  title: string;
  subtitle: string;
}): JSX.Element {
  const samples = useMemo(() => {
    const n = 80;
    return Array.from({ length: n + 1 }, (_, i) => {
      const at = from + ((to - from) * i) / n;
      const v = solveStatic(model, { overrides: { ...overrides, [sweep]: at } }).values[of]!;
      return { at, v };
    }).filter((s) => Number.isFinite(s.v));
  }, [model, overrides, sweep, of, from, to]);

  const varOf = new Map(model.variables.map((v) => [v.id, v]));
  const alt = `${varOf.get(of)?.name} plotted against ${varOf.get(sweep)?.name}, from ${formatValue(from)} to ${formatValue(to)}. ${subtitle}`;
  const yMax = Math.max(...samples.map((s) => s.v)) * 1.05;
  const { x, y } = makeScales([from, to], [0, yMax]);
  const points = samples.map((s) => `${x(s.at).toFixed(1)},${y(s.v).toFixed(1)}`).join(' ');

  const marks = (markAt ?? []).map((at) => ({
    at,
    v: solveStatic(model, { overrides: { ...overrides, [sweep]: at } }).values[of]!,
  }));

  return (
    <figure className="viz">
      <figcaption className="viz__caption">
        <span className="mono viz__title">{title}</span>
        <span className="viz__sub">{subtitle}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${PLOT.width + PLOT.pad.left + PLOT.pad.right} ${PLOT.height + PLOT.pad.top + PLOT.pad.bottom}`}
        role="img"
        aria-label={alt}
      >
        <g transform={`translate(${PLOT.pad.left}, ${PLOT.pad.top})`}>
          {ticks([0, yMax]).map((t) => (
            <g key={t}>
              <line x1={0} y1={y(t)} x2={PLOT.width} y2={y(t)} className="viz__grid" />
              <text x={-8} y={y(t) + 4} className="mono viz__tick" textAnchor="end">
                {formatValue(t)}
              </text>
            </g>
          ))}
          {ticks([from, to]).map((t) => (
            <text
              key={`x-${t}`}
              x={x(t)}
              y={PLOT.height + 16}
              className="mono viz__tick"
              textAnchor="middle"
            >
              {formatValue(t)}
            </text>
          ))}
          <line x1={0} y1={0} x2={0} y2={PLOT.height} className="viz__axis" />
          <line x1={0} y1={PLOT.height} x2={PLOT.width} y2={PLOT.height} className="viz__axis" />

          {/* The vertical axis carries a quantity, and it says which one. */}
          <text x={-8} y={-8} className="mono viz__axislabel" textAnchor="start">
            {varOf.get(of)?.unit.label}
          </text>

          <polyline className="viz__line viz__line--in" points={points} />
          {marks.map((m) => (
            <g key={m.at}>
              <line
                x1={x(m.at)}
                y1={y(m.v)}
                x2={x(m.at)}
                y2={PLOT.height}
                className="viz__drop"
              />
              <circle cx={x(m.at)} cy={y(m.v)} r={6} className="viz__halo" />
              <circle cx={x(m.at)} cy={y(m.v)} r={4} className="viz__dot" />
              <text
                x={x(m.at)}
                y={y(m.v) - 12}
                className="mono viz__note"
                textAnchor="middle"
              >
                {formatValue(m.v, varOf.get(of))}
              </text>
            </g>
          ))}
          <text
            x={PLOT.width / 2}
            y={PLOT.height + 40}
            className="mono viz__axislabel"
            textAnchor="middle"
          >
            {varOf.get(sweep)?.name} ({varOf.get(sweep)?.unit.label})
          </text>
        </g>
      </svg>
    </figure>
  );
}
