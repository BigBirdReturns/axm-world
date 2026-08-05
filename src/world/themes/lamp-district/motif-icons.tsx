// Lamp District underworld motifs. Each movement has a cartridge-owned mark;
// no Unicode emoji or font glyph is used as authored art.

import type { HTMLAttributes } from "react";
import "./lamp-district.css";

export type LampDistrictMotifName =
  | "lamp"
  | "reservoir"
  | "drainage"
  | "market"
  | "lattice"
  | "surface"
  | "heat"
  | "map";

const LOCATION_MOTIF: Record<string, LampDistrictMotifName> = {
  "keep-the-school-lamps": "lamp",
  "authorize-the-reservoir-route": "reservoir",
  "cross-the-drainage-liturgy": "drainage",
  "read-the-sleeping-market": "market",
  "wake-the-war-lattice": "lattice",
  "interrupt-the-surface-sacrifice": "surface",
  "return-with-heat": "heat",
  "redraw-the-district-map": "map",
};

export function locationMotif(id: string): LampDistrictMotifName {
  return LOCATION_MOTIF[id] ?? "lamp";
}

function MotifPath({ name }: { name: LampDistrictMotifName }): JSX.Element {
  switch (name) {
    case "reservoir":
      return <><path d="M2 11 Q4 8 6 11 T10 11 T14 11" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M4 3 H12 V8 H4 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M6 5 H10" stroke="currentColor"/></>;
    case "drainage":
      return <><path d="M3 3 H13 V13 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.1"/><path d="M5 5 L11 11 M11 5 L5 11" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></>;
    case "market":
      return <><path d="M2 6 H14 L12.5 3 H3.5 Z" fill="none" stroke="currentColor" strokeWidth="1.1"/><path d="M3 6 V13 H13 V6 M6 6 V13 M10 6 V13" fill="none" stroke="currentColor" strokeWidth="1.1"/></>;
    case "lattice":
      return <><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1"/><path d="M2.5 8 H13.5 M8 2.5 V13.5 M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth=".8"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/></>;
    case "surface":
      return <><path d="M2 11 L5 7 L8 10 L11 5 L14 11" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M2 12 H14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11" cy="3" r="1.5" fill="currentColor"/></>;
    case "heat":
      return <><path d="M4 13 C2 9 7 8 5 4 C9 5 8 8 10 9 C12 7 13 10 11 13 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M7 13 C6 11 9 10 8 7 C11 9 10 11 10 13" fill="currentColor"/></>;
    case "map":
      return <><path d="M2.5 3.5 L6 2.5 L10 4 L13.5 3 V12.5 L10 13.5 L6 12 L2.5 13 Z" fill="none" stroke="currentColor" strokeWidth="1.1"/><path d="M6 2.5 V12 M10 4 V13.5" stroke="currentColor" strokeWidth=".9"/><circle cx="8" cy="7.5" r="1.2" fill="currentColor"/></>;
    default:
      return <><path d="M6 2 H10 L11 5 V10 L9.5 13 H6.5 L5 10 V5 Z" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M6 6 H10 M7 10 H9" stroke="currentColor" strokeWidth="1"/></>;
  }
}

type MotifIconProps = HTMLAttributes<HTMLSpanElement> & { name: LampDistrictMotifName; size?: number };

export function MotifIcon({ name, size = 20, className = "", ...props }: MotifIconProps): JSX.Element {
  return (
    <span className={`lamp-motif lamp-motif--${name} ${className}`.trim()} aria-hidden="true" {...props}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><MotifPath name={name}/></svg>
    </span>
  );
}
