import type { Variable } from './engine/types';

/**
 * The single place a number becomes text.
 *
 * Spec §5.7: every figure a reader sees comes from the engine and is formatted
 * here. No component may hand-write a numeral that asserts a model result.
 */
export function formatValue(value: number, variable?: Variable): string {
  if (!Number.isFinite(value)) return '—';
  // Excess demand at a cleared market is -1.42e-14, and reporting that as a
  // number distracts from the fact that it is zero.
  if (value !== 0 && Math.abs(value) < 1e-9) return '0';
  switch (variable?.format) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'currency':
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case 'count':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'index':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    default:
      return Math.abs(value) >= 1000
        ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : String(Number(value.toPrecision(6)));
  }
}

export function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value * 100).toFixed(2)}%`;
}

const GREEK: Record<string, string> = { alpha: 'α', Pi: 'Π', ell: 'ℓ', lambda: 'λ', Delta: 'Δ' };

/** LaTeX to something a browser can render without a math engine. */
export function plainMath(latex: string): string {
  return latex
    .replace(/\\bar\{(.)\}/g, '$1̄')
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\t?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\cdot/g, '·')
    .replace(/\\,/g, ' ')
    .replace(/\;/g, ' ')
    .replace(/\\min/g, 'min')
    .replace(/\\max/g, 'max')
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => GREEK[name] ?? name)
    .replace(/[{}]/g, '')
    .replace(/ +/g, ' ')
    .trim();
}
