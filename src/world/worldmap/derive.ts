// The World-map projection: the same WorldNode list the board and (eventually) the
// 3D planet consume, grouped into regions for a small 2D location map. PURE — no
// React, no three. The region name is the progression tier's authored name; the
// location is the challenge. Nothing here is authored per contract.

import type { Arc } from "../../engine/types.js";
import type { WorldNode } from "../contract.js";

/** A node's map state, collapsing engine status + current selection into the four
 *  the map renders: locked / available / active (the selected node) / recorded. */
export type MapNodeState = "locked" | "available" | "active" | "recorded";

export interface MapLocation {
  challengeId: string;
  title: string;
  state: MapNodeState;
  difficulty: number;
}

export interface MapRegion {
  /** The progression tier's authored name (e.g. "Proving Grounds"). */
  name: string;
  tierIndex: number;
  locations: MapLocation[];
}

export function mapNodeState(node: WorldNode, selectedId: string | null): MapNodeState {
  if (node.status === "cleared") return "recorded";
  if (node.status === "locked") return "locked";
  return node.challengeId === selectedId ? "active" : "available";
}

function regionName(arc: Arc, tierIndex: number): string {
  return arc.progressionTiers[tierIndex]?.name ?? "The Field";
}

/** Group the world nodes into regions (progression tiers), preserving tier order.
 *  The map is a projection of this — one section per region, one pin per node. */
export function groupNodesByRegion(nodes: WorldNode[], arc: Arc, selectedId: string | null): MapRegion[] {
  const byTier = new Map<number, MapLocation[]>();
  for (const node of nodes) {
    const list = byTier.get(node.tierIndex) ?? [];
    list.push({
      challengeId: node.challengeId,
      title: node.title,
      state: mapNodeState(node, selectedId),
      difficulty: node.difficulty,
    });
    byTier.set(node.tierIndex, list);
  }
  return [...byTier.keys()]
    .sort((a, b) => a - b)
    .map((tierIndex) => ({
      name: regionName(arc, tierIndex),
      tierIndex,
      locations: byTier.get(tierIndex) ?? [],
    }));
}
