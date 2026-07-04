// The one place that maps a node's progression-tier index to its authored region
// name. Both the strategic World-map (which groups pins into regions) and the
// inhabited hall (which now names the region its steward's contract sits in) read
// this, so the two surfaces label the same contract's place with the same words —
// never two competing vocabularies. PURE; the name is authored arc content and
// flows verbatim wherever it is shown.

import type { Arc } from "../engine/types.js";

/** The authored progression-tier name a tierIndex belongs to (e.g. "Proving
 *  Grounds"). Falls back to a neutral label only for a tierIndex the arc doesn't
 *  define — the same fallback the map has always used. */
export function regionNameForTier(arc: Arc, tierIndex: number): string {
  return arc.progressionTiers[tierIndex]?.name ?? "The Field";
}
