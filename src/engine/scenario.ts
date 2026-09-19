/**
 * Scenario encoding.
 *
 * A reader who is stuck at a particular parameterisation should be able to send
 * a friend the exact thing that confused them. With no server, the state has to
 * ride in the URL, so it is kept short enough to paste into a message.
 *
 * Decoding never throws. A stale or truncated link degrades to the model's
 * defaults with a diagnostic, because a broken link should cost the reader a
 * scenario, not the page.
 */
import type { Diagnostic, Model, Shock, VarId } from './types';

export const SCENARIO_VERSION = 'v1';

export interface Scenario {
  modelId: string;
  params: Record<VarId, number>;
  shocks: Shock[];
  period?: number;
}

export interface DecodeResult {
  scenario: Scenario | null;
  diagnostics: Diagnostic[];
}

interface Wire {
  m: string;
  p?: Record<string, number>;
  k?: Array<[VarId, number, number?, string?]>;
  t?: number;
}

const toBase64Url = (s: string): string =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (s: string): string => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))));
};

/** Six significant figures: past that the digits are noise, and they cost length. */
const compact = (n: number): number => Number(n.toPrecision(6));

export function encodeScenario(scenario: Scenario): string {
  const wire: Wire = { m: scenario.modelId };
  const params = Object.entries(scenario.params);
  if (params.length > 0) {
    wire.p = Object.fromEntries(params.map(([k, v]) => [k, compact(v)]));
  }
  if (scenario.shocks.length > 0) {
    wire.k = scenario.shocks.map((s) => [s.varId, compact(s.to), s.atPeriod ?? 0, s.label]);
  }
  if (scenario.period !== undefined) wire.t = scenario.period;
  return `${SCENARIO_VERSION}.${toBase64Url(JSON.stringify(wire))}`;
}

export function decodeScenario(encoded: string, model: Model): DecodeResult {
  const diagnostics: Diagnostic[] = [];
  const dot = encoded.indexOf('.');
  const version = dot < 0 ? '' : encoded.slice(0, dot);

  if (version !== SCENARIO_VERSION) {
    diagnostics.push({
      code: 'scenario-version',
      severity: 'warning',
      message: `This link was made by a different version of the book (${version || 'unknown'}). Showing the defaults instead.`,
    });
    return { scenario: null, diagnostics };
  }

  let wire: Wire;
  try {
    wire = JSON.parse(fromBase64Url(encoded.slice(dot + 1))) as Wire;
    if (typeof wire?.m !== 'string') throw new Error('no model');
  } catch {
    diagnostics.push({
      code: 'scenario-version',
      severity: 'warning',
      message: 'This link is damaged. Showing the defaults instead.',
    });
    return { scenario: null, diagnostics };
  }

  const known = new Map(model.variables.map((v) => [v.id, v]));
  const params: Record<VarId, number> = {};
  for (const [id, raw] of Object.entries(wire.p ?? {})) {
    const variable = known.get(id);
    if (!variable || typeof raw !== 'number' || !Number.isFinite(raw)) {
      diagnostics.push({
        code: 'scenario-dropped',
        severity: 'info',
        message: `The link set "${id}", which this model does not have. Ignored.`,
        varId: id,
      });
      continue;
    }
    let value = raw;
    const domain = variable.domain;
    if (domain && (value < domain.min || value > domain.max)) {
      value = Math.min(domain.max, Math.max(domain.min, value));
      diagnostics.push({
        code: 'scenario-clamped',
        severity: 'info',
        message: `The link set ${variable.symbol} to ${raw}, outside its range. Clamped to ${value}.`,
        varId: id,
      });
    }
    params[id] = value;
  }

  const shocks: Shock[] = [];
  for (const entry of wire.k ?? []) {
    const [id, to, at, label] = entry;
    if (!known.has(id) || typeof to !== 'number' || !Number.isFinite(to)) {
      diagnostics.push({
        code: 'scenario-dropped',
        severity: 'info',
        message: `The link shocked "${id}", which this model does not have. Ignored.`,
        varId: id,
      });
      continue;
    }
    const shock: Shock = { varId: id, to, label: label ?? `${id} → ${to}` };
    if (typeof at === 'number' && Number.isFinite(at)) shock.atPeriod = at;
    shocks.push(shock);
  }

  const scenario: Scenario = { modelId: wire.m, params, shocks };
  if (typeof wire.t === 'number' && Number.isFinite(wire.t)) scenario.period = wire.t;
  return { scenario, diagnostics };
}
