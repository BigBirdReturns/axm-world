// World-side projection of the axm-arc resource-spend lever. The engine already
// owns the law (bounded, mean-preserving variance narrowing — see the vendored
// resolver + docs/design/RESOURCE_SPEND_*). This module is the world's faithful
// mirror of that law for the encounter surface: it decides when a spend control
// may be offered, computes the same steadiness factor the resolver uses, and
// words the receipt. PURE: no React, no engine mutation.
//
// The sovereignty rule holds here too: no authored lever → no offer. Below-gate
// party → no offer. No tokens → no offer. And the projection never claims a
// higher mean — only a narrower band.

import type { ResourceSpendLever } from "../../engine/types.js";
import type { PartyReadiness } from "../readiness.js";

/** The steadiness factor k ∈ [minSteadiness, 1] the resolver applies to the
 *  symmetric variance. k = 1 (no effect) when no lever, gates fail, or no spend.
 *  MUST mirror the vendored resolver's steadinessFor exactly. */
export function steadinessForLever(
  lever: ResourceSpendLever | null | undefined,
  gatesOk: boolean,
  tokensSpent: number,
): number {
  if (!lever || !gatesOk || tokensSpent <= 0) return 1;
  const honored = Math.min(tokensSpent, lever.maxTokens);
  return Math.max(lever.minSteadiness, 1 - lever.steadinessPerToken * honored);
}

export interface SpendOffer {
  /** Whether the encounter may render a spend control at all. */
  available: boolean;
  /** The most tokens the control may let the player commit (0 when unavailable). */
  maxSpend: number;
}

/** Decide whether — and how far — the encounter may offer resource-spend. The
 *  gate is the sovereignty rule made concrete: a control renders ONLY when the
 *  contract authors a lever, the party clears the hard gates (countOk && rolesOk),
 *  and the player actually holds tokens. Any of those failing → no offer. */
export function spendOffer(
  lever: ResourceSpendLever | null | undefined,
  readiness: Pick<PartyReadiness, "countOk" | "rolesOk"> | null,
  tokenBalance: number,
): SpendOffer {
  const gatesOk = !!readiness && readiness.countOk && readiness.rolesOk;
  if (!lever || !gatesOk || tokenBalance <= 0) return { available: false, maxSpend: 0 };
  const maxSpend = Math.min(lever.maxTokens, Math.floor(tokenBalance));
  if (maxSpend <= 0) return { available: false, maxSpend: 0 };
  return { available: true, maxSpend };
}

/** True when the player actually committed a spend on this run. */
export function spendWasUsed(tokensSpent: number): boolean {
  return tokensSpent > 0;
}

/** The tokens a run actually commits: the encounter's explicit choice when given
 *  (clamped to what the org holds, never negative), else the legacy default of 1
 *  when any are held. Pure so the world→engine wiring is testable without a hook. */
export function resolveTokensSpent(override: number | undefined, tokenBalance: number): number {
  if (override !== undefined) return Math.max(0, Math.min(override, tokenBalance));
  return tokenBalance > 0 ? 1 : 0;
}
