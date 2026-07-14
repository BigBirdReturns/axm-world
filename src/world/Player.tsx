// axm-world: the cartridge player. Its whole job is to pick a cartridge and render it
// in a costume. No designer, no library, no embedded hub game — those belong to
// axm-arc. Boot -> cartridge select -> world (costume + HUD) -> exit back to select.

import { Suspense, lazy, useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Cartridge } from "./cartridge.js";
import {
  bayImportPreflight,
  cartridgeForEntry,
  ensureBundledCartridges,
  importCartridgeFromJson,
  listCartridges,
  removeCartridge,
  type BayImportPreflight,
  type CartridgeBayEntry,
} from "./cartridge-bay.js";
import { cartridgeIdentity } from "./cartridge-identity.js";
import { programForCartridge } from "./program-of-record.js";
import { readProgramSaveSummary } from "./save.js";
import { CartridgeBayCard } from "./components/CartridgeBayCard.js";
import { LocaleSwitcher } from "./components/LocaleSwitcher.js";
import { CartridgeEnterTransition } from "./components/CartridgeEnterTransition.js";
import { RodohRuntimeMark } from "./brand/RodohRuntimeMark.js";
import "./themes/karazhan/karazhan.css";
import { PixelButton, PixelIcon } from "./pixel-ui/index.js";
import { t, useLocale } from "./i18n/index.js";

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
  // Subscribe the boot surface to the locale so its copy re-translates the moment
  // the toggle below is used (the persisted choice otherwise only reads at load).
  useLocale();
  const [cartridge, setCartridge] = useState<Cartridge | null>(null);
  const [enteringCartridge, setEnteringCartridge] = useState<Cartridge | null>(null);
  const [entries, setEntries] = useState<CartridgeBayEntry[]>(() => ensureBundledCartridges());
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importedMsg, setImportedMsg] = useState<string | null>(null);
  const [importPreflight, setImportPreflight] = useState<BayImportPreflight | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enterCartridge = useCallback((next: Cartridge): void => {
    // Mount the authoritative world immediately. The bounded plaque layer below
    // reveals that committed state; it never delays or owns game state.
    setCartridge(next);
    setEnteringCartridge(next);
  }, []);
  const completeEntry = useCallback(() => setEnteringCartridge(null), []);
  const leaveCartridge = useCallback((): void => {
    setEnteringCartridge(null);
    setCartridge(null);
  }, []);

  // Every bay entry's content-identity digest (arc-072 parity) — computed once
  // per entries change, not per render, since it hashes the whole canonical
  // arc. Keyed by id+source to match the entries' own dedup key below.
  const digests = useMemo(
    () => new Map(entries.map((e) => [`${e.arc.meta.id}:${e.source}`, cartridgeIdentity(cartridgeForEntry(e))])),
    [entries],
  );

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
      <>
        <Suspense
          fallback={
            <div style={{ ...screen, font: "14px 'IBM Plex Mono', ui-monospace, monospace", color: "#a59c8b" }}>
              <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
                <RodohRuntimeMark variant="boot" label="RODOH RUNTIME v1.0" caption={t("boot.loadingNamed", { name: cartridge.manifest.name })} />
              </div>
            </div>
          }
        >
          <WorldHost cartridge={cartridge} onExit={leaveCartridge} />
        </Suspense>
        {enteringCartridge && (
          <CartridgeEnterTransition cartridge={enteringCartridge} onComplete={completeEntry} />
        )}
      </>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename later
    if (!file) return;
    const text = await file.text();
    // Preflight is computed against the bay's state BEFORE this import writes
    // anything — a pure, additive report that reuses the same validator the
    // write path uses. It never changes what importCartridgeFromJson does.
    const report = bayImportPreflight(text, entries);
    const result = importCartridgeFromJson(text);
    if (!result.ok) {
      setImportErrors(result.errors);
      setImportedMsg(null);
      setImportPreflight(null);
      return;
    }
    setImportErrors(null);
    setImportedMsg(t("boot.importedNamed", { name: result.entry.arc.meta.name }));
    setImportPreflight(report.ok ? report : null);
    setEntries(listCartridges());
  };

  const preflightActionMessage = (action: "new" | "update" | "duplicate") =>
    action === "new" ? t("boot.preflightNew") : action === "update" ? t("boot.preflightUpdate") : t("boot.preflightDuplicate");

  const handleRemove = (entry: CartridgeBayEntry) => {
    removeCartridge(entry.arc.meta.id);
    setEntries(listCartridges());
  };

  // One cartridge, rendered as a durable Library object. Every entry — a program
  // of record, a bundled game, or a cartridge you imported — reads its identity,
  // provenance, memory, and resume state through the SAME derivations (digest,
  // programForCartridge, the one save summary), so a card can never claim more
  // than the cartridge in hand backs.
  const renderCard = (entry: CartridgeBayEntry): JSX.Element => {
    const c = cartridgeForEntry(entry);
    const digest = digests.get(`${entry.arc.meta.id}:${entry.source}`)!;
    const program = programForCartridge(c);
    const save = readProgramSaveSummary(localStorage, { arc: c.arc, authoredArcDigest: digest });
    return (
      <CartridgeBayCard
        key={`${entry.arc.meta.id}:${entry.source}`}
        entry={entry}
        cartridge={c}
        program={program}
        save={save}
        digest={digest}
        onEnter={() => enterCartridge(c)}
        onRemove={() => handleRemove(entry)}
      />
    );
  };

  // The Library is shelved by PROVENANCE, the one custody axis a holder cares
  // about at a glance: what shipped with the runtime vs. what they imported and
  // can remove. Order within each shelf is the bay's own (bundled-first) order.
  const bundledEntries = entries.filter((e) => e.source === "bundled");
  const importedEntries = entries.filter((e) => e.source === "file");

  return (
    <div style={screen} role="region" aria-label={t("boot.heroTitle")}>
      <div style={{ width: "min(560px, 92vw)" }}>
        {/* The runtime mark, with the language toggle beside it — the boot surface
            must offer the same EN / zh-Hant switch the shell has, or a persisted
            choice locks the player out of the other language before they enter. */}
        <div style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <RodohRuntimeMark variant="boot" label="RODOH RUNTIME v1.0" caption={t("boot.holdTheLoop")} />
          <LocaleSwitcher />
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6f8f57" }}>
          {t("boot.runtimeEyebrow")}
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(34px, 7vw, 56px)", lineHeight: 1, margin: "6px 0 4px" }}>
          {t("boot.heroTitle")}
        </h1>
        <p style={{ color: "#a59c8b", margin: "0 0 22px", maxWidth: "48ch" }}>
          {t("boot.heroBody")}
        </p>

        {/* The Library: the cartridges you hold, named as a collection and
            shelved by provenance. The heading + count make it read as something
            possessed, not a boot menu — the acceptance bar's "understand what
            you now possess". */}
        <div data-testid="library" role="group" aria-label={t("boot.libraryHeading")} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #2a2620", paddingBottom: 6 }}>
            <h2 style={{ margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "0.02em", color: "#ece4d4" }}>
              {t("boot.libraryHeading")}
            </h2>
            <span data-testid="library-count" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a59c8b" }}>
              {t("boot.libraryCount", { count: entries.length })}
            </span>
          </div>

          <section data-testid="library-shelf-bundled" style={{ display: "grid", gap: 8 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6f8f57" }}>
              {t("boot.sectionBundled")}
            </div>
            <div style={{ display: "grid", gap: 10 }}>{bundledEntries.map(renderCard)}</div>
          </section>

          {importedEntries.length > 0 && (
            <section data-testid="library-shelf-imported" style={{ display: "grid", gap: 8 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a59c8b" }}>
                {t("boot.sectionImported")}
              </div>
              <div style={{ display: "grid", gap: 10 }}>{importedEntries.map(renderCard)}</div>
            </section>
          )}
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
          <div
            style={{ marginTop: 12, color: "#e6a5a2", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
            data-testid="import-errors"
            role="alert"
          >
            <strong>{t("boot.importFailedHeading")}</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {importErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {importedMsg && (
          <div
            style={{ marginTop: 12, color: "#74ad77", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
            data-testid="import-success"
            role="status"
          >
            {importedMsg}
          </div>
        )}
        {importPreflight && importPreflight.ok && (
          <div
            data-testid="bay-import-preflight"
            role="status"
            style={{ marginTop: 6, color: "#a59c8b", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, display: "grid", gap: 2 }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ color: "#6b6050" }}>{t("boot.identity")}</span>
              <span
                data-testid="bay-import-preflight-digest"
                title={importPreflight.digest}
                aria-label={`${t("boot.identity")}: ${importPreflight.digest}`}
                style={{ wordBreak: "break-all" }}
              >
                {`${importPreflight.digest.slice(0, 12)}…`}
              </span>
            </div>
            <div data-testid="bay-import-preflight-action">{preflightActionMessage(importPreflight.action)}</div>
            {importPreflight.sameIdBundled && (
              <div data-testid="bay-import-preflight-bundled-note">{t("boot.preflightSameIdBundled")}</div>
            )}
          </div>
        )}

        <p style={{ color: "#a59c8b", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, marginTop: 18 }}>
          {t("boot.footerNote")}
        </p>
      </div>
    </div>
  );
}
