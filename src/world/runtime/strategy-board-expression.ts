import { cartridgeDigest } from "../../engine/cartridge-digest.js";
import type { Arc } from "../../engine/types.js";
import { STRATEGY_BOARD_MATERIAL_SETS } from "../expressions/index.js";
import type { StrategySpaceMaterial } from "../expressions/types.js";
import { compileProjectionManifest, compileWorldForgePlanV2 } from "../forge/index.js";

export const STRATEGY_BOARD_EXPRESSION_FORMAT = "axm-strategy-board-expression/1" as const;

export interface StrategyBoardExpressionPack {
  format: typeof STRATEGY_BOARD_EXPRESSION_FORMAT;
  cartridgeDigest: `cart1_${string}`;
  planDigest: `wf2_${string}`;
  producer: string;
  sourceClass: "project-authored" | "generated" | "licensed";
  environmentUrl: string;
  foregroundUrl: string;
  standards: { human: string; automatic: string };
  spaces: Readonly<Record<string, StrategySpaceMaterial>>;
  slotUrls: Readonly<Record<string, string>>;
}

/** Resolve inert material only after exact Arc identity and the independently
 * compiled Strategy Board projection agree. No cartridge id routes play. */
export function resolveStrategyBoardExpression(arc: Arc): StrategyBoardExpressionPack | null {
  const digest = cartridgeDigest(arc) as `cart1_${string}`;
  const material = STRATEGY_BOARD_MATERIAL_SETS.find((entry) => entry.cartridgeDigest === digest);
  if (!material) return null;
  const plan = compileWorldForgePlanV2(compileProjectionManifest(arc));
  if (plan.cartridge.digest !== digest || plan.manifest.runtime.family !== "strategy-board") return null;
  const slotUrls = Object.fromEntries(plan.jobs.map((job) => [
    job.id,
    job.contextId === "world" ? material.environmentUrl : material.foregroundUrl,
  ]));
  return {
    format: STRATEGY_BOARD_EXPRESSION_FORMAT,
    cartridgeDigest: digest,
    planDigest: plan.planDigest,
    producer: material.producer,
    sourceClass: material.sourceClass,
    environmentUrl: material.environmentUrl,
    foregroundUrl: material.foregroundUrl,
    standards: material.standards,
    spaces: material.spaces,
    slotUrls,
  };
}
