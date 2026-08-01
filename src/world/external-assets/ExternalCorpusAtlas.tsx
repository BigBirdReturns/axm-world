import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { ExternalAssetSession } from "../external-assets.js";
import {
  buildBurnCorpusAtlas,
  getExternalCorpusCatalog,
  subscribeExternalCorpusCatalog,
  type BurnCorpusAtlasEntry,
} from "./corpus-atlas.js";

const surface: CSSProperties = {
  display: "grid",
  gap: 12,
  minWidth: 0,
};

const panel: CSSProperties = {
  border: "1px solid #332e27",
  background: "rgba(6,6,5,0.48)",
  padding: 10,
  minWidth: 0,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function shortDigest(digest: string): string {
  return `${digest.slice(0, 12)}…${digest.slice(-9)}`;
}

function entryLabel(entry: BurnCorpusAtlasEntry): string {
  const prefix = entry.kind === "panel"
    ? `Panel ${entry.ordinal ?? "?"}`
    : entry.kind === "plate"
      ? `Plate ${entry.ordinal ?? "?"}`
      : entry.kind === "reader-evidence"
        ? "Reader evidence"
        : "Visual evidence";
  return `${prefix} · ${entry.verified ? "verified byte" : "manifest only"}`;
}

export function ExternalCorpusAtlas({ session }: { session: ExternalAssetSession }): JSX.Element {
  const catalog = useSyncExternalStore(
    (listener) => subscribeExternalCorpusCatalog(session.authoredArcDigest, listener),
    () => getExternalCorpusCatalog(session.authoredArcDigest),
    () => null,
  );
  const result = useMemo(() => {
    if (!catalog) return { atlas: null, error: null };
    try {
      return { atlas: buildBurnCorpusAtlas(catalog, session), error: null };
    } catch (error) {
      return { atlas: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [catalog, session]);
  const atlas = result.atlas;
  const [episode, setEpisode] = useState<number | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);

  useEffect(() => {
    if (!atlas || atlas.episodes.length === 0) {
      setEpisode(null);
      setActivePath(null);
      return;
    }
    if (episode === null || !atlas.episodes.some((item) => item.episode === episode)) {
      setEpisode(atlas.episodes[0]!.episode);
      setActivePath(null);
    }
  }, [atlas, episode]);

  if (result.error) {
    return <div role="alert" data-testid="burn-corpus-atlas-error" style={{ ...panel, color: "#f0c4bd" }}>{result.error}</div>;
  }
  if (!atlas) {
    return (
      <div data-testid="burn-corpus-atlas-unavailable" style={{ ...panel, color: "#9a8e7d", fontSize: 11 }}>
        The verified session has no process-local corpus catalog. Reopen the external receiver and admit the three custody records in this page session.
      </div>
    );
  }

  const selectedEpisode = atlas.episodes.find((item) => item.episode === episode) ?? atlas.episodes[0] ?? null;
  const allEntries = [
    ...(selectedEpisode?.chapters.flatMap((chapter) => chapter.entries) ?? []),
    ...atlas.unlocated,
  ];
  const active = allEntries.find((entry) => entry.path === activePath && entry.verified && entry.objectUrl) ?? null;

  return (
    <section
      style={surface}
      data-testid="burn-corpus-atlas"
      data-indexed={atlas.indexedAssets}
      data-verified={atlas.verifiedAssets}
      data-episodes={atlas.episodeCount}
      data-chapters={atlas.chapterCount}
      data-unlocated={atlas.unlocated.length}
      aria-label="Manifest-derived Burn corpus atlas"
    >
      <div style={{ ...panel, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <strong style={{ font: "800 19px 'Barlow Condensed', sans-serif" }}>Manifest-derived corpus atlas</strong>
          <span style={{ color: "#9f9483", fontSize: 10 }}>
            {atlas.verifiedAssets} verified / {atlas.indexedAssets} indexed
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 7, color: "#bdb2a0", fontSize: 10 }}>
          <span>{atlas.episodeCount} explicit episodes</span>
          <span>{atlas.chapterCount} explicit chapters</span>
          <span>{formatBytes(atlas.verifiedBytes)} selected</span>
          <span>{formatBytes(atlas.indexedBytes)} indexed</span>
        </div>
        <div style={{ color: "#71685b", fontSize: 9, wordBreak: "break-all" }}>
          Index {shortDigest(atlas.indexSha256)} · coordinates come only from explicit manifest path tokens
        </div>
      </div>

      {atlas.episodes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} aria-label="Indexed episodes">
          {atlas.episodes.map((item) => (
            <button
              key={item.episode}
              type="button"
              data-testid={`burn-atlas-episode-${item.episode}`}
              data-selected={selectedEpisode?.episode === item.episode ? "true" : "false"}
              onClick={() => {
                setEpisode(item.episode);
                setActivePath(null);
              }}
              style={{
                border: `1px solid ${selectedEpisode?.episode === item.episode ? "#c9a14a" : "#4a4238"}`,
                background: selectedEpisode?.episode === item.episode ? "#342d1c" : "#15130f",
                color: "#e2d8c7",
                padding: "7px 10px",
                cursor: "pointer",
                font: "10px 'IBM Plex Mono', monospace",
              }}
            >
              Episode {item.episode} · {item.verifiedAssets}/{item.indexedAssets}
            </button>
          ))}
        </div>
      )}

      {selectedEpisode && (
        <div style={{ display: "grid", gap: 9 }} data-testid={`burn-atlas-selected-episode-${selectedEpisode.episode}`}>
          {selectedEpisode.chapters.map((chapter) => (
            <section
              key={chapter.chapter}
              style={panel}
              data-testid={`burn-atlas-chapter-${chapter.episode}-${chapter.chapter}`}
              data-indexed={chapter.indexedAssets}
              data-verified={chapter.verifiedAssets}
              aria-label={`Episode ${chapter.episode} chapter ${chapter.chapter}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <strong style={{ font: "700 15px 'Barlow Condensed', sans-serif" }}>Chapter {chapter.chapter}</strong>
                <span style={{ color: "#827767", fontSize: 9 }}>{chapter.verifiedAssets}/{chapter.indexedAssets} · {formatBytes(chapter.bytes)}</span>
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {chapter.entries.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    data-testid="burn-atlas-entry"
                    data-path={entry.path}
                    data-verified={entry.verified ? "true" : "false"}
                    disabled={!entry.verified || !entry.objectUrl}
                    onClick={() => setActivePath(entry.path)}
                    title={entry.path}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 8,
                      alignItems: "center",
                      textAlign: "left",
                      border: `1px solid ${activePath === entry.path ? "#c9a14a" : "#29251f"}`,
                      background: entry.verified ? "#1d211a" : "#11100d",
                      color: entry.verified ? "#d9e4d4" : "#827767",
                      padding: "7px 8px",
                      cursor: entry.verified && entry.objectUrl ? "pointer" : "default",
                      font: "9px/1.4 'IBM Plex Mono', monospace",
                      opacity: 1,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", color: entry.verified ? "#cfe0ca" : "#9a8e7d" }}>{entryLabel(entry)}</span>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.path}</span>
                    </span>
                    <span>{formatBytes(entry.bytes)}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {atlas.unlocated.length > 0 && (
        <section style={panel} data-testid="burn-atlas-unlocated" data-count={atlas.unlocated.length}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
            <strong style={{ font: "700 15px 'Barlow Condensed', sans-serif" }}>Unlocated evidence</strong>
            <span style={{ color: "#827767", fontSize: 9 }}>{atlas.unlocated.length} records</span>
          </div>
          <p style={{ margin: "0 0 7px", color: "#817665", fontSize: 9, lineHeight: 1.45 }}>
            These manifest paths do not contain an explicit episode and chapter pair. The atlas preserves them without guessing position.
          </p>
          <div style={{ display: "grid", gap: 4 }}>
            {atlas.unlocated.slice(0, 24).map((entry) => (
              <div key={entry.path} data-testid="burn-atlas-unlocated-entry" data-path={entry.path} style={{ color: "#9a8e7d", fontSize: 9, wordBreak: "break-all" }}>
                {entry.verified ? "verified" : "manifest only"} · {entry.path}
              </div>
            ))}
            {atlas.unlocated.length > 24 && <span style={{ color: "#655d52", fontSize: 9 }}>+ {atlas.unlocated.length - 24} additional unlocated records</span>}
          </div>
        </section>
      )}

      {active && active.objectUrl && (
        <figure style={{ ...panel, margin: 0, display: "grid", gap: 8 }} data-testid="burn-atlas-preview">
          <div style={{ minHeight: 180, maxHeight: "42dvh", display: "grid", placeItems: "center", overflow: "hidden", background: "#030303" }}>
            <img
              data-testid="burn-atlas-preview-image"
              src={active.objectUrl}
              alt={`Verified corpus atlas preview ${active.path}`}
              referrerPolicy="no-referrer"
              style={{ maxWidth: "100%", maxHeight: "42dvh", objectFit: "contain" }}
            />
          </div>
          <figcaption style={{ color: "#9f9483", fontSize: 9, wordBreak: "break-all" }}>
            {active.path} · manifest SHA-256 {shortDigest(active.sha256)}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
