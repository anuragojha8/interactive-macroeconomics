/**
 * Terminal explorer for the model engine.
 *
 * A stand-in for the reading surface: everything the book's model stage will
 * show — solved values, live invariants, the relation list with primitive tags,
 * feedback loops, and the causal trace — printed to a terminal.
 *
 *   npm run play
 *   npm run play -- solow s=0.3
 *   npm run play -- solow --shock s=0.3 --period 0
 *   npm run play -- production K=2000
 *   npm run play -- solow --chart K --periods 120
 */
import { detectLoops } from '../src/engine/loops';
import { solveDynamic, solveStatic } from '../src/engine/solve';
import { trace } from '../src/engine/trace';
import type { Model, Solution, TraceStep, VarId, Variable } from '../src/engine/types';
import { getModel, models } from '../src/models/registry';
import { solowSteadyState } from '../src/models/solow';

// --- terminal niceties ------------------------------------------------------
const ESC = '\u001b';
const useColour = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) =>
  useColour ? `${ESC}[${code}m${s}${ESC}[0m` : s;
const bold = paint('1');
const dim = paint('2');
const red = paint('31');
const green = paint('32');
const yellow = paint('33');
const blue = paint('36');
const magenta = paint('35');
const plain = (s: string) => s;

const KIND_COLOUR: Record<string, (s: string) => string> = {
  identity: blue,
  definition: blue,
  budget: blue,
  behavior: yellow,
  technology: yellow,
  clearing: magenta,
  accumulation: green,
};

const PRIMITIVE_LABEL: Record<string, string> = {
  P1: 'P1 stock/flow',
  P2: 'P2 identity  ',
  P3: 'P3 budget    ',
  P4: 'P4 assumption',
  P5: 'P5 clearing  ',
};

const GREEK: Record<string, string> = { alpha: 'α', bar: '', Delta: 'Δ' };

/** `\bar{A}` → `Ā`, `\alpha_K` → `αK`, so the terminal shows what a page would. */
const symbolOf = (s: string): string =>
  s
    .replace(/\\bar\{(.)\}/g, '$1\u0304')
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => GREEK[name] ?? name)
    .replace(/[_{}]/g, '')
    .replace(/\s+/g, '');

/**
 * Renders LaTeX as something a terminal can show without a renderer.
 * Order matters: overbars are resolved first so that \frac's arguments no
 * longer contain nested braces.
 */
const plainLatex = (s: string): string =>
  s
    .replace(/\\bar\{(.)\}/g, '$1\u0304')
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\^\{([^{}]*)\}/g, '^$1')
    .replace(/_\{([^{}]*)\}/g, '($1)')
    .replace(/\\cdot/g, '·')
    .replace(/\\,/g, ' · ')
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => GREEK[name] ?? name)
    .replace(/[{}_]/g, '')
    .replace(/ +/g, ' ')
    .trim();

/** Visible width, ignoring combining marks such as the overbar. */
const visibleWidth = (s: string): number =>
  [...s.normalize('NFD')].filter((c) => !/\p{M}/u.test(c)).length;

function rule(title = ''): void {
  const width = 78;
  if (!title) {
    console.log(dim('─'.repeat(width)));
    return;
  }
  console.log(`\n${bold(title)} ${dim('─'.repeat(Math.max(0, width - title.length - 1)))}`);
}

function fmt(value: number, v?: Variable): string {
  if (!Number.isFinite(value)) return red(String(value));
  switch (v?.format) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'currency':
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    case 'count':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    default:
      return Math.abs(value) >= 1000
        ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : String(Number(value.toPrecision(8)));
  }
}

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - visibleWidth(s)));
const padLeft = (s: string, n: number) => ' '.repeat(Math.max(1, n - visibleWidth(s))) + s;

