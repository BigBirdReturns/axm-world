import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  clearExternalAssetSession,
  getExternalAssetSession,
  subscribeExternalAssetSession,
  type ExternalAssetSession,
  type ExternalAssetSessionEntry,
} from "../external-assets.js";
import { ExternalCorpusAtlas } from "./ExternalCorpusAtlas.js";
import { ExternalWorldEvidenceCrosswalk } from "./ExternalWorldEvidenceCrosswalk.js";
import { clearBurnWorldEvidenceCrosswalk } from "./world-evidence-crosswalk.js";

const veil: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1_700,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 520px)",
  background: "rgba(4,4,3,0.58)",
  pointerEvents: "auto",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function shortDigest(digest: string): string {
  return `${digest.slice(0, 14)}…${digest.slice(-10)}`;
}

function useBurnEvidenceSession(): ExternalAssetSession | null {
  return useSyncExternalStore(
    (listener) => subscribeExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST, listener),
    () => getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST),
    () => null,
  );
}

function EvidenceFigure({ asset }: { asset: ExternalAssetSessionEntry }): JSX.Element {
  return (
    <figure data-testid="live-external-evidence-figure" style={{ margin: 0, display: "grid", gap: 9 }}>
      <div style={{ minHeight: 240, maxHeight: "58dvh", display: "grid", placeItems: "center", overflow: "hidden", border: "1px solid #3b352c", background: "#050504" }}>
        {asset.objectUrl ? (
          <img
            data-testid="live-external-evidence-image"
            src={asset.objectUrl}
            alt={`Verified external evidence ${asset.path}`}
            referrerPolicy="no-referrer"
            style={{ display: "block", maxWidth: "100%", maxHeight: "58dvh", objectFit: "contain" }}
          />
        ) : (
          <div style={{ padding: 18, color: "#8b8172", font: "11px/1.5 'IBM Plex Mono', ui-monospace, monospace" }}>
            This verified record has no raster projection in the current browser.
          </div>
        )}
      </div>
      <figcaption style={{ display: "grid", gap: 3, color: "#bdb2a0", font: "10px/1.45 'IBM Plex Mono', ui-monospace, monospace" }}>
        <strong style={{ color: "#ece4d4", wordBreak: "break-all" }}>{asset.path}</strong>
        <span>{asset.classification} · {formatBytes(asset.bytes)}</span>
        <span title={asset.sha256}>Manifest SHA-256 {shortDigest(asset.sha256)}</span>
      </figcaption>
    </figure>
  );
}

/** Read-only projection of a verified process-local evidence session. It receives
 * no ArcWorld, interaction, outcome, save, or export callback. Closing, paging,
 * changing atlas view, or loading an explicit crosswalk can therefore change
 * only process-local presentation state. */
