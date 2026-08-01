import { compareCodepoints } from "../../engine/determinism.js";
import type {
  ExternalAssetIndexEntry,
  ExternalAssetSession,
  ExternalAssetSessionEntry,
  ExternalAssetStanding,
  PreparedExternalAssetCustody,
} from "../external-assets.js";

export interface ExternalCorpusCatalog {
  cartridgeId: string;
  authoredArcDigest: string;
  standing: ExternalAssetStanding;
  evidenceTier: string;
  overlaySha256: string;
  indexSha256: string;
  generatedFrom: string;
  totalBytes: number;
  counts: Record<string, number>;
  assets: ExternalAssetIndexEntry[];
}

export type BurnCorpusAssetKind =
  | "panel"
  | "plate"
  | "reader-evidence"
  | "visual-evidence";

export interface BurnCorpusCoordinate {
  episode: number | null;
  chapter: number | null;
  ordinal: number | null;
}

export interface BurnCorpusAtlasEntry extends ExternalAssetIndexEntry, BurnCorpusCoordinate {
  kind: BurnCorpusAssetKind;
  verified: boolean;
  objectUrl: string | null;
  selectedPath: string | null;
}

export interface BurnCorpusAtlasChapter {
  episode: number;
  chapter: number;
  entries: BurnCorpusAtlasEntry[];
  indexedAssets: number;
  verifiedAssets: number;
  bytes: number;
}

export interface BurnCorpusAtlasEpisode {
  episode: number;
  chapters: BurnCorpusAtlasChapter[];
  indexedAssets: number;
  verifiedAssets: number;
  bytes: number;
}

export interface BurnCorpusAtlas {
  authoredArcDigest: string;
  standing: ExternalAssetStanding;
  evidenceTier: string;
  overlaySha256: string;
  indexSha256: string;
  indexedAssets: number;
  verifiedAssets: number;
  indexedBytes: number;
  verifiedBytes: number;
  episodeCount: number;
  chapterCount: number;
  classificationCounts: Record<string, number>;
  episodes: BurnCorpusAtlasEpisode[];
  unlocated: BurnCorpusAtlasEntry[];
}

const catalogs = new Map<string, ExternalCorpusCatalog>();
const listeners = new Map<string, Set<() => void>>();

function notify(authoredArcDigest: string): void {
  for (const listener of listeners.get(authoredArcDigest) ?? []) listener();
}

export function installExternalCorpusCatalog(
  custody: PreparedExternalAssetCustody,
): ExternalCorpusCatalog {
  const catalog: ExternalCorpusCatalog = {
    cartridgeId: custody.cartridgeId,
    authoredArcDigest: custody.authoredArcDigest,
    standing: custody.standing,
    evidenceTier: custody.evidenceTier,
    overlaySha256: custody.overlaySha256,
    indexSha256: custody.indexSha256,
    generatedFrom: custody.index.generatedFrom,
    totalBytes: custody.totalBytes,
    counts: { ...custody.index.counts },
    assets: custody.index.assets.map((asset) => ({ ...asset })),
  };
  catalogs.set(custody.authoredArcDigest, catalog);
  notify(custody.authoredArcDigest);
  return catalog;
}

export function getExternalCorpusCatalog(authoredArcDigest: string): ExternalCorpusCatalog | null {
  return catalogs.get(authoredArcDigest) ?? null;
}

export function clearExternalCorpusCatalog(authoredArcDigest: string): void {
  catalogs.delete(authoredArcDigest);
  notify(authoredArcDigest);
}

export function subscribeExternalCorpusCatalog(
  authoredArcDigest: string,
  listener: () => void,
): () => void {
  const current = listeners.get(authoredArcDigest) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(authoredArcDigest, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(authoredArcDigest);
  };
}

const COMPACT_PANEL = /(?:^|[/_.-])E(\d{1,3})[-_]C(\d{1,2})[-_]P(\d{1,3})(?=$|[/_.-])/i;
const COMPACT_PLATE = /(?:^|[/_.-])E(\d{1,3})[-_]C(\d{1,2})[-_](?:PLATE|PL)[-_]?(\d{1,3})(?=$|[/_.-])/i;
const LONG_PANEL = /(?:^|[/_.-])(?:EPISODE|EP)[-_ ]?(\d{1,3})[/_.-]+(?:CHAPTER|CH)[-_ ]?(\d{1,2})[/_.-]+(?:PANEL|P)[-_ ]?(\d{1,3})(?=$|[/_.-])/i;
const LONG_PLATE = /(?:^|[/_.-])(?:EPISODE|EP)[-_ ]?(\d{1,3})[/_.-]+(?:CHAPTER|CH)[-_ ]?(\d{1,2})[/_.-]+(?:PLATE|PL)[-_ ]?(\d{1,3})(?=$|[/_.-])/i;
const EPISODE_TOKEN = /(?:^|[/_.-])(?:EPISODE|EP|E)[-_ ]?(\d{1,3})(?=$|[/_.-])/i;
const CHAPTER_TOKEN = /(?:^|[/_.-])(?:CHAPTER|CH|C)[-_ ]?(\d{1,2})(?=$|[/_.-])/i;

