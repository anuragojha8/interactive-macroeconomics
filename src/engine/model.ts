/**
 * Model composition. Chapter 3's model is Chapter 2's model plus two
 * relations, and the reader is shown exactly that — so the extension
 * mechanism has to produce a diff, not just a merged object.
 */
import type { Invariant, Model, Relation, VarId, Variable } from './types';

export interface ModelPatch {
  id: string;
  title: string;
  timing?: Model['timing'];
  variables?: Variable[];
  relations?: Relation[];
  invariants?: Invariant[];
  defaults?: Record<VarId, number>;
  periods?: number;
}

/**
 * Merges by id, with the patch winning. This is how a later chapter *restates*
 * something it inherited — Chapter 3 drops the overbar from capital because
 * capital is no longer fixed, which is the notational signal that the model
 * has come alive.
 */
function mergeById<T extends { id: string }>(base: T[], patch: T[] = []): T[] {
  const out = [...base];
  for (const item of patch) {
    const at = out.findIndex((x) => x.id === item.id);
    if (at >= 0) out[at] = item;
    else out.push(item);
  }
  return out;
}

export function extendModel(base: Model, patch: ModelPatch): Model {
  const model: Model = {
    id: patch.id,
    title: patch.title,
    timing: patch.timing ?? base.timing,
    variables: mergeById(base.variables, patch.variables),
    relations: mergeById(base.relations, patch.relations),
    invariants: mergeById(base.invariants, patch.invariants),
    defaults: { ...base.defaults, ...(patch.defaults ?? {}) },
    extends: base.id,
  };
  if (patch.periods !== undefined) model.periods = patch.periods;
  else if (base.periods !== undefined) model.periods = base.periods;
  return model;
}

export interface ModelDiff {
  addedVariables: VarId[];
  addedParameters: VarId[];
  addedRelations: string[];
  addedInvariants: string[];
  removedVariables: VarId[];
  removedRelations: string[];
}

export function modelDiff(base: Model, derived: Model): ModelDiff {
  const baseVars = new Set(base.variables.map((v) => v.id));
  const derivedVars = new Set(derived.variables.map((v) => v.id));
  const baseRels = new Set(base.relations.map((r) => r.id));
  const derivedRels = new Set(derived.relations.map((r) => r.id));
  const baseInvs = new Set(base.invariants.map((i) => i.id));

  const addedVariables = derived.variables.filter((v) => !baseVars.has(v.id)).map((v) => v.id);
  return {
    addedVariables,
    addedParameters: derived.variables
      .filter((v) => !baseVars.has(v.id) && v.kind === 'parameter')
      .map((v) => v.id),
    addedRelations: derived.relations.filter((r) => !baseRels.has(r.id)).map((r) => r.id),
    addedInvariants: derived.invariants.filter((i) => !baseInvs.has(i.id)).map((i) => i.id),
    removedVariables: base.variables.filter((v) => !derivedVars.has(v.id)).map((v) => v.id),
    removedRelations: base.relations.filter((r) => !derivedRels.has(r.id)).map((r) => r.id),
  };
}
