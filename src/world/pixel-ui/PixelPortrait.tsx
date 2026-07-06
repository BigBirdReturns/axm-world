// Pixel portraits — small head-and-shoulders faces for people the runtime can
// honestly name: the roster's members (keyed by their ROLE — real run data) and,
// via the theme seam (themes/CartridgePortrait), a cartridge's authored people.
//
// Source: hand-authored in the PixelIcon idiom (rect-per-pixel SVG,
//   crispEdges), following the RodohRuntimeMark precedent of a per-module
//   alphabet + color map rather than PixelIcon's 3-tone `.#ow`.
// Grid: 16x16 (every PixelPortraitName)
// Encoding: .=transparent o=outline s=skin d=skin shadow h=headgear/hair
//   e=eye m=mouth c=clothing t=clothing trim w=highlight — each token's color
//   comes from the portrait's own palette below, so a vanguard's `h` is steel
//   while a mender's `h` is hair. Fixed palettes (not currentColor): a face
//   should not recolor with surrounding chrome.

import type { HTMLAttributes } from "react";
import "./pixel-ui.css";

export type PixelPortraitName = "vanguard" | "skirmisher" | "mender" | "person";

export const PIXEL_PORTRAIT_NAMES: PixelPortraitName[] = ["vanguard", "skirmisher", "mender", "person"];

export interface PortraitSpec {
  grid: string[];
  palette: Record<string, string>;
}

const OUTLINE = "#1b1b1b";
const SKIN = "#e8c39a";
const SKIN_SHADOW = "#c99f74";
const EYE = "#2a2018";
const MOUTH = "#a05c48";
const HIGHLIGHT = "#f6efe3";

// One 16x16 bust per portrait. Shared framing (hairline rows 1-4, eyes row 6,
// mouth row 9, shoulders rows 12-15) so a row of faces reads as one cast.
export const PORTRAITS: Record<PixelPortraitName, PortraitSpec> = {
  // Vanguard — steel helm with a crest ridge and cheek guards; armored shoulders.
  vanguard: {
    grid: [
      "......oooo......",
      "....oohhhhoo....",
      "...ohhwhhhhho...",
      "...ohhhhhhhho...",
      "..ohhohhhhohho..",
      "..ohossssssoho..",
      "..ohosessesoho..",
      "..ohosssssssho..",
      "...oossssssoo...",
      "....osdmmsdso...",
      "....ossssssso...",
      ".....oosssoo....",
      "....occcccco....",
      "...occwcccctco..",
      ".occcccccccccco.",
      ".occcccccccccco.",
    ],
    palette: { o: OUTLINE, s: SKIN, d: SKIN_SHADOW, h: "#8b95a3", e: EYE, m: MOUTH, c: "#5c6672", t: "#c9a14a", w: HIGHLIGHT },
  },
  // Skirmisher — hood up, a wrapped scarf collar; quick eyes.
  skirmisher: {
    grid: [
      "................",
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhhhhhhho...",
      "..ohhossssohho..",
      "..ohhsessesho...",
      "..ohhssssssho...",
      "..ohhssssssho...",
      "...ohsdmmsdho...",
      "...ohhssssho....",
      "....ohhhhho.....",
      "....ottttto.....",
      "...octtttttco...",
      "..occcccccccco..",
      ".occcccccccccco.",
    ],
    palette: { o: OUTLINE, s: SKIN, d: SKIN_SHADOW, h: "#5d7052", e: EYE, m: MOUTH, c: "#4a5a43", t: "#8b7d5a", w: HIGHLIGHT },
  },
  // Mender — hair under a circlet band; calm face, robed shoulders.
  mender: {
    grid: [
      "................",
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...otttttttto...",
      "..ohssssssssho..",
      "..ohseosseosho..",
      "..ohssssssssho..",
      "..ohssssssssho..",
      "...osdsmmsdso...",
      "...ohssssssho...",
      "....ohhsshho....",
      "....occcccco....",
      "...occcttccco...",
      "..occcccccccco..",
      ".occcccccccccco.",
    ],
    palette: { o: OUTLINE, s: SKIN, d: SKIN_SHADOW, h: "#7a5a3d", e: EYE, m: MOUTH, c: "#6b7d74", t: "#c9a14a", w: HIGHLIGHT },
  },
  // Person — the neutral fallback bust for anyone without richer data.
  person: {
    grid: [
      "................",
      ".....oooooo.....",
      "....ohhhhhho....",
      "...ohhhhhhhho...",
      "...ohhssssho....",
      "..ohsssssssho...",
      "..ohsesssesho...",
      "..ohsssssssho...",
      "..ohsssssssho...",
      "...osdmmsdso....",
      "...ohsssssho....",
      "....ohhhhho.....",
      "....occccco.....",
      "...occcccccco...",
      "..occcccccccco..",
      ".occcccccccccco.",
    ],
    palette: { o: OUTLINE, s: SKIN, d: SKIN_SHADOW, h: "#6b5c48", e: EYE, m: MOUTH, c: "#7a6f5d", t: "#c9a14a", w: HIGHLIGHT },
  },
};

/** Low-level renderer shared with themed (authored-person) portraits: any 16x16
 *  grid + palette in this module's encoding renders the same way. */
export function PixelPortraitGlyph({ spec }: { spec: PortraitSpec }): JSX.Element {
  const cells: JSX.Element[] = [];
  for (let y = 0; y < spec.grid.length; y++) {
    const row = spec.grid[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      cells.push(<rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} fill={spec.palette[ch] ?? OUTLINE} />);
    }
  }
  return (
    <svg viewBox="0 0 16 16" width="100%" height="100%" style={{ shapeRendering: "crispEdges", display: "block" }}>
      {cells}
    </svg>
  );
}

type PixelPortraitProps = HTMLAttributes<HTMLSpanElement> & {
  name: PixelPortraitName;
  label?: string;
  size?: number;
};

export function PixelPortrait({ name, label, size = 32, className = "", style, ...props }: PixelPortraitProps): JSX.Element {
  return (
    <span
      className={`pixel-portrait pixel-portrait--${name} ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, display: "inline-block", flex: "none", ...style }}
      {...props}
    >
      <PixelPortraitGlyph spec={PORTRAITS[name]} />
    </span>
  );
}

/** Map a roster member's ROLE (real run data) to its face. Unknown roles get the
 *  neutral person — never an invented identity. */
export function portraitForRole(role: string): PixelPortraitName {
  const lower = role.toLowerCase();
  if (lower.includes("vanguard")) return "vanguard";
  if (lower.includes("skirmisher")) return "skirmisher";
  if (lower.includes("mender")) return "mender";
  return "person";
}
