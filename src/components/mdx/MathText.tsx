import type { ReactNode } from 'react';

const GREEK: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  Delta: 'Δ',
  ell: 'ℓ',
  lambda: 'λ',
  Pi: 'Π',
  pi: 'π',
  sigma: 'σ',
  min: 'min',
  max: 'max',
};

const MACRON = '̄';
const THIN = ' ';

/** Reads a `{...}` group, or a single character. */
function readGroup(src: string, i: number): { body: string; next: number } {
  if (src[i] === '{') {
    let depth = 1;
    let j = i + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth += 1;
      else if (src[j] === '}') depth -= 1;
      j += 1;
    }
    return { body: src.slice(i + 1, j - 1), next: j };
  }
  return { body: src[i] ?? '', next: i + 1 };
}

/**
 * A very small LaTeX subset, rendered as real HTML.
 *
 * Enough for Part I: overbars, sub/superscripts, fractions and greek letters.
 * KaTeX arrives when a chapter needs more than this; until then a `<sub>` beats
 * a string that reads `K_t+1`.
 */
function parse(src: string, keyPrefix = 'm'): ReactNode[] {
  const out: ReactNode[] = [];
  let text = '';
  let k = 0;
  const flush = () => {
    if (text) {
      out.push(text);
      text = '';
    }
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;

    if (ch === '\\') {
      const nameMatch = /^[a-zA-Z]+/.exec(src.slice(i + 1));
      if (!nameMatch) {
        if (src[i + 1] === ',') {
          text += THIN;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }
      const name = nameMatch[0];
      let j = i + 1 + name.length;

      if (name === 'bar') {
        const { body, next } = readGroup(src, j);
        text += body + MACRON;
        i = next;
        continue;
      }
      if (name === 'text') {
        const { body, next } = readGroup(src, j);
        text += body;
        i = next;
        continue;
      }
      if (name === 'frac' || name === 'tfrac') {
        const num = readGroup(src, j);
        const den = readGroup(src, num.next);
        flush();
        k += 1;
        out.push(
          <span key={`${keyPrefix}-f${k}`} className="math-frac">
            {parse(num.body, `${keyPrefix}-fn${k}`)}
            <span className="math-slash">/</span>
            {parse(den.body, `${keyPrefix}-fd${k}`)}
          </span>,
        );
        i = den.next;
        continue;
      }
      if (name === 'cdot') {
        text += '·';
        i = j;
        continue;
      }
      text += GREEK[name] ?? name;
      // `\Delta t` — swallow one following space so it reads as one symbol.
      if (src[j] === ' ' && GREEK[name]) j += 1;
      i = j;
      continue;
    }

    if (ch === '_' || ch === '^') {
      const { body, next } = readGroup(src, i + 1);
      flush();
      k += 1;
      const Tag = ch === '_' ? 'sub' : 'sup';
      out.push(<Tag key={`${keyPrefix}-s${k}`}>{parse(body, `${keyPrefix}-ss${k}`)}</Tag>);
      i = next;
      continue;
    }

    if (ch === '{' || ch === '}') {
      i += 1;
      continue;
    }

    text += ch;
    i += 1;
  }

  flush();
  return out;
}

export function MathText({ latex }: { latex: string }): JSX.Element {
  return <span className="math">{parse(latex)}</span>;
}