function positiveInteger(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function burnCorpusAssetKind(classification: string): BurnCorpusAssetKind {
  if (classification === "panel-raster") return "panel";
  if (classification === "scroll-plate") return "plate";
  if (classification === "reader-evidence") return "reader-evidence";
  return "visual-evidence";
}

/** Coordinates are claimed only when the verified manifest path carries explicit
 * episode and chapter tokens. Unmatched evidence remains unlocated rather than
 * inheriting guessed story position from array order or classification. */
export function parseBurnCorpusCoordinate(
  asset: Pick<ExternalAssetIndexEntry, "path" | "classification">,
): BurnCorpusCoordinate {
  const kind = burnCorpusAssetKind(asset.classification);
  const orderedPatterns = kind === "plate"
    ? [COMPACT_PLATE, LONG_PLATE, COMPACT_PANEL, LONG_PANEL]
    : [COMPACT_PANEL, LONG_PANEL, COMPACT_PLATE, LONG_PLATE];
  for (const pattern of orderedPatterns) {
    const match = asset.path.match(pattern);
    if (!match) continue;
    return {
      episode: positiveInteger(match[1]),
      chapter: positiveInteger(match[2]),
      ordinal: positiveInteger(match[3]),
    };
  }
  return {
    episode: positiveInteger(asset.path.match(EPISODE_TOKEN)?.[1]),
    chapter: positiveInteger(asset.path.match(CHAPTER_TOKEN)?.[1]),
    ordinal: null,
  };
}

function kindRank(kind: BurnCorpusAssetKind): number {
  switch (kind) {
    case "panel": return 0;
    case "plate": return 1;
    case "reader-evidence": return 2;
    case "visual-evidence": return 3;
  }
}

function compareEntries(left: BurnCorpusAtlasEntry, right: BurnCorpusAtlasEntry): number {
  return kindRank(left.kind) - kindRank(right.kind)
    || (left.ordinal ?? Number.MAX_SAFE_INTEGER) - (right.ordinal ?? Number.MAX_SAFE_INTEGER)
    || compareCodepoints(left.path, right.path);
}

function verifiedMap(session: ExternalAssetSession): Map<string, ExternalAssetSessionEntry> {
  return new Map(session.assets.map((asset) => [asset.path, asset]));
}

export function buildBurnCorpusAtlas(
  catalog: ExternalCorpusCatalog,
  session: ExternalAssetSession,
): BurnCorpusAtlas {
  if (catalog.authoredArcDigest !== session.authoredArcDigest) {
    throw new Error("External corpus catalog and verified session identify different authored cartridges.");
  }
  if (catalog.indexSha256 !== session.indexSha256 || catalog.overlaySha256 !== session.overlaySha256) {
    throw new Error("External corpus catalog and verified session identify different custody records.");
  }

  const verified = verifiedMap(session);
  const entries = catalog.assets.map((asset): BurnCorpusAtlasEntry => {
    const selected = verified.get(asset.path) ?? null;
    return {
      ...asset,
      ...parseBurnCorpusCoordinate(asset),
      kind: burnCorpusAssetKind(asset.classification),
      verified: selected !== null,
      objectUrl: selected?.objectUrl ?? null,
      selectedPath: selected?.selectedPath ?? null,
    };
  });

  const located = entries.filter((entry) => entry.episode !== null && entry.chapter !== null);
  const unlocated = entries
    .filter((entry) => entry.episode === null || entry.chapter === null)
    .sort(compareEntries);
  const episodeNumbers = [...new Set(located.map((entry) => entry.episode!))].sort((a, b) => a - b);
  const episodes = episodeNumbers.map((episode): BurnCorpusAtlasEpisode => {
    const episodeEntries = located.filter((entry) => entry.episode === episode);
    const chapterNumbers = [...new Set(episodeEntries.map((entry) => entry.chapter!))].sort((a, b) => a - b);
    const chapters = chapterNumbers.map((chapter): BurnCorpusAtlasChapter => {
      const chapterEntries = episodeEntries
        .filter((entry) => entry.chapter === chapter)
        .sort(compareEntries);
      return {
        episode,
        chapter,
        entries: chapterEntries,
        indexedAssets: chapterEntries.length,
        verifiedAssets: chapterEntries.filter((entry) => entry.verified).length,
        bytes: chapterEntries.reduce((sum, entry) => sum + entry.bytes, 0),
      };
    });
    return {
      episode,
      chapters,
      indexedAssets: chapters.reduce((sum, chapter) => sum + chapter.indexedAssets, 0),
      verifiedAssets: chapters.reduce((sum, chapter) => sum + chapter.verifiedAssets, 0),
      bytes: chapters.reduce((sum, chapter) => sum + chapter.bytes, 0),
    };
  });

  return {
    authoredArcDigest: catalog.authoredArcDigest,
    standing: catalog.standing,
    evidenceTier: catalog.evidenceTier,
    overlaySha256: catalog.overlaySha256,
    indexSha256: catalog.indexSha256,
    indexedAssets: entries.length,
    verifiedAssets: entries.filter((entry) => entry.verified).length,
    indexedBytes: catalog.totalBytes,
    verifiedBytes: session.verifiedBytes,
    episodeCount: episodes.length,
    chapterCount: episodes.reduce((sum, episode) => sum + episode.chapters.length, 0),
    classificationCounts: { ...catalog.counts },
    episodes,
    unlocated,
  };
}
