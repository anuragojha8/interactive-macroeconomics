/**
 * Dimensional analysis over a fixed four-element basis.
 *
 * The point of this module is pedagogical as much as it is technical: a stock
 * ($) and a flow ($/year) are different *types*, and confusing them is the
 * single most common error in macroeconomics. Here that confusion is a thrown
 * error and a failing test, not a paragraph a reader has to be careful about.
 */

export interface Dimension {
  money: number;
  time: number;
  people: number;
  goods: number;
}

const ZERO: Dimension = { money: 0, time: 0, people: 0, goods: 0 };

const SYMBOL: Record<keyof Dimension, string> = {
  money: '$',
  time: 'year',
  people: 'person',
  goods: 'goods',
};

const AXES: Array<keyof Dimension> = ['money', 'time', 'people', 'goods'];

export function dimension(p: Partial<Dimension> = {}): Dimension {
  return { ...ZERO, ...p };
}

export function sameDimension(a: Dimension, b: Dimension): boolean {
  return AXES.every((k) => a[k] === b[k]);
}

export function isDimensionless(d: Dimension): boolean {
  return AXES.every((k) => d[k] === 0);
}

/**
 * Renders an exponent the way a reader would write it: `2`, or `(2/3)`.
 * Cobb-Douglas gives total factor productivity a fractional-dimension unit,
 * which is worth showing honestly rather than hiding.
 */
export function formatExponent(n: number): string {
  if (Number.isInteger(n)) return String(n);
  for (let q = 2; q <= 12; q += 1) {
    const p = n * q;
    if (Math.abs(p - Math.round(p)) < 1e-9) return `(${Math.round(p)}/${q})`;
  }
  return String(Number(n.toFixed(4)));
}

/** Canonical human-readable label, e.g. `$/year`, `1/year`, `$/(year·person)`. */
export function canonicalLabel(d: Dimension): string {
  const part = (k: keyof Dimension, exp: number) =>
    Math.abs(exp) === 1 ? SYMBOL[k] : `${SYMBOL[k]}^${formatExponent(Math.abs(exp))}`;

  const num = AXES.filter((k) => d[k] > 0).map((k) => part(k, d[k]));
  const den = AXES.filter((k) => d[k] < 0).map((k) => part(k, d[k]));

  if (num.length === 0 && den.length === 0) return 'ratio';

  const top = num.length > 0 ? num.join('·') : '1';
  if (den.length === 0) return top;
  const bottom = den.length > 1 ? `(${den.join('·')})` : den[0]!;
  return `${top}/${bottom}`;
}

export interface Unit {
  readonly dim: Dimension;
  /** Display label. Not part of equality — see {@link unitsEqual}. */
  readonly label: string;
  /** Real (inflation-adjusted) vs nominal. Tracked, but not part of dimension algebra. */
  readonly real: boolean;
}

export function unit(label: string, p: Partial<Dimension> = {}, real = false): Unit {
  return { dim: dimension(p), label, real };
}

/** Derived units always take a generated label, so `$/$` becomes `ratio`. */
function derived(d: Dimension, real: boolean): Unit {
  return { dim: d, label: canonicalLabel(d), real };
}

/** Units are equal when their dimensions match. Labels are presentation only. */
export function unitsEqual(a: Unit, b: Unit): boolean {
  return sameDimension(a.dim, b.dim);
}

export class UnitMismatchError extends Error {
  constructor(
    readonly left: Unit,
    readonly right: Unit,
    op: string,
  ) {
    super(
      `Cannot ${op} incompatible units: ${left.label} [${JSON.stringify(left.dim)}] ` +
        `and ${right.label} [${JSON.stringify(right.dim)}]`,
    );
    this.name = 'UnitMismatchError';
  }
}

// ---------------------------------------------------------------------------
// Common units
// ---------------------------------------------------------------------------

