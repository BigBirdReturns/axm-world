import type { Vec3, WorldNode } from "./contract.js";

export function isWorldNodeWithinRange(position: Vec3, node: WorldNode, radius: number): boolean {
  const dx = position[0] - node.position[0];
  const dy = position[1] - node.position[1];
  const dz = position[2] - node.position[2];
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/** Find the closest authored place the player can physically reach. */
export function nearestWorldNode(position: Vec3, nodes: WorldNode[], radius: number): WorldNode | null {
  const radiusSq = radius * radius;
  let nearest: WorldNode | null = null;
  let nearestSq = radiusSq;

  for (const node of nodes) {
    const dx = position[0] - node.position[0];
    const dy = position[1] - node.position[1];
    const dz = position[2] - node.position[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    if (distanceSq <= nearestSq) {
      nearest = node;
      nearestSq = distanceSq;
    }
  }

  return nearest;
}

/** Physical custody gate for the embodied World surface. Selection is shared
 * across Board, Map and World, but only proximity grants action in World. */
export function isWorldInteractionUnlocked(selectedId: string | null, nearbyId: string | null): boolean {
  return selectedId !== null && selectedId === nearbyId;
}
