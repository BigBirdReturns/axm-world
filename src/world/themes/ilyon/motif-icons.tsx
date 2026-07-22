// Inline SVG motif library for The Kind Gods of Ilyon. The runtime keeps the
// white-label seam: unknown cartridges receive no motif; Ilyon receives a
// cartridge-owned emblem, six beat marks, evidence/faction receipts, and
// consequence glyphs without moving executable authority out of the Arc.
//
// Source: docs/design/references/ilyon_white_label_asset_pack.svg — redrawn
//   derivative of the accepted Ilyon white-label concept sheet.
// Grid: 16x16 viewBox (hand-authored SVG paths)
// Encoding: one MotifPath case per IlyonMotifName; currentColor carries the
//   active Ilyon palette through board, encounter, Aperture, and bay surfaces.

import type { HTMLAttributes } from "react";
import "./ilyon.css";

export type IlyonMotifName =
  | "tideAstrolabe"
  | "feverCure"
  | "dependencyMap"
  | "deadStar"
  | "oceanVoice"
  | "forkedSystems"
  | "openRoute"
  | "benefactors"
  | "uncrowned"
  | "thalassic"
  | "cureLedger"
  | "reefTestimony"
  | "archiveCustody"
  | "contestedSeal";

const LOCATION_MOTIF: Record<string, IlyonMotifName> = {
  "end-the-fever": "feverCure",
  "map-the-dependency": "dependencyMap",
  "read-the-dead-star": "deadStar",
  "hear-the-ocean": "oceanVoice",
  "refuse-integration": "forkedSystems",
  "carry-the-evidence": "openRoute",
};

const PRESSURE_MOTIF: Record<string, IlyonMotifName> = {
  pocket: "tideAstrolabe",
  patron: "benefactors",
  "excluded-actor": "oceanVoice",
  "approaching-trigger": "forkedSystems",
  "cost-of-resistance": "feverCure",
  "scale-revelation": "deadStar",
};

const FACTION_MOTIF: Record<string, IlyonMotifName> = {
  "final-humanity": "benefactors",
  "uncrowned-compact": "uncrowned",
  "local-dynasties": "thalassic",
};

const EVIDENCE_MOTIF: Record<string, IlyonMotifName> = {
  "cure-ledger": "cureLedger",
  "dead-star-ruins": "deadStar",
  "deep-tide-testimony": "reefTestimony",
};

const CONSEQUENCE_MOTIF: Record<string, IlyonMotifName> = {
  "cure-dependency": "feverCure",
  "public-dependency-map": "dependencyMap",
  "dead-star-custody": "archiveCustody",
  "ocean-embassy": "oceanVoice",
  "forked-infrastructure": "forkedSystems",
  "scarway-disclosure": "openRoute",
};

export function locationMotif(id: string): IlyonMotifName {
  return LOCATION_MOTIF[id.toLowerCase()] ?? "tideAstrolabe";
}

export function pressureMotif(kind: string): IlyonMotifName {
  return PRESSURE_MOTIF[kind] ?? "tideAstrolabe";
}

export function factionMotif(id: string): IlyonMotifName {
  return FACTION_MOTIF[id] ?? "contestedSeal";
}

export function evidenceMotif(id: string): IlyonMotifName {
  return EVIDENCE_MOTIF[id] ?? "contestedSeal";
}

export function consequenceMotif(id: string): IlyonMotifName {
  return CONSEQUENCE_MOTIF[id] ?? "tideAstrolabe";
}

