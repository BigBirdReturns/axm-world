import type { PixelPortraitName } from "../pixel-ui/PixelPortrait.js";
import type { PixelSpriteName } from "../pixel-ui/PixelSprite.js";

/** Presentation data owned by a theme. Role ids and labels stay opaque to the
 * runtime; a cartridge may bind any of them to any appearance it ships. */
export interface DollAppearance {
  id: string;
  body: PixelSpriteName;
  portrait: PixelPortraitName;
  renderMode: "layered" | "baked";
  /** Optional hand-authored raster states. Missing states fall back to `body`;
   * absence is explicit and never disguised as an authored reduction. */
  scaleBodies?: Partial<Record<DollScaleState, PixelSpriteName>>;
}

export type DollScaleState = "micro" | "field" | "card" | "close";
export type EmbodimentMotionState = "idle" | "walk" | "airborne" | "arrived";

export interface WorldAvatarAppearance {
  id: string;
  palette: {
    body: string;
    skin: string;
    headgear: string;
    legs: string;
    cargo: string;
    strap: string;
  };
  modules: {
    headgear: "cap" | "hood" | "none";
    cargo: "satchel" | "pack" | "none";
  };
}

export interface PlaceStateAppearance {
  color: string;
  accent: string;
  landmark: "crystal" | "growth" | "warning" | "sealed";
}

export interface DollAppearancePack {
  fallback: string;
  appearances: Record<string, DollAppearance>;
  roleBindings: Record<string, string>;
  worldAvatar: WorldAvatarAppearance;
  placeStates: {
    available: PlaceStateAppearance;
    locked: PlaceStateAppearance;
    recorded: PlaceStateAppearance;
    success: PlaceStateAppearance;
    partial: PlaceStateAppearance;
    failure: PlaceStateAppearance;
  };
}

export function dollScaleState(size: number): DollScaleState {
  if (size <= 18) return "micro";
  if (size <= 26) return "field";
  if (size <= 36) return "card";
  return "close";
}

export function resolveDollBody(appearance: DollAppearance, size: number): { body: PixelSpriteName; scale: DollScaleState; authored: boolean } {
  const scale = dollScaleState(size);
  const authored = appearance.scaleBodies?.[scale];
  return { body: authored ?? appearance.body, scale, authored: authored !== undefined };
}

export function resolveWorldAvatarAppearance(theme: AppearanceTheme, identity: string): WorldAvatarAppearance {
  const base = theme.appearancePack.worldAvatar;
  const identityColors = identityPalette(identity);
  return {
    ...base,
    palette: { ...base.palette, body: identityColors.accent, headgear: identityColors.highlight },
  };
}

export interface AppearanceTheme {
  appearancePack: DollAppearancePack;
}

export function resolveDollAppearance(theme: AppearanceTheme, role: string): DollAppearance {
  const pack = theme.appearancePack;
  const appearanceId = pack.roleBindings[role] ?? pack.fallback;
  return pack.appearances[appearanceId] ?? pack.appearances[pack.fallback] ?? {
    id: "rodoh:bare-doll",
    body: "person",
    portrait: "person",
    renderMode: "layered",
  };
}

/** Stable identity accents. These are deliberately derived from identity, not
 * role or cartridge, so the same agent keeps the same visual cue everywhere. */
export function identityPalette(identity: string): { accent: string; highlight: string } {
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return {
    accent: `hsl(${hue} 42% 43%)`,
    highlight: `hsl(${hue} 58% 68%)`,
  };
}

export const RODOH_DOLL_APPEARANCES: Record<string, DollAppearance> = {
  "rodoh:bare-doll": { id: "rodoh:bare-doll", body: "person", portrait: "person", renderMode: "layered" },
  "rodoh:plated": { id: "rodoh:plated", body: "vanguard", portrait: "vanguard", renderMode: "layered" },
  "rodoh:hooded": { id: "rodoh:hooded", body: "skirmisher", portrait: "skirmisher", renderMode: "layered" },
  "rodoh:robed": { id: "rodoh:robed", body: "mender", portrait: "mender", renderMode: "layered" },
};
