// Surfaces an authored/pending decision (the cartridge's opening oath, or any drama
// card the engine generated). The player chooses; on Continue the engine resolves it
// (effects applied, card cleared). Two phases: deciding -> consequence. The panel is
// keyed by card id, so each new decision resets it. axm-world authors nothing here —
// it only renders the card's options and reports the engine's response.

import { useState, type CSSProperties } from "react";
import type { DramaCard } from "../../engine/types.js";

interface Props {
  card: DramaCard;
  onResolve: (optionId: string) => void;
}

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "rgba(11,10,8,0.62)",
  pointerEvents: "auto",
  zIndex: 25,
  padding: 20,
};

const card: CSSProperties = {
  background: "rgba(23,21,15,0.97)",
  color: "#ece4d4",
  border: "1px solid #4a4238",
  borderRadius: 10,
  padding: "24px 26px",
  maxWidth: 560,
  boxShadow: "0 24px 70px -24px rgba(0,0,0,0.85)",
};

export function DecisionPanel({ card: drama, onResolve }: Props): JSX.Element {
  const [chosen, setChosen] = useState<{ id: string; label: string; description: string } | null>(null);

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c9a14a" }}>
          {chosen ? "The world responds" : "A decision"}
        </div>

        {!chosen ? (
          <>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 17, lineHeight: 1.5, margin: "10px 0 18px" }}>
              {drama.narrativeText}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {drama.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setChosen({ id: o.id, label: o.label, description: o.description })}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 6,
                    border: "1px solid #5e5850",
                    background: "rgba(201,161,74,0.07)",
                    color: "#ece4d4",
                    cursor: "pointer",
                    font: "700 15px 'Barlow Condensed', sans-serif",
                    letterSpacing: "0.01em",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, margin: "8px 0 6px" }}>
              {chosen.label}
            </h2>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 16, lineHeight: 1.5, color: "#d8cfbd", margin: "0 0 18px" }}>
              {chosen.description}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => onResolve(chosen.id)}
                style={{
                  font: "700 15px 'Barlow Condensed', sans-serif",
                  letterSpacing: "0.02em",
                  padding: "9px 22px",
                  borderRadius: 5,
                  border: "none",
                  background: "#b01c18",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