export function ExternalEvidenceProjection(): JSX.Element | null {
  const session = useBurnEvidenceSession();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<"evidence" | "atlas" | "crosswalk">("evidence");
  const renderable = useMemo(
    () => session?.assets.filter((asset) => asset.objectUrl !== null) ?? [],
    [session],
  );
  const active = renderable.length > 0
    ? renderable[Math.min(cursor, renderable.length - 1)] ?? null
    : session?.assets[0] ?? null;

  useEffect(() => {
    if (!session) {
      clearBurnWorldEvidenceCrosswalk(BURN_PROTOCOL_AUTHORED_DIGEST);
      setOpen(false);
      setCursor(0);
      setMode("evidence");
    } else if (cursor >= Math.max(1, renderable.length)) {
      setCursor(0);
    }
  }, [session, renderable.length, cursor]);

  if (!session) return null;

  const releaseSession = (): void => {
    clearBurnWorldEvidenceCrosswalk(BURN_PROTOCOL_AUTHORED_DIGEST);
    clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
  };

  return (
    <>
      <PixelButton
        type="button"
        variant="secondary"
        data-testid="live-external-evidence-button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 14,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          zIndex: 1_500,
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          gap: 7,
          boxShadow: "0 12px 36px rgba(0,0,0,0.55)",
        }}
      >
        <PixelIcon name="recorded" /> Verified evidence {session.assets.length}
      </PixelButton>

      {open && (
        <div
          style={veil}
          data-testid="live-external-evidence-drawer"
          data-standing={session.standing}
          data-assets={session.assets.length}
          data-mode={mode}
          role="dialog"
          aria-modal="true"
          aria-label="Verified external evidence"
          onClick={() => setOpen(false)}
        >
          <div aria-hidden="true" />
          <aside
            onClick={(event) => event.stopPropagation()}
            style={{
              minWidth: 0,
              overflowY: "auto",
              borderLeft: "1px solid #4a4238",
              background: "rgba(17,15,10,0.985)",
              color: "#ece4d4",
              padding: "clamp(14px, 3vw, 22px)",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ color: session.standing === "production-exact" ? "#74ad77" : "#c9a14a", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {session.standing === "production-exact" ? "Production-exact external evidence" : "Mechanism-fixture external evidence"}
                </div>
                <h2 style={{ margin: "4px 0 3px", font: "800 25px/1 'Barlow Condensed', sans-serif" }}>Read-only evidence drawer</h2>
                <div style={{ color: "#8b8172", fontSize: 10 }}>
                  {session.assets.length} verified · {formatBytes(session.verifiedBytes)} · session-only
                </div>
              </div>
              <button
                type="button"
                aria-label="Close verified external evidence"
                data-testid="close-live-external-evidence"
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "1px solid #4a4238", color: "#d8cfbd", cursor: "pointer", font: "18px monospace", width: 34, height: 34 }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: "12px 0", color: "#bdb2a0", font: "13px/1.55 'Lora', Georgia, serif" }}>
              Verified images may inform the holder's judgment. They cannot satisfy a contract, alter a report, enter a portable run, or change the canonical Burn record.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 12 }} role="tablist" aria-label="External evidence views">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "evidence"}
                data-testid="live-evidence-mode-evidence"
                onClick={() => setMode("evidence")}
                style={{ border: `1px solid ${mode === "evidence" ? "#c9a14a" : "#4a4238"}`, background: mode === "evidence" ? "#342d1c" : "#15130f", color: "#e7ddca", padding: 8, cursor: "pointer", font: "9px 'IBM Plex Mono', monospace" }}
              >
                Selected evidence
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "atlas"}
                data-testid="live-evidence-mode-atlas"
                onClick={() => setMode("atlas")}
                style={{ border: `1px solid ${mode === "atlas" ? "#c9a14a" : "#4a4238"}`, background: mode === "atlas" ? "#342d1c" : "#15130f", color: "#e7ddca", padding: 8, cursor: "pointer", font: "9px 'IBM Plex Mono', monospace" }}
              >
                Corpus atlas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "crosswalk"}
                data-testid="live-evidence-mode-crosswalk"
                onClick={() => setMode("crosswalk")}
                style={{ border: `1px solid ${mode === "crosswalk" ? "#c9a14a" : "#4a4238"}`, background: mode === "crosswalk" ? "#342d1c" : "#15130f", color: "#e7ddca", padding: 8, cursor: "pointer", font: "9px 'IBM Plex Mono', monospace" }}
              >
                World crosswalk
              </button>
            </div>

            {mode === "evidence" ? (
              <>
                {active && <EvidenceFigure asset={active} />}
                {renderable.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}>
                    <PixelButton type="button" variant="ghost" data-testid="live-evidence-previous" onClick={() => setCursor((value) => (value - 1 + renderable.length) % renderable.length)}>Previous</PixelButton>
                    <span style={{ color: "#8b8172", fontSize: 10 }}>{cursor + 1} / {renderable.length}</span>
                    <PixelButton type="button" variant="ghost" data-testid="live-evidence-next" onClick={() => setCursor((value) => (value + 1) % renderable.length)}>Next</PixelButton>
                  </div>
                )}
              </>
            ) : mode === "atlas" ? (
              <ExternalCorpusAtlas session={session} />
            ) : (
              <ExternalWorldEvidenceCrosswalk session={session} />
            )}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #2a2620", display: "grid", gap: 5, color: "#6f6659", fontSize: 9, wordBreak: "break-all" }}>
              <span title={session.overlaySha256}>Overlay {shortDigest(session.overlaySha256)}</span>
              <span title={session.indexSha256}>Index {shortDigest(session.indexSha256)}</span>
              <span>Authored Arc {shortDigest(session.authoredArcDigest)}</span>
            </div>

            <PixelButton
              type="button"
              variant="danger"
              data-testid="release-live-external-evidence"
              onClick={releaseSession}
              style={{ width: "100%", marginTop: 15, minHeight: 42 }}
            >
              Release verified session bytes
            </PixelButton>
          </aside>
        </div>
      )}
    </>
  );
}
