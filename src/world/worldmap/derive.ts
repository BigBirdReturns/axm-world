// The World-map projection: the same WorldNode list the board and (eventually) the
// 3D planet consume, grouped into regions for a small 2D location map. PURE — no
// React, no three. The region name is the progression tier's authored name; the
// location is the challenge. Nothing here is authored per contract.
//
// Everything the map draws is DERIVED from the run's own nodes plus the authored
// arc — never a parallel store and never a new mechanic. The three reads the map
// layers on top of raw node status are all projections of existing data:
//   • region status/progress — a fold over the locations' states
//   • "steep" risk           — a read of the authored difficultyRating, arc-relative
//   • "next" contract        — the SAME node the inhabited hall's steward holds,
//                              so the strategic map and the hall never disagree

import type { Arc } from "../../engine/types.js";
import type { WorldNode } from "../contract.js";
import { deriveHallView } from "../inhabited/hall.js";
import { regionNameForTier } from "../progression.js";

/** A node's map state, collapsing engine status + current selection into the four
 *  the map renders: locked / available / active (the selected node) / recorded. */
export type MapNodeState = "locked" | "available" | "active" | "recorded";

export interface MapLocation {
  challengeId: string;
  title: string;
  state: MapNodeState;
  difficulty: number;
  /** The authored difficultyRating sits in the arc's upper band — a purely visual
   *  "steep climb" read, NOT a party-relative risk assessment (that's the board's
   *  readiness math) and NOT a mechanic: it changes nothing the engine resolves. */
  steep: boolean;
  /** This is the one contract to act on next — the first still-available node, i.e.
   *  exactly the contract the inhabited hall's steward is holding. Shared derivation
   *  (deriveHallView), so the map's highlight and the hall's steward never drift. */
  next: boolean;
}

/** A region's rolled-up state: locked until any location opens, complete once every
 *  location is recorded, active in between. Derived from the locations, not stored. */
export type RegionStatus = "locked" | "active" | "complete";

export interface MapRegion {
  /** The progression tier's authored name (e.g. "Proving Grounds"). */
  name: string;
  tierIndex: number;
  locations: MapLocation[];
  status: RegionStatus;
  /** Recorded-of-total within this region, so grouping expresses progress at a glance. */
  recorded: number;
  total: number;
}

/** The whole map as one derived view model: regions plus the arc-wide roll-up the
 *  header shows. `nextChallengeId` is the hall steward's contract (or null when none
 *  is available), the single source of truth both surfaces mark. */
export interface WorldMapView {
  regions: MapRegion[];
  recorded: number;
  total: number;
  nextChallengeId: string | null;
}

export function mapNodeState(node: WorldNode, selectedId: string | null): MapNodeState {
  if (node.status === "cleared") return "recorded";
  if (node.status === "locked") return "locked";
  return node.challengeId === selectedId ? "active" : "available";
}

/** The authored-difficulty cutoff above which a contract reads as "steep": the top
 *  40% of the arc's difficulty range. Returns null when the arc has no spread (every
 *  contract equally hard → no steepness signal to draw). PURE and arc-wide, so a
 *  location's steepness never shifts as the run clears nodes around it. */
function steepCutoff(nodes: readonly WorldNode[]): number | null {
  let min = Infinity;
  let max = -Infinity;
  for (const n of nodes) {
    if (n.difficulty < min) min = n.difficulty;
    if (n.difficulty > max) max = n.difficulty;
  }
  if (!Number.isFinite(min) || max <= min) return null;
  return min + (max - min) * 0.6;
}

function regionStatus(locations: readonly MapLocation[]): RegionStatus {
  if (locations.length === 0) return "locked";
  if (locations.every((l) => l.state === "recorded")) return "complete";
  if (locations.every((l) => l.state === "locked")) return "locked";
  return "active";
}

/** Group the world nodes into regions (progression tiers), preserving tier order.
 *  The map is a projection of this — one section per region, one pin per node — with
 *  each pin's steepness and the run's single "next" contract derived alongside. */
export function deriveWorldMap(nodes: WorldNode[], arc: Arc, selectedId: string | null): WorldMapView {
  const cutoff = steepCutoff(nodes);
  // The hall steward's held contract IS the map's "next". When every contract is
  // recorded the steward reads as fulfilled (resolved) and there is no next node.
  const hall = deriveHallView(nodes);
  const nextChallengeId = hall.resolved ? null : hall.challengeId;

  const byTier = new Map<number, MapLocation[]>();
  for (const node of nodes) {
    const list = byTier.get(node.tierIndex) ?? [];
    list.push({
      challengeId: node.challengeId,
      title: node.title,
      state: mapNodeState(node, selectedId),
      difficulty: node.difficulty,
      steep: cutoff !== null && node.difficulty >= cutoff,
      next: node.challengeId === nextChallengeId,
    });
    byTier.set(node.tierIndex, list);
  }

  const regions = [...byTier.keys()]
    .sort((a, b) => a - b)
    .map((tierIndex) => {
      const locations = byTier.get(tierIndex) ?? [];
      return {
        name: regionNameForTier(arc, tierIndex),
        tierIndex,
        locations,
        status: regionStatus(locations),
        recorded: locations.filter((l) => l.state === "recorded").length,
        total: locations.length,
      };
    });

  return {
    regions,
    recorded: regions.reduce((sum, r) => sum + r.recorded, 0),
    total: regions.reduce((sum, r) => sum + r.total, 0),
    nextChallengeId,
  };
}
