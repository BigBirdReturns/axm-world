// The cartridge as an object. Returning here at the end of the loop shows that the
// world did not swallow the cartridge: it is still a named, owned, portable artifact
// — now carrying the run state and the choice you made — with an Export affordance
// that produces the custody object (manifest + arc + run state) as a file. Custody as
// an object action.

import { type CSSProperties } from "react";
import type { CartridgeManifest } from "../cartridge.js";
import type { CustodyObject } from "../useArcWorld.js";

interface Props {
  manifest: CartridgeManifest;
  openingChoice: string | null;
  cycle: number;
  clearedCount: number;
  totalNodes: number;
  onExport: () => CustodyObject;
  onClose: () => void;
  onLeave: () => void;
}

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "rgba(11,10,8,0.7)",
  pointerEvents: "auto",
  zIndex: 30,
  padding: 20,
};

const TRUST_COLOR: Record<string, string> = {
  bundled: "#c9a14a",
  verified: "#74ad77",
  imported: "#a59c8b",
  quarantined: "#b01c18",
};

function row(label: string, value: string): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "4px 0" }}>
      <span style={{ color: "#a59c8b" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

export function CartridgeObjectPanel({ manifest, openingChoice, cycle, clearedCount, totalNodes, onExport, onClose, onLeave }: Props): JSX.Element {
  const progressPct = totalNodes > 0 ? Math.round((clearedCount / totalNodes) * 100) : 0;
  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manifest.id}.run.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={wrap}>
      <div
        style={{
          background: "rgba(23,21,15,0.98)",
          color: "#ece4d4",
          border: "1px solid #4a4238",
          borderRadius: 10,
          padding: "22px 24px",
          width: "min(440px, 92vw)",
          font: "13px/1.5 'IBM Plex Mono', ui-monospace, monospace",
          boxShadow: "0 24px 70px -24px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>Cartridge</span>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TRUST_COLOR[manifest.trust] ?? "#a59c8b" }}>{manifest.trust}</span>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, margin: "2px 0 12px" }}>{manifest.name}</div>

        {row("Domain", manifest.domain)}
        {row("Engine", manifest.engineVersion)}
        <div style={{ height: 1, background: "#2a2620", margin: "8px 0" }} />
        {row("Cycle", String(cycle).padStart(2, "0"))}
        {row("Recorded nodes", `${clearedCount} / ${totalNodes}`)}
        <div style={{ height: 6, background: "#2a2620", borderRadius: 999, overflow: "hidden", margin: "4px 0 8px" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "#74ad77" }} />
        </div>
        {row("Decision mark", openingChoice ?? "—")}

        <p style={{ color: "#a59c8b", fontFamily: "'Lora', Georgia, serif", fontSize: 13, lineHeight: 1.5, margin: "14px 0 16px" }}>
          The world did not swallow it. The object now carries engine marks — decisions,
          cleared nodes, cycle count, and roster state — that survive representation changes.
        </p>

        <button
          onClick={handleExport}
          style={{
            width: "100%",
            font: "700 15px 'Barlow Condensed', sans-serif",
            letterSpacing: "0.02em",
            padding: "11px 0",
            borderRadius: 5,
            border: "none",
            background: "#b01c18",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          ⤓ Export cartridge + run
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 5, border: "1px solid #4a4238", background: "transparent", color: "#ece4d4", cursor: "pointer", font: "600 13px 'IBM Plex Mono', monospace" }}>
            Resume
          </button>
          <button onClick={onLeave} style={{ flex: 1, padding: "9px 0", borderRadius: 5, border: "1px solid #4a4238", background: "transparent", color: "#a59c8b", cursor: "pointer", font: "600 13px 'IBM Plex Mono', monospace" }}>
            Leave cartridge
          </button>
        </div>
      </div>
    </div>
  );
}
