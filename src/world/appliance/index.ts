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
 * The roster size an appliance boot needs to actually field this cartridge's
 * encounters. This includes both the largest party a challenge accepts and the
 * number of generated slots needed to satisfy authored role counts under
 * `bootstrapRoster`'s deterministic round-robin role assignment. A raid boss
 * that wants three healers must not boot with only two merely because the
 * total roster meets `maxAgents`. Falls back to `undefined` (bootstrap's own
 * default) when a cartridge declares no roster requirements.
 */
export function applianceRosterSize(arc: Arc): number | undefined {
  let max = 0;
  const roleIndex = new Map(arc.roles.map((role, index) => [role.id, index]));
  const roleCount = arc.roles.length;
  for (const challenge of arc.challenges) {
    const req = challenge.rosterRequirements;
    if (req?.maxAgents) max = Math.max(max, req.maxAgents);
    if (roleCount === 0) continue;
    for (const roleReq of req?.roleRequirements ?? []) {
      const index = roleIndex.get(roleReq.roleId);
      if (index === undefined || roleReq.count <= 0) continue;
      // Slots are zero-based and roles repeat every `roleCount` agents. The
      // Nth copy of role i therefore appears at i + (N - 1) * roleCount.
      // Every count is monotone in roster-prefix length, so the maximum bound
      // across all requirements satisfies every authored floor simultaneously.
      const slotsNeeded = index + 1 + (roleReq.count - 1) * roleCount;
      max = Math.max(max, slotsNeeded);
    }
  }
  return max > 0 ? max : undefined;
}

/**
 * The `bootstrapOrg` options a fresh appliance boot should use for this
 * cartridge — the one seam PR 054 wires into the runtime. `rosterSize` comes
 * straight from `applianceRosterSize`; when a cartridge declares no roster
 * requirements this is `{ rosterSize: undefined }`, which `bootstrapOrg`
 * treats identically to omitting the option (its `?? 6` default applies), so
 * a requirement-less cartridge boots byte-identically to before this PR
 * (Article 5: old cartridges always boot). Pulled out as its own pure
 * function so the boot decision is unit-testable without rendering
 * `useArcWorld` itself.
 */
export function applianceBootOptions(arc: Arc): BootstrapOptions {
  return { rosterSize: applianceRosterSize(arc) };
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
