import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  advanceCanonicalStory,
  canonicalStoryCoverage,
  canonicalStoryCursorForPanel,
  canonicalStoryPanel,
  retreatCanonicalStory,
  type CanonicalStoryCursor,
  type CanonicalStorySource,
} from "../../canonical-story/index.js";
import type { Cartridge } from "../cartridge.js";
import { cartridgeIdentity } from "../cartridge-identity.js";
import { RodohRuntimeMark } from "../brand/RodohRuntimeMark.js";
import { PixelButton, PixelIcon } from "../pixel-ui/index.js";
import { verifyCanonicalStoryAssetFiles } from "./assets.js";
import {
  CANONICAL_STORY_SESSION_FORMAT,
  loadCanonicalStorySession,
  saveCanonicalStorySession,
} from "./session.js";

interface Props {
  cartridge: Cartridge;
  story: CanonicalStorySource;
  onExit: () => void;
}

const page: CSSProperties = {
  minHeight: "100dvh",
  boxSizing: "border-box",
  background: "radial-gradient(120% 110% at 50% -10%, #232017 0%, #090908 64%)",
  color: "#ece4d4",
  padding: "clamp(14px, 3vw, 34px)",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

const card: CSSProperties = {
  border: "1px solid #3b352d",
  background: "rgba(20,18,13,0.94)",
  borderRadius: 8,
  padding: "clamp(12px, 2.5vw, 18px)",
};

const hidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function shortDigest(value: string): string {
  return `${value.slice(0, 12)}…${value.slice(-9)}`;
}

export function SequenceHost({ cartridge, story, onExit }: Props): JSX.Element {
  const digest = useMemo(() => cartridgeIdentity(cartridge), [cartridge]);
  const directoryInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const [cursor, setCursor] = useState<CanonicalStoryCursor>(() =>
    loadCanonicalStorySession(localStorage, story, digest).cursor);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [assetStatus, setAssetStatus] = useState<string | null>(null);
  const [assetErrors, setAssetErrors] = useState<string[]>([]);
  const [continuationPanelId, setContinuationPanelId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    directoryInput.current?.setAttribute("webkitdirectory", "");
    directoryInput.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    saveCanonicalStorySession(localStorage, {
      format: CANONICAL_STORY_SESSION_FORMAT,
      authoredArcDigest: digest,
      cursor,
    });
  }, [cursor, digest]);

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
  }, []);

  const coverage = useMemo(() => canonicalStoryCoverage(story), [story]);
  const located = useMemo(
    () => canonicalStoryPanel(story, cursor.panelId),
    [story, cursor.panelId],
  );
  const episode = story.episodes.find((candidate) => candidate.id === located.episodeId)!;
  const chapterPanels = located.chapter.panels;
  const allPanels = useMemo(
    () => story.episodes.flatMap((entry) =>
      entry.chapters.flatMap((chapter) => chapter.panels)),
    [story],
  );
  const panelIndex = chapterPanels.findIndex((panel) => panel.id === located.panel.id);
  const globalPanelIndex = allPanels.findIndex((panel) => panel.id === located.panel.id);
  const currentAssetUrl = assetUrls[located.panel.asset.path] ?? null;
  const verifiedCount = Object.keys(assetUrls).length;
  const plateReceiptIds = [...new Set(located.chapter.plates.flatMap((plate) =>
    plate.panelMapping.status === "resolved"
      ? plate.panelMapping.sourceReceiptIds
      : plate.panelMapping.expectedSourceReceiptIds))];

  const replaceObjectUrls = (next: Record<string, string>) => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current = Object.values(next);
    setAssetUrls(next);
  };

  const openAssets = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setVerifying(true);
    setAssetErrors([]);
    setAssetStatus(null);
    try {
      const result = await verifyCanonicalStoryAssetFiles(story, files);
      const next: Record<string, string> = {};
      for (const entry of result.verified) {
        if (typeof Blob !== "undefined" && entry.file instanceof Blob) {
          next[entry.asset.path] = URL.createObjectURL(entry.file);
        }
      }
      replaceObjectUrls(next);
      setAssetStatus(
        `Verified ${result.verified.length} canonical assets (${formatBytes(result.verifiedBytes)}). `
        + "Their object URLs exist only in this page session.",
      );
      if (result.unmatchedPaths.length > 0) {
        setAssetErrors([
          `${result.unmatchedPaths.length} selected files were outside the canonical story asset ledger and were ignored.`,
        ]);
      }
    } catch (error) {
      replaceObjectUrls({});
      setAssetErrors((error instanceof Error ? error.message : String(error)).split("\n"));
    } finally {
      setVerifying(false);
    }
  };

  const moveNext = () => {
    const result = advanceCanonicalStory(story, cursor);
    if (result.kind === "panel") {
      setCursor(result.cursor);
      setContinuationPanelId(null);
    } else {
      setContinuationPanelId(result.continuationPanelId);
    }
  };

  const movePrevious = () => {
    const result = retreatCanonicalStory(story, cursor);
    if (result.kind === "panel") {
      setCursor(result.cursor);
      setContinuationPanelId(null);
    }
  };

  const selectPanel = (panelId: string) => {
    setCursor(canonicalStoryCursorForPanel(story, panelId));
    setContinuationPanelId(null);
  };

  return (
    <main
      style={page}
      data-testid="canonical-story-host"
      data-episode-id={located.episodeId}
      data-panel-id={located.panel.id}
      data-chapter-id={located.chapter.id}
    >
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 760 }}>
            <RodohRuntimeMark variant="boot" label="RODOH CANONICAL STORY" caption="Arc-fixed path · no simulation · no choices" />
            <h1 style={{ margin: "16px 0 5px", font: "800 clamp(30px, 6vw, 58px)/0.96 'Barlow Condensed', sans-serif" }}>
              {story.identity.title}
            </h1>
            <p style={{ margin: 0, color: "#b4aa99", font: "15px/1.55 'Lora', Georgia, serif" }}>
              Episode {episode.number}: {episode.title} · Chapter {located.chapter.number}: {located.chapter.title}
            </p>
          </div>
          <PixelButton type="button" variant="ghost" onClick={onExit} data-testid="canonical-story-exit">
            Exit to cartridge bay
          </PixelButton>
        </header>

        <section style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }} aria-label="Canonical story coverage">
          <span><b>{coverage.chapters}</b> chapters</span>
          <span><b>{coverage.panels}</b> panel slots</span>
          <span><b>{coverage.plates}</b> plate assets</span>
          <span><b>{coverage.resolvedTextPanels}</b> text-complete</span>
          <span><b>{verifiedCount}</b> local assets verified</span>
          <span><b>{coverage.choiceNodes}</b> choice nodes</span>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 280px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          <aside
            key={located.chapter.id}
            style={{ ...card, display: "grid", gap: 7, maxHeight: "72dvh", overflowY: "auto" }}
            aria-label="Canonical episode, chapter, and panel index"
          >
            <strong style={{ font: "800 18px 'Barlow Condensed', sans-serif" }}>Episodes</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))", gap: 5 }}>
              {story.episodes.map((storyEpisode) => (
                <button
                  key={storyEpisode.id}
                  type="button"
                  data-testid={`canonical-episode-index-${storyEpisode.id}`}
                  data-selected={storyEpisode.id === episode.id ? "true" : "false"}
                  onClick={() => selectPanel(storyEpisode.chapters[0]!.openingPanelId)}
                  style={{
                    border: `1px solid ${storyEpisode.id === episode.id ? "#c9a14a" : "#40382e"}`,
                    background: storyEpisode.id === episode.id ? "#332c1b" : "#15130f",
                    color: "#ddd3c1",
                    padding: "7px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "10px 'IBM Plex Mono', monospace",
                  }}
                >
                  Episode {storyEpisode.number}
                </button>
              ))}
            </div>
            <strong style={{ font: "800 18px 'Barlow Condensed', sans-serif", marginTop: 4 }}>
              Episode {episode.number} chapters
            </strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(94px, 1fr))", gap: 5 }}>
              {episode.chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  data-testid={`canonical-chapter-index-${chapter.id}`}
                  data-selected={chapter.id === located.chapter.id ? "true" : "false"}
                  onClick={() => selectPanel(chapter.openingPanelId)}
                  style={{
                    border: `1px solid ${chapter.id === located.chapter.id ? "#c9a14a" : "#40382e"}`,
                    background: chapter.id === located.chapter.id ? "#332c1b" : "#15130f",
                    color: "#ddd3c1",
                    padding: "7px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "10px 'IBM Plex Mono', monospace",
                  }}
                >
                  Chapter {chapter.number}
                </button>
              ))}
            </div>
            <strong style={{ font: "800 18px 'Barlow Condensed', sans-serif", marginTop: 4 }}>
              Chapter {located.chapter.number} · {located.chapter.title}
            </strong>
            {chapterPanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                data-testid={`canonical-panel-index-${panel.id}`}
                data-selected={panel.id === located.panel.id ? "true" : "false"
                }
                onClick={() => selectPanel(panel.id)}
                style={{
                  border: `1px solid ${panel.id === located.panel.id ? "#c9a14a" : "#302b24"}`,
                  background: panel.id === located.panel.id ? "#332c1b" : "#11100d",
                  color: "#ddd3c1",
                  padding: "7px 8px",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "10px 'IBM Plex Mono', monospace",
                }}
              >
                {String(panel.ordinal).padStart(2, "0")} · {panel.id}
              </button>
            ))}
            <div data-testid="canonical-plate-boundary" style={{ borderTop: "1px solid #302b24", paddingTop: 9, marginTop: 4, color: "#8e8373", fontSize: 9, lineHeight: 1.45 }}>
              {located.chapter.plates.length} scroll-plate assets are indexed. Plate mode remains disabled until the exact composition map is admitted
              {plateReceiptIds.length > 0 ? ` (${plateReceiptIds.join(" · ")})` : ""}.
            </div>
          </aside>

          <article style={{ display: "grid", gap: 12, minWidth: 0 }}>
            <section style={{ ...card, display: "grid", gap: 10 }} aria-label="Current canonical panel">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <div>
                  <span style={{ color: "#8d816f", fontSize: 10 }}>
                    PANEL {globalPanelIndex + 1} OF {coverage.panels} · CHAPTER POSITION {panelIndex + 1} OF {chapterPanels.length}
                  </span>
                  <h2 style={{ margin: "3px 0 0", font: "800 25px 'Barlow Condensed', sans-serif" }}>{located.panel.id}</h2>
                </div>
                <span style={{ color: "#8d816f", fontSize: 9 }} title={located.panel.asset.sha256}>
                  {formatBytes(located.panel.asset.bytes)} · {shortDigest(located.panel.asset.sha256)}
                </span>
              </div>

              <div style={{ minHeight: 340, maxHeight: "64dvh", display: "grid", placeItems: "center", overflow: "hidden", background: "#030303", border: "1px solid #2a2620" }}>
                {currentAssetUrl ? (
                  <img
                    data-testid="canonical-panel-image"
                    src={currentAssetUrl}
                    alt={`Verified local bytes for ${located.panel.id}; canonical alt text remains source-required.`}
                    referrerPolicy="no-referrer"
                    style={{ maxWidth: "100%", maxHeight: "64dvh", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <div data-testid="canonical-panel-asset-placeholder" style={{ padding: 24, maxWidth: 650, textAlign: "center", color: "#918675", fontSize: 11, lineHeight: 1.6 }}>
                    <PixelIcon name="recorded" />
                    <p>Panel bytes are held outside World. Select the exact estate file or directory to verify and display this asset.</p>
                    <code style={{ wordBreak: "break-all" }}>{located.panel.asset.path}</code>
                  </div>
                )}
              </div>
            </section>

            {located.panel.text.status === "resolved" ? (
              <section style={card} data-testid="canonical-panel-text">
                {located.panel.text.captions.map((caption) => <p key={caption.id}>{caption.text}</p>)}
                {located.panel.text.dialogue.map((line) => (
                  <p key={line.id}><strong>{line.label}</strong> {line.text}</p>
                ))}
                {located.panel.text.soundEffects.map((effect) => <p key={effect.id}>{effect.text}</p>)}
              </section>
            ) : (
              <section style={{ ...card, borderColor: "#7b6031" }} data-testid="canonical-panel-text-blocked">
                <strong style={{ color: "#d2ad61" }}>Canonical text source required</strong>
                <p style={{ color: "#b8ad9b", font: "13px/1.55 'Lora', Georgia, serif" }}>{located.panel.text.reason}</p>
                <div style={{ color: "#7f7464", fontSize: 9 }}>
                  Required receipts: {located.panel.text.expectedSourceReceiptIds.join(" · ")}
                </div>
              </section>
            )}

            {located.panel.auditProjection && (
              <section style={{ ...card, borderStyle: "dashed", color: "#a89d8c" }} data-testid="canonical-panel-audit-projection">
                <strong style={{ color: "#8f826f", fontSize: 10 }}>DEVELOPMENT AUDIT PROJECTION · NOT CANONICAL DIALOGUE</strong>
                <p style={{ margin: "8px 0 4px", font: "13px/1.55 'Lora', Georgia, serif" }}>{located.panel.auditProjection.summary}</p>
                <span style={{ fontSize: 9 }}>{located.panel.auditProjection.location} · {located.panel.auditProjection.actorIds.join(", ")}</span>
              </section>
            )}

            {continuationPanelId && (
              <section style={{ ...card, borderColor: "#6e7844" }} data-testid="canonical-story-extent-complete">
                <strong>Published canonical extent complete</strong>
                <p style={{ marginBottom: 0, color: "#b6ad9b" }}>
                  The canonical successor is {continuationPanelId}. That successor has not yet been compiled into this Arc source.
                </p>
              </section>
            )}

            <nav style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }} aria-label="Canonical story navigation">
              <PixelButton type="button" variant="secondary" onClick={movePrevious} disabled={located.panel.previousPanelId === null} data-testid="canonical-story-previous">
                Previous
              </PixelButton>
              <span style={{ color: "#807565", fontSize: 10 }}>{globalPanelIndex + 1} / {coverage.panels}</span>
              <PixelButton type="button" variant="secondary" onClick={moveNext} data-testid="canonical-story-next">
                Next
              </PixelButton>
            </nav>
          </article>
        </div>

        <section style={card} aria-label="Holder asset verification">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <strong style={{ font: "800 18px 'Barlow Condensed', sans-serif" }}>Verify holder-owned canonical story assets</strong>
              <p style={{ margin: "4px 0 0", color: "#968b7b", fontSize: 10 }}>Every selected file is matched to one ledger path, byte-counted, and SHA-256 verified before display.</p>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <PixelButton type="button" variant="secondary" disabled={verifying} onClick={() => fileInput.current?.click()} data-testid="canonical-story-select-files">Select files</PixelButton>
              <PixelButton type="button" variant="secondary" disabled={verifying} onClick={() => directoryInput.current?.click()} data-testid="canonical-story-select-directory">Select estate folder</PixelButton>
            </div>
            <input ref={fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp" style={hidden} onChange={openAssets} data-testid="canonical-story-file-input" />
            <input ref={directoryInput} type="file" multiple style={hidden} onChange={openAssets} data-testid="canonical-story-directory-input" />
          </div>
          {assetStatus && <p role="status" data-testid="canonical-story-asset-status" style={{ color: "#82b584", fontSize: 10 }}>{assetStatus}</p>}
          {assetErrors.length > 0 && <div role="alert" data-testid="canonical-story-asset-errors" style={{ color: "#d99991", fontSize: 10 }}>{assetErrors.map((error) => <p key={error}>{error}</p>)}</div>}
        </section>

        <footer style={{ color: "#706656", fontSize: 9, lineHeight: 1.6 }}>
          Reading position is stored under the exact Arc digest. Panel and plate bytes are never stored, exported, or added to simulation state. Reload requires local asset reselection.
        </footer>
      </div>
    </main>
  );
}
