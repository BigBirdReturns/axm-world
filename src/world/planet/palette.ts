// Cozy, slightly desaturated low-poly palette. Linear RGB in [0,1].

export type RGB = [number, number, number];

export interface PaletteBand {
  /** Upper bound of normalized elevation [0,1] this band covers. */
  max: number;
  color: RGB;
}

// Ordered bands from low (water) to high (snow).
export const PALETTE: PaletteBand[] = [
  { max: 0.34, color: [0.18, 0.32, 0.42] }, // deep water
  { max: 0.4, color: [0.27, 0.45, 0.55] }, // shallow water
  { max: 0.46, color: [0.78, 0.71, 0.52] }, // beach / sand
  { max: 0.62, color: [0.42, 0.56, 0.32] }, // grass
  { max: 0.76, color: [0.28, 0.42, 0.26] }, // forest
  { max: 0.9, color: [0.46, 0.42, 0.38] }, // rock
  { max: 1.01, color: [0.9, 0.91, 0.93] }, // snow
];

/** Normalized elevation at/below which a point is considered water. */
export const WATER_LEVEL = 0.4;

/**
 * Map normalized elevation e in [0,1] to a linear RGB color.
 * Flat (per-band) for a tactile low-poly look.
 */
export function colorForElevation(e: number): RGB {
  const clamped = e < 0 ? 0 : e > 1 ? 1 : e;
  for (const band of PALETTE) {
    if (clamped <= band.max) {
      return [band.color[0], band.color[1], band.color[2]];
    }
  }
  const last = PALETTE[PALETTE.length - 1];
  if (last) return [last.color[0], last.color[1], last.color[2]];
  return [1, 1, 1];
}
