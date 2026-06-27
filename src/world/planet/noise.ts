// Deterministic noise helpers — no external deps.

/** Standard mulberry32 PRNG. Returns a function yielding floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash -> float in [-1, 1]. Deterministic. */
function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (ix | 0), 0x27d4eb2f);
  h = Math.imul(h ^ (iy | 0), 0x85ebca6b);
  h = Math.imul(h ^ (iz | 0), 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x165667b1);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

function smooth(t: number): number {
  // smootherstep
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const NOISE_SEED = 1337;

/** 3D value noise in ~[-1,1]. */
function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  const u = smooth(xf);
  const v = smooth(yf);
  const w = smooth(zf);

  const c000 = hash3(xi, yi, zi, NOISE_SEED);
  const c100 = hash3(xi + 1, yi, zi, NOISE_SEED);
  const c010 = hash3(xi, yi + 1, zi, NOISE_SEED);
  const c110 = hash3(xi + 1, yi + 1, zi, NOISE_SEED);
  const c001 = hash3(xi, yi, zi + 1, NOISE_SEED);
  const c101 = hash3(xi + 1, yi, zi + 1, NOISE_SEED);
  const c011 = hash3(xi, yi + 1, zi + 1, NOISE_SEED);
  const c111 = hash3(xi + 1, yi + 1, zi + 1, NOISE_SEED);

  const x00 = lerp(c000, c100, u);
  const x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u);
  const x11 = lerp(c011, c111, u);

  const y0 = lerp(x00, x10, v);
  const y1 = lerp(x01, x11, v);

  return lerp(y0, y1, w);
}

/** Fractal Brownian motion, returns ~[-1,1]. Deterministic. */
export function fbm3(x: number, y: number, z: number, octaves: number = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}
