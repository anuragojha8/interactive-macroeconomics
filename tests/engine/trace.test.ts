import { describe, expect, it } from 'vitest';
import { detectLoops } from '../../src/engine/loops';
import { plainSymbol, trace } from '../../src/engine/trace';
import type { Shock } from '../../src/engine/types';
import { productionModel } from '../../src/models/production';
import { solowModel, solowSteadyState } from '../../src/models/solow';
import { convergingCycle } from '../fixtures';
import { expectClose } from '../helpers';

const tfpShock: Shock[] = [{ varId: 'A', to: 1.1, label: 'productivity rises 10%' }];
const savingShock: Shock[] = [{ varId: 's', to: 0.3, label: 'saving rises to 30%' }];

describe('T9xx — causal trace', () => {
  it('T901 never explains a dependent before its dependency', () => {
    const t = trace(productionModel, tfpShock);
    const at = (id: string) => t.steps.findIndex((s) => s.targetId === id);
    expect(at('Y')).toBeLessThan(at('MPK'));
    expect(at('Y')).toBeLessThan(at('MPL'));
    expect(at('MPK')).toBeLessThan(at('r'));
    expect(at('MPL')).toBeLessThan(at('w'));
    expect(t.steps.every((s, i) => s.order === i)).toBe(true);
  });

  it('T902 before and after values match the two solves', () => {
    const t = trace(productionModel, tfpShock);
    const Y = t.steps.find((s) => s.targetId === 'Y')!;
    expectClose(Y.before, 1000, 1e-12);
    expectClose(Y.after, 1100, 1e-12);
    expectClose(Y.pctChange!, 0.1, 1e-12);
    expect(Y.direction).toBe('up');
  });

  it('T903 lists what did not move', () => {
    const t = trace(productionModel, tfpShock);
    // Capital per worker cannot care about productivity.
    expect(t.unchanged).toContain('k');
    expect(t.unchanged).not.toContain('Y');
    // Factor shares are pinned by the exponents, whatever productivity does.
    expect(t.unchanged).toContain('capitalShare');
  });

  it('T904 raising the savings rate does nothing to output today', () => {
    const t = trace(solowModel, savingShock, { period: 0 });
    expect(t.unchanged).toContain('Y');
    expect(t.unchanged).toContain('MPK');
    expect(t.unchanged).toContain('y');
    const moved = t.steps.map((s) => s.targetId).sort();
    expect(moved).toEqual(['C', 'I', 'c']);
    // And the consumption fall is the reader's first encounter with a trade-off.
    expect(t.steps.find((s) => s.targetId === 'C')!.direction).toBe('down');
    expect(t.steps.find((s) => s.targetId === 'I')!.direction).toBe('up');
  });

  it('T905 by the next period output has moved, through capital', () => {
    const t = trace(solowModel, savingShock, { period: 1 });
    const targets = t.steps.map((s) => s.targetId);
    expect(targets).toContain('K');
    expect(targets).toContain('Y');
    expect(t.unchanged).not.toContain('Y');
    // Capital moved first, and it moved because of last period's investment.
    const K = t.steps.find((s) => s.targetId === 'K')!;
    expect(K.order).toBe(0);
    expect(K.relationId).toBe('capital-accumulation');
    expect(K.primitive).toBe('P1');
    expect(K.inputDeltas.map((d) => d.varId)).toContain('I');
  });

  it('T906 every step carries a reason and the right primitive', () => {
    for (const t of [trace(productionModel, tfpShock), trace(solowModel, savingShock)]) {
      for (const step of t.steps) {
        expect(step.because.length, step.relationId).toBeGreaterThan(0);
        expect(['P1', 'P2', 'P3', 'P4', 'P5']).toContain(step.primitive);
      }
    }
    // The distinction the whole book turns on.
        // Consumption is the residual of an identity, not a behavioural rule: only
    // investment is a choice in this model, and the accounting survives whatever
    // rule sets it.
    const consumption = trace(solowModel, savingShock).steps.find((s) => s.targetId === 'C')!;
    expect(consumption.relationKind).toBe('identity');
    expect(consumption.primitive).toBe('P2');
    const investment = trace(solowModel, savingShock).steps.find((s) => s.targetId === 'I')!;
    expect(investment.relationKind).toBe('behavior');
    expect(investment.primitive).toBe('P4');
    const perWorker = trace(productionModel, tfpShock).steps.find((s) => s.targetId === 'y')!;
    expect(perWorker.relationKind).toBe('definition');
    expect(perWorker.primitive).toBe('P2');
  });

  it('T907 direction always matches the sign of the change', () => {
    for (const to of [0.5, 0.9, 1.0001, 2, 5]) {
      const t = trace(productionModel, [{ varId: 'A', to, label: `A = ${to}` }]);
      for (const step of t.steps) {
        if (step.direction === 'up') expect(step.after).toBeGreaterThan(step.before);
        if (step.direction === 'down') expect(step.after).toBeLessThan(step.before);
      }
    }
  });

  it('T908 never reports an infinite or NaN percentage', () => {
    const t = trace(productionModel, [{ varId: 'K', to: 2000, label: 'K doubles' }]);
    for (const step of t.steps) {
      if (step.pctChange !== null) expect(Number.isFinite(step.pctChange)).toBe(true);
    }
    const fromZero = trace(productionModel, [{ varId: 'K', to: 1000, label: 'K returns' }], {
      overrides: { K: 0 },
    });
    for (const step of fromZero.steps) {
      expect(step.pctChange === null || Number.isFinite(step.pctChange)).toBe(true);
    }
  });

  it('T909 floating-point noise does not become a step', () => {
    const t = trace(productionModel, [
      { varId: 'A', to: 1 + 1e-15, label: 'imperceptible' },
    ]);
    expect(t.steps).toHaveLength(0);
  });

  it('T910 the summary names the cause and the headline effect', () => {
    const t = trace(productionModel, tfpShock);
    expect(t.summary).toContain('A');
    expect(t.summary).toContain('Y');
    expect(t.summary).toMatch(/↑/);
  });

  it('T911 is deterministic', () => {
    expect(trace(solowModel, savingShock, { period: 1 })).toEqual(
      trace(solowModel, savingShock, { period: 1 }),
    );
  });

  it('T912 a shock that changes nothing produces no steps', () => {
    const t = trace(productionModel, [{ varId: 'A', to: 1, label: 'no change' }]);
    expect(t.steps).toEqual([]);
    expect(t.unchanged).toContain('Y');
    expect(t.summary).toMatch(/nothing else moved/);
  });

  it('T913 attributes each step to the shocks that move it', () => {
    const t = trace(productionModel, [
      { varId: 'A', to: 1.1, label: 'productivity up' },
      { varId: 'L', to: 1100, label: 'more workers' },
    ]);
    const Y = t.steps.find((s) => s.targetId === 'Y')!;
    expect(Y.attributedTo).toEqual(['A', 'L']);
    // Capital per worker responds to the labour force, not to productivity.
    const k = t.steps.find((s) => s.targetId === 'k')!;
    expect(k.attributedTo).toEqual(['L']);
  });

  it('strips LaTeX for generated prose', () => {
    expect(plainSymbol('\\bar{A}')).toBe('A');
    expect(plainSymbol('\\Delta t')).toBe('Delta t');
    expect(plainSymbol('Y')).toBe('Y');
  });
});

