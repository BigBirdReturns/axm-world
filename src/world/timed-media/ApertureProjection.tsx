import type { CSSProperties } from "react";
import type { CanonicalStoryTimedMedia } from "../../canonical-story/timed-media.js";
import { projectApertureAtPanel } from "./projection.js";

interface Props {
  timedMedia: CanonicalStoryTimedMedia;
  panelId: string;
}

const card: CSSProperties = {
  border: "1px solid #4a4934",
  background: "rgba(17,18,13,0.96)",
  borderRadius: 8,
  padding: "clamp(12px, 2.5vw, 18px)",
  display: "grid",
  gap: 12,
};

function formatInterval(startUs: number, endUs: number): string {
  return `${(startUs / 1_000_000).toFixed(3)}s–${(endUs / 1_000_000).toFixed(3)}s`;
}

export function ApertureProjection({ timedMedia, panelId }: Props): JSX.Element | null {
  const projection = projectApertureAtPanel(timedMedia, panelId);
  if (!projection) return null;

  const facts = new Map(projection.facts.map((fact) => [fact.id, fact]));

  return (
    <section
      style={card}
      data-testid="aperture-timed-media-projection"
      data-panel-id={panelId}
      data-position-ids={projection.positions.map((position) => position.id).join(" ")}
      aria-label="Arc-reviewed timed-media projection"
    >
      <header>
        <strong style={{ font: "800 19px 'Barlow Condensed', sans-serif" }}>
          Aperture · Arc-reviewed position
        </strong>
        <p style={{ margin: "5px 0 0", color: "#a7a58d", fontSize: 10, lineHeight: 1.5 }}>
          Narrative: Arc · provider clock: none · viewer state: none · playback control: none
        </p>
      </header>

      <div style={{ display: "grid", gap: 7 }}>
        {projection.positions.map((position) => (
          <div
            key={position.id}
            data-testid={`aperture-position-${position.id}`}
            style={{ borderLeft: "3px solid #999663", paddingLeft: 10 }}
          >
            <strong>{position.label}</strong>
            <div style={{ color: "#9b9784", fontSize: 9 }}>
              {position.id} · canonical {formatInterval(
                position.canonicalStartUs,
                position.canonicalEndUs,
              )}
            </div>
          </div>
        ))}
      </div>

      {projection.reveals.length > 0 && (
        <div style={{ display: "grid", gap: 7 }}>
          <strong style={{ fontSize: 11 }}>Explicit reveals at this position</strong>
          {projection.reveals.map((reveal) => {
            const fact = facts.get(reveal.factId)!;
            return (
              <article
                key={reveal.id}
                data-testid={`aperture-reveal-${reveal.id}`}
                style={{ border: "1px solid #35372b", padding: 10, background: "#11130e" }}
              >
                <div style={{ color: "#a9a678", fontSize: 9 }}>
                  {reveal.mode.toUpperCase()} · {reveal.id}
                </div>
                <p style={{ margin: "5px 0", font: "14px/1.5 'Lora', Georgia, serif" }}>
                  {fact.proposition}
                </p>
                <div style={{ color: "#817f70", fontSize: 9 }}>
                  {fact.id}
                  {fact.subjectIds.length > 0 ? ` · ${fact.subjectIds.join(" · ")}` : ""}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {projection.causalEdges.length > 0 && (
        <div style={{ display: "grid", gap: 5 }}>
          <strong style={{ fontSize: 11 }}>Reviewed causal relations among displayed facts</strong>
          {projection.causalEdges.map((edge) => (
            <div key={edge.id} data-testid={`aperture-causal-edge-${edge.id}`} style={{ fontSize: 10 }}>
              <code>{edge.fromFactId}</code> {edge.relation} <code>{edge.toFactId}</code>
            </div>
          ))}
        </div>
      )}

      <details data-testid="aperture-source-receipts">
        <summary style={{ cursor: "pointer", fontSize: 10 }}>
          {projection.sourceReceipts.length} reviewed source receipt{
            projection.sourceReceipts.length === 1 ? "" : "s"}
        </summary>
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {projection.sourceReceipts.map((receipt) => (
            <div key={receipt.id} style={{ fontSize: 9, overflowWrap: "anywhere" }}>
              <strong>{receipt.id}</strong> · {receipt.standing}<br />
              {receipt.locator}<br />
              <code>{receipt.sha256}</code>
            </div>
          ))}
        </div>
      </details>

      <footer style={{ borderTop: "1px solid #303126", paddingTop: 9, color: "#8c8979", fontSize: 9, lineHeight: 1.55 }}>
        This projection is recomputed from the current canonical panel. It is not an Exposure Ledger,
        a Knowledge Ledger, provider time, edition proof, or a seek target.
      </footer>
    </section>
  );
}