export const DIMENSIONLESS = unit('ratio');
export const RATIO = DIMENSIONLESS;
export const MONEY = unit('$', { money: 1 });
export const MONEY_REAL = unit('$', { money: 1 }, true);
export const YEAR = unit('year', { time: 1 });
export const PER_YEAR = unit('1/year', { time: -1 });
export const MONEY_PER_YEAR = unit('$/year', { money: 1, time: -1 });
export const MONEY_PER_YEAR_REAL = unit('$/year', { money: 1, time: -1 }, true);
export const PERSON = unit('person', { people: 1 });
export const MONEY_PER_PERSON = unit('$/person', { money: 1, people: -1 });
export const MONEY_PER_PERSON_YEAR = unit('$/(year·person)', {
  money: 1,
  time: -1,
  people: -1,
});
export const INDEX = unit('index', {});

// ---------------------------------------------------------------------------
// Unit expressions
// ---------------------------------------------------------------------------

/**
 * A unit computation that records its own derivation, so the book can show a
 * reader *why* `K + (sY − dK)·dt` is dimensionally sound and
 * `K + (sY − dK)` is not.
 */
export class UnitExpr {
  constructor(
    readonly unit: Unit,
    readonly steps: readonly string[] = [],
    readonly warnings: readonly string[] = [],
  ) {}

  private static coerce(x: UnitExpr | Unit): UnitExpr {
    return x instanceof UnitExpr ? x : new UnitExpr(x);
  }

  private combine(
    other: UnitExpr,
    result: Unit,
    op: string,
    extraWarnings: readonly string[] = [],
  ): UnitExpr {
    return new UnitExpr(
      result,
      [
        ...this.steps,
        ...other.steps,
        `${this.unit.label} ${op} ${other.unit.label} = ${result.label}`,
      ],
      [...this.warnings, ...other.warnings, ...extraWarnings],
    );
  }

  mul(x: UnitExpr | Unit): UnitExpr {
    const o = UnitExpr.coerce(x);
    const d = dimension(
      Object.fromEntries(AXES.map((k) => [k, this.unit.dim[k] + o.unit.dim[k]])),
    );
    return this.combine(o, derived(d, this.unit.real || o.unit.real), '×');
  }

  div(x: UnitExpr | Unit): UnitExpr {
    const o = UnitExpr.coerce(x);
    const d = dimension(
      Object.fromEntries(AXES.map((k) => [k, this.unit.dim[k] - o.unit.dim[k]])),
    );
    return this.combine(o, derived(d, this.unit.real || o.unit.real), '÷');
  }

  /**
   * Addition requires matching dimensions. A real/nominal mismatch is a
   * modelling smell rather than a dimension error, so it warns instead.
   */
  add(x: UnitExpr | Unit): UnitExpr {
    const o = UnitExpr.coerce(x);
    if (!sameDimension(this.unit.dim, o.unit.dim)) {
      throw new UnitMismatchError(this.unit, o.unit, 'add');
    }
    const warnings =
      this.unit.real !== o.unit.real
        ? [`Mixing real and nominal quantities: ${this.unit.label} + ${o.unit.label}`]
        : [];
    return this.combine(o, derived(this.unit.dim, this.unit.real && o.unit.real), '+', warnings);
  }

  sub(x: UnitExpr | Unit): UnitExpr {
    const o = UnitExpr.coerce(x);
    if (!sameDimension(this.unit.dim, o.unit.dim)) {
      throw new UnitMismatchError(this.unit, o.unit, 'subtract');
    }
    const warnings =
      this.unit.real !== o.unit.real
        ? [`Mixing real and nominal quantities: ${this.unit.label} − ${o.unit.label}`]
        : [];
    return this.combine(o, derived(this.unit.dim, this.unit.real && o.unit.real), '−', warnings);
  }

  /** Fractional exponents are allowed — Cobb-Douglas needs `K^(1/3)`. */
  pow(n: number): UnitExpr {
    const d = dimension(Object.fromEntries(AXES.map((k) => [k, this.unit.dim[k] * n])));
    const result = derived(d, this.unit.real);
    return new UnitExpr(
      result,
      [...this.steps, `(${this.unit.label})^${n} = ${result.label}`],
      this.warnings,
    );
  }

  /** Human-readable derivation, for the reader-facing unit tooltip. */
  describe(): string {
    return this.steps.length > 0 ? this.steps.join('; ') : this.unit.label;
  }
}

export function u(x: Unit): UnitExpr {
  return new UnitExpr(x);
}
