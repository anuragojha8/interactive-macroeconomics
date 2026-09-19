import { useMemo } from 'react';
import { solveDynamic } from '../../engine/solve';
import type { Model, Shock, VarId } from '../../engine/types';
import { formatValue } from '../../format';
import { PLOT, PLOT_COMPACT, makeScales, ticks } from './scales';
import './viz.css';

export interface TimePathProps {
  model: Model;
  overrides: Record<VarId, number>;
  varId: VarId;
  periods: number;
  shocks?: Shock[];
  /** Marked with a crosshair and a readout. */
  focus?: number;
  /**
   * What distinguishes this figure from the one beside it. Three charts titled
   * "Room temperature over 60 periods" tell a reader nothing about which rule
   * produced which shape.
   */
  label?: string;
  /**
   * A shared vertical range, so a row of small multiples can be compared. Left
   * out, each figure sizes its own axis to its own path.
   */
  domain?: [number, number];
  /** Chrome stripped for a small multiple; the figures move into the caption. */
  compact?: boolean;
}

export function TimePath({
  model,
  overrides,
  varId,
  periods,
  shocks,
  focus,
  label,
  domain,
  compact = false,
}: TimePathProps): JSX.Element {
  const series = useMemo(() => {
    const opts = shocks ? { overrides, periods, shocks } : { overrides, periods };
    return solveDynamic(model, opts).path!.map((p) => p[varId]!);
  }, [model, overrides, varId, periods, shocks]);

  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const padding = (hi - lo) * 0.12 || 1;
  const yDomain: [number, number] = domain ?? [lo - padding, hi + padding];
  const plot = compact ? PLOT_COMPACT : PLOT;
  const { x, y } = makeScales([0, series.length - 1], yDomain, plot);
  const points = series.map((v, t) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const variable = model.variables.find((v) => v.id === varId);
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const alt = `${label ? `${label}. ` : ''}${variable?.name} over ${series.length - 1} periods, from ${formatValue(first, variable)} to ${formatValue(last, variable)}.`;
  const focusValue = focus === undefined ? undefined : series[Math.min(focus, series.length - 1)];
  const viewBox = `0 0 ${plot.width + plot.pad.left + plot.pad.right} ${plot.height + plot.pad.top + plot.pad.bottom}`;

  if (compact) {
    return (
      <figure className="viz viz--compact">
        <figcaption className="viz__caption">
          <span className="mono viz__title">{label ?? variable?.name}</span>
          <span className="mono viz__sub">
            {formatValue(first, variable)} → {formatValue(last, variable)} {variable?.unit.label}
          </span>
        </figcaption>
        <svg viewBox={viewBox} role="img" aria-label={alt}>
          <g transform={`translate(${plot.pad.left}, ${plot.pad.top})`}>
            <line
              x1={0}
              y1={plot.height}
              x2={plot.width}
              y2={plot.height}
              className="viz__baseline"
            />
            <polyline className="viz__line viz__line--stock" points={points} />
          </g>
        </svg>
      </figure>
    );
  }

  return (
    <figure className="viz">
      <figcaption className="viz__caption">
        <span className="mono viz__title">
          {label ?? `${variable?.name} over ${series.length - 1} periods`}
        </span>
        <span className="viz__sub">
          Starting at {formatValue(first, variable)}, ending at {formatValue(last, variable)}.
        </span>
      </figcaption>
      <svg viewBox={viewBox} role="img" aria-label={alt}>
        <g transform={`translate(${plot.pad.left}, ${plot.pad.top})`}>
          {ticks(yDomain).map((t) => (
            <g key={t}>
              <line x1={0} y1={y(t)} x2={plot.width} y2={y(t)} className="viz__grid" />
              <text x={-8} y={y(t) + 4} className="mono viz__tick" textAnchor="end">
                {formatValue(t)}
              </text>
            </g>
          ))}
          {ticks([0, series.length - 1]).map((t) => (
            <text
              key={`x-${t}`}
              x={x(t)}
              y={plot.height + 16}
              className="mono viz__tick"
              textAnchor="middle"
            >
              {t}
            </text>
          ))}
          <line x1={0} y1={0} x2={0} y2={plot.height} className="viz__axis" />
          <line x1={0} y1={plot.height} x2={plot.width} y2={plot.height} className="viz__axis" />

          {/* The vertical axis carries a quantity, and it says which one. */}
          <text x={-8} y={-8} className="mono viz__axislabel" textAnchor="start">
            {variable?.unit.label}
          </text>

          <polyline className="viz__line viz__line--stock" points={points} />

          {focusValue !== undefined && focus !== undefined ? (
            <g>
              <line x1={x(focus)} y1={0} x2={x(focus)} y2={plot.height} className="viz__crosshair" />
              <circle cx={x(focus)} cy={y(focusValue)} r={6.5} className="viz__halo" />
              <circle cx={x(focus)} cy={y(focusValue)} r={4.5} className="viz__dot" />
              <text
                x={x(focus) + (x(focus) > plot.width * 0.72 ? -10 : 10)}
                y={y(focusValue) - 10}
                className="mono viz__note"
                textAnchor={x(focus) > plot.width * 0.72 ? 'end' : 'start'}
              >
                t = {focus}: {formatValue(focusValue, variable)}
              </text>
            </g>
          ) : null}

          <text
            x={plot.width / 2}
            y={plot.height + 40}
            className="mono viz__axislabel"
            textAnchor="middle"
          >
            periods
          </text>
        </g>
      </svg>
    </figure>
  );
}
