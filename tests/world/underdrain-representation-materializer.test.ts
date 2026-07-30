import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const json = (path: string) => JSON.parse(read(path));
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const EXTRACTOR = resolve(ROOT, "scripts/extract-underdrain-shine-assets.mjs");
const RESOLVER = resolve(ROOT, "scripts/resolve-underdrain-shine-representation.mjs");
const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4fQAAAAASUVORK5CYII=";

const roles = [
  ["player:rhea-venn", "rhea"],
  ["enemy:skirmisher", "capling"],
  ["enemy:duelist", "duelist"],
  ["enemy:swarm", "swarm"],
  ["enemy:hexer", "hexer"],
  ["enemy:breaker", "breaker"],
  ["arena:pump-seven", "pumpSeven"],
] as const;

describe("UNDERDRAIN representation materialization source", () => {
  it("locks the exact project-owned Shine source and six upstream visual-source names", () => {
    const source = json("unity/Fixtures/underdrain.shine-source.json");
    expect(source).toMatchObject({
      format: "rodoh-underdrain-shine-source/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      themeId: "underdrain-bloom-below",
      standaloneFileName: "UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html",
      standaloneSha256: "ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311",
      assetObject: "ASSET_DATA",
      projectOwned: true,
    });
    expect(source.upstreamVisualSources).toEqual([
      "metalworker_character_turnaround.png",
      "worker_mercenary_concept_sheet.png",
      "fungal_toads_swamp_creature_lineup.png",
      "swamp_fungus_monster_concept_sheet.png",
      "sewer_asset_kit_pipes_grates_and_machinery.png",
      "subterranean_sewer_concept_art_board.png",
    ]);
  });

  it("extracts a bounded ASSET_DATA object and resolves seven distinct semantic roles without network access", () => {
    const directory = mkdtempSync(join(tmpdir(), "underdrain-shine-extractor-"));
    const htmlPath = join(directory, "shine.html");
    const extractionRoot = join(directory, "extraction");
    const resolvedRoot = join(directory, "resolved");
    const roleMapPath = join(directory, "role-map.json");
    const assetData = Object.fromEntries(roles.map(([, key]) => [key, `data:image/png;base64,${ONE_PIXEL_PNG}`]));
    const html = `<!doctype html><script>const ASSET_DATA=${JSON.stringify(assetData)};const W=1600,H=900;</script>`;
    writeFileSync(htmlPath, html);
    writeFileSync(roleMapPath, `${JSON.stringify({
      format: "rodoh-underdrain-shine-role-map/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      roles: roles.map(([role, sourceKey]) => ({ role, sourceKey })),
    }, null, 2)}\n`);

    const extracted = spawnSync(process.execPath, [
      EXTRACTOR,
      "--input", htmlPath,
      "--output", extractionRoot,
      "--expected-sha256", sha256(html),
    ], { cwd: ROOT, encoding: "utf8" });
    expect(extracted.status, extracted.stderr || extracted.stdout).toBe(0);
    const extraction = JSON.parse(readFileSync(join(extractionRoot, "shine-extraction.json"), "utf8"));
    expect(extraction).toMatchObject({
      format: "rodoh-underdrain-shine-extraction/1",
      status: "pass",
      sourceSha256: sha256(html),
      assetCount: 7,
      unityInvoked: false,
      approvalIssued: false,
      productAcceptance: "not-issued",
    });
    expect(extraction.assets.every((asset: { width: number; height: number }) => asset.width === 1 && asset.height === 1)).toBe(true);

    const resolved = spawnSync(process.execPath, [
      RESOLVER,
      "--extraction", join(extractionRoot, "shine-extraction.json"),
      "--role-map", roleMapPath,
      "--output", resolvedRoot,
    ], { cwd: ROOT, encoding: "utf8" });
    expect(resolved.status, resolved.stderr || resolved.stdout).toBe(0);
    const manifest = JSON.parse(readFileSync(join(resolvedRoot, "resolved-representation-source.json"), "utf8"));
    expect(manifest).toMatchObject({
      format: "rodoh-underdrain-resolved-representation-source/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      themeId: "underdrain-bloom-below",
      unityVersion: "6000.0.66f2",
      templateOnly: false,
      reviewRequired: true,
      approvalIssued: false,
      productAcceptance: "not-issued",
    });
    expect(manifest.assets).toHaveLength(7);
    expect(new Set(manifest.assets.map((asset: { role: string }) => asset.role))).toEqual(new Set(roles.map(([role]) => role)));
    expect(new Set(manifest.assets.map((asset: { sourceKey: string }) => asset.sourceKey)).size).toBe(7);
  });

  it("materializes exact production paths while retaining Arc, approval, and physics boundaries", () => {
    const batch = read("unity/Packages/com.axm.rodoh-action/Editor/ActionUnderdrainRepresentationMaterializerBatch.cs");
    const billboard = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionCameraFacingSprite.cs");
    const pulse = read("unity/Packages/com.axm.rodoh-action/Runtime/Unity/ActionFeedbackPulse.cs");
    const runner = read("scripts/materialize-underdrain-production-representation.ps1");
    const template = json("unity/Fixtures/underdrain.representation-source.template.json");

    expect(template.format).toBe("rodoh-underdrain-resolved-representation-source/1");
    expect(template.assets).toHaveLength(7);
    expect(template.assets.map((asset: { role: string }) => asset.role)).toEqual(roles.map(([role]) => role));
    expect(template.approvalIssued).toBe(false);
    expect(template.productAcceptance).toBe("not-issued");

    expect(batch).toContain('ReceiptFormat = "rodoh-underdrain-representation-materialization/1"');
    expect(batch).toContain('DefaultAssetRoot = "Assets/AXM/Underdrain/Production"');
    expect(batch).toContain("BuildActorPrefab");
    expect(batch).toContain("BuildArenaPrefab");
    expect(batch).toContain("BuildFeedbackPrefabs");
    expect(batch).toContain("BuildAudioClips");
    expect(batch).toContain("BuildReviewScene");
    expect(batch).toContain("ActionProductionAssetDigest.ComputeDeclaredBindingClosure");
    expect(batch).toContain("closure.declaredBindingCount != 27");
    expect(batch).toContain("closure.uniqueDeclaredAssetCount != 23");
    expect(batch).toContain("actorColliderCount != 0");
    expect(batch).toContain("activeRigidBodies != 0");
    expect(batch).toContain("RefuseApprovedPrefab");
    expect(batch).toContain("approvalIssued = false");
    expect(batch).toContain('productAcceptance = "not-issued"');
    expect(batch).not.toContain("GameObject.CreatePrimitive");

    for (const parameter of [
      "AXM_Mode", "AXM_ModeTick", "AXM_Health", "AXM_Active", "AXM_Hit", "AXM_Parry", "AXM_Dodge", "AXM_Defeat",
      "AXM_Objective", "AXM_Cue", "AXM_CueCode", "AXM_CueDuration", "AXM_DefenseWindow", "AXM_WorkWindow",
    ]) expect(batch).toContain(`"${parameter}"`);

    expect(billboard).toContain("Presentation-only billboard");
    expect(billboard).toContain("Camera.main");
    expect(pulse).toContain("presentation-only pulse");
    expect(pulse).toContain("gameObject.SetActive(false)");
    expect(runner).toContain("ActionUnderdrainRepresentationMaterializerBatch.Run");
    expect(runner).toContain("postMaterializationPreflight");
    expect(runner).toContain('namedAssetReview = "open"');
    expect(runner).toContain('productAcceptance = "not-issued"');
  });
});
