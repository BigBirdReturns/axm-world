// axm-world: the cartridge player. Its whole job is to pick a cartridge and render it
// in a costume. No designer, no library, no embedded hub game — those belong to
// axm-arc. Boot -> cartridge select -> world (costume + HUD) -> exit back to select.

import { Suspense, lazy, useRef, useState, type CSSProperties } from "react";
import type { Cartridge } from "./cartridge.js";
import {
  cartridgeForEntry,
  ensureBundledCartridges,
  importCartridgeFromJson,
  listCartridges,
  removeCartridge,
  type CartridgeBayEntry,
} from "./cartridge-bay.js";
import { RodohRuntimeMark } from "./brand/RodohRuntimeMark.js";
import { PixelButton, PixelIcon } from "./pixel-ui/index.js";
import { t } from "./i18n/index.js";
import type { MessageId } from "./i18n/messages.js";

// Lazy: the world pulls in three.js / R3F (~1MB). Keep it out of the entry bundle so
// the cartridge-select screen is instant; three only loads when a cartridge is played.
const WorldHost = lazy(() => import("./WorldHost.js").then((m) => ({ default: m.WorldHost })));

// Lazy: the UI kit dev route pulls in every pixel-ui component. Only loaded when
// visiting /rodoh/ui-kit directly, never part of the cartridge-select bundle.
const RodohUiKitRoute = lazy(() => import("./dev/RodohUiKitRoute.js").then((m) => ({ default: m.RodohUiKitRoute })));

const screen: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(120% 130% at 50% -10%, #1b1a14 0%, #0b0a08 62%)",
  color: "#ece4d4",
  display: "grid",
  placeItems: "center",
  fontFamily: "'Lora', Georgia, serif",
};

const TRUST_COLOR: Record<string, string> = {
  bundled: "#c9a14a",
  verified: "#74ad77",
  "imported-unsigned": "#a59c8b",
  quarantined: "#b01c18",
};

const TRUST_LABEL_ID: Record<string, MessageId> = {
  bundled: "boot.trustBundled",
  "imported-unsigned": "boot.trustImportedUnsigned",
  verified: "boot.trustVerified",
  quarantined: "boot.trustQuarantined",
};

// Visually-hidden-but-present input: Playwright's setInputFiles (and screen readers,
// via the associated label) work fine against it, but sighted users see the styled
// PixelButton beside it, not the browser's native file-input chrome.
const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function Player(): JSX.Element {
  const [cartridge, setCartridge] = useState<Cartridge | null>(null);
  const [entries, setEntries] = useState<CartridgeBayEntry[]>(() => ensureBundledCartridges());
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importedMsg, setImportedMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Base-path agnostic: the app deploys under /axm-world/game/ on GitHub Pages
  // but at root in local dev, so match on suffix rather than exact pathname.
  if (typeof window !== "undefined" && window.location.pathname.endsWith("/rodoh/ui-kit")) {
    return (
      <Suspense fallback={<div style={screen} />}>
        <RodohUiKitRoute />
      </Suspense>
    );
  }

  if (cartridge) {
    return (
      <Suspense
        fallback={
          <div style={{ ...screen, font: "14px 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b" }}>
            <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
              <RodohRuntimeMark variant="boot" label="RODOH RUNTIME v1.0" caption={`Loading ${cartridge.manifest.name}`} />
            </div>
          </div>
        }
      >
        <WorldHost cartridge={cartridge} onExit={() => setCartridge(null)} />
      </Suspense>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename later
    if (!file) return;
    const text = await file.text();
    const result = importCartridgeFromJson(text);
    if (!result.ok) {
      setImportErrors(result.errors);
      setImportedMsg(null);
      return;
    }
    setImportErrors(null);
    setImportedMsg(t("boot.importedNamed", { name: result.entry.arc.meta.name }));
    setEntries(listCartridges());
  };

  const handleRemove = (entry: CartridgeBayEntry) => {
    removeCartridge(entry.arc.meta.id);
    setEntries(listCartridges());
  };

  return (
    <div style={screen}>
      <div style={{ width: "min(560px, 92vw)" }}>
        <div style={{ marginBottom: 18 }}>
          <RodohRuntimeMark variant="boot" label="RODOH RUNTIME v1.0" caption="Hold the loop." />
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6f8f57" }}>
          AXM-WORLD runtime shell
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(34px, 7vw, 56px)", lineHeight: 1, margin: "6px 0 4px" }}>
          Cartridge worlds that remember.
        </h1>
        <p style={{ color: "#a59c8b", margin: "0 0 22px", maxWidth: "48ch" }}>
          Pick up a cartridge. Hold the loop. Mark what happened. Keep going.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          {entries.map((entry) => {
            const c = cartridgeForEntry(entry);
            return (
              <div
                key={`${entry.arc.meta.id}:${entry.source}`}
                data-testid={`cartridge-entry-${entry.arc.meta.id}`}
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
                }}
              >
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22 }}>{c.manifest.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#a59c8b", marginTop: 2 }}>
                    {c.manifest.domain} · engine {c.manifest.engineVersion} · {c.arc.challenges.length} contracts
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RodohRuntimeMark variant="micro" showText={false} />
                  <span
                    data-testid={`trust-chip-${entry.trust}`}
                    data-trust={entry.trust}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: TRUST_COLOR[entry.trust] ?? "#a59c8b" }}
                  >
                    {t(TRUST_LABEL_ID[entry.trust] ?? "boot.trustImportedUnsigned")}
                  </span>
                  {entry.source === "file" && (
                    <PixelButton
                      type="button"
                      variant="secondary"
                      data-testid={`remove-cartridge-${entry.arc.meta.id}`}
                      onClick={() => handleRemove(entry)}
                      style={{ minHeight: 32, fontSize: 10, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
                      aria-label={t("boot.remove")}
                    >
                      <PixelIcon name="failing" /> <span>{t("boot.remove")}</span>
                    </PixelButton>
                  )}
                  <button
                    data-testid={`play-cartridge-${entry.arc.meta.id}`}
                    onClick={() => setCartridge(c)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#b01c18",
                      padding: 0,
                    }}
                  >
                    Enter →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
          >
            <PixelIcon name="available" /> <span>{t("boot.openCartridge")}</span>
          </PixelButton>
          <label htmlFor="cartridge-file-input" style={visuallyHidden}>
            {t("boot.openCartridge")}
          </label>
          <input
            id="cartridge-file-input"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            data-testid="open-cartridge"
            style={visuallyHidden}
            onChange={handleFileChange}
          />
        </div>

        {importErrors && (
          <div style={{ marginTop: 12, color: "#e6a5a2", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} data-testid="import-errors">
            <strong>{t("boot.importFailedHeading")}</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {importErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {importedMsg && (
          <div style={{ marginTop: 12, color: "#74ad77", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} data-testid="import-success">
            {importedMsg}
          </div>
        )}

        <p style={{ color: "#a59c8b", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginTop: 18 }}>
          Rodoh records the run. AXM-WORLD renders the shell. The cartridge stays yours.
        </p>
      </div>
    </div>
  );
}
