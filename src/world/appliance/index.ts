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
import type { BootstrapOptions } from "../../spoke/bootstrap.js";
import firstLockoutArc from "./first-lockout.arc.json";

/**
 * The minimum roster composition an appliance boot needs to field this
 * cartridge's encounters: for each role, the largest count any single
 * challenge asks of it. Challenges are played from the same roster one at a
 * time, so the per-role demand is the max across challenges (and the headcount
 * must cover their sum — see `applianceRosterSize`). Empty when no challenge
 * declares role requirements. (issue #93)
 */
export function applianceRoleFloor(arc: Arc): Record<string, number> {
  const floor: Record<string, number> = {};
  for (const challenge of arc.challenges) {
    for (const req of challenge.rosterRequirements?.roleRequirements ?? []) {
      floor[req.roleId] = Math.max(floor[req.roleId] ?? 0, req.count);
    }
  }
  return floor;
}

/**
 * The roster size an appliance boot needs to actually field this cartridge's
 * encounters. Two demands: the largest single party any challenge asks for
 * (`maxAgents`), and enough distinct bodies to cover the whole role
 * composition (the sum of the per-role floor — a warden cannot double as the
 * mender a different fight needs). A raid boss that wants 8–10 agents cannot be
 * fielded from the hall bootstrap's default of 6, so the appliance reads the
 * requirement from the cartridge rather than assuming a size. Falls back to
 * `undefined` (bootstrap's own default) when a cartridge declares no roster
 * requirements. (issue #93)
 */
export function applianceRosterSize(arc: Arc): number | undefined {
  let maxParty = 0;
  for (const challenge of arc.challenges) {
    const req = challenge.rosterRequirements;
    if (req?.maxAgents) maxParty = Math.max(maxParty, req.maxAgents);
  }
  const composition = Object.values(applianceRoleFloor(arc)).reduce((s, n) => s + n, 0);
  const size = Math.max(maxParty, composition);
  return size > 0 ? size : undefined;
}

/**
 * The `bootstrapOrg` options a fresh appliance boot should use for this
 * cartridge — the one seam PR 054 wires into the runtime. `rosterSize` and
 * `roleFloor` come straight from `applianceRosterSize`/`applianceRoleFloor`;
 * when a cartridge declares no roster requirements both are omitted
 * (`{ rosterSize: undefined, roleFloor: undefined }`), which `bootstrapOrg`
 * treats identically to omitting the options (its `?? 6` default and the
 * round-robin role fallback apply), so a requirement-less cartridge boots
 * byte-identically to before this seam existed (Article 5: old cartridges
 * always boot). Pulled out as its own pure function so the boot decision is
 * unit-testable without rendering `useArcWorld` itself. (issue #93)
 */
export function applianceBootOptions(arc: Arc): BootstrapOptions {
  const floor = applianceRoleFloor(arc);
  return {
    rosterSize: applianceRosterSize(arc),
    roleFloor: Object.keys(floor).length > 0 ? floor : undefined,
  };
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
