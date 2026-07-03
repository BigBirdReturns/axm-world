// Inline SVG motif icons for the Karazhan theme. One motif per encounter id,
// replacing the generic contract glyph on the board and encounter surfaces
// with on-theme iconography.
//
// Source: Karazhan theme asset sheet §1 "Location Motifs" (design review) —
// redrawn derivative; the sheet is not yet committed to
// docs/design/references, so these are hand-authored from its per-encounter
// descriptions (spectral horseshoe, pocket watch, chained sigil, twin masks,
// orrery core, summoning circle, rune ring, three beams, knight, tilted crown,
// dragon skull, ogre fist, shattered mountain, broken manacle, the tower).
// Provenance level: redrawn derivative (see component-inventory.md).
// Grid: 16x16 viewBox (hand-authored SVG paths, not a character grid)
// Encoding: one <MotifPath> case per KarazhanMotifName; each draws its shape
//           with `currentColor` strokes/fills so gameplay CSS controls color.

import type { HTMLAttributes } from "react";
import "./karazhan.css";

export type KarazhanMotifName =
  | "tower"
  | "horseshoe"
  | "pocketWatch"
  | "chainedSigil"
  | "twinMasks"
  | "orrery"
  | "summoningCircle"
  | "runeRing"
  | "threeBeams"
  | "knight"
  | "tiltedCrown"
  | "dragonSkull"
  | "ogreFist"
  | "shatteredMountain"
  | "brokenManacle";

const LOCATION_MOTIF: Record<string, KarazhanMotifName> = {
  attumen: "horseshoe",
  moroes: "pocketWatch",
  maiden: "chainedSigil",
  opera: "twinMasks",
  curator: "orrery",
  illhoof: "summoningCircle",
  aran: "runeRing",
  netherspite: "threeBeams",
  chess: "knight",
  prince: "tiltedCrown",
  nightbane: "dragonSkull",
  maulgar: "ogreFist",
  gruul: "shatteredMountain",
  magtheridon: "brokenManacle",
};

/** Encounter id -> motif. Anything unrecognized falls back to the tower (the
 *  sheet's authored default motif). */
export function locationMotif(id: string): KarazhanMotifName {
  const lower = id.toLowerCase();
  for (const [key, motif] of Object.entries(LOCATION_MOTIF)) {
    if (lower.includes(key)) return motif;
  }
  return "tower";
}

function MotifPath({ name }: { name: KarazhanMotifName }): JSX.Element {
  switch (name) {
    case "tower":
      return (
        <>
          <path d="M4 15 V7 h1 V5 h1 V7 h1 V5 h1 V7 h1 V5 h1 V7 h1 v8 Z" fill="currentColor" />
          <rect x="7" y="9" width="2" height="2" fill="#1A1420" />
          <rect x="7" y="12" width="2" height="3" fill="#1A1420" />
        </>
      );
    case "horseshoe":
      return (
        <>
          <path d="M5 4 A4 4 0 1 0 11 4" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="3" width="2" height="2" fill="currentColor" />
          <rect x="10" y="3" width="2" height="2" fill="currentColor" />
          <circle cx="5" cy="11" r="0.8" fill="currentColor" />
          <circle cx="11" cy="11" r="0.8" fill="currentColor" />
        </>
      );
    case "pocketWatch":
      return (
        <>
          <circle cx="8" cy="9" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="7" y="2" width="2" height="2" fill="currentColor" />
          <path d="M8 9 V6 M8 9 h2.5" stroke="currentColor" strokeWidth="1" fill="none" />
        </>
      );
    case "chainedSigil":
      return (
        <>
          <path d="M8 3 L13 6 V10 L8 13 L3 10 V6 Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <path d="M3 12 h10" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
        </>
      );
    case "twinMasks":
      return (
        <>
          <path d="M3 4 h4 v4 a2 2 0 0 1 -4 0 Z" fill="currentColor" />
          <path d="M9 4 h4 v4 a2 2 0 0 1 -4 0 Z" fill="currentColor" />
          <rect x="4" y="5" width="1" height="1" fill="#1A1420" />
          <rect x="11" y="5" width="1" height="1" fill="#1A1420" />
          <path d="M3 11 h10" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "orrery":
      return (
        <>
          <circle cx="8" cy="8" r="2" fill="currentColor" />
          <ellipse cx="8" cy="8" rx="6" ry="2.5" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(30 8 8)" />
          <circle cx="13" cy="6" r="1" fill="currentColor" />
        </>
      );
    case "summoningCircle":
      return (
        <>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 2.5 L11 11 L3.5 6 H12.5 L5 11 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
        </>
      );
    case "runeRing":
      return (
        <>
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 6 L11 10 M11 5 L6 11" stroke="currentColor" strokeWidth="1" />
          <rect x="10.5" y="3.5" width="1.6" height="1.6" fill="currentColor" transform="rotate(45 11 4)" />
        </>
      );
    case "threeBeams":
      return (
        <>
          <circle cx="3" cy="8" r="2" fill="currentColor" />
          <path d="M5 8 h9" stroke="currentColor" strokeWidth="2" />
          <path d="M5 5 L14 4 M5 11 L14 12" stroke="currentColor" strokeWidth="1.4" />
        </>
      );
    case "knight":
      return (
        <>
          <path d="M6 14 V9 C6 5 9 5 9 3 L11 5 C11 8 9 8 10 10 V14 Z" fill="currentColor" />
          <rect x="8" y="6" width="1" height="1" fill="#1A1420" />
        </>
      );
    case "tiltedCrown":
      return (
        <>
          <path d="M3 11 L4 5 L7 8 L8 4 L9 8 L12 5 L13 11 Z" fill="currentColor" transform="rotate(-12 8 8)" />
          <rect x="3" y="11" width="10" height="1.5" fill="currentColor" transform="rotate(-12 8 8)" />
        </>
      );
    case "dragonSkull":
      return (
        <>
          <path d="M4 6 C4 3 12 3 12 7 L14 9 L11 10 L11 13 L9 11 L7 13 L5 10 Z" fill="currentColor" />
          <circle cx="7" cy="7" r="1" fill="#1A1420" />
          <circle cx="10" cy="7" r="1" fill="#1A1420" />
        </>
      );
    case "ogreFist":
      return (
        <>
          <rect x="4" y="6" width="8" height="6" rx="1.5" fill="currentColor" />
          <rect x="5" y="4" width="1.6" height="3" fill="currentColor" />
          <rect x="7.2" y="3.5" width="1.6" height="3.5" fill="currentColor" />
          <rect x="9.4" y="4" width="1.6" height="3" fill="currentColor" />
        </>
      );
    case "shatteredMountain":
      return (
        <>
          <path d="M2 13 L6 5 L8 9 L10 4 L14 13 Z" fill="currentColor" />
          <path d="M6 5 L5 8 M10 4 L11 8" stroke="#1A1420" strokeWidth="0.8" />
        </>
      );
    case "brokenManacle":
      return (
        <>
          <circle cx="6" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 8 h2 M12 6 l2 4 M13 5 l-1 2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="6" cy="8" r="0.8" fill="currentColor" />
        </>
      );
  }
}

interface MotifIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: KarazhanMotifName;
  size?: number;
}

export function MotifIcon({ name, size = 20, className = "", ...props }: MotifIconProps): JSX.Element {
  return (
    <span
      className={`kz-motif-icon kz-motif-icon--${name} ${className}`.trim()}
      style={{ width: size, height: size, display: "inline-flex" }}
      {...props}
    >
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" role="presentation">
        <MotifPath name={name} />
      </svg>
    </span>
  );
}
