// DOM overlay drawn over the 3D canvas: resources, the selected/nearby node, its
// auto-assigned party, the Run Contract action, and the last deterministic report.
// Plain absolutely-positioned DOM (rendered as a sibling of <Canvas>, not inside it).

import type { CSSProperties } from "react";
import type { PlayReportView } from "../../play-pipeline/compile.js";
import type { WorldNode } from "../contract.js";

interface Props {
  title: string;
  cycle: number;
  resources: {
    currency: number;
    tokens: number;
    reputation: number;
    currencyName: string;
    tokenName: string;
    reputationName: string;
  };
  selected: WorldNode | null;
  party: string[];
  near: boolean;
  canRun: boolean;
  lastReport: PlayReportView | null;
  onRun: () => void;
}

const panel: CSSProperties = {
  position: "absolute",
  background: "rgba(23,21,15,0.86)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 8,
  padding: "12px 14px",
  font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
  pointerEvents: "auto",
  backdropFilter: "blur(4px)",
};

export function Hud(props: Props): JSX.Element {
  const { title, cycle, resources, selected, party, near, canRun, lastReport, onRun } = props;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* top-left: identity + resources */}
      <div style={{ ...panel, top: 14, left: 14, minWidth: 200 }}>
        <div style={{ color: "#c9a14a", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 11 }}>
          axm-world · arc → world
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, margin: "2px 0 8px" }}>
          {title}
        </div>
        <Row label="Cycle" value={String(cycle).padStart(2, "0")} />
        <Row label={resources.tokenName} value={String(resources.tokens)} />
        <Row label={resources.currencyName} value={String(resources.currency)} />
        <Row label={resources.reputationName} value={String(resources.reputation)} />
      </div>

      {/* bottom-center: selected node + action */}
      {selected && (
        <div style={{ ...panel, bottom: 16, left: "50%", transform: "translateX(-50%)", maxWidth: 460, textAlign: "center" }}>
          <div style={{ color: statusColor(selected.status), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>
            {selected.status}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700 }}>{selected.title}</div>
          <div style={{ color: "#a59c8b", margin: "4px 0 8px" }}>{selected.description}</div>
          {party.length > 0 && (
            <div style={{ color: "#a59c8b", fontSize: 12 }}>Party: {party.join(" · ")}</div>
          )}
          <button
            onClick={onRun}
            disabled={!canRun}
            style={{
              marginTop: 10,
              font: "700 15px 'Barlow Condensed', sans-serif",
              letterSpacing: "0.02em",
              padding: "9px 22px",
              borderRadius: 3,
              border: "none",
              cursor: canRun ? "pointer" : "not-allowed",
              background: canRun ? "#b01c18" : "#3a352c",
              color: canRun ? "#fff" : "#6e675a",
            }}
          >
            {selected.status === "locked"
              ? "Locked"
              : selected.status === "cleared"
              ? "Run Again"
              : near
              ? "Run Contract"
              : "Walk closer to run"}
          </button>
        </div>
      )}

      {/* top-right: last deterministic report */}
      {lastReport && (
        <div style={{ ...panel, top: 14, right: 14, maxWidth: 280 }}>
          <div style={{ color: statusColor(lastReport.outcome), textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>
            {lastReport.outcome}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}>
            {lastReport.challengeName}
          </div>
          <div style={{ color: "#a59c8b", marginTop: 4 }}>{lastReport.rewardSummary}</div>
        </div>
      )}
    </div>
  );
}

function Row(props: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
      <span style={{ color: "#a59c8b" }}>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function statusColor(s: string): string {
  if (s === "cleared" || s === "success") return "#74ad77";
  if (s === "locked" || s === "failure") return "#b01c18";
  return "#c9a14a";
}
