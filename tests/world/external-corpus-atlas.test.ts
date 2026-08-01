import { describe, expect, it } from "vitest";
import type { ExternalAssetSession } from "../../src/world/external-assets.js";
import {
  buildBurnCorpusAtlas,
  burnCorpusAssetKind,
  parseBurnCorpusCoordinate,
  type ExternalCorpusCatalog,
} from "../../src/world/external-assets/corpus-atlas.js";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function catalog(): ExternalCorpusCatalog {
  return {
    cartridgeId: "burn-protocol-disclosure-probe",
    authoredArcDigest: "cart1_test",
    standing: "mechanism-fixture",
    evidenceTier: "mechanism-fixture",
    overlaySha256: HASH_A,
    indexSha256: HASH_B,
    generatedFrom: "verified nested v0.58.0 manifest",
    totalBytes: 66,
    counts: {
      "panel-raster": 4,
      "scroll-plate": 1,
      "visual-evidence": 1,
    },
    assets: [
      { path: "panels/E12-C3-P02.png", sha256: "2".repeat(64), bytes: 12, classification: "panel-raster" },
      { path: "panels/E12-C2-P20.png", sha256: "3".repeat(64), bytes: 11, classification: "panel-raster" },
      { path: "plates/E12-C3-PLATE-01.png", sha256: "4".repeat(64), bytes: 13, classification: "scroll-plate" },
      { path: "episodes/EP13/CH1/PANEL-01.png", sha256: "5".repeat(64), bytes: 10, classification: "panel-raster" },
      { path: "panels/E12-C3-P01.png", sha256: "1".repeat(64), bytes: 9, classification: "panel-raster" },
      { path: "evidence/contact-sheet.png", sha256: "6".repeat(64), bytes: 11, classification: "visual-evidence" },
    ],
  };
}

function session(): ExternalAssetSession {
  return {
    cartridgeId: "burn-protocol-disclosure-probe",
    authoredArcDigest: "cart1_test" as ExternalAssetSession["authoredArcDigest"],
    standing: "mechanism-fixture",
    evidenceTier: "mechanism-fixture",
    overlaySha256: HASH_A,
    indexSha256: HASH_B,
    verifiedBytes: 9,
    totalAssets: 6,
    complete: false,
    createdAt: 1,
    assets: [{
      path: "panels/E12-C3-P01.png",
      sha256: "1".repeat(64),
      bytes: 9,
      classification: "panel-raster",
      selectedPath: "holder/panels/E12-C3-P01.png",
      objectUrl: "blob:test-panel",
      mimeType: "image/png",
    }],
  };
}

describe("Burn Protocol manifest-derived corpus atlas", () => {
  it("claims coordinates only from explicit episode and chapter path tokens", () => {
    expect(parseBurnCorpusCoordinate({ path: "assets/E12-C3-P07.png", classification: "panel-raster" })).toEqual({
      episode: 12,
      chapter: 3,
      ordinal: 7,
    });
    expect(parseBurnCorpusCoordinate({ path: "episodes/EP13/CH1/PLATE-04.png", classification: "scroll-plate" })).toEqual({
      episode: 13,
      chapter: 1,
      ordinal: 4,
    });
    expect(parseBurnCorpusCoordinate({ path: "evidence/contact-sheet.png", classification: "visual-evidence" })).toEqual({
      episode: null,
      chapter: null,
      ordinal: null,
    });
  });

  it("maps manifest classifications without inventing story semantics", () => {
    expect(burnCorpusAssetKind("panel-raster")).toBe("panel");
    expect(burnCorpusAssetKind("scroll-plate")).toBe("plate");
    expect(burnCorpusAssetKind("reader-evidence")).toBe("reader-evidence");
    expect(burnCorpusAssetKind("contact-sheet")).toBe("visual-evidence");
  });

  it("groups and sorts explicit episodes, chapters, panels, and plates deterministically", () => {
    const atlas = buildBurnCorpusAtlas(catalog(), session());
    expect(atlas).toMatchObject({
      indexedAssets: 6,
      verifiedAssets: 1,
      episodeCount: 2,
      chapterCount: 3,
      verifiedBytes: 9,
    });
    expect(atlas.episodes.map((episode) => episode.episode)).toEqual([12, 13]);
    expect(atlas.episodes[0]?.chapters.map((chapter) => chapter.chapter)).toEqual([2, 3]);
    expect(atlas.episodes[0]?.chapters[1]?.entries.map((entry) => [entry.kind, entry.ordinal, entry.path])).toEqual([
      ["panel", 1, "panels/E12-C3-P01.png"],
      ["panel", 2, "panels/E12-C3-P02.png"],
      ["plate", 1, "plates/E12-C3-PLATE-01.png"],
    ]);
  });

  it("marks only byte-verified entries as previewable and preserves unlocated evidence", () => {
    const atlas = buildBurnCorpusAtlas(catalog(), session());
    const chapter = atlas.episodes[0]?.chapters.find((entry) => entry.chapter === 3);
    expect(chapter?.verifiedAssets).toBe(1);
    expect(chapter?.entries.map((entry) => ({ path: entry.path, verified: entry.verified, objectUrl: entry.objectUrl }))).toEqual([
      { path: "panels/E12-C3-P01.png", verified: true, objectUrl: "blob:test-panel" },
      { path: "panels/E12-C3-P02.png", verified: false, objectUrl: null },
      { path: "plates/E12-C3-PLATE-01.png", verified: false, objectUrl: null },
    ]);
    expect(atlas.unlocated.map((entry) => entry.path)).toEqual(["evidence/contact-sheet.png"]);
  });

  it("refuses a catalog and session bound to different custody records", () => {
    expect(() => buildBurnCorpusAtlas({ ...catalog(), indexSha256: "c".repeat(64) }, session())).toThrow(/different custody records/i);
  });
});
