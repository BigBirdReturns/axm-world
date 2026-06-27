import * as THREE from "three";
import { mulberry32 } from "./noise.js";
import { planetHeight } from "./generatePlanet.js";
import { WATER_LEVEL } from "./palette.js";

export interface ScatterItem {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: number;
  kind: "tree" | "rock";
}

/**
 * Sample seeded points on the planet surface, skip water, and orient each item
 * so its local +Y axis aligns with the surface normal (the radial direction).
 *
 * Re-derives surface height from `planetHeight` using the SAME amplitude the
 * planet was generated with, so callers should pass matching radius/seed/amp.
 */
export function scatterOnPlanet(
  geometry: THREE.BufferGeometry,
  radius: number,
  count: number,
  seed: number,
  amplitude?: number,
): ScatterItem[] {
  const rand = mulberry32(seed);
  const amp = amplitude ?? radius * 0.12;

  const items: ScatterItem[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  // Oversample a bit since water points are discarded.
  const maxTries = count * 6;
  let tries = 0;

  while (items.length < count && tries < maxTries) {
    tries++;

    // Uniform point on a unit sphere.
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const sinPhi = Math.sin(phi);
    const nx = sinPhi * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = sinPhi * Math.sin(theta);

    const { displacement, normElevation } = planetHeight(nx, ny, nz, amp, seed);
    if (normElevation <= WATER_LEVEL + 0.02) continue; // skip water + waterline

    const surfaceR = radius + displacement;

    // Orient local +Y to the surface normal (radial).
    normal.set(nx, ny, nz).normalize();
    quat.setFromUnitVectors(up, normal);

    // Add a little random spin about the up axis for variety.
    const spin = new THREE.Quaternion().setFromAxisAngle(normal, rand() * Math.PI * 2);
    quat.premultiply(spin);

    const kind: "tree" | "rock" = rand() < 0.7 ? "tree" : "rock";
    const baseScale = kind === "tree" ? 0.5 : 0.35;
    const scale = baseScale * (0.7 + rand() * 0.6);

    items.push({
      position: [nx * surfaceR, ny * surfaceR, nz * surfaceR],
      quaternion: [quat.x, quat.y, quat.z, quat.w],
      scale,
      kind,
    });
  }

  return items;
}
