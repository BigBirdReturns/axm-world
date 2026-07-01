// Inline SVG motif icons for the First Charter theme. These replace placeholder
// emoji glyphs (🐀, 🌉, 🛒, ⛏️, 🔥, 🏰) in encounter surfaces with on-theme,
// no-font iconography drawn from FIRST_CHARTER_MOTIFS.

import type { HTMLAttributes } from "react";
import "./first-charter.css";

export type FirstCharterMotifName =
  | "dandelion"
  | "archiveBox"
  | "coffeeMug"
  | "crossedCalendar"
  | "receiptTab"
  | "notebook"
  | "starSpark";

const LOCATION_MOTIF: Record<string, FirstCharterMotifName> = {
  cellar: "dandelion",
  "the-cellar": "dandelion",
  "bridge-troll": "crossedCalendar",
  "merchant-escort": "receiptTab",
  "mine-collapse": "notebook",
  "bandit-camp": "starSpark",
  "wardens-keep": "archiveBox",
};

export function locationMotif(id: string): FirstCharterMotifName {
  const lower = id.toLowerCase();
  for (const [key, motif] of Object.entries(LOCATION_MOTIF)) {
    if (lower.includes(key)) return motif;
  }
  return "dandelion";
}

function MotifPath({ name }: { name: FirstCharterMotifName }): JSX.Element {
  switch (name) {
    case "dandelion":
      return (
        <>
          <circle cx="8" cy="4" r="1.4" />
          <circle cx="5" cy="3" r="1" />
          <circle cx="11" cy="3" r="1" />
          <circle cx="4" cy="6" r="0.8" />
          <circle cx="12" cy="6" r="0.8" />
          <path d="M8 5.5 L8 14" strokeWidth="1" stroke="currentColor" fill="none" />
        </>
      );
    case "archiveBox":
      return (
        <>
          <rect x="2" y="6" width="12" height="8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="3" width="12" height="3" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.5 9 H9.5" stroke="currentColor" strokeWidth="1.2" />
        </>
      );
    case "coffeeMug":
      return (
        <>
          <path d="M3 5 H10 V11 A3.5 3.5 0 0 1 3 11 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M10 6.5 H12 A1.5 1.5 0 0 1 12 9.5 H10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 3 Q5.5 4 5 5" stroke="currentColor" strokeWidth="0.9" fill="none" />
          <path d="M7.5 3 Q8 4 7.5 5" stroke="currentColor" strokeWidth="0.9" fill="none" />
        </>
      );
    case "crossedCalendar":
      return (
        <>
          <rect x="2.5" y="3" width="11" height="11" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.5 6.5 H13.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 2 V4.5 M11 2 V4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 8.5 L11.5 12.5 M11.5 8.5 L4.5 12.5" stroke="currentColor" strokeWidth="1.1" />
        </>
      );
    case "receiptTab":
      return (
        <>
          <path d="M4 2 H12 V13 L10.5 12 L9 13 L7.5 12 L6 13 L4.5 12 L4 13 Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <path d="M6 5 H10 M6 7.5 H10 M6 10 H8.5" stroke="currentColor" strokeWidth="1" />
        </>
      );
    case "notebook":
      return (
        <>
          <rect x="3" y="2.5" width="10" height="11" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 2.5 V13.5" stroke="currentColor" strokeWidth="1" />
          <path d="M7.5 5.5 H10.5 M7.5 8 H10.5 M7.5 10.5 H9.5" stroke="currentColor" strokeWidth="0.9" />
        </>
      );
    case "starSpark":
      return (
        <path d="M8 2 L9.2 6.2 L13.5 6.6 L10.2 9.3 L11.2 13.5 L8 11.1 L4.8 13.5 L5.8 9.3 L2.5 6.6 L6.8 6.2 Z" fill="currentColor" />
      );
    default:
      return <circle cx="8" cy="8" r="3" fill="currentColor" />;
  }
}

type MotifIconProps = HTMLAttributes<HTMLSpanElement> & {
  name: FirstCharterMotifName;
  size?: number;
};

export function MotifIcon({ name, size = 20, className = "", ...props }: MotifIconProps): JSX.Element {
  return (
    <span className={`fc-motif-icon fc-motif-icon--${name} ${className}`} aria-hidden="true" {...props}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <MotifPath name={name} />
      </svg>
    </span>
  );
}
