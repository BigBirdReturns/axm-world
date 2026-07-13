// PlayScene -> planet-surface placement. PURE (no three import, no engine internals).
//
// The 3D spoke consumes a PlayScene (compiled from an arc by src/play-pipeline)
// and needs to know *where on the sphere* each challenge node sits and where the
// player spawns. This module is the only mapping from the engine's 2D-ish scene
// layout to spherical coordinates. Integration (WorldScreen) and both 3D agents
// can rely on these types without touching the engine.

import type {
  PlayScene,
  PlayNode,
  PlayAgentToken,
  PlayNodeStatus,
} from "../play-pipeline/compile.js";

export type { PlayScene, PlayNode, PlayAgentToken, PlayNodeStatus };

export interface WorldConfig {
  /** Planet radius in world units. */
  planetRadius: number;
  /** Gravitational acceleration magnitude toward the core. */
  gravity: number;
  /** Capsule radius for the player controller. */
  playerRadius: number;
  /** Capsule segment height (between the two capsule spheres). */
  playerHeight: number;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  planetRadius: 10,
  gravity: 26,
  playerRadius: 0.35,
  playerHeight: 0.9,
};

export type Vec3 = [number, number, number];

export interface WorldNode {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  status: PlayNodeStatus;
  difficulty: number;
  tierIndex: number;
  requirements: string[];
  /** First cycle this node was choosable; null when locked or cleared. */
  availableSinceCycle: number | null;
  /** Unit surface normal = direction from planet center to the node. */
  normal: Vec3;
  /** World-space position on the planet surface. */
  position: Vec3;
}

export interface WorldSpawn {
  position: Vec3;
  normal: Vec3;
}

export interface WorldLayout {
  config: WorldConfig;
  nodes: WorldNode[];
  spawn: WorldSpawn;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** (latitude, longitude) in radians -> unit vector on the sphere. */
export function sphericalToUnit(lat: number, lon: number): Vec3 {
  const r = Math.cos(lat);
  return [r * Math.cos(lon), Math.sin(lat), r * Math.sin(lon)];
}

/**
 * Distribute the scene's challenge nodes over the planet. Tiers form latitude
 * bands (north -> south as the arc progresses); nodes within a tier spread across
 * longitudes, with a per-tier longitude stagger so tiers don't line up.
 */
export function buildWorldLayout(
  scene: PlayScene,
  config: WorldConfig = DEFAULT_WORLD_CONFIG,
): WorldLayout {
  const byTier = new Map<number, PlayNode[]>();
  for (const node of scene.nodes) {
    const group = byTier.get(node.tierIndex) ?? [];
    group.push(node);
    byTier.set(node.tierIndex, group);
  }

  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  const tierCount = Math.max(1, tiers.length);
  const nodes: WorldNode[] = [];

  tiers.forEach((tier, tierOrdinal) => {
    const group = byTier.get(tier) ?? [];
    const latDeg = tierCount === 1 ? 18 : lerp(56, -56, tierOrdinal / (tierCount - 1));
    const lat = (latDeg * Math.PI) / 180;
    const lonStagger = tierOrdinal * 0.7;

    group.forEach((node, gi) => {
      const lonDeg = group.length === 1 ? 0 : lerp(-115, 115, gi / (group.length - 1));
      const lon = (lonDeg * Math.PI) / 180 + lonStagger;
      const n = sphericalToUnit(lat, lon);
      nodes.push({
        id: node.id,
        challengeId: node.challengeId,
        title: node.title,
        description: node.description,
        status: node.status,
        difficulty: node.difficulty,
        tierIndex: node.tierIndex,
        requirements: node.requirements,
        availableSinceCycle: node.availableSinceCycle,
        normal: n,
        position: [n[0] * config.planetRadius, n[1] * config.planetRadius, n[2] * config.planetRadius],
      });
    });
  });

  // Start just outside the first available place's interaction radius, on its
  // authored approach line. The controller faces local north at yaw zero, so a
  // short forward walk teaches movement -> arrival -> interaction immediately.
  // This remains cartridge-agnostic: whichever node the engine makes available
  // first becomes the approach target; an empty/fully-recorded world falls back
  // to the neutral spawn.
  const approachTarget = nodes.find((node) => node.status === "available") ?? nodes[0] ?? null;
  const approachOffset = 20 * Math.PI / 180;
  const targetLat = approachTarget ? Math.asin(approachTarget.normal[1]) : 4 * Math.PI / 180;
  const targetLon = approachTarget ? Math.atan2(approachTarget.normal[2], approachTarget.normal[0]) : 0;
  const spawnLat = Math.max(-Math.PI / 2 + 0.05, targetLat - approachOffset);
  const sn = sphericalToUnit(spawnLat, targetLon);
  const spawn: WorldSpawn = {
    normal: sn,
    position: [sn[0] * config.planetRadius, sn[1] * config.planetRadius, sn[2] * config.planetRadius],
  };

  return { config, nodes, spawn };
}
