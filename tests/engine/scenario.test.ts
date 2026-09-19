import { describe, expect, it } from 'vitest';
import { decodeScenario, encodeScenario, type Scenario } from '../../src/engine/scenario';
import { solowModel } from '../../src/models/solow';
import { expectClose } from '../helpers';

const base: Scenario = {
  modelId: 'solow-v1',
  params: { s: 0.3, d: 0.08 },
  shocks: [{ varId: 's', to: 0.4, atPeriod: 20, label: 's rises to 40%' }],
  period: 20,
};

describe('T11xx — scenario codec', () => {
  it('T1101 round-trips', () => {
    const { scenario, diagnostics } = decodeScenario(encodeScenario(base), solowModel);
    expect(diagnostics).toEqual([]);
    expect(scenario!.modelId).toBe('solow-v1');
    expectClose(scenario!.params.s!, 0.3, 1e-9);
    expectClose(scenario!.params.d!, 0.08, 1e-9);
    expect(scenario!.shocks).toEqual(base.shocks);
    expect(scenario!.period).toBe(20);
  });

  it('T1102 survives a URL hash', () => {
    const url = new URL(`https://example.com/#/ch3?s=${encodeURIComponent(encodeScenario(base))}`);
    const round = decodeScenario(new URLSearchParams(url.hash.split('?')[1]).get('s')!, solowModel);
    expectClose(round.scenario!.params.s!, 0.3, 1e-9);
  });

  it('T1103 drops a variable this model does not have', () => {
    const encoded = encodeScenario({
      ...base,
      params: { ...base.params, notAVariable: 3 },
    });
    const { scenario, diagnostics } = decodeScenario(encoded, solowModel);
    expect(scenario!.params.notAVariable).toBeUndefined();
    expectClose(scenario!.params.s!, 0.3, 1e-9);
    expect(diagnostics.some((d) => d.code === 'scenario-dropped')).toBe(true);
  });

  it('T1104 clamps a value outside its range', () => {
    const { scenario, diagnostics } = decodeScenario(
      encodeScenario({ ...base, params: { s: 5 } }),
      solowModel,
    );
    expect(scenario!.params.s).toBe(1);
    expect(diagnostics.some((d) => d.code === 'scenario-clamped')).toBe(true);
  });

  it('T1105 never throws on a damaged payload', () => {
    for (const bad of ['v1.@@@@', 'v1.', 'v1.eyJ', 'nonsense', '', 'v1.' + 'A'.repeat(50)]) {
      const result = decodeScenario(bad, solowModel);
      expect(result.scenario).toBeNull();
      expect(result.diagnostics.length).toBeGreaterThan(0);
    }
  });

  it('T1106 refuses a payload from another version', () => {
    const { scenario, diagnostics } = decodeScenario(
      encodeScenario(base).replace('v1.', 'v2.'),
      solowModel,
    );
    expect(scenario).toBeNull();
    expect(diagnostics[0]!.code).toBe('scenario-version');
    expect(diagnostics[0]!.message).toMatch(/different version/);
  });

  it('T1107 stays short enough to paste into a message', () => {
    expect(encodeScenario(base).length).toBeLessThan(200);
  });

  it('T1108 is deterministic', () => {
    expect(encodeScenario(base)).toBe(encodeScenario(base));
  });

  it('T1109 keeps float precision to six significant figures', () => {
    const { scenario } = decodeScenario(
      encodeScenario({ ...base, params: { s: 0.123456789 } }),
      solowModel,
    );
    expectClose(scenario!.params.s!, 0.123457, 1e-9);
  });

  it('T1109b encodes an empty scenario compactly', () => {
    const encoded = encodeScenario({ modelId: 'solow-v1', params: {}, shocks: [] });
    expect(encoded.length).toBeLessThan(40);
    const { scenario } = decodeScenario(encoded, solowModel);
    expect(scenario!.params).toEqual({});
    expect(scenario!.shocks).toEqual([]);
  });

  it('T1103b drops a shock on a variable this model does not have', () => {
    const encoded = encodeScenario({
      ...base,
      shocks: [{ varId: 'ghost', to: 1, label: 'ghost' }],
    });
    const { scenario, diagnostics } = decodeScenario(encoded, solowModel);
    expect(scenario!.shocks).toEqual([]);
    expect(diagnostics.some((d) => d.code === 'scenario-dropped')).toBe(true);
  });
});