// --- argument parsing -------------------------------------------------------
const argv = process.argv.slice(2);
const overrides: Record<VarId, number> = {};
const shocks: Array<{ varId: VarId; to: number; label: string }> = [];
let modelId = 'solow-v1';
let period: number | undefined;
let periods: number | undefined;
let chartVar: string | undefined;

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]!;
  const next = () => argv[(i += 1)]!;
  if (arg === '--shock') {
    const [k, v] = next().split('=');
    shocks.push({ varId: k!, to: Number(v), label: `${symbolOf(k!)} → ${v}` });
  } else if (arg === '--period') period = Number(next());
  else if (arg === '--periods') periods = Number(next());
  else if (arg === '--chart') chartVar = next();
  else if (arg === '--help' || arg === '-h') {
    console.log(
      [
        `${bold('npm run play')}${dim(' -- [model] [var=value ...] [options]')}`,
        '',
        `  model            ${models.map((m) => m.id).join(' | ')}   ${dim('(or: production | solow)')}`,
        '  var=value        override a parameter or a starting stock',
        '  --shock var=v    apply a shock and print the causal trace',
        '  --period n       which period to explain (dynamic models, default: last)',
        '  --periods n      how many periods to simulate',
        '  --chart var      draw the path of a variable',
        '',
        dim('  npm run play -- solow --shock s=0.3 --period 0'),
        dim('  npm run play -- production K=2000'),
        dim('  npm run play -- solow --chart K --periods 120'),
        dim('  npm run play -- solow d=0        # break it: no depreciation'),
        dim('  npm run play -- production alphaK=1   # break it: increasing returns'),
      ].join('\n'),
    );
    process.exit(0);
  } else if (arg.includes('=')) {
    const [k, v] = arg.split('=');
    overrides[k!] = Number(v);
  } else if (arg === 'production') modelId = 'production-v1';
  else if (arg === 'solow') modelId = 'solow-v1';
  else modelId = arg;
}

const model: Model = getModel(modelId);
const varOf = new Map(model.variables.map((v) => [v.id, v]));

// --- solve ------------------------------------------------------------------
const solution: Solution =
  model.timing === 'dynamic'
    ? solveDynamic(model, periods === undefined ? { overrides } : { overrides, periods })
    : solveStatic(model, { overrides });

