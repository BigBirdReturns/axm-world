import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
} from "react";
import { BURN_PROTOCOL_CARTRIDGE_ID } from "../external-assets.js";
import { useExternalAssetReceiver } from "../external-assets-context.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";

const hiddenInput: CSSProperties = {
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

const directoryAttributes = {
  webkitdirectory: "",
  directory: "",
} as InputHTMLAttributes<HTMLInputElement>;

function shortDigest(value: string): string {
  return value.length > 18 ? `${value.slice(0, 14)}…${value.slice(-6)}` : value;
}

export function ExternalAssetDock(): JSX.Element | null {
  const { current, state, mountFiles, clear } = useExternalAssetReceiver();
  const [open, setOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (current.id !== BURN_PROTOCOL_CARTRIDGE_ID) return null;

  const receive = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setPreviewFailed(false);
    setOpen(true);
    void mountFiles(files);
  };

  const mounted = state.status === "mounted" ? state.session : null;
  const firstAsset = mounted?.verifiedAssets[0] ?? null;

  return (
    <aside
      data-testid="external-asset-dock"
      data-status={state.status}
      style={{
        position: "fixed",
        // The open sheet may cover runtime chrome because it owns its own close
        // control. The collapsed trigger sits below the two-row mobile header so
        // it never intercepts Board, record, or cartridge controls.
        top: open ? 70 : 132,
        right: 12,
        zIndex: 25,
        width: open ? "min(380px, calc(100vw - 24px))" : "auto",
        pointerEvents: "auto",
        font: "11px/1.45 'IBM Plex Mono', ui-monospace, monospace",
        color: "#ece4d4",
      }}
    >
      <input
        {...directoryAttributes}
        ref={folderRef}
        type="file"
        multiple
        data-testid="open-external-asset-folder"
        style={hiddenInput}
        onChange={receive}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="application/json,.json,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
        data-testid="open-external-asset-files"
        style={hiddenInput}
        onChange={receive}
      />

      {!open ? (
        <PixelButton
          type="button"
          variant="secondary"
          data-testid="external-asset-dock-button"
          onClick={() => setOpen(true)}
          style={{ minHeight: 38, display: "flex", alignItems: "center", gap: 6 }}
        >
          <PixelIcon name={mounted ? "recorded" : "available"} />
          <span>{mounted ? `${mounted.verifiedAssets.length} verified` : "External evidence"}</span>
        </PixelButton>
      ) : (
        <div
          data-testid="external-asset-panel"
          style={{
            border: "1px solid #4a4238",
            borderRadius: 8,
            background: "rgba(18,16,12,0.98)",
            boxShadow: "0 18px 50px -18px rgba(0,0,0,0.9)",
            maxHeight: "calc(100dvh - 84px)",
            overflowY: "auto",
            padding: 12,
          }}
        >
          <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <small style={{ color: "#c9a14a", letterSpacing: "0.12em", textTransform: "uppercase" }}>Holder evidence</small>
              <strong style={{ display: "block", marginTop: 2, fontSize: 13 }}>External Burn assets</strong>
            </div>
            <button
              type="button"
              aria-label="Close external evidence"
              onClick={() => setOpen(false)}
              style={{ border: "1px solid #4a4238", background: "transparent", color: "#a59c8b", cursor: "pointer", font: "14px monospace" }}
            >
              ×
            </button>
          </header>

          <div style={{ color: "#8b8172", wordBreak: "break-all", marginBottom: 10 }}>
            <span>Cartridge </span>
            <strong title={current.authoredArcDigest} data-testid="external-asset-cartridge-digest">{shortDigest(current.authoredArcDigest)}</strong>
          </div>

          {state.status === "idle" && (
            <p data-testid="external-asset-idle" style={{ color: "#a59c8b", margin: "0 0 10px" }}>
              No estate bytes are mounted. Open a holder-controlled evidence folder containing the activation chain, corpus index, and one or more indexed assets.
            </p>
          )}

          {state.status === "verifying" && (
            <div data-testid="external-asset-verifying" role="status" style={{ padding: "10px 0", color: "#c9a14a" }}>
              Verifying {state.files} local files against the custody chain and per-asset SHA-256 records.
            </div>
          )}

          {state.status === "error" && (
            <div data-testid="external-asset-errors" role="alert" style={{ border: "1px solid #7a352f", background: "rgba(122,53,47,0.18)", color: "#f0d4cf", padding: 9, marginBottom: 10 }}>
              <strong>Evidence refused</strong>
              <ul style={{ margin: "5px 0 0", paddingLeft: 18 }}>
                {state.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          {mounted && (
            <div data-testid="external-asset-mounted" data-evidence-tier={mounted.evidenceTier} style={{ display: "grid", gap: 9 }}>
              <div style={{ border: "1px solid #3d5137", background: "rgba(67,94,61,0.16)", padding: 9 }}>
                <strong style={{ color: "#74ad77", textTransform: "uppercase", letterSpacing: "0.08em" }}>{mounted.classification}</strong>
                <div style={{ marginTop: 4, color: "#d8cfbd" }}>
                  {mounted.verifiedAssets.length} of {mounted.indexedAssets} indexed assets verified for this session.
                </div>
                <div style={{ color: "#8b8172" }}>Authored panels remain absent. Runtime bundling remains none.</div>
              </div>

              {firstAsset && (
                <figure style={{ margin: 0, border: "1px solid #2a2620", background: "#0b0a08", padding: 8 }}>
                  {!previewFailed ? (
                    <img
                      data-testid="external-asset-preview"
                      src={firstAsset.objectUrl}
                      alt={`Verified external evidence ${firstAsset.path}`}
                      onError={() => setPreviewFailed(true)}
                      style={{ display: "block", width: "100%", maxHeight: 220, objectFit: "contain", background: "#050504" }}
                    />
                  ) : (
                    <div data-testid="external-asset-preview-fallback" style={{ minHeight: 120, display: "grid", placeItems: "center", color: "#a59c8b", textAlign: "center", padding: 12 }}>
                      The bytes passed custody verification but this browser could not decode the selected image.
                    </div>
                  )}
                  <figcaption style={{ marginTop: 7, color: "#a59c8b", wordBreak: "break-all" }}>
                    <strong style={{ color: "#d8cfbd" }}>{firstAsset.classification}</strong><br />
                    {firstAsset.path}<br />
                    <span title={firstAsset.sha256}>{shortDigest(firstAsset.sha256)}</span>
                  </figcaption>
                </figure>
              )}

              <details>
                <summary style={{ cursor: "pointer", color: "#c9a14a" }}>Custody details</summary>
                <dl style={{ margin: "7px 0 0", display: "grid", gap: 3 }}>
                  <div><dt style={{ color: "#6b6050" }}>Evidence tier</dt><dd style={{ margin: 0 }}>{mounted.evidenceTier}</dd></div>
                  <div><dt style={{ color: "#6b6050" }}>Missing from this session</dt><dd style={{ margin: 0 }}>{mounted.missingAssets}</dd></div>
                  <div><dt style={{ color: "#6b6050" }}>Ignored local files</dt><dd style={{ margin: 0 }}>{mounted.ignoredFiles}</dd></div>
                  <div><dt style={{ color: "#6b6050" }}>Overlay</dt><dd title={mounted.evidence.overlaySha256} style={{ margin: 0, wordBreak: "break-all" }}>{shortDigest(mounted.evidence.overlaySha256)}</dd></div>
                </dl>
              </details>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
            <PixelButton type="button" variant="secondary" onClick={() => folderRef.current?.click()} style={{ minHeight: 38, fontSize: 10 }}>
              Open folder
            </PixelButton>
            <PixelButton type="button" variant="secondary" onClick={() => fileRef.current?.click()} style={{ minHeight: 38, fontSize: 10 }}>
              Select files
            </PixelButton>
          </div>
          {(state.status === "mounted" || state.status === "error") && (
            <PixelButton
              type="button"
              variant="ghost"
              data-testid="external-asset-clear"
              onClick={() => { clear(); setPreviewFailed(false); }}
              style={{ width: "100%", minHeight: 34, marginTop: 7, fontSize: 10 }}
            >
              Clear session evidence
            </PixelButton>
          )}
          <p style={{ color: "#6b6050", margin: "9px 0 0" }}>
            Files remain on the holder’s device. Object URLs are revoked on clear, reload, cartridge switch, or exit. No evidence bytes enter the run export.
          </p>
        </div>
      )}
    </aside>
  );
}
