// Mounts the active presentation and offers a costume switcher. The same arc plays
// in every costume because they all render the one engine seam (useArcWorld). This
// is the "presentation is a free choice" layer made concrete.

import { useState } from "react";
import type { Arc } from "../engine/types.js";
import { PRESENTATIONS } from "./presentations.js";

export interface WorldHostProps {
  arc: Arc;
  onExit: () => void;
}

export function WorldHost({ arc, onExit }: WorldHostProps): JSX.Element {
  const [costumeId, setCostumeId] = useState<string>("board");
  const active = PRESENTATIONS.find((p) => p.id === costumeId) ?? PRESENTATIONS[0];
  if (!active) return <div />;
  const Active = active.Component;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Active arc={arc} onExit={onExit} />

      {/* costume switcher */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 8,
          background: "rgba(23,21,15,0.82)",
          border: "1px solid #4a4238",
          pointerEvents: "auto",
          font: "600 12px 'IBM Plex Mono', ui-monospace, monospace",
        }}
      >
        {PRESENTATIONS.map((p) => {
          const on = p.id === active.id;
          return (
            <button
              key={p.id}
              onClick={() => setCostumeId(p.id)}
              title={p.blurb}
              style={{
                cursor: "pointer",
                padding: "5px 11px",
                borderRadius: 5,
                border: "none",
                background: on ? "#b01c18" : "transparent",
                color: on ? "#fff" : "#a59c8b",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
