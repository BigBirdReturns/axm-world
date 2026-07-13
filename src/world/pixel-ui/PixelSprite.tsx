// Pixel sprites — small FULL-BODY standing figures for the staged scenes (hall
// floor, encounter staging): the party as bodies in a place, not rectangles.
// Same honesty rule as PixelPortrait: a body exists only for what the runtime can
// name — roster ROLES (real run data), the neutral person, and the encounter's
// abstract threat. Authored people's bodies live with their theme
// (themes/first-charter/portrait-icons.tsx), keyed by authored id.
//
// Source: hand-authored in the PixelPortrait idiom (rect-per-pixel SVG,
//   crispEdges) — same renderer (PixelPortraitGlyph), same validation contract.
// Grid: 16x16 (every PixelSpriteName)
// Encoding: .=transparent o=outline s=skin d=ground shadow h=headgear/hair/hide
//   e=eye m=mouth c=clothing t=cloak/trim w=highlight — colors from each
//   sprite's own palette below.

import type { HTMLAttributes } from "react";
import { PixelPortraitGlyph, type PortraitSpec } from "./PixelPortrait.js";
import "./pixel-ui.css";

export type PixelSpriteName = "vanguard" | "skirmisher" | "mender" | "person" | "threat";

export const PIXEL_SPRITE_NAMES: PixelSpriteName[] = ["vanguard", "skirmisher", "mender", "person", "threat"];

const OUTLINE = "#1b1b1b";
const SKIN = "#e8c39a";
const GROUND = "#3a352c";
const HIGHLIGHT = "#f6efe3";

// One 16x16 standing body per sprite. Shared framing (head rows 1-4, torso 5-10,
// legs 11-14, ground shadow row 15) so a line of figures stands on one floor.
export const SPRITES: Record<PixelSpriteName, PortraitSpec> = {
  // Vanguard — helm, armored torso, planted stance.
  vanguard: {
    grid: [
      "......oooo......",
      ".....ohhhho.....",
      ".....ohwhho.....",
      ".....ossoso.....",
      "......osso......",
      "....occccco.....",
      "...occcwccco....",
      "...ococcccoo....",
      "...o.occco.o....",
      ".....occco......",
      ".....occco......",
      ".....o...o......",
      "....oc...co.....",
      "....oc...co.....",
      "....oo...oo.....",
      "...d.......d....",
    ],
    palette: { o: OUTLINE, s: SKIN, d: GROUND, h: "#8b95a3", c: "#5c6672", t: "#c9a14a", w: HIGHLIGHT },
  },
  // Skirmisher — hood and cloak, light on their feet.
  skirmisher: {
    grid: [
      "................",
      ".....oooo.......",
      "....ohhhho......",
      "....ohssho......",
      ".....osso.......",
      "....otttto......",
      "...otttttto.....",
      "...otttttto.....",
      "...o.otto.o.....",
      ".....otto.......",
      ".....otto.......",
      ".....o..o.......",
      "....oc..co......",
      "....oc..co......",
      "....oo..oo......",
      "...d......d.....",
    ],
    palette: { o: OUTLINE, s: SKIN, d: GROUND, h: "#5d7052", c: "#4a5a43", t: "#66784f", w: HIGHLIGHT },
  },
  // Mender — circlet and a long unbroken robe.
  mender: {
    grid: [
      "................",
      ".....oooo.......",
      "....ohhhho......",
      "....otttto......",
      "....ossso.......",
      "....occcco......",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...occcccco.....",
      "...oooooooo.....",
      "...d.......d....",
    ],
    palette: { o: OUTLINE, s: SKIN, d: GROUND, h: "#7a5a3d", c: "#6b7d74", t: "#c9a14a", w: HIGHLIGHT },
  },
  // Person — the neutral standing figure.
  person: {
    grid: [
      "................",
      ".....oooo.......",
      "....ohhhho......",
      "....osssso......",
      ".....osso.......",
      "....occcco......",
      "...occcccco.....",
      "...occcccco.....",
      "...o.occo.o.....",
      ".....occo.......",
      ".....occo.......",
      ".....o..o.......",
      "....oc..co......",
      "....oc..co......",
      "....oo..oo......",
      "...d......d.....",
    ],
    palette: { o: OUTLINE, s: SKIN, d: GROUND, h: "#6b5c48", c: "#7a6f5d", t: "#c9a14a", w: HIGHLIGHT },
  },
  // Threat — the encounter's opposition as a hulking horned silhouette. Abstract
  // on purpose: the SITE's danger embodied, not an invented named enemy.
  threat: {
    grid: [
      "..o..........o..",
      ".oho........oho.",
      ".ohho......ohho.",
      "..ohhoooooohho..",
      "...ohhhhhhhho...",
      "...ohwhhhhwho...",
      "...ohhhhhhhho...",
      "..ohhhhhhhhhho..",
      ".ohhhhhhhhhhhho.",
      ".ohhohhhhhhohho.",
      ".oho.ohhhho.oho.",
      ".....ohhhho.....",
      "....ohho.ohho...",
      "....oho...oho...",
      "....oo.....oo...",
      "..d..........d..",
    ],
    palette: { o: OUTLINE, h: "#7a4a3d", d: GROUND, w: "#e0a23a" },
  },
};

type PixelSpriteProps = HTMLAttributes<HTMLSpanElement> & {
  name: PixelSpriteName;
  label?: string;
  size?: number;
};

export function PixelSprite({ name, label, size = 40, className = "", style, ...props }: PixelSpriteProps): JSX.Element {
  return (
    <span
      className={`pixel-sprite pixel-sprite--${name} ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, display: "inline-block", flex: "none", ...style }}
      {...props}
    >
      <PixelPortraitGlyph spec={SPRITES[name]} />
    </span>
  );
}

/** Map a roster member's ROLE (real run data) to its body. Unknown roles get the
 *  neutral person — never an invented identity. */
