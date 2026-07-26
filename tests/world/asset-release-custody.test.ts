import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { EXPECTED_BUNDLED_DIGESTS } from "../../src/world/bundled-digests.js";
import { PRESENTATION_THEME_ROOT_HZ } from "../../src/world/sensory-prefs.js";

const ROOT = resolve(import.meta.dirname, "../..");
const ROLLUPS = resolve(ROOT, "src/assets/rollups/rodoh-v1-programs.json");
const DESCRIPTIONS = resolve(ROOT, "src/assets/descriptions/rodoh-v1-dense-assets.json");
const INVENTORY = resolve(ROOT, "docs/release/RODOH_ASSET_INVENTORY.json");
const GENERATOR = resolve(ROOT, "scripts/assets/build-release-asset-inventory.mjs");

const rollups = JSON.parse(readFileSync(ROLLUPS, "utf8")) as {
  format: string;
  provenanceCompatibility: string[];
  programs: Array<{
    id: string;
    cartridgeId: string | null;
    cartridgeDigest: string | null;
    status: string;
    historicalManifests: string[];
    assetRoots: string[];
    presentationRoots: string[];
    requiredRoles: string[];
    denseDescriptions: string[];
    acceptance: string[];
  }>;
};
const descriptions = JSON.parse(readFileSync(DESCRIPTIONS, "utf8")) as {
  format: string;
  descriptions: Array<{
    id: string;
    asset: string;
    title: string;
    summary: string;
    entities: string[];
    relations: string[];
    directions: string[];
    runtimeEquivalents: string[];
  }>;
};

function runGenerator(root: string, rollupPath: string, descriptionPath: string, output: string) {
  return spawnSync(process.execPath, [GENERATOR,
    "--root", root,
    "--rollups", rollupPath,
    "--descriptions", descriptionPath,
    "--output", output,
  ], { cwd: root, encoding: "utf8" });
}

