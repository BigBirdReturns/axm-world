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
import { programForCartridge } from "./program-of-record.js";
import { readProgramSaveSummary } from "./save.js";
import { CartridgeBayCard } from "./components/CartridgeBayCard.js";
import { RodohRuntimeMark } from "./brand/RodohRuntimeMark.js";
import "./themes/karazhan/karazhan.css";
import { PixelButton, PixelIcon } from "./pixel-ui/index.js";
import { t } from "./i18n/index.js";

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
            // A program of record is matched by the cartridge's COMPUTED authored
            // identity (never a manifest claim); only then do we read its save
            // slot so the plaque can show fresh-vs-resumable and what it remembers.
            const program = programForCartridge(c);
            const save = program ? readProgramSaveSummary(localStorage, { arc: c.arc, authoredArcDigest: program.authoredArcDigest }) : null;
            return (
              <CartridgeBayCard
                key={`${entry.arc.meta.id}:${entry.source}`}
                entry={entry}
                cartridge={c}
                program={program}
                save={save}
                onEnter={() => setCartridge(c)}
                onRemove={() => handleRemove(entry)}
              />
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
