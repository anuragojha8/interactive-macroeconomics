import { useMemo } from 'react';
import type { Model, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { samplePhase } from './phase';
import { PLOT, makeScales, ticks } from './scales';
import './viz.css';

export interface PhaseDiagramProps {
  model: Model;
  overrides: Record<VarId, number>;
  /** The stock on the x axis. */
  stock: VarId;
  /** The two flows whose crossing defines the rest point. */
  inflow: VarId;
  outflow: VarId;
  max: number;
}

/**
 * Both curves are evaluated by the engine at each sample point — there is no
 * separate plotting formula that could drift from the model (spec §5.7).
 */
export function PhaseDiagram({
  model,
  overrides,
  stock,
  inflow,
  outflow,
  max,
}: PhaseDiagramProps): JSX.Element {
  const { samples, crossing, yMax, plottable } = useMemo(
    () => samplePhase(model, overrides, { stock, inflow, outflow, max }),
    [model, overrides, stock, inflow, outflow, max],
  );

  const varOf0 = new Map(model.variables.map((v) => [v.id, v]));
  const varOfEarly = varOf0;
  if (!plottable) {
    return (
      <figure className="viz">
        <figcaption className="viz__caption">
          <span className="mono viz__title">Where building and wearing out cancel</span>
          <span className="viz__sub">
            Nothing to plot: {varOfEarly.get(outflow)?.name.toLowerCase()} never catches up, so
            there is no rest point at these values.
          </span>
        </figcaption>
      </figure>
    );
  }

  const { x, y } = makeScales([0, max], [0, yMax]);
  const line = (key: 'inflow' | 'outflow') =>
    samples.map((r) => `${x(r.k).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');

  const varOf = new Map(model.variables.map((v) => [v.id, v]));
  const alt = crossing
    ? `${varOf.get(inflow)?.name} and ${varOf.get(outflow)?.name} plotted against ${varOf.get(stock)?.name}. They cross at ${formatValue(crossing.k)}, where both flows equal ${formatValue(crossing.flow)}.`
    : `${varOf.get(inflow)?.name} and ${varOf.get(outflow)?.name} plotted against ${varOf.get(stock)?.name}. The two never cross over this range, so there is no rest point.`;

  // Flip the callout to the left of the marker when the crossing sits in the
  // right of the plot, so it never runs off the edge or across the curve.
  const crossX = crossing ? x(crossing.k) : 0;
  const flip = crossX > PLOT.width * 0.6;
  const labelX = flip ? crossX - 12 : crossX + 12;
  const labelAnchor = flip ? 'end' : 'start';

  return (
    <figure className="viz">
      <figcaption className="viz__caption">
        <span className="mono viz__title">Where building and wearing out cancel</span>
        <span className="viz__sub">
          Both flows, in {varOf0.get(inflow)?.unit.label}, against the stock they act on.
        </span>
      </figcaption>
      <div className="viz__legend">
        <span className="viz__key viz__key--in">{varOf.get(inflow)?.name}</span>
        <span className="viz__key viz__key--out">{varOf.get(outflow)?.name}</span>
      </div>
      <svg viewBox={`0 0 ${PLOT.width + PLOT.pad.left + PLOT.pad.right} ${PLOT.height + PLOT.pad.top + PLOT.pad.bottom}`} role="img"
        aria-label={alt}>
        <g transform={`translate(${PLOT.pad.left}, ${PLOT.pad.top})`}>
          {ticks([0, yMax]).map((t) => (
            <g key={t}>
              <line x1={0} y1={y(t)} x2={PLOT.width} y2={y(t)} className="viz__grid" />
              <text x={-8} y={y(t) + 4} className="mono viz__tick" textAnchor="end">
                {formatValue(t)}
              </text>
            </g>
          ))}
          {ticks([0, max]).map((t) => (
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
            {varOf.get(inflow)?.unit.label}
          </text>

          <polyline className="viz__line viz__line--out" points={line('outflow')} />
          <polyline className="viz__line viz__line--in" points={line('inflow')} />

          {crossing ? (
            <g>
              <line
                x1={x(crossing.k)}
                y1={y(crossing.flow)}
                x2={x(crossing.k)}
                y2={PLOT.height}
                className="viz__drop"
              />
              <circle cx={x(crossing.k)} cy={y(crossing.flow)} r={6} className="viz__halo" />
              <circle cx={x(crossing.k)} cy={y(crossing.flow)} r={4.5} className="viz__dot" />
              <text
                x={labelX}
                y={y(crossing.flow) - 14}
                className="mono viz__note"
                textAnchor={labelAnchor}
              >
                rest point: {formatValue(crossing.k)}
              </text>
              <text
                x={labelX}
                y={y(crossing.flow) - 1}
                className="mono viz__note viz__note--soft"
                textAnchor={labelAnchor}
              >
                both flows {formatValue(crossing.flow)}
              </text>
            </g>
          ) : (
            <text x={PLOT.width / 2} y={PLOT.height / 2} className="mono viz__none" textAnchor="middle">
              they never cross — no rest point
            </text>
          )}

          <text x={PLOT.width / 2} y={PLOT.height + 40} className="mono viz__axislabel" textAnchor="middle">
            {varOf.get(stock)?.name} ({varOf.get(stock)?.unit.label})
          </text>
        </g>
      </svg>
    </figure>
  );
}