describe("RODOH v1 asset release custody", () => {
  it("has one current rollup for the shell and every first-party program", () => {
    expect(rollups.format).toBe("rodoh-program-asset-rollup-set/1");
    expect(rollups.programs.map((program) => program.id)).toEqual([
      "rodoh-shell",
      "program-001-first-charter",
      "program-002-waking-tower",
      "program-003-kind-gods-of-ilyon",
      "program-004-lamp-district",
      "program-005-relief-circuit",
    ]);
    expect(rollups.provenanceCompatibility).toEqual(expect.arrayContaining([
      "axm-runtime-asset-provenance/1",
      "rodoh-original-asset-provenance/1",
      "axm-world-root-mark-provenance/1",
    ]));
    for (const program of rollups.programs) {
      expect(program.status).toBe("production-dignity-complete");
      expect(program.requiredRoles.length).toBeGreaterThanOrEqual(4);
      for (const path of [
        ...program.historicalManifests,
        ...program.assetRoots,
        ...program.presentationRoots,
        ...program.acceptance,
      ]) {
        expect(existsSync(resolve(ROOT, path)), `${program.id} references missing path ${path}`).toBe(true);
      }
    }
  });

  it("binds every first-party rollup to the current reviewed cartridge identity", () => {
    const byCartridge = new Map(rollups.programs
      .filter((program) => program.cartridgeId)
      .map((program) => [program.cartridgeId!, program.cartridgeDigest]));
    expect(Object.fromEntries(byCartridge)).toEqual(EXPECTED_BUNDLED_DIGESTS);
  });

  it("gives every dense diagram and motif system a structured nonvisual equivalent", () => {
    expect(descriptions.format).toBe("rodoh-asset-long-description-set/1");
    const byId = new Map(descriptions.descriptions.map((entry) => [entry.id, entry]));
    for (const program of rollups.programs) {
      for (const id of program.denseDescriptions) {
        const description = byId.get(id);
        expect(description, `${program.id} lacks ${id}`).toBeTruthy();
        expect(existsSync(resolve(ROOT, description!.asset))).toBe(true);
        expect(description!.title.trim()).not.toBe("");
        expect(description!.summary.trim()).not.toBe("");
        expect(description!.entities.length).toBeGreaterThan(0);
        expect(description!.relations.length).toBeGreaterThan(0);
        expect(description!.runtimeEquivalents.length).toBeGreaterThan(0);
      }
    }
    expect(new Set(descriptions.descriptions.map((entry) => entry.id)).size).toBe(descriptions.descriptions.length);
  });

  it("completes optional procedural sound identity without making sound authoritative", () => {
    expect(PRESENTATION_THEME_ROOT_HZ).toMatchObject({
      "first-charter": 220,
      karazhan: 146.83,
      "kind-gods-of-ilyon": 196,
      "lamp-district": 110,
      "relief-circuit": 261.63,
    });
    expect(new Set(Object.values(PRESENTATION_THEME_ROOT_HZ)).size).toBe(Object.keys(PRESENTATION_THEME_ROOT_HZ).length);
    const source = readFileSync(resolve(ROOT, "src/world/sensory-prefs.ts"), "utf8");
    expect(source).toContain("never enter cartridge identity, run state, or resolver inputs");
    expect(source).toContain("Missing IDs retain");
  });

  it("keeps the committed deterministic inventory current and free of remote or executable assets", () => {
    expect(existsSync(INVENTORY), "Generated inventory must be committed before review").toBe(true);
    const result = spawnSync(process.execPath, [GENERATOR,
      "--root", ROOT,
      "--rollups", "src/assets/rollups/rodoh-v1-programs.json",
      "--descriptions", "src/assets/descriptions/rodoh-v1-dense-assets.json",
      "--output", "docs/release/RODOH_ASSET_INVENTORY.json",
      "--check",
    ], { cwd: ROOT, encoding: "utf8" });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const inventory = JSON.parse(readFileSync(INVENTORY, "utf8"));
    expect(inventory).toMatchObject({
      format: "rodoh-release-asset-inventory/1",
      status: "pass",
      summary: { programs: 6, failures: 0 },
    });
    expect(inventory.assets.length).toBeGreaterThan(20);
    expect(inventory.assets.every((asset: { remoteReferences: string[]; embeddedRaster: boolean; executableSvg: boolean }) =>
      asset.remoteReferences.length === 0 && !asset.embeddedRaster && !asset.executableSvg
    )).toBe(true);
  });

  it("detects network-bearing literals in executable presentation source while ignoring comment provenance", () => {
    const fixture = mkdtempSync(join(tmpdir(), "rodoh-asset-source-"));
    mkdirSync(resolve(fixture, "assets"), { recursive: true });
    writeFileSync(resolve(fixture, "assets/presentation.tsx"), [
      "// provenance: https://example.com/historical-record",
      'export const endpoint = "https://example.com/runtime-asset.svg";',
      "",
    ].join("\n"));
    writeFileSync(resolve(fixture, "provenance.json"), JSON.stringify({ format: "rodoh-original-asset-provenance/1" }));
    writeFileSync(resolve(fixture, "acceptance.test.ts"), "export {};\n");
    writeFileSync(resolve(fixture, "descriptions.json"), JSON.stringify({
      format: "rodoh-asset-long-description-set/1",
      descriptions: [],
    }));
    writeFileSync(resolve(fixture, "rollups.json"), JSON.stringify({
      format: "rodoh-program-asset-rollup-set/1",
      releaseTarget: "fixture",
      provenanceCompatibility: ["rodoh-original-asset-provenance/1"],
      programs: [{
        id: "fixture-program",
        name: "Fixture",
        cartridgeId: null,
        cartridgeDigest: null,
        status: "production-dignity-complete",
        historicalManifests: ["provenance.json"],
        assetRoots: ["assets"],
        presentationRoots: [],
        requiredRoles: ["one", "two", "three", "four"],
        denseDescriptions: [],
        acceptance: ["acceptance.test.ts"],
        releaseBoundary: "fixture",
      }],
    }));

    const result = runGenerator(fixture, "rollups.json", "descriptions.json", "inventory.json");
    expect(result.status).not.toBe(0);
    const inventory = JSON.parse(readFileSync(resolve(fixture, "inventory.json"), "utf8"));
    expect(inventory.failures).toEqual([
      "assets/presentation.tsx contains remote runtime references: https://example.com/runtime-asset.svg.",
    ]);
  });

  it("refuses asset roots that escape repository custody", () => {
    const parent = mkdtempSync(join(tmpdir(), "rodoh-asset-escape-"));
    const fixture = resolve(parent, "repo");
    const outside = resolve(parent, "outside");
    mkdirSync(fixture);
    mkdirSync(outside);
    writeFileSync(resolve(outside, "escaped.ts"), "export {};\n");
    writeFileSync(resolve(fixture, "provenance.json"), JSON.stringify({ format: "rodoh-original-asset-provenance/1" }));
    writeFileSync(resolve(fixture, "acceptance.test.ts"), "export {};\n");
    writeFileSync(resolve(fixture, "descriptions.json"), JSON.stringify({
      format: "rodoh-asset-long-description-set/1",
      descriptions: [],
    }));
    writeFileSync(resolve(fixture, "rollups.json"), JSON.stringify({
      format: "rodoh-program-asset-rollup-set/1",
      releaseTarget: "fixture",
      provenanceCompatibility: ["rodoh-original-asset-provenance/1"],
      programs: [{
        id: "fixture-program",
        name: "Fixture",
        cartridgeId: null,
        cartridgeDigest: null,
        status: "production-dignity-complete",
        historicalManifests: ["provenance.json"],
        assetRoots: ["../outside"],
        presentationRoots: [],
        requiredRoles: ["one", "two", "three", "four"],
        denseDescriptions: [],
        acceptance: ["acceptance.test.ts"],
        releaseBoundary: "fixture",
      }],
    }));

    const result = runGenerator(fixture, "rollups.json", "descriptions.json", "inventory.json");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("escapes the repository root");
    expect(existsSync(resolve(fixture, "inventory.json"))).toBe(false);
  });
});
