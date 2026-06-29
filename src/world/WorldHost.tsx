// Mounts the active presentation and offers a costume switcher. The same cartridge
// plays in every costume because they all render the one engine seam (useArcWorld).

import { useState } from "react";
import { PRESENTATIONS } from "./presentations.js";
import { loadCostume, saveCostume, isCostumeId } from "./presentation-prefs.js";
import type { Cartridge } from "./cartridge.js";

export interface WorldHostProps {
  cartridge: Cartridge;
  onExit: () => void;
}

export function WorldHost({ cartridge, onExit }: WorldHostProps): JSX.Element {
  const [costumeId, setCostumeId] = useState<string>(() => loadCostume(cartridge.arc));
  const choose = (id: string) => {
    setCostumeId(id);
    if (isCostumeId(id)) saveCostume(cartridge.arc, id);
  };
  const active = PRESENTATIONS.find((p) => p.id === costumeId) ?? PRESENTATIONS[0];
  if (!active) return <div />;
  const Active = active.Component;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Active cartridge={cartridge} onExit={onExit} />

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
              onClick={() => choose(p.id)}
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
