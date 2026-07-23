// Named Lamp District residents. Faces exist only for ids explicitly authored by
// the cartridge or its validated Dark Tomb source.

import { PixelPortraitGlyph, type PortraitSpec } from "../../pixel-ui/PixelPortrait.js";

const ANJA_VEI: PortraitSpec = {
  grid: [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "..ohhhhhhhhhho..",
    "..ohhwwhhhhthho.",
    "..ohhssssssshto.",
    ".ohhsssssssssho.",
    ".ohhsseossstsho.",
    ".ohhssssssstsho.",
    ".ohhssdssssssho.",
    "..ohsssmmmsssho.",
    "..ohhsssssssho..",
    "...ohhsssssho...",
    "...octtttttco...",
    "..occcwccwccco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: { o: "#100f11", s: "#d9ad8b", d: "#392e2b", h: "#62464f", e: "#241b1a", m: "#95564d", c: "#704d5e", t: "#d7a25d", w: "#f3e3d4" },
};

const ANJA_BODY: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "....ohhhhhho....",
    "....ohwthhho....",
    "....osssssso....",
    ".....ossso......",
    "...octtttttco...",
    "..occcwccwccco..",
    "..occcccccccco..",
    "..ococcccccco...",
    "...occccccco....",
    "...occccccco....",
    "...oc..cc..o....",
    "..occ..cc..cco..",
    "..occ..cc..cco..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: ANJA_VEI.palette,
};

const BLACK_LAMP_NINE: PortraitSpec = {
  grid: [
    "....oooooooo....",
    "...otttttttto...",
    "..otwwwwwwwwto..",
    "..otwccccccwto..",
    "..otwccecccwto..",
    "..otwccccccwto..",
    "..otwccddccwto..",
    "..otwccccccwto..",
    "..otwccmmccwto..",
    "..otwccccccwto..",
    "..otwwwwwwwwto..",
    "...otttttttto...",
    "...occcccccco...",
    "..occcwccwccco..",
    ".occcccccccccco.",
    ".occcccccccccco.",
  ],
  palette: { o: "#07090a", s: "#9fc8be", d: "#164448", h: "#182a2e", e: "#f4b85a", m: "#e16e4f", c: "#244c50", t: "#e0a64c", w: "#cde6df" },
};

const BLACK_LAMP_BODY: PortraitSpec = {
  grid: [
    ".....oooooo.....",
    "....otttttto....",
    "....otwewto.....",
    "....otccccto....",
    ".....otcto......",
    "...occcccccco...",
    "..occcttttccco..",
    "..occcccccccco..",
    "..ococcccccco...",
    "...occccccco....",
    "...occccccco....",
    "...oc..cc..o....",
    "..occ..cc..cco..",
    "..occ..cc..cco..",
    "..oo...oo...oo..",
    "...d........d...",
  ],
  palette: BLACK_LAMP_NINE.palette,
};

const PEOPLE: Record<string, PortraitSpec> = {
  "anja-vei": ANJA_VEI,
  "black-lamp-nine": BLACK_LAMP_NINE,
};

const BODIES: Record<string, PortraitSpec> = {
  "anja-vei": ANJA_BODY,
  "black-lamp-nine": BLACK_LAMP_BODY,
};

export function personPortrait(personId: string): PortraitSpec | null {
  return PEOPLE[personId] ?? null;
}

export function personSprite(personId: string): PortraitSpec | null {
  return BODIES[personId] ?? null;
}

export function PersonPortraitIcon({ personId, size = 32, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personPortrait(personId);
  if (!spec) return null;
  return (
    <span className={`lamp-person-portrait ${className}`.trim()} data-testid={`person-portrait-${personId}`} aria-hidden="true" style={{ width: size, height: size, display: "inline-block", flex: "none" }}>
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}

export function PersonSpriteIcon({ personId, size = 44, className = "" }: { personId: string; size?: number; className?: string }): JSX.Element | null {
  const spec = personSprite(personId);
  if (!spec) return null;
  return (
    <span className={`lamp-person-sprite ${className}`.trim()} data-testid={`person-sprite-${personId}`} aria-hidden="true" style={{ width: size, height: size, display: "inline-block", flex: "none" }}>
      <PixelPortraitGlyph spec={spec} />
    </span>
  );
}
