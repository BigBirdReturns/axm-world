// Pure derivation for the inhabited hall — which contract the hall's steward
// holds, and whether the world has visibly answered it yet. This is the only
// hall-specific state, and it is DERIVED from the run's nodes (never a parallel
// store): the steward offers the first available contract; once every contract
// the steward could offer is recorded, it reflects the most recent one as
// fulfilled. Resolution itself stays in the engine (world.runChallenge) — this
// module decides only what the scene shows.

import type { WorldNode } from "../contract.js";

export interface HallView {
  /** The contract the steward holds, or null if the cartridge authored none. */
  challengeId: string | null;
  /** The contract's authored name (flows verbatim; never chrome). */
  challengeName: string | null;
  /** True once that contract is recorded in the world (status "cleared"): the
   *  steward has been answered and the world has visibly changed. Derived, not
   *  stored. */
  resolved: boolean;
}

type NodeView = Pick<WorldNode, "challengeId" | "title" | "status">;

/** Whether the steward may hand over a contract right now. False while a reward
 *  is unclaimed: resolving another contract calls runChallenge, which REPLACES
 *  the pending reward choices, so starting a new run before claiming would
 *  silently discard the previous contract's loot. The board enforces this by
 *  letting pending loot own the rail; the hall must enforce the same guarantee. */
export function canTakeContract(view: HallView, pendingLootCount: number): boolean {
  return view.challengeId !== null && !view.resolved && pendingLootCount === 0;
}

export function deriveHallView(nodes: readonly NodeView[]): HallView {
  const available = nodes.find((n) => n.status === "available");
  if (available) {
    return { challengeId: available.challengeId, challengeName: available.title, resolved: false };
  }
  // No available contract: surface the most recently recorded one so the steward
  // reflects a fulfilled contract rather than vanishing after the last resolve.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!;
    if (n.status === "cleared") {
      return { challengeId: n.challengeId, challengeName: n.title, resolved: true };
    }
  }
  return { challengeId: null, challengeName: null, resolved: false };
}
