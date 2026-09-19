/**
 * Units for Chapter 0's non-economic models.
 *
 * The dimension basis is fixed at money / time / people / goods, so a bathtub's
 * litres and a room's degrees both ride the `goods` axis. They are
 * dimensionally interchangeable, which would matter if any single model mixed
 * them; none does. Labels are declared explicitly so each model reads in its
 * own vocabulary.
 */
import { unit } from '../../engine/units';

export const LITRE = unit('litres', { goods: 1 });
export const LITRE_PER_MIN = unit('litres/min', { goods: 1, time: -1 });
export const PER_MIN = unit('1/min', { time: -1 });
export const MINUTE = unit('min', { time: 1 });

export const DEGREE = unit('°C', { goods: 1 });
export const DEGREE_PER_MIN = unit('°C/min', { goods: 1, time: -1 });