function MotifPath({ name }: { name: IlyonMotifName }): JSX.Element {
  switch (name) {
    case "tideAstrolabe":
      return (
        <>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <ellipse cx="8" cy="8" rx="5.5" ry="2.1" fill="none" stroke="currentColor" strokeWidth="0.9" transform="rotate(-22 8 8)" />
          <path d="M8 2.5 V13.5 M3 10.5 C5 8.5 6.5 12 8 10 C9.5 8 11 11.5 13 9.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </>
      );
    case "feverCure":
      return (
        <>
          <path d="M6 2 H10 V6 H14 V10 H10 V14 H6 V10 H2 V6 H6 Z" fill="currentColor" />
          <path d="M3 13 C5 11.5 6.5 14 8 12.5 C9.5 11 11 13.5 13 12" fill="none" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "dependencyMap":
      return (
        <>
          <circle cx="3" cy="4" r="1.5" fill="currentColor" />
          <circle cx="13" cy="4" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.8" fill="currentColor" />
          <circle cx="3" cy="13" r="1.5" fill="currentColor" />
          <circle cx="13" cy="13" r="1.5" fill="currentColor" />
          <path d="M4.3 4.8 L6.5 7 M11.7 4.8 L9.5 7 M4.3 12.2 L6.5 9 M11.7 12.2 L9.5 9" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "deadStar":
      return (
        <>
          <path d="M8 1.5 L9.4 6.3 L14.5 6.7 L10.4 9.7 L11.8 14.5 L8 11.6 L4.2 14.5 L5.6 9.7 L1.5 6.7 L6.6 6.3 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M5 4 L11 12 M11 4 L5 12" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </>
      );
    case "oceanVoice":
      return (
        <>
          <path d="M2 5 C4 2.5 6 7.5 8 5 C10 2.5 12 7.5 14 5 M2 8 C4 5.5 6 10.5 8 8 C10 5.5 12 10.5 14 8 M2 11 C4 8.5 6 13.5 8 11 C10 8.5 12 13.5 14 11" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="5" cy="4" r="0.8" fill="currentColor" />
          <circle cx="11" cy="12" r="0.8" fill="currentColor" />
        </>
      );
    case "forkedSystems":
      return (
        <>
          <path d="M8 14 V9 M8 9 L4 5 M8 9 L12 5 M4 5 V2 M12 5 V2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2.5" y="1.5" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="10.5" y="1.5" width="3" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="8" cy="14" r="1.3" fill="currentColor" />
        </>
      );
    case "openRoute":
      return (
        <>
          <path d="M2 13 C4 8 5 10 7 6 C9 2 11 5 14 2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 2 H14 V5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="3" cy="12" r="1.4" fill="currentColor" />
          <circle cx="8" cy="7" r="1" fill="currentColor" />
        </>
      );
    case "benefactors":
      return (
        <>
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M8 2 V14 M2 8 H14" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
          <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
        </>
      );
    case "uncrowned":
      return (
        <>
          <path d="M3 11 L4.5 5 L7 8 L8 4 L9 8 L11.5 5 L13 11" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 3 L14 13" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 13 H13" stroke="currentColor" strokeWidth="1.1" />
        </>
      );
    case "thalassic":
      return (
        <>
          <path d="M3 13 V7 L8 3 L13 7 V13 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 13 V9 H11 V13 M3 7 H13" stroke="currentColor" strokeWidth="1" />
          <path d="M2 4 C4 2.5 5 5.5 7 4 C9 2.5 10 5.5 14 3.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
        </>
      );
    case "cureLedger":
      return (
        <>
          <path d="M4 2 H12 V14 L10.5 13 L9 14 L7.5 13 L6 14 L4.5 13 L4 14 Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M6 5 H10 M6 8 H10 M6 11 H8" stroke="currentColor" strokeWidth="1" />
          <path d="M11 9 V13 M9 11 H13" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "reefTestimony":
      return (
        <>
          <path d="M4 14 V8 C4 6 2.5 5 2.5 3 M8 14 V6 C8 4.5 10 4 10 2 M12 14 V9 C12 7 14 6.5 14 5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="2.5" cy="3" r="1" fill="currentColor" />
          <circle cx="10" cy="2" r="1" fill="currentColor" />
          <circle cx="14" cy="5" r="1" fill="currentColor" />
          <path d="M2 14 H14" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "archiveCustody":
      return (
        <>
          <rect x="2.5" y="5" width="11" height="8.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="4" y="2.5" width="8" height="3" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="8" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M8 10.5 V12" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "contestedSeal":
      return (
        <>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1" />
          <path d="M8 4 V8.5 M8 11.5 V12" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        </>
      );
  }
}

type MotifIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: IlyonMotifName;
  size?: number;
};

export function MotifIcon({ name, size = 20, className = "", ...props }: MotifIconProps): JSX.Element {
  return (
    <span
      className={`ilyon-motif-icon ilyon-motif-icon--${name} ${className}`.trim()}
      data-ilyon-glyph={name}
      style={{ width: size, height: size, display: "inline-flex", flex: "none" }}
      {...props}
    >
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" role="presentation">
        <MotifPath name={name} />
      </svg>
    </span>
  );
}