describe('T10xx — feedback loops', () => {
  it('T1001 finds the capital–output loop in Solow', () => {
    const loops = detectLoops(solowModel);
    expect(loops).toHaveLength(1);
    expect(loops[0]!.varIds).toEqual(['K', 'Y', 'I']);
    expect(loops[0]!.relationIds).toContain('production-function');
    expect(loops[0]!.relationIds).toContain('capital-accumulation');
  });

  it('T1002 measures loop gain away from the steady state', () => {
    const [loop] = detectLoops(solowModel, { K: 1000 });
    expectClose(loop!.gain, 0.9666666666666667, 1e-6);
  });

  it('T1003 measures loop gain at the steady state', () => {
    const ss = solowSteadyState({ A: 1, L: 1000, s: 0.2, d: 0.1 });
    const [loop] = detectLoops(solowModel, { K: ss.K });
    expectClose(loop!.gain, 0.9333333333333332, 1e-6);
  });

  it('T1004 gain below one means disturbances die away', () => {
    const [loop] = detectLoops(solowModel, { K: 1000 });
    expect(loop!.stable).toBe(true);
    expect(loop!.sign).toBe('stabilizing');
  });

  it('T1005 with no depreciation the loop amplifies — and that predicts T717', () => {
    const [loop] = detectLoops(solowModel, { K: 1000, d: 0 });
    expect(loop!.gain).toBeGreaterThan(1);
    expect(loop!.stable).toBe(false);
    expect(loop!.sign).toBe('amplifying');
    expectClose(loop!.gain, 1 + 0.2 * (1 / 3), 1e-6);
  });

  it('T1006 numeric partials match the analytic ones', () => {
    // Algebraic loop with known gain g^3.
    for (const g of [0.3, 0.5, 0.7]) {
      const [loop] = detectLoops(convergingCycle(g));
      expectClose(loop!.gain, g ** 3, 1e-6);
    }
  });

  it('T1007 a static acyclic model has no loops', () => {
    expect(detectLoops(productionModel)).toEqual([]);
  });

  it('T1008 the narrative names every variable in the cycle, in order', () => {
    const [loop] = detectLoops(solowModel);
    const names = loop!.varIds.map(
      (id) => solowModel.variables.find((v) => v.id === id)!.name,
    );
    let cursor = -1;
    for (const name of names) {
      const found = loop!.narrative.indexOf(name, cursor + 1);
      expect(found, `${name} in "${loop!.narrative}"`).toBeGreaterThan(cursor);
      cursor = found;
    }
  });

  it('T1009 detection is stable under reordering', () => {
    const shuffled = { ...solowModel, relations: [...solowModel.relations].reverse() };
    expect(detectLoops(shuffled)[0]!.varIds).toEqual(detectLoops(solowModel)[0]!.varIds);
  });

  it('the trace carries the loops with it', () => {
    const t = trace(solowModel, savingShock, { period: 1 });
    expect(t.loops).toHaveLength(1);
    expect(t.loops[0]!.stable).toBe(true);
  });
});
