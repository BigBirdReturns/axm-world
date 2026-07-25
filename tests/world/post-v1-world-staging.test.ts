import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const staging = JSON.parse(readFileSync(resolve(ROOT, "docs/post-v1/POST_V1_WORLD_STAGING.json"), "utf8"));

describe("post-v1 World architecture staging", () => {
  it("stages opaque theme-owned presentation with complete neutral fallback", () => {
    expect(staging).toMatchObject({
      format: "rodoh-post-v1-world-staging/1",
      releaseBoundary: { requiresRodohV1: true, runtimeChanges: false },
      presentationManifest: { format: "rodoh-presentation-manifest/v1-candidate" },
    });
    expect(staging.presentationManifest.opaqueKeys).toEqual(expect.arrayContaining([
      "roleId",
      "attributeId",
      "itemId",
      "profileId",
    ]));
    expect(staging.presentationManifest.fallback).toEqual(expect.arrayContaining([
      "authored label is rendered verbatim",
      "neutral icon and body remain available",
      "missing art never blocks play",
      "no first-party palette or fiction leaks into an imported cartridge",
    ]));
  });

  it("stages delegated update trust without adding an updater to v1", () => {
    expect(staging.updates).toMatchObject({
      automaticUpdaterInV1: false,
      candidateModel: "tuf-style-delegated-metadata",
      roles: ["root", "targets", "snapshot", "timestamp"],
    });
    expect(staging.updates.invariants).toEqual(expect.arrayContaining([
      "local installed version and highest accepted version prevent rollback",
      "failed activation preserves the prior working build and holder estate",
      "operator consent remains explicit for incompatible migrations",
    ]));
    expect(existsSync(resolve(ROOT, "src/world/updater"))).toBe(false);
  });

  it("keeps connected-operation v2 as Arc-owned staging", () => {
    expect(staging.connectedOperationReceiver).toMatchObject({
      format: "axm-connected-operation/v2-candidate",
    });
    expect(staging.connectedOperationReceiver.authority).toMatch(/Arc.*decision kernel.*own/i);
    const source = readFileSync(resolve(ROOT, "src/engine/connected-operation.ts"), "utf8");
    expect(source).toContain("axm-connected-operation/v1");
    expect(source).not.toContain("axm-connected-operation/v2");
  });

  it("does not smuggle the staged formats into current runtime source", () => {
    const runtimePaths = [
      "src/world/presentations.tsx",
      "src/world/theme-icons.ts",
      "src/world/cartridge.ts",
      "src/world/program-of-record.ts",
    ];
    for (const path of runtimePaths) {
      const source = readFileSync(resolve(ROOT, path), "utf8");
      expect(source).not.toContain("rodoh-presentation-manifest/v1");
      expect(source).not.toContain("axm-connected-operation/v2");
      expect(source).not.toMatch(/Program 006|lineage[- ]commons/i);
    }
  });
});
