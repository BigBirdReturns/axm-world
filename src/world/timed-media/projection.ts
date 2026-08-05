import type {
  CanonicalStoryTimedMedia,
  TimedMediaCausalEdge,
  TimedMediaFact,
  TimedMediaPosition,
  TimedMediaReveal,
  TimedMediaSourceReceipt,
} from "../../canonical-story/timed-media.js";

export interface AperturePanelProjection {
  panelId: string;
  positions: TimedMediaPosition[];
  reveals: TimedMediaReveal[];
  facts: TimedMediaFact[];
  causalEdges: TimedMediaCausalEdge[];
  sourceReceipts: TimedMediaSourceReceipt[];
}

/**
 * Project only records explicitly attached to the current canonical panel.
 *
 * The function has no history input and returns no exposure or knowledge state.
 * A fact appears only when an Arc-authored reveal names that fact at a position
 * containing the panel. Causal edges appear only when both endpoint facts are
 * already present in that explicit reveal set, preventing an unrevealed fact
 * from becoming visible through graph traversal.
 */
export function projectApertureAtPanel(
  timedMedia: CanonicalStoryTimedMedia,
  panelId: string,
): AperturePanelProjection | null {
  const positions = timedMedia.positions.filter((position) =>
    position.panelIds.includes(panelId));
  if (positions.length === 0) return null;

  const positionIds = new Set(positions.map((position) => position.id));
  const reveals = timedMedia.reveals.filter((reveal) =>
    positionIds.has(reveal.positionId));
  const factIds = new Set(reveals.map((reveal) => reveal.factId));
  const facts = timedMedia.facts.filter((fact) => factIds.has(fact.id));
  const causalEdges = timedMedia.causalEdges.filter((edge) =>
    factIds.has(edge.fromFactId) && factIds.has(edge.toFactId));

  const receiptIds = new Set<string>();
  for (const row of positions) {
    for (const id of row.sourceReceiptIds) receiptIds.add(id);
  }
  for (const row of reveals) {
    for (const id of row.sourceReceiptIds) receiptIds.add(id);
  }
  for (const row of facts) {
    for (const id of row.sourceReceiptIds) receiptIds.add(id);
  }
  for (const row of causalEdges) {
    for (const id of row.sourceReceiptIds) receiptIds.add(id);
  }

  return {
    panelId,
    positions,
    reveals,
    facts,
    causalEdges,
    sourceReceipts: timedMedia.sourceReceipts.filter((receipt) =>
      receiptIds.has(receipt.id)),
  };
}
