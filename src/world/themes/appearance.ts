import type { PixelPortraitName } from "../pixel-ui/PixelPortrait.js";
import type { PixelSpriteName } from "../pixel-ui/PixelSprite.js";

/** Presentation data owned by a theme. Role ids and labels stay opaque to the
 * runtime; a cartridge may bind any of them to any appearance it ships. */
export interface DollAppearance {
  id: string;
  body: PixelSpriteName;
  portrait: PixelPortraitName;
  renderMode: "layered" | "baked";
}

export interface DollAppearancePack {
  fallback: string;
  appearances: Record<string, DollAppearance>;
  roleBindings: Record<string, string>;
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
