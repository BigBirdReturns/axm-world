// Authored-person portraits for the First Charter theme. A face here exists ONLY
// for a person the cartridge actually authors (cartridge.people) — keyed by the
// person's authored id, never generated for unnamed figures. Cartridges without
// authored people keep the neutral runtime figures.
//
// Source: hand-authored in the PixelPortrait idiom (see
//   src/world/pixel-ui/PixelPortrait.tsx) — same renderer, same encoding, a
//   per-person grid + palette.
// Grid: 16x16 (every authored person)
// Encoding: .=transparent o=outline s=skin d=skin shadow h=hair e=eye m=mouth
//   c=clothing t=clothing trim w=highlight — colors from the person's palette.

import { PixelPortraitGlyph, type PortraitSpec } from "../../pixel-ui/PixelPortrait.js";

// Maren Vos, Charter-Keeper — grey hair gathered to a side bun, a warm robe with
// the charter's gold band at the collar.
const MAREN_VOS: PortraitSpec = {
  grid: [
    "....oooooo.oo...",
    "...ohhhhhhohho..",
    "..ohhhhhhhhoho..",
    "..ohhwhhhhhho...",
    "..ohhssssssho...",
    ".ohhssssssssho..",
    ".ohhseosseosho..",
    ".ohhssssssssho..",
    ".ohhsdssssdsho..",
    "..ohsssmmsssho..",
    "..ohhssssssho...",
    "...ohhssssho....",
    "....otttttto....",
    "...octcccctco...",
    "..occcccccccco..",
    ".occcccccccccco.",
  ],
  palette: {
    o: "#1b1b1b",
    s: "#e8c39a",
    d: "#c99f74",
    h: "#b9b2a4",
    e: "#2a2018",
    m: "#a05c48",
    c: "#7a4a3d",
    t: "#c9a14a",
    w: "#f6efe3",
  },
};

const PEOPLE: Record<string, PortraitSpec> = {
  // Keyed by the person's AUTHORED id (cartridge.people[].id), not their name.
  "charter-keeper": MAREN_VOS,
};

/** The authored portrait for a First Charter person id, or null when that person
 *  has no authored face (callers keep their existing figure/fallback). */
export function personPortrait(personId: string): PortraitSpec | null {
  return PEOPLE[personId] ?? null;
}

export function PersonPortraitIcon({ personId, size = 32, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personPortrait(personId);
  if (!spec) return null;
  return (
    <span
      className={`fc-person-portrait ${className}`.trim()}
      data-testid={`person-portrait-${personId}`}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-block", flex: "none" }}
    >
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}
