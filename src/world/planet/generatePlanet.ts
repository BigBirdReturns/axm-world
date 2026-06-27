import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import "three-mesh-bvh"; // augments BufferGeometry with boundsTree
import { fbm3 } from "./noise.js";
import { colorForElevation, WATER_LEVEL } from "./palette.js";

export interface PlanetOptions {
  radius: number;
  detail?: number;
  seed?: number;
  amplitude?: number;
}

/**
 * Compute the radial displacement (in world units) for a unit direction.
 * Deterministic given seed/amplitude. Water areas are flattened so they
 * sit near a calm sea level rather than dipping into deep trenches.
 */
export function planetHeight(
  nx: number,
  ny: number,
  nz: number,
  amplitude: number,
  seed: number,
): { displacement: number; normElevation: number } {
  // Offset the sample domain by the seed so different seeds give different worlds.
  const s = (seed % 1000) * 0.137;
  const freq = 1.6;
  let raw = fbm3(nx * freq + s, ny * freq + s, nz * freq + s, 5); // ~[-1,1]

  // Normalized elevation in [0,1] for coloring.
  const norm = raw * 0.5 + 0.5;

  // Flatten anything at/below the water line toward a flat sea level.
  if (norm <= WATER_LEVEL) {
    // gentle, mostly flat seabed just below the surface
    const t = norm / WATER_LEVEL; // [0,1]
    raw = -0.08 - (1 - t) * 0.06;
  }

  return { displacement: amplitude * raw, normElevation: norm };
}

/**
 * Build a low-poly procedural planet geometry with baked vertex colors.
 * Centered at the origin with identity transform. Non-indexed for flat faces.
 */
export function generatePlanet(opts: PlanetOptions): THREE.BufferGeometry {
  const radius = opts.radius;
  const detail = opts.detail ?? 5;
  const seed = opts.seed ?? 1234;
  const amplitude = opts.amplitude ?? radius * 0.12;

  const ico = new THREE.IcosahedronGeometry(radius, detail);
  const geometry = ico.toNonIndexed();
  ico.dispose();

  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const count = posAttr.count;

  const colors = new Float32Array(count * 3);
  const dir = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const pz = posAttr.getZ(i);

    dir.set(px, py, pz);
    const len = dir.length() || 1;
    const nx = dir.x / len;
    const ny = dir.y / len;
    const nz = dir.z / len;

    const { displacement, normElevation } = planetHeight(nx, ny, nz, amplitude, seed);
    const newR = radius + displacement;

    posAttr.setXYZ(i, nx * newR, ny * newR, nz * newR);

    const c = colorForElevation(normElevation);
    const o = i * 3;
    colors[o] = c[0];
    colors[o + 1] = c[1];
    colors[o + 2] = c[2];
  }

  posAttr.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Build a BVH collider for the geometry and attach it as `geometry.boundsTree`.
 * Requires `import "three-mesh-bvh"` (done at module top) for the typing.
 */
export function makeColliderBVH(geometry: THREE.BufferGeometry): void {
  geometry.boundsTree = new MeshBVH(geometry);
}
