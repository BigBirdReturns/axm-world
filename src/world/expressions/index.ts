import { ILYON_CROWN_TIDES_MATERIAL_SET } from "./ilyon-crown-tides.js";
import type { StrategyBoardMaterialSet } from "./types.js";

export type { StrategyBoardMaterialSet } from "./types.js";

/** Content registrations are inert presentation data. Runtime hosts resolve them only
 * by exact authored digest and independently compiled World Forge projection. */
export const STRATEGY_BOARD_MATERIAL_SETS: readonly StrategyBoardMaterialSet[] = [
  ILYON_CROWN_TIDES_MATERIAL_SET,
];
