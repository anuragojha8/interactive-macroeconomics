import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeScenario } from '../engine/scenario';
import type { Model, VarId } from '../engine/types';

/**
 * Parameter state for a chapter, seeded from a shared link when one is present.
 * A damaged link falls back to the model's defaults rather than failing.
 */
export function useOverrides(model: Model): {
  overrides: Record<VarId, number>;
  set: (varId: VarId, value: number) => void;
  reset: () => void;
  notices: string[];
} {
  const location = useLocation();
  const seed = useMemo(() => {
    const query = location.search || (location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?')) : '');
    const encoded = new URLSearchParams(query).get('s');
    if (!encoded) return { params: {} as Record<VarId, number>, notices: [] as string[] };
    const { scenario, diagnostics } = decodeScenario(encoded, model);
    return {
      params: scenario?.modelId === model.id ? scenario.params : {},
      notices: diagnostics.map((d) => d.message),
    };
  }, [location.search, location.hash, model]);

  const [overrides, setOverrides] = useState<Record<VarId, number>>(seed.params);

  const set = useCallback((varId: VarId, value: number) => {
    setOverrides((prev) => ({ ...prev, [varId]: value }));
  }, []);
  const reset = useCallback(() => setOverrides({}), []);

  return { overrides, set, reset, notices: seed.notices };
}
