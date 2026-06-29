// axm-world: the cartridge player. Its whole job is to pick a cartridge and render it
// in a costume. No designer, no library, no embedded hub game — those belong to
// axm-arc. Boot -> cartridge select -> world (costume + HUD) -> exit back to select.

import { Suspense, lazy, useState, type CSSProperties } from "react";
import { BUNDLED_CARTRIDGES, type Cartridge, type TrustLevel } from "./cartridge.js";

// Lazy: the world pulls in three.js / R3F (~1MB). Keep it out of the entry bundle so
// the cartridge-select screen is instant; three only loads when a cartridge is played.
const WorldHost = lazy(() => import("./WorldHost.js").then((m) => ({ default: m.WorldHost })));

const screen: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(120% 130% at 50% -10%, #211d16 0%, #17150f 60%)",
  color: "#ece4d4",
  display: "grid",
  placeItems: "center",
  fontFamily: "'Lora', Georgia, serif",
};

const TRUST_COLOR: Record<TrustLevel, string> = {
  bundled: "#c9a14a",
  verified: "#74ad77",
  imported: "#a59c8b",
  quarantined: "#b01c18",
};

export function Player(): JSX.Element {
  const [cartridge, setCartridge] = useState<Cartridge | null>(null);

  if (cartridge) {
    return (
      <Suspense
        fallback={
          <div style={{ ...screen, font: "14px 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b" }}>
            Loading {cartridge.manifest.name}…
          </div>
        }
      >
        <WorldHost cartridge={cartridge} onExit={() => setCartridge(null)} />
      </Suspense>
    );
  }

  return (
    <div style={screen}>
      <div style={{ width: "min(560px, 92vw)" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#b01c18" }}>
          axm-world
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(34px, 7vw, 56px)", lineHeight: 1, margin: "6px 0 4px" }}>
          Drop in a cartridge.
        </h1>
        <p style={{ color: "#a59c8b", margin: "0 0 22px", maxWidth: "46ch" }}>
          A player for AXM cartridges. Pick one below and it renders — deterministic engine
          underneath, your choice of costume on top.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          {BUNDLED_CARTRIDGES.map((c) => (
            <button
              key={c.manifest.id}
              onClick={() => setCartridge(c)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: 8,
                border: "1px solid #4a4238",
                background: "rgba(42,38,32,0.5)",
                color: "#ece4d4",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22 }}>{c.manifest.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#a59c8b", marginTop: 2 }}>
                  {c.manifest.domain} · engine {c.manifest.engineVersion} · {c.arc.challenges.length} contracts
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TRUST_COLOR[c.manifest.trust] }}>
                  {c.manifest.trust}
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#b01c18" }}>Play →</span>
              </div>
            </button>
          ))}
        </div>

        <p style={{ color: "#a59c8b", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginTop: 18 }}>
          Load a cartridge by URL or file — coming. The same cartridge plays in other
          players too; it stays yours.
        </p>
      </div>
    </div>
  );
}
