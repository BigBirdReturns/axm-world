import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import {
  BURN_PROTOCOL_AUTHORED_DIGEST,
  BURN_PROTOCOL_CARTRIDGE_ID,
  BURN_PROTOCOL_PUBLICATION_HEAD,
  clearExternalAssetSession,
  getExternalAssetSession,
  installExternalAssetSession,
  jsonFormat,
  prepareExternalAssetCustody,
  subscribeExternalAssetSession,
  verifyExternalAssetFiles,
  type ExternalAssetSession,
  type ExternalAssetVerificationProgress,
  type PreparedExternalAssetCustody,
} from "../external-assets.js";

const page: CSSProperties = {
  minHeight: "100dvh",
  boxSizing: "border-box",
  background: "radial-gradient(110% 100% at 48% -10%, #252116 0%, #0b0a08 62%)",
  color: "#ece4d4",
  padding: "clamp(16px, 4vw, 42px)",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

const card: CSSProperties = {
  border: "1px solid #4a4238",
  borderRadius: 10,
  background: "rgba(23,21,15,0.94)",
  padding: "clamp(14px, 3vw, 22px)",
  boxShadow: "0 24px 70px -32px rgba(0,0,0,0.9)",
};

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

const FORMAT_OVERLAY = "burn-protocol-handoff-publication-overlay/1";
const FORMAT_RECEIPT = "burn-protocol-handoff-publication-activation-receipt/1";
const FORMAT_INDEX = "burn-protocol-corpus-asset-index/1";

function errorLines(error: unknown): string[] {
  return (error instanceof Error ? error.message : String(error))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function shortDigest(digest: string): string {
  return `${digest.slice(0, 16)}…${digest.slice(-10)}`;
}

function standingCopy(custody: PreparedExternalAssetCustody): string {
  return custody.standing === "production-exact"
    ? "Exact production custody. Every renderable byte must still pass its own manifest hash."
    : "Mechanism fixture. This can exercise the receiver but cannot acquire production standing.";
}

export function BurnExternalAssetReceiverRoute(): JSX.Element {
  const custodyInput = useRef<HTMLInputElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);
  const directoryInput = useRef<HTMLInputElement>(null);
  const [custody, setCustody] = useState<PreparedExternalAssetCustody | null>(null);
  const [session, setSession] = useState<ExternalAssetSession | null>(() =>
    getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST));
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExternalAssetVerificationProgress | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    directoryInput.current?.setAttribute("webkitdirectory", "");
    directoryInput.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => subscribeExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST, () => {
    setSession(getExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST));
  }), []);

  const previewable = useMemo(
    () => session?.assets.filter((asset) => asset.objectUrl !== null) ?? [],
    [session],
  );
  const activePreview = previewable.length > 0
    ? previewable[Math.min(cursor, previewable.length - 1)] ?? null
    : null;

  const loadCustody = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    try {
      const records = new Map<string, string>();
      for (const file of files) {
        const text = await file.text();
        const format = jsonFormat(text);
        if (!format) throw new Error(`${file.name} is not a recognized bounded JSON custody record.`);
        if (records.has(format)) throw new Error(`More than one selected file declares ${format}.`);
        records.set(format, text);
      }
      const overlayText = records.get(FORMAT_OVERLAY);
      const receiptText = records.get(FORMAT_RECEIPT);
      const indexText = records.get(FORMAT_INDEX);
      const missing = [
        [FORMAT_OVERLAY, overlayText],
        [FORMAT_RECEIPT, receiptText],
        [FORMAT_INDEX, indexText],
      ].filter(([, value]) => value === undefined).map(([format]) => format);
      if (missing.length > 0) throw new Error(`Custody selection is missing: ${missing.join(", ")}.`);

      const next = await prepareExternalAssetCustody({
        overlayText: overlayText!,
        receiptText: receiptText!,
        indexText: indexText!,
        cartridgeId: BURN_PROTOCOL_CARTRIDGE_ID,
        authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
      });
      clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
      setCustody(next);
      setErrors([]);
      setProgress(null);
      setCursor(0);
      setStatus(standingCopy(next));
    } catch (error) {
      setCustody(null);
      clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
      setErrors(errorLines(error));
      setStatus(null);
      setProgress(null);
    }
  };

  const loadAssets = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!custody || files.length === 0) return;
    setVerifying(true);
    setErrors([]);
    setStatus(null);
    setProgress({ processed: 0, total: files.length, currentPath: "Preparing selected files" });
    try {
      const result = await verifyExternalAssetFiles(custody, files, setProgress);
      const next = installExternalAssetSession(custody, result);
      setSession(next);
      setCursor(0);
      setStatus(result.complete
        ? `Verified all ${result.verified.length} indexed assets. Bytes remain session-only.`
        : `Verified ${result.verified.length} of ${custody.index.assets.length} indexed assets. ${result.missing.length} remain unselected.`);
      if (result.unmatchedFiles.length > 0) {
        setErrors([`${result.unmatchedFiles.length} selected files were outside the verified index and were ignored.`]);
      }
    } catch (error) {
      clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
      setErrors(errorLines(error));
      setStatus(null);
    } finally {
      setVerifying(false);
      setProgress(null);
    }
  };

  const clearSession = () => {
    clearExternalAssetSession(BURN_PROTOCOL_AUTHORED_DIGEST);
    setStatus("Session asset URLs released. No payload bytes were persisted.");
    setErrors([]);
    setCursor(0);
  };

  const returnToBay = () => {
    const url = new URL(document.baseURI);
    url.searchParams.delete("surface");
    window.location.assign(url);
  };

  return (
    <main style={page} data-testid="burn-external-asset-receiver">
      <div style={{ width: "min(1100px, 100%)", margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div style={{ maxWidth: 760 }}>
            <RodohRuntimeMark variant="boot" label="RODOH EXTERNAL CORPUS RECEIVER" caption="Holder-controlled, hash-bound, session-only" />
            <h1 style={{ font: "800 clamp(34px, 6vw, 62px)/0.95 'Barlow Condensed', sans-serif", margin: "18px 0 10px" }}>
              The Burn Protocol corpus browser
            </h1>
            <p style={{ margin: 0, color: "#bdb2a0", font: "15px/1.65 'Lora', Georgia, serif", maxWidth: "68ch" }}>
              World receives custody records first, then verifies holder-selected files against the manifest-derived index. It creates only temporary object URLs for exact raster bytes. Reloading or releasing the session removes them.
            </p>
          </div>
          <PixelButton type="button" variant="ghost" onClick={returnToBay} data-testid="external-assets-return-bay">
            Return to cartridge bay
          </PixelButton>
        </header>

        <section style={card} aria-label="Authored publication binding">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            <div><div style={{ color: "#8b7d6a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cartridge</div><strong>{BURN_PROTOCOL_CARTRIDGE_ID}</strong></div>
            <div><div style={{ color: "#8b7d6a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Authored identity</div><strong title={BURN_PROTOCOL_AUTHORED_DIGEST}>{shortDigest(BURN_PROTOCOL_AUTHORED_DIGEST)}</strong></div>
            <div><div style={{ color: "#8b7d6a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Arc authority</div><strong title={BURN_PROTOCOL_PUBLICATION_HEAD}>{shortDigest(BURN_PROTOCOL_PUBLICATION_HEAD)}</strong></div>
          </div>
        </section>

        <section style={card} aria-label="External custody intake">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, font: "800 21px 'Barlow Condensed', sans-serif" }}>1. Open the three custody records</h2>
              <p style={{ margin: "5px 0 0", color: "#a59c8b", fontSize: 12 }}>Overlay, activation receipt, and exact corpus asset index. Selection order does not matter.</p>
            </div>
            <PixelButton type="button" variant="secondary" onClick={() => custodyInput.current?.click()} data-testid="open-external-custody">
              <PixelIcon name="recorded" /> Open custody records
            </PixelButton>
            <label htmlFor="external-custody-input" style={visuallyHidden}>Open external custody records</label>
            <input
              ref={custodyInput}
              id="external-custody-input"
              data-testid="external-custody-input"
              type="file"
              multiple
              accept="application/json,.json"
              style={visuallyHidden}
              onChange={loadCustody}
            />
          </div>

          {custody && (
            <div
              data-testid="external-custody-preflight"
              data-standing={custody.standing}
              data-assets={custody.index.assets.length}
              data-bytes={custody.totalBytes}
              style={{ marginTop: 14, padding: 12, border: `1px solid ${custody.standing === "production-exact" ? "#74ad77" : "#c9a14a"}`, background: "rgba(9,9,7,0.45)", display: "grid", gap: 8 }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                <strong style={{ color: custody.standing === "production-exact" ? "#74ad77" : "#c9a14a" }}>
                  {custody.standing === "production-exact" ? "Production-exact custody" : "Mechanism-fixture custody"}
                </strong>
                <span>{custody.index.assets.length} assets · {formatBytes(custody.totalBytes)}</span>
              </div>
              <div style={{ color: "#bdb2a0", fontSize: 12 }}>{standingCopy(custody)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 6, color: "#8b8172", fontSize: 10 }}>
                <span title={custody.overlaySha256}>Overlay {shortDigest(custody.overlaySha256)}</span>
                <span title={custody.indexSha256}>Index {shortDigest(custody.indexSha256)}</span>
                <span>{Object.entries(custody.index.counts).map(([key, value]) => `${key} ${value}`).join(" · ")}</span>
              </div>
            </div>
          )}
        </section>

        <section style={{ ...card, opacity: custody ? 1 : 0.58 }} aria-label="Holder asset selection">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, font: "800 21px 'Barlow Condensed', sans-serif" }}>2. Select holder-owned asset bytes</h2>
              <p style={{ margin: "5px 0 0", color: "#a59c8b", fontSize: 12 }}>A partial selection is allowed. Every matched file is size-checked and SHA-256 verified before it receives an object URL.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PixelButton type="button" variant="secondary" disabled={!custody || verifying} onClick={() => assetInput.current?.click()} data-testid="open-external-assets">
                <PixelIcon name="available" /> Select files
              </PixelButton>
              <PixelButton type="button" variant="secondary" disabled={!custody || verifying} onClick={() => directoryInput.current?.click()} data-testid="open-external-asset-directory">
                <PixelIcon name="selected" /> Select folder
              </PixelButton>
            </div>
            <label htmlFor="external-assets-input" style={visuallyHidden}>Select external asset files</label>
            <input
              ref={assetInput}
              id="external-assets-input"
              data-testid="external-assets-input"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              style={visuallyHidden}
              onChange={loadAssets}
            />
            <label htmlFor="external-assets-directory-input" style={visuallyHidden}>Select external asset directory</label>
            <input
              ref={directoryInput}
              id="external-assets-directory-input"
              data-testid="external-assets-directory-input"
              type="file"
              multiple
              style={visuallyHidden}
              onChange={loadAssets}
            />
          </div>
          {progress && (
            <div data-testid="external-assets-verification-progress" data-processed={progress.processed} data-total={progress.total} style={{ marginTop: 12, color: "#c9a14a", fontSize: 11 }}>
              Verifying {progress.processed} / {progress.total}: {progress.currentPath}
            </div>
          )}
        </section>

        {session && (
          <section
            style={card}
            data-testid="external-asset-session"
            data-standing={session.standing}
            data-verified={session.assets.length}
            data-total={session.totalAssets}
            data-complete={session.complete ? "true" : "false"}
            aria-label="Verified external asset session"
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, font: "800 23px 'Barlow Condensed', sans-serif" }}>Verified session</h2>
                <div style={{ color: "#a59c8b", fontSize: 11, marginTop: 4 }}>
                  {session.assets.length} / {session.totalAssets} assets · {formatBytes(session.verifiedBytes)} · {session.complete ? "complete index" : "partial selection"}
                </div>
              </div>
              <PixelButton type="button" variant="danger" data-testid="release-external-assets" onClick={clearSession}>
                Release session bytes
              </PixelButton>
            </div>

            {activePreview ? (
              <figure data-testid="external-asset-preview" style={{ margin: "16px 0 0", display: "grid", gap: 10 }}>
                <div style={{ minHeight: 260, maxHeight: "64dvh", display: "grid", placeItems: "center", overflow: "hidden", border: "1px solid #2f2a22", background: "#050504" }}>
                  <img
                    data-testid="external-asset-image"
                    src={activePreview.objectUrl!}
                    alt={`Verified external asset ${activePreview.path}`}
                    referrerPolicy="no-referrer"
                    style={{ display: "block", maxWidth: "100%", maxHeight: "64dvh", objectFit: "contain" }}
                  />
                </div>
                <figcaption style={{ display: "grid", gap: 4, color: "#bdb2a0", fontSize: 11 }}>
                  <strong style={{ color: "#ece4d4", wordBreak: "break-all" }}>{activePreview.path}</strong>
                  <span>{activePreview.classification} · {formatBytes(activePreview.bytes)} · <span title={activePreview.sha256}>{shortDigest(activePreview.sha256)}</span></span>
                  {previewable.length > 1 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 5 }}>
                      <PixelButton type="button" variant="ghost" onClick={() => setCursor((value) => (value - 1 + previewable.length) % previewable.length)} data-testid="external-asset-previous">Previous</PixelButton>
                      <span>{cursor + 1} / {previewable.length}</span>
                      <PixelButton type="button" variant="ghost" onClick={() => setCursor((value) => (value + 1) % previewable.length)} data-testid="external-asset-next">Next</PixelButton>
                    </div>
                  )}
                </figcaption>
              </figure>
            ) : (
              <div data-testid="external-assets-no-preview" style={{ marginTop: 14, color: "#a59c8b", fontSize: 12 }}>
                The verified selection contains no PNG, JPEG, or WebP raster that this bounded receiver will render.
              </div>
            )}
          </section>
        )}

        {status && <div role="status" data-testid="external-assets-status" style={{ ...card, color: "#9fe0d6", fontSize: 12 }}>{status}</div>}
        {errors.length > 0 && (
          <div role="alert" data-testid="external-assets-errors" style={{ ...card, borderColor: "#7a352f", color: "#f0d4cf", fontSize: 12 }}>
            <strong>Receiver notice</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <footer style={{ color: "#6b6050", fontSize: 10, lineHeight: 1.6, padding: "4px 2px 20px" }}>
          No asset bytes enter localStorage, the cartridge, a portable run, the service worker cache, or the repository. Object URLs exist only in this page session and are revoked on release or reload.
        </footer>
      </div>
    </main>
  );
}
