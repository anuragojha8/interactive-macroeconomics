import type { Model } from '../engine/types';
import { circularFlowModel } from './circularFlow';
import { bathtubModel } from './kernel/bathtub';
import { fixedPointModel } from './kernel/fixedpoint';
import { ledgerModel } from './kernel/ledger';
import {
  thermostatBangBangModel,
  thermostatConstantModel,
  thermostatProportionalModel,
} from './kernel/thermostat';
import { productionModel } from './production';
import { solowModel } from './solow';

/** In reading order, which is also build order. */
export const models: Model[] = [
  bathtubModel,
  ledgerModel,
  thermostatConstantModel,
  thermostatBangBangModel,
  thermostatProportionalModel,
  fixedPointModel,
  circularFlowModel,
  productionModel,
  solowModel,
];

export const modelById = new Map<string, Model>(models.map((m) => [m.id, m]));

export function getModel(id: string): Model {
  const m = modelById.get(id);
  if (!m) throw new Error(`Unknown model "${id}"`);
  return m;
}
