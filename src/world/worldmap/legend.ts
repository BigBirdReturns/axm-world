// The World-map legend model: a static key that ties every visual marker a pin
// can carry to the vocabulary word the map already prints, plus a one-line gloss
// of what it means. PURE data (message ids only — no React, no CSS), so the map
// renders it and tests/world/worldmap.test.ts asserts it covers EXACTLY the marker
// set deriveWorldMap produces — no marker left unexplained, none invented.
//
// It authors nothing and derives nothing: the terms reuse the existing state
// labels, and every string is a t() id so the i18n coverage + locale guards apply.

import type { MessageId } from "../i18n/messages.js";
import type { MapNodeState } from "./derive.js";

/** Every distinct marker a pin can render: the four node states (from
 *  mapNodeState) plus the two overlay signals the map layers on — the arc-relative
 *  "steep" risk and the single shared "next" contract. The legend explains this
 *  set and only this set. */
export type MapMarker = MapNodeState | "steep" | "next";

export interface MapLegendEntry {
  marker: MapMarker;
  /** The label the map already prints for this marker — reused verbatim so the key
   *  and the pins speak the same word. */
  term: MessageId;
  /** A terse gloss: what the marker MEANS, so a pin reads without guesswork. */
  gloss: MessageId;
}

/** Read order follows a contract's life on the map: what to act on next, what's
 *  open, what's selected, what's hard, what's done, what's still shut. */
export const MAP_LEGEND: readonly MapLegendEntry[] = [
  { marker: "next", term: "worldMap.nextContract", gloss: "worldMap.legendNext" },
  { marker: "available", term: "worldMap.stateAvailable", gloss: "worldMap.legendAvailable" },
  { marker: "active", term: "worldMap.stateActive", gloss: "worldMap.legendActive" },
  { marker: "steep", term: "worldMap.steep", gloss: "worldMap.legendSteep" },
  { marker: "recorded", term: "worldMap.stateRecorded", gloss: "worldMap.legendRecorded" },
  { marker: "locked", term: "worldMap.stateLocked", gloss: "worldMap.legendLocked" },
];

/** The glyph a swatch echoes from the pin it explains (recorded ✓, next ▸, steep
 *  ⚠); the plain state swatches carry colour alone. Punctuation only — never a
 *  translatable string. */
export const MARKER_GLYPH: Partial<Record<MapMarker, string>> = {
  recorded: "✓",
  next: "▸",
  steep: "⚠",
};