// --- header -----------------------------------------------------------------
console.log('');
rule();
console.log(`${bold(model.title)}  ${dim(model.id)}`);
const byKind = model.relations.reduce<Record<string, number>>((acc, r) => {
  acc[r.kind] = (acc[r.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(
  dim(
    `${model.timing}  ·  ${model.variables.length} variables  ·  ` +
      Object.entries(byKind)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ') +
      (model.extends ? `  ·  extends ${model.extends}` : ''),
  ),
);
if (Object.keys(overrides).length > 0) {
  console.log(
    yellow(
      'overrides: ' +
        Object.entries(overrides)
          .map(([k, v]) => `${symbolOf(varOf.get(k)?.symbol ?? k)}=${v}`)
          .join('  '),
    ),
  );
}
rule();

// --- relations --------------------------------------------------------------
rule('Relations');
console.log(`${dim(`  ${pad('kind', 14)}${pad('determines', 12)}equation`)}\n`);
for (const r of model.relations) {
  const colour = KIND_COLOUR[r.kind] ?? plain;
  const arguable = r.arguable ? yellow('   ⚠ arguable') : '';
  console.log(
    `  ${colour(pad(r.kind, 14))}${pad(symbolOf(varOf.get(r.target)?.symbol ?? r.target), 12)}` +
      `${dim(plainLatex(r.latex))}${arguable}`,
  );
}
console.log(
  `\n  ${blue('accounting — not arguable')}${dim('  ·  ')}${yellow('assumption — arguable')}` +
    `${dim('  ·  ')}${magenta('clearing')}${dim('  ·  ')}${green('accumulation')}`,
);

// --- values -----------------------------------------------------------------
const lastIndex = solution.path ? solution.path.length - 1 : 0;
const focusIndex = Math.min(period ?? lastIndex, lastIndex);
const focus = solution.path ? solution.path[focusIndex]! : solution.values;

rule(model.timing === 'dynamic' ? `Values at t = ${focusIndex}` : 'Values');
for (const v of model.variables) {
  const value = focus[v.id];
  if (value === undefined) continue;
  const kindTag =
    v.kind === 'stock'
      ? green('stock')
      : v.kind === 'flow'
        ? blue('flow')
        : dim(v.kind);
  console.log(
    `  ${pad(symbolOf(v.symbol), 6)}${pad(v.name, 28)}${padLeft(fmt(value, v), 15)}  ` +
      `${dim(pad(v.unit.label, 30))}${kindTag}`,
  );
}

// --- invariants -------------------------------------------------------------
rule('Invariants');
for (const r of solution.invariantResults) {
  const mark = r.passed ? green('✓') : red('✗');
  const detail = r.passed
    ? dim(`rel error ${r.relError.toExponential(1)}`)
    : red(
        `${fmt(r.lhs)} ≠ ${fmt(r.rhs)}   left side is ` +
          `${((r.lhs / r.rhs) * 100).toFixed(1)}% of the right`,
      );
  console.log(`  ${mark} ${pad(r.name, 40)}${detail}`);
}

// --- diagnostics ------------------------------------------------------------
if (solution.diagnostics.length > 0) {
  rule('Diagnostics');
  for (const d of solution.diagnostics) {
    const colour = d.severity === 'error' ? red : d.severity === 'warning' ? yellow : dim;
    console.log(`  ${colour(d.severity)} ${dim(`[${d.code}]`)} ${d.message}`);
  }
}
console.log(
  `\n  ${solution.converged ? green('converged') : red('did NOT converge')}` +
    (solution.iterations ? dim(`  (${solution.iterations} iterations)`) : ''),
);

// --- simulation vs algebra --------------------------------------------------
if (model.id === 'solow-v1' && solution.path) {
  rule('Simulation vs algebra');
  const ss = solowSteadyState({
    A: focus.A!,
    L: focus.L!,
    s: focus.s!,
    d: focus.d!,
    alphaK: focus.alphaK!,
    alphaL: focus.alphaL!,
  });
  const last = solution.path[lastIndex]!;
  const row = (name: string, sim: number, closed: number) => {
    const verdict = !Number.isFinite(closed)
      ? red('no steady state exists')
      : (() => {
          const rel = Math.abs(sim - closed) / Math.max(Math.abs(sim), Math.abs(closed), 1e-300);
          return rel < 1e-9 ? green(`match (${rel.toExponential(1)})`) : yellow(rel.toExponential(1));
        })();
    console.log(
      `  ${pad(name, 26)}${padLeft(fmt(sim), 16)}${padLeft(fmt(closed), 16)}   ${verdict}`,
    );
  };
  console.log(`${dim(`  ${pad('', 26)}${padLeft('simulated', 16)}${padLeft('closed form', 16)}`)}\n`);
  row('capital K*', last.K!, ss.K);
  row('output Y*', last.Y!, ss.Y);
  row('output per worker y*', last.y!, ss.y);
  row('consumption per worker c*', last.c!, ss.c);
  const prior = solution.path[lastIndex - 1];
  if (prior) {
    const growth = Math.abs(last.Y! - prior.Y!) / Math.max(Math.abs(last.Y!), 1e-300);
    console.log(
      `\n  ${dim('long-run growth of Y:')} ` +
        (growth === 0
          ? `${green('exactly zero')}${dim('   ← the result that reframes everything')}`
          : `${yellow(growth.toExponential(2))}${dim('   still climbing at the last period')}`),
    );
  }
}

// --- loops ------------------------------------------------------------------
// Measure the loop where the reader is looking, not at the defaults.
const loopAt: Record<VarId, number> = { ...overrides };
for (const v of model.variables) {
  if (v.kind === 'stock' && focus[v.id] !== undefined) loopAt[v.id] = focus[v.id]!;
}
const loops = detectLoops(model, loopAt);
rule('Feedback loops');
if (loops.length === 0) console.log(dim('  none — this model has no feedback at all.'));
for (const loop of loops) {
  const path = [...loop.varIds, loop.varIds[0]!]
    .map((id) => symbolOf(varOf.get(id)?.symbol ?? id))
    .join(' → ');
  console.log(
    `  ${loop.stable ? green('stabilizing') : red('amplifying ')}  ` +
      `${dim('gain')} ${loop.gain.toFixed(4)}   ${path}`,
  );
  console.log(dim(`    ${loop.narrative}`));
}

// --- trace ------------------------------------------------------------------
if (shocks.length > 0) {
  const t = trace(model, shocks, {
    overrides,
    ...(period === undefined ? {} : { period }),
    ...(periods === undefined ? {} : { periods }),
  });
  rule(`Causal trace${period === undefined ? '' : `  (t = ${period})`}`);
  console.log(`  ${bold(t.summary)}\n`);
  if (t.steps.length === 0) console.log(dim('  Nothing moved.'));
  for (const step of t.steps as TraceStep[]) {
    const v = varOf.get(step.targetId);
    const arrow =
      step.direction === 'up' ? green('↑') : step.direction === 'down' ? red('↓') : '→';
    const pct = step.pctChange === null ? '' : dim(` (${(step.pctChange * 100).toFixed(2)}%)`);
    console.log(
      `  ${dim(padLeft(String(step.order + 1), 3))}. ${arrow} ` +
        `${bold(pad(symbolOf(v?.symbol ?? step.targetId), 6))}` +
        `${fmt(step.before, v)} → ${fmt(step.after, v)}${pct}`,
    );
    console.log(
      `        ${(KIND_COLOUR[step.relationKind] ?? plain)(PRIMITIVE_LABEL[step.primitive]!)}` +
        dim(`  ${step.because}`),
    );
    if (step.inputDeltas.length > 0) {
      console.log(
        dim(
          '        because ' +
            step.inputDeltas
              .map((d) => `${symbolOf(varOf.get(d.varId)?.symbol ?? d.varId)}: ${fmt(d.before)} → ${fmt(d.after)}`)
              .join(',  '),
        ),
      );
    }
  }
  if (t.unchanged.length > 0) {
    rule('Did not move');
    console.log(`  ${t.unchanged.map((id) => symbolOf(varOf.get(id)?.symbol ?? id)).join(', ')}`);
    console.log(dim('  ← often the whole lesson: nothing here responded to the shock.'));
  }
}

// --- chart ------------------------------------------------------------------
if (chartVar) {
  if (!solution.path) {
    console.log(red(`\n  --chart needs a dynamic model; ${model.id} is static.`));
  } else if (solution.path[0]![chartVar] === undefined) {
    console.log(red(`\n  Unknown variable "${chartVar}"`));
  } else {
    const series = solution.path.map((p) => p[chartVar]!);
    const width = 68;
    const height = 16;
    const stride = Math.max(1, Math.ceil(series.length / width));
    const sampled = series.filter((_, i) => i % stride === 0);
    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    const span = max - min || 1;
    rule(`Path of ${symbolOf(varOf.get(chartVar)?.symbol ?? chartVar)}`);
    const grid: string[][] = Array.from({ length: height }, () =>
      Array.from({ length: sampled.length }, () => ' '),
    );
    const rowOf = (value: number) =>
      height - 1 - Math.round(((value - min) / span) * (height - 1));
    sampled.forEach((value, x) => {
      const y = rowOf(value);
      grid[y]![x] = '●';
      // Join consecutive points so a fast-rising curve reads as a line rather
      // than as a dotted stripe with holes in it.
      if (x > 0) {
        const prev = rowOf(sampled[x - 1]!);
        const [lo, hi] = prev < y ? [prev + 1, y - 1] : [y + 1, prev - 1];
        for (let row = lo; row <= hi; row += 1) if (grid[row]![x] === ' ') grid[row]![x] = '│';
      }
    });
    grid.forEach((row, y) => {
      const label = y === 0 ? fmt(max) : y === height - 1 ? fmt(min) : '';
      console.log(`${dim(padLeft(label, 14))} ${dim('│')}${blue(row.join(''))}`);
    });
    console.log(dim(`${' '.repeat(15)}└${'─'.repeat(sampled.length)}`));
    const tail = `t = ${series.length - 1}`;
    console.log(
      dim(`${' '.repeat(16)}t = 0${' '.repeat(Math.max(1, sampled.length - 5 - tail.length))}${tail}`),
    );
  }
}

console.log('');
