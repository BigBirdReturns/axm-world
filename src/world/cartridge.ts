// A cartridge is the portable unit axm-world plays. It is intentionally a THIN
// envelope around the canonical axm-arc `Arc` artifact — the same schema, validated
// by the same `validateArc` — so that when axm-arc gains a "publish cartridge" step
// it emits exactly this, and the loader here also accepts a bare arc (what axm-arc
// exports today). The engine is the console; the cartridge is the game.
//
//   Cartridge = { manifest, arc }
//     arc      — the axm-arc scenario (unchanged, portable, deterministic)
//     manifest — axm-arc vocabulary: id/name/domain/engineVersion + trust taxonomy
//                (bundled|verified|imported|quarantined) + a Genesis signature slot.

import type { Arc } from "../engine/types.js";
import { validateArc } from "../engine/schema.js";
import { FIRST_CHARTER } from "../arcs/index.js";
import type { CostumeId } from "./presentation-prefs.js";

/** axm-arc's trust taxonomy (mirror — shared union when axm-arc is updated). */
export type TrustLevel = "bundled" | "verified" | "imported" | "quarantined";

export interface CartridgeManifest {
  /** Envelope version, so the cartridge format can evolve independently of the arc. */
  cartridgeVersion: 1;
  id: string;
  name: string;
  domain: string;
  /** Engine version floor the arc requires (from arc.meta). */
  engineVersion: string;
  trust: TrustLevel;
  /** Spoke hint for the default presentation; ignored by the engine/hub. */
  preferredCostume?: CostumeId;
  /** Genesis signature slot — null until the hub signs it. */
  signature?: string | null;
}

export interface Cartridge {
  manifest: CartridgeManifest;
  arc: Arc;
}

function manifestForArc(arc: Arc, trust: TrustLevel, preferredCostume?: CostumeId): CartridgeManifest {
  return {
    cartridgeVersion: 1,
    id: arc.meta.id,
    name: arc.meta.name,
    domain: arc.meta.domain,
    engineVersion: arc.meta.engineVersion,
    trust,
    preferredCostume,
    signature: null,
  };
}

/** The demo cartridge: First Charter, wrapped as a proper artifact. */
export const FIRST_CHARTER_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(FIRST_CHARTER, "bundled", "board"),
  arc: FIRST_CHARTER,
};

export const BUNDLED_CARTRIDGES: Cartridge[] = [FIRST_CHARTER_CARTRIDGE];

/**
 * Load a cartridge from arbitrary input. Accepts EITHER a full `{ manifest, arc }`
 * envelope OR a bare axm-arc `Arc` (what axm-arc exports today) — both validated by
 * `validateArc`. This is the forward/back-compatibility seam with the hub.
 */
export function parseCartridge(input: unknown, trust: TrustLevel = "imported"): Cartridge {
  if (input && typeof input === "object" && "arc" in input && "manifest" in input) {
    const env = input as { manifest: Partial<CartridgeManifest>; arc: unknown };
    const arc = validateArc(env.arc);
    return { manifest: { ...manifestForArc(arc, trust), ...env.manifest, id: arc.meta.id }, arc };
  }
  const arc = validateArc(input);
  return { manifest: manifestForArc(arc, trust), arc };
}
