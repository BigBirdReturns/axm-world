// Authored-person portraits for the Karazhan theme. A face here exists ONLY for a
// person the cartridge actually authors (cartridge.people) — keyed by the person's
// authored id, never generated for unnamed figures. Cartridges without authored
// people keep the neutral runtime figures. This is the Karazhan-side twin of
// themes/first-charter/portrait-icons.tsx: same renderer, same encoding, a
// per-person grid + palette in the tower's own violet register.
//
// Source: hand-authored in the PixelPortrait idiom (see
//   src/world/pixel-ui/PixelPortrait.tsx) — same renderer, same encoding, a
//   per-person grid + palette.
// Grid: 16x16 (every authored person)
// Encoding: .=transparent o=outline s=skin d=skin shadow h=hood/hair e=eye
//   m=mouth c=robe t=robe trim w=highlight — colors from the person's palette.

import { PixelPortraitGlyph, type PortraitSpec } from "../../pixel-ui/PixelPortrait.js";

// Aldous Venn, Warden of the Violet Eye — a deep-hooded warden of the order,
// tower-pale face framed by an amethyst hood with the Eye's trim at the brow.
const ALDOUS_VENN: PortraitSpec = {
  grid: [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    "..ohhwhhhhwhho..",
    "..ohhsssssssho..",
    ".ohhsssssssssho.",
    ".ohhsseesseesho.",
    ".ohhsssssssssho.",
    ".ohhssdsssdssho.",
    "..ohsssmmmsssho.",
    "..ohhsssssssho..",
    "...ohhsssssho...",
    "...octtttttco...",
    "..occcwccwccco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: {
    o: "#1b1b1b",
    s: "#d9cbb8",
    d: "#b3a389",
    h: "#3a2a55",
    e: "#241c2c",
    m: "#8a5a4c",
    c: "#4a3768",
    t: "#9a7fd0",
    w: "#efe7f5",
  },
};

// Venn's standing BODY for the staged hall scene — sprite in the scene, portrait
// in the close-ups (dialogue, steward's note): the classic tactics-game split.
const ALDOUS_VENN_BODY: PortraitSpec = {
  grid: [
    ".....ooooo.oo...",
    "....ohhhhhoho...",
    "....ohssshho....",
    ".....osso.......",
    "....otttto......",
    "...occcwcco.....",
    "...occcccco.....",
    "...occwccco.....",
    "...occcccco.....",
    "...occcwcco.....",
    "...occcccco.....",
    "...occcccco.....",
    "...occcccco.....",
    "...occcccco.....",
    "...oooooooo.....",
    "...d.......d....",
  ],
  palette: {
    o: "#1b1b1b",
    s: "#d9cbb8",
    d: "#2a2438",
    h: "#3a2a55",
    c: "#4a3768",
    t: "#9a7fd0",
    w: "#efe7f5",
  },
};

const PEOPLE: Record<string, PortraitSpec> = {
  // Keyed by the person's AUTHORED id (cartridge.people[].id), not their name.
  "tower-warden": ALDOUS_VENN,
};

const PEOPLE_BODIES: Record<string, PortraitSpec> = {
  "tower-warden": ALDOUS_VENN_BODY,
};

/** The authored portrait for a Karazhan person id, or null when that person has
 *  no authored face (callers keep their existing figure/fallback). */
export function personPortrait(personId: string): PortraitSpec | null {
  return PEOPLE[personId] ?? null;
}

/** The authored standing body for a Karazhan person id, or null. */
export function personSprite(personId: string): PortraitSpec | null {
  return PEOPLE_BODIES[personId] ?? null;
}

export function PersonSpriteIcon({ personId, size = 44, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personSprite(personId);
  if (!spec) return null;
  return (
    <span
      className={`kz-person-sprite ${className}`.trim()}
      data-testid={`person-sprite-${personId}`}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}

export function PersonPortraitIcon({ personId, size = 32, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personPortrait(personId);
  if (!spec) return null;
  return (
    <span
      className={`kz-person-portrait ${className}`.trim()}
      data-testid={`person-portrait-${personId}`}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}
