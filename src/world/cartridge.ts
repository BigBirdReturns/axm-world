// A cartridge is the portable unit axm-world plays. It is intentionally a THIN
// envelope around the canonical axm-arc `Arc` artifact — the same schema, validated
// by the same `validateArc` — so that when axm-arc gains a "publish cartridge" step
// it emits exactly this, and the loader here also accepts a bare arc (what axm-arc
// exports today). The engine is the console; the cartridge is the game.
//
//   Cartridge = { manifest, arc }
//     arc      — the axm-arc scenario (unchanged, portable, deterministic)
//     manifest — axm-arc vocabulary: id/name/domain/engineVersion + trust taxonomy
//                (bundled|imported-unsigned|verified|quarantined) + a Genesis
//                signature slot.

import type { Arc, TrustLabel } from "../engine/types.js";
import { validateArc } from "../engine/schema.js";
import { FIRST_CHARTER, KARAZHAN } from "../arcs/index.js";
import type { CostumeId } from "./presentation-prefs.js";

/**
 * axm-arc's trust taxonomy. This is a re-export, not a parallel union — the
 * hub's `ArcLibraryEntry.trust` (src/game/lib/arc-library.ts) and the vendored
 * engine's `TrustLabel` (src/engine/types.ts) are the same four values. World
 * used to spell its "imported" state differently from the hub; that drift is
 * exactly the kind of divergence the vendoring rule exists to prevent, so this
 * type is now just an alias of the vendored one.
 */
export type TrustLevel = TrustLabel;

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

// ── Authored opening beat (cartridge DATA, not player logic) ────────────────────
// The first interaction. axm-world only reads this, surfaces the options, and hands
// the chosen option to the engine (resolveDramaCard) — it never authors the drama.
// Effects use engine-applied agent dimensions: morale (0–100), stress (0–10),
// loyalty (0–20). scope "all" binds to every bootstrapped agent at load time.

export interface AuthoredEffect {
  scope: "all";
  type: "morale" | "stress" | "loyalty";
  value: number;
}

export interface AuthoredOption {
  id: string;
  label: string;
  /** Shown as the consequence once chosen. */
  description: string;
  effects: AuthoredEffect[];
}

export interface AuthoredOpening {
  triggerType: string;
  narrativeText: string;
  options: AuthoredOption[];
}

// ── Authored people (cartridge DATA, not player logic) ──────────────────────
// The person the player meets in the inhabited hall. Like the opening beat, this
// is authored cartridge content axm-world only reads and surfaces — the name,
// role, bio, and spoken lines belong to the cartridge, never to runtime chrome
// (buttons/prompts/labels stay in the message catalog). Cartridge-layer data, so
// it never touches the arc and never perturbs the computed identity.

export interface AuthoredPerson {
  id: string;
  /** The person's name and role — authored, surfaced verbatim. */
  name: string;
  role: string;
  /** A short authored bio. */
  bio: string;
  /** What they say while they still hold a contract for you. */
  greeting: string;
  /** What they say once their contract is recorded in the world. */
  fulfilledLine: string;
}

export interface Cartridge {
  manifest: CartridgeManifest;
  arc: Arc;
  /** Optional authored opening decision the player faces on entering the world. */
  opening?: AuthoredOpening;
  /** Optional authored people the inhabited surfaces meet. Absent → the hall
   *  falls back to a generic runtime steward. */
  people?: AuthoredPerson[];
}

/** First Charter's opening oath — an ownership/governance choice, not a tactical one. */
export const FIRST_CHARTER_OPENING: AuthoredOpening = {
  triggerType: "founding-oath",
  narrativeText:
    "Before a single contract is taken, the charter must be sworn. The crown's envoy lays a sealed writ on the table: accept its protection, and the crown takes its claim on all the hall will build. The guild waits on your word.",
  options: [
    {
      id: "open-charter",
      label: "Swear the open charter",
      description:
        "You refuse the seal. The hall binds itself to a charter no crown or company can seize — what you build stays yours. The room rises.",
      effects: [
        { scope: "all", type: "morale", value: 8 },
        { scope: "all", type: "loyalty", value: 3 },
      ],
    },
    {
      id: "crown-seal",
      label: "Take the crown's seal",
      description:
        "Safety, and a leash. Coin will flow — but the work is the crown's to claim. A few eyes lower.",
      effects: [
        { scope: "all", type: "morale", value: 3 },
        { scope: "all", type: "loyalty", value: -3 },
      ],
    },
    {
      id: "coin-bound",
      label: "Bind the hall to coin",
      description:
        "No oath, no crown — only the ledger. The mercenary road pays now and costs later. The hall grows quiet.",
      effects: [
        { scope: "all", type: "morale", value: -5 },
        { scope: "all", type: "stress", value: 1 },
      ],
    },
  ],
};

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

/** The First Charter's authored people — whom the player meets in the hall. */
export const FIRST_CHARTER_PEOPLE: AuthoredPerson[] = [
  {
    id: "charter-keeper",
    name: "Maren Vos",
    role: "Charter-Keeper",
    bio: "Keeper of the founding writ. She logs every contract the hall takes and every mark it leaves on the world.",
    greeting: "The hall's work waits, and the ledger with it. Take the contract when you're ready — I'll see it recorded.",
    fulfilledLine: "It's done, and written. The charter remembers what the hall did here.",
  },
];

/** The demo cartridge: First Charter, wrapped as a proper artifact. */
export const FIRST_CHARTER_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(FIRST_CHARTER, "bundled", "board"),
  arc: FIRST_CHARTER,
  opening: FIRST_CHARTER_OPENING,
  people: FIRST_CHARTER_PEOPLE,
};

/** The second bundled game: Karazhan. Structurally distinct from First Charter —
 *  raid roles, attunement gates, and (unlike First Charter) an authored Heroic
 *  difficulty mode. That authored lever is what lets its encounters offer a
 *  posture choice while First Charter's cannot. No opening beat authored. */
export const KARAZHAN_CARTRIDGE: Cartridge = {
  manifest: manifestForArc(KARAZHAN, "bundled", "board"),
  arc: KARAZHAN,
};

export const BUNDLED_CARTRIDGES: Cartridge[] = [FIRST_CHARTER_CARTRIDGE, KARAZHAN_CARTRIDGE];

/**
 * Load a cartridge from arbitrary input. Accepts EITHER a full `{ manifest, arc }`
 * envelope OR a bare axm-arc `Arc` (what axm-arc exports today) — both validated by
 * `validateArc`. This is the forward/back-compatibility seam with the hub.
 */
export function parseCartridge(input: unknown, trust: TrustLevel = "imported-unsigned"): Cartridge {
  if (input && typeof input === "object" && "arc" in input && "manifest" in input) {
    const env = input as { manifest: Partial<CartridgeManifest>; arc: unknown; opening?: AuthoredOpening; people?: AuthoredPerson[] };
    const arc = validateArc(env.arc);
    // Preserve the authored envelope fields (opening beat, people) — they are
    // cartridge DATA layered on the arc, so a parsed envelope must carry them
    // through, not silently drop them.
    return {
      manifest: { ...manifestForArc(arc, trust), ...env.manifest, id: arc.meta.id },
      arc,
      ...(env.opening ? { opening: env.opening } : {}),
      ...(env.people ? { people: env.people } : {}),
    };
  }
  const arc = validateArc(input);
  return { manifest: manifestForArc(arc, trust), arc };
}
