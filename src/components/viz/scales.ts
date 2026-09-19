import { scaleLinear } from 'd3-scale';

export interface Plot {
  width: number;
  height: number;
  pad: { top: number; right: number; bottom: number; left: number };
}

export const PLOT: Plot = {
  width: 460,
  height: 300,
  pad: { top: 22, right: 16, bottom: 50, left: 48 },
};

/**
 * A small multiple, for a row of figures whose shapes are being compared rather
 * than read off. Nothing is scaled down: the ticks and the axis titles are gone,
 * and their content is set in the HTML caption instead, where 11px is 11px
 * however narrow the column gets.
 */
export const PLOT_COMPACT: Plot = {
  width: 200,
  height: 86,
  pad: { top: 6, right: 5, bottom: 6, left: 5 },
};

export function makeScales(
  xDomain: [number, number],
  yDomain: [number, number],
  plot: Plot = PLOT,
) {
  return {
    x: scaleLinear().domain(xDomain).range([0, plot.width]),
    y: scaleLinear().domain(yDomain).range([plot.height, 0]),
  };
}

/**
 * Rounded tick values *inside* the domain.
 *
 * Deliberately not `.nice()`: nicing a capital path that runs 1,000 to 2,828
 * widens the axis to 0–4,000 and throws away two thirds of the plot.
 */
export function ticks(domain: [number, number], count = 4): number[] {
  return scaleLinear()
    .domain(domain)
    .ticks(count)
    .filter((t) => t >= domain[0] && t <= domain[1]);
}
