import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { ExternalAssetSession } from "../external-assets.js";
import {
  getExternalCorpusCatalog,
  subscribeExternalCorpusCatalog,
} from "./corpus-atlas.js";
import {
  BURN_WORLD_EVIDENCE_CROSSWALK_MAX_BYTES,
  clearBurnWorldEvidenceCrosswalk,
  getBurnWorldEvidenceCrosswalk,
  getBurnWorldEvidenceTargetCatalog,
  installBurnWorldEvidenceCrosswalk,
  prepareBurnWorldEvidenceCrosswalk,
  subscribeBurnWorldEvidenceCrosswalk,
  subscribeBurnWorldEvidenceTargetCatalog,
  type BurnWorldEvidenceTargetKind,
  type PreparedBurnWorldEvidenceLink,
} from "./world-evidence-crosswalk.js";

const panel: CSSProperties = {
  border: "1px solid #332e27",
  background: "rgba(6,6,5,0.48)",
  padding: 10,
  minWidth: 0,
};

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

const targetKinds: Array<{ kind: BurnWorldEvidenceTargetKind | "all"; label: string }> = [
  { kind: "all", label: "All targets" },
  { kind: "watch", label: "Watches" },
  { kind: "actor", label: "Actors" },
  { kind: "faction", label: "Factions" },
  { kind: "state", label: "State" },
  { kind: "pressure", label: "Pressures" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function shortDigest(digest: string): string {
  return `${digest.slice(0, 12)}…${digest.slice(-9)}`;
}

function targetKey(link: PreparedBurnWorldEvidenceLink): string {
  return `${link.target.kind}\u0000${link.target.id}`;
}

function relationLabel(value: string): string {
  return value.replaceAll("-", " ");
}

export function ExternalWorldEvidenceCrosswalk({
  session,
}: {
  session: ExternalAssetSession;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<BurnWorldEvidenceTargetKind | "all">("all");
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);

  const targetCatalog = useSyncExternalStore(
    (listener) => subscribeBurnWorldEvidenceTargetCatalog(session.authoredArcDigest, listener),
    () => getBurnWorldEvidenceTargetCatalog(session.authoredArcDigest),
    () => null,
  );
  const corpus = useSyncExternalStore(
    (listener) => subscribeExternalCorpusCatalog(session.authoredArcDigest, listener),
    () => getExternalCorpusCatalog(session.authoredArcDigest),
    () => null,
  );
  const crosswalk = useSyncExternalStore(
    (listener) => subscribeBurnWorldEvidenceCrosswalk(session.authoredArcDigest, listener),
    () => getBurnWorldEvidenceCrosswalk(session.authoredArcDigest),
    () => null,
  );

  useEffect(() => {
    if (crosswalk
        && (crosswalk.overlaySha256 !== session.overlaySha256
          || crosswalk.indexSha256 !== session.indexSha256)) {
      clearBurnWorldEvidenceCrosswalk(session.authoredArcDigest);
    }
  }, [crosswalk, session]);

  const visibleLinks = useMemo(
    () => crosswalk?.links.filter((link) => kind === "all" || link.target.kind === kind) ?? [],
    [crosswalk, kind],
  );
  const groups = useMemo(() => {
    const map = new Map<string, PreparedBurnWorldEvidenceLink[]>();
    for (const link of visibleLinks) {
      const key = targetKey(link);
      map.set(key, [...(map.get(key) ?? []), link]);
    }
    return [...map.values()];
  }, [visibleLinks]);
  const active = crosswalk?.links.find((link) => link.id === activeLinkId && link.verified && link.objectUrl) ?? null;

  const loadCrosswalk = async (file: File | null): Promise<void> => {
    if (!file) return;
    setError(null);
    setLoading(true);
    setActiveLinkId(null);
    try {
      if (file.size > BURN_WORLD_EVIDENCE_CROSSWALK_MAX_BYTES) {
        throw new Error(`World evidence crosswalk exceeds ${BURN_WORLD_EVIDENCE_CROSSWALK_MAX_BYTES} bytes.`);
      }
      if (!targetCatalog) throw new Error("The exact authored target catalog is not available in this live world.");
      if (!corpus) throw new Error("The process-local corpus catalog is not available. Reopen the external receiver.");
      const prepared = await prepareBurnWorldEvidenceCrosswalk({
        text: await file.text(),
        catalog: targetCatalog,
        corpus,
        session,
      });
      installBurnWorldEvidenceCrosswalk(prepared);
    } catch (cause) {
      clearBurnWorldEvidenceCrosswalk(session.authoredArcDigest);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  if (!targetCatalog || !corpus) {
    return (
      <div data-testid="burn-world-crosswalk-unavailable" style={{ ...panel, color: "#9a8e7d", fontSize: 11 }}>
        The live world and corpus catalog have not both supplied their process-local read models. Reopen the exact Burn cartridge and the external receiver in this page session.
      </div>
    );
  }

  return (
    <section
      data-testid="burn-world-evidence-crosswalk"
      data-status={crosswalk ? "loaded" : loading ? "loading" : error ? "refused" : "empty"}
      data-links={crosswalk?.links.length ?? 0}
      data-linked-assets={crosswalk?.linkedAssets ?? 0}
      data-linked-targets={crosswalk?.linkedTargets ?? 0}
      data-verified-links={crosswalk?.verifiedLinks ?? 0}
      aria-label="Explicit Burn evidence to world crosswalk"
      style={{ display: "grid", gap: 10, minWidth: 0 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        data-testid="burn-world-crosswalk-input"
        style={hiddenInput}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void loadCrosswalk(file);
        }}
      />

      <div style={{ ...panel, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <strong style={{ display: "block", font: "800 19px 'Barlow Condensed', sans-serif" }}>Explicit world crosswalk</strong>
            <span style={{ color: "#8b8172", fontSize: 9 }}>No link is inferred from filenames, sequence, classification, or story knowledge.</span>
          </div>
          <button
            type="button"
            data-testid="open-burn-world-crosswalk"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            style={{ border: "1px solid #4a4238", background: "#18150f", color: "#e7ddca", padding: "7px 9px", cursor: loading ? "wait" : "pointer", font: "9px 'IBM Plex Mono', monospace" }}
          >
            {loading ? "Verifying…" : crosswalk ? "Replace crosswalk" : "Open crosswalk"}
          </button>
        </div>
        <div style={{ color: "#6f6659", fontSize: 9, wordBreak: "break-all" }}>
          Target catalog {shortDigest(targetCatalog.sha256)} · {targetCatalog.targets.length} authored targets
        </div>
      </div>

      {error && (
        <div role="alert" data-testid="burn-world-crosswalk-error" style={{ ...panel, borderColor: "#7a352f", color: "#f0c4bd", whiteSpace: "pre-wrap", fontSize: 10 }}>
          <strong>Crosswalk refused</strong><br />{error}
        </div>
      )}

      {!crosswalk && !error && !loading && (
        <div data-testid="burn-world-crosswalk-empty" style={{ ...panel, color: "#9a8e7d", fontSize: 10, lineHeight: 1.55 }}>
          Load a content-bound crosswalk that names exact corpus paths and exact authored target identifiers. A crosswalk may explain a relationship, but it cannot alter either side of that relationship.
        </div>
      )}

      {crosswalk && (
        <>
          <div style={{ ...panel, display: "grid", gap: 7 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: 7, fontSize: 10 }}>
              <span><strong>{crosswalk.links.length}</strong> explicit links</span>
              <span><strong>{crosswalk.linkedAssets}</strong> linked assets</span>
              <span><strong>{crosswalk.linkedTargets}</strong> world targets</span>
              <span><strong>{crosswalk.verifiedLinks}</strong> byte-verified links</span>
            </div>
            <div style={{ color: "#746a5c", fontSize: 9, wordBreak: "break-all" }}>
              {crosswalk.source.kind} · {crosswalk.source.label} · crosswalk {shortDigest(crosswalk.crosswalkSha256)}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }} role="tablist" aria-label="Crosswalk target kinds">
            {targetKinds.map((item) => (
              <button
                key={item.kind}
                type="button"
                role="tab"
                aria-selected={kind === item.kind}
                data-testid={`burn-world-crosswalk-kind-${item.kind}`}
                onClick={() => {
                  setKind(item.kind);
                  setActiveLinkId(null);
                }}
                style={{ border: `1px solid ${kind === item.kind ? "#c9a14a" : "#4a4238"}`, background: kind === item.kind ? "#342d1c" : "#15130f", color: "#e7ddca", padding: "6px 8px", cursor: "pointer", font: "9px 'IBM Plex Mono', monospace" }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {groups.map((links) => {
              const target = links[0]!.targetRecord;
              return (
                <section
                  key={`${target.kind}:${target.id}`}
                  style={panel}
                  data-testid="burn-world-crosswalk-target"
                  data-target-kind={target.kind}
                  data-target-id={target.id}
                  data-links={links.length}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: "#c9a14a", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>{target.kind}</span>
                      <strong style={{ display: "block", font: "700 15px 'Barlow Condensed', sans-serif" }}>{target.label}</strong>
                      <span style={{ display: "block", color: "#817665", fontSize: 8, wordBreak: "break-all" }}>{target.id}</span>
                    </div>
                    <span style={{ color: "#817665", fontSize: 9 }}>{links.filter((link) => link.verified).length}/{links.length} verified</span>
                  </div>
                  {target.description && <p style={{ margin: "0 0 8px", color: "#9a8e7d", fontSize: 9, lineHeight: 1.45 }}>{target.description}</p>}
                  <div style={{ display: "grid", gap: 5 }}>
                    {links.map((link) => (
                      <button
                        key={link.id}
                        type="button"
                        data-testid="burn-world-crosswalk-link"
                        data-link-id={link.id}
                        data-asset-path={link.assetPath}
                        data-verified={link.verified ? "true" : "false"}
                        disabled={!link.verified || !link.objectUrl}
                        onClick={() => setActiveLinkId(link.id)}
                        title={link.assetPath}
                        style={{
                          display: "grid",
                          gap: 3,
                          textAlign: "left",
                          border: `1px solid ${activeLinkId === link.id ? "#c9a14a" : "#29251f"}`,
                          background: link.verified ? "#1d211a" : "#11100d",
                          color: link.verified ? "#d9e4d4" : "#827767",
                          padding: "7px 8px",
                          cursor: link.verified && link.objectUrl ? "pointer" : "default",
                          font: "9px/1.4 'IBM Plex Mono', monospace",
                        }}
                      >
                        <span style={{ color: link.verified ? "#cfe0ca" : "#9a8e7d" }}>
                          {relationLabel(link.relation)} · {link.verified ? "verified byte" : "manifest only"} · {formatBytes(link.asset.bytes)}
                        </span>
                        <span style={{ color: "#bdb2a0", fontFamily: "'Lora', Georgia, serif", fontSize: 11 }}>{link.statement}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.assetPath}</span>
                        {link.sourceLocator && <span style={{ color: "#6f6659" }}>{link.sourceLocator}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {active && active.objectUrl && (
            <figure style={{ ...panel, margin: 0, display: "grid", gap: 8 }} data-testid="burn-world-crosswalk-preview">
              <div style={{ minHeight: 180, maxHeight: "42dvh", display: "grid", placeItems: "center", overflow: "hidden", background: "#030303" }}>
                <img
                  data-testid="burn-world-crosswalk-preview-image"
                  src={active.objectUrl}
                  alt={`Verified crosswalk evidence ${active.assetPath}`}
                  referrerPolicy="no-referrer"
                  style={{ maxWidth: "100%", maxHeight: "42dvh", objectFit: "contain" }}
                />
              </div>
              <figcaption style={{ color: "#9f9483", fontSize: 9, wordBreak: "break-all" }}>
                {active.targetRecord.label} · {relationLabel(active.relation)} · {active.assetPath}<br />
                Manifest SHA-256 {shortDigest(active.asset.sha256)}
              </figcaption>
            </figure>
          )}

          <button
            type="button"
            data-testid="clear-burn-world-crosswalk"
            onClick={() => {
              clearBurnWorldEvidenceCrosswalk(session.authoredArcDigest);
              setError(null);
              setActiveLinkId(null);
            }}
            style={{ border: "1px solid #633934", background: "#251310", color: "#efc8c0", padding: 8, cursor: "pointer", font: "9px 'IBM Plex Mono', monospace" }}
          >
            Release crosswalk from this process
          </button>
        </>
      )}
    </section>
  );
}
