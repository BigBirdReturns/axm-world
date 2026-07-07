// The appliance cartridge seam: an arc-authored cartridge, imported into
// world and played as an embodied world — not authored here.
//
// first-lockout is authored in axm-arc (`cartridges/first-lockout.arc.json`)
// and lives in arc `main`. It is NOT part of world's vendored surface
// (`src/engine`, `src/arcs`, …): those are engine code synced from arc, whereas
// a cartridge is *data* that flows between clients verbatim (the pipeline's
// grammar rule — CARTRIDGE_LIFECYCLE stage 7). So first-lockout enters world
// the same way any player's cartridge does: through the boot import seam
// (`importCartridgeFromJson`), not as bundled world content. It carries the
// `imported-unsigned` trust the receiving client assigns — world does not
// claim first-lockout as its own.
//
// Provenance:
//   Source:   axm-arc cartridges/first-lockout.arc.json
//   Digest:   cart1_3cc60c051cc5a6834cbdaa60756563669850a0e7b8f4d22f947a71dd645f95c5
//   Identity: content-addressed; the same digest on both clients IS the proof
//             that one cartridge has two honest expressions (arc's management
//             surface, world's embodied appliance). Guarded below and in
//             tests/world/appliance-first-lockout.test.ts.

import type { Arc } from "../../engine/types.js";
import firstLockoutArc from "./first-lockout.arc.json";

/**
 * The roster size an appliance boot needs to actually field this cartridge's
 * encounters: the largest party any of its challenges asks for. A raid boss
 * that wants 8–10 agents cannot be fielded from the hall bootstrap's default
 * of 6 — so the appliance reads the requirement from the cartridge rather than
 * assuming a size. Falls back to `undefined` (bootstrap's own default) when a
 * cartridge declares no roster requirements.
 */
export function applianceRosterSize(arc: Arc): number | undefined {
  let max = 0;
  for (const challenge of arc.challenges) {
    const req = challenge.rosterRequirements;
    if (req?.maxAgents) max = Math.max(max, req.maxAgents);
  }
  return max > 0 ? max : undefined;
}

/**
 * The digest first-lockout must resolve to in world, pinned from arc's
 * conformance test (`axm-arc tests/cartridges/first-lockout.test.ts`). If a
 * re-copy of the cartridge ever changes this, the appliance test fails — a
 * content drift between the two clients can never pass silently.
 */
export const FIRST_LOCKOUT_DIGEST =
  "cart1_3cc60c051cc5a6834cbdaa60756563669850a0e7b8f4d22f947a71dd645f95c5";

/** The raw authored arc, as parsed JSON (bundler-inlined; no runtime fs). */
export { firstLockoutArc };

/**
 * The cartridge as a JSON string for the boot import seam
 * (`importCartridgeFromJson`). Digest identity is invariant to formatting —
 * `cartridgeDigest` canonicalizes before hashing — so re-stringifying the
 * parsed arc is safe.
 */
export function firstLockoutCartridgeJson(): string {
  return JSON.stringify(firstLockoutArc);
}
