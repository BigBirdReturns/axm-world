import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RUNTIME_FAMILY_EXTENSION_KEY,
  RUNTIME_FAMILY_FORMAT,
  type RuntimeFamily,
} from "../../src/engine/runtime-family.js";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import type { Arc } from "../../src/engine/types.js";
import { parseCartridge } from "../../src/world/cartridge.js";
import { resolveRuntimeHost } from "../../src/world/runtime/host-registry.js";
import { compileProjectionManifest, validateProjectionManifest } from "../../src/world/forge/projection.js";
import { compileWorldForgePlanV2 } from "../../src/world/forge/compile-v2.js";
import { cartridgeFixture, storyFixture } from "./aperture/fixtures.js";
import { strategyBoardProgramExtension } from "../fixtures/strategy-board-program.js";

const cleanRoom = parseCartridge(JSON.parse(readFileSync(
  new URL("../../cartridges/clean-room/orchard-at-low-tide.arc.json", import.meta.url), "utf8",
)));

function withFamily(arc: Arc, family: RuntimeFamily): Arc {
  const next = structuredClone(arc);
  next.extensions = {
    ...next.extensions,
    [RUNTIME_FAMILY_EXTENSION_KEY]: { format: RUNTIME_FAMILY_FORMAT, family },
    ...(family === "strategy-board" ? strategyBoardProgramExtension() : {}),
  };
  return next;
}
describe("circulation convergence", () => {
  it("lets explicit authored runtime family select the compatible host", () => {
    const simulation = withFamily(cleanRoom.arc, "encounter-simulation");
    expect(resolveRuntimeHost(simulation)).toEqual({ ok: true, selection: { host: "simulation" } });

    const story = storyFixture();
    const storyArc = withFamily(cartridgeFixture(story).arc, "fixed-canonical-sequence");
    expect(resolveRuntimeHost(storyArc)).toMatchObject({
      ok: true,
      selection: { host: "canonical-story", story },
    });
  });

  it("refuses explicit family contradictions instead of falling through", () => {
    const story = storyFixture();
    const storyAsSimulation = withFamily(cartridgeFixture(story).arc, "encounter-simulation");
    expect(resolveRuntimeHost(storyAsSimulation)).toMatchObject({
      ok: false,
      refusal: { testId: "runtime-family-mismatch" },
    });

    const simulationAsStory = withFamily(cleanRoom.arc, "fixed-canonical-sequence");
    expect(resolveRuntimeHost(simulationAsStory)).toMatchObject({
      ok: false,
      refusal: { testId: "missing-runtime-authority" },
    });
  });
  it("routes strategy-board only when authored program authority is present", () => {
    const strategy = withFamily(cleanRoom.arc, "strategy-board");
    expect(resolveRuntimeHost(strategy)).toMatchObject({
      ok: true,
      selection: { host: "strategy-board" },
    });
    const manifest = compileProjectionManifest(strategy);
    expect(manifest.runtime).toMatchObject({
      family: "strategy-board",
      authority: "axm.strategy-board@1",
      selection: "explicit",
    });
    expect(manifest.verbs.some((verb) => verb.operation === "move")).toBe(true);
    expect(manifest.verbs.some((verb) => verb.operation === "program-action")).toBe(true);
    expect(manifest.terminalConditions.every((entry) => entry.scope === "run")).toBe(true);
  });

  it("preserves legacy host behavior while future family versions cannot fallback", () => {
    expect(resolveRuntimeHost(cleanRoom.arc)).toEqual({ ok: true, selection: { host: "simulation" } });
    const story = storyFixture();
    expect(resolveRuntimeHost(cartridgeFixture(story).arc)).toMatchObject({
      ok: true,
      selection: { host: "canonical-story" },
    });

    const future = structuredClone(cleanRoom.arc);
    future.extensions = { ...future.extensions, "axm.runtime-family@2": { family: "encounter-simulation" } };
    expect(resolveRuntimeHost(future)).toMatchObject({
      ok: false,
      refusal: { testId: "unsupported-runtime-family" },
    });
  });

  it("binds projection and Forge v2 to the selected runtime without moving cart1 law", () => {
    const simulation = withFamily(cleanRoom.arc, "encounter-simulation");
    const digest = cartridgeDigest(simulation);
    const manifest = compileProjectionManifest(simulation);
    expect(manifest.runtime).toMatchObject({
      family: "encounter-simulation",
      authority: "runCycle",
      selection: "explicit",
    });
    expect(manifest.cartridge.digest).toBe(digest);
    expect(manifest.verbs.some((entry) => entry.operation === "commit")).toBe(true);
    const plan = compileWorldForgePlanV2(manifest);
    expect(plan.manifest.runtime).toEqual(manifest.runtime);
    expect(plan.jobs.every((job) => job.requirements.runtime.family === "encounter-simulation")).toBe(true);

    const presentationVariant = structuredClone(manifest);
    presentationVariant.expressionSlots[0]!.brief += " Alternate presentation treatment.";
    const alternate = compileWorldForgePlanV2(presentationVariant);
    expect(alternate.cartridge.digest).toBe(digest);
    expect(alternate.planDigest).not.toBe(plan.planDigest);
    expect(cartridgeDigest(simulation)).toBe(digest);
  });

  it("binds fixed sequence projections to sequence verbs only", () => {
    const story = storyFixture();
    const arc = withFamily(cartridgeFixture(story).arc, "fixed-canonical-sequence");
    const manifest = compileProjectionManifest(arc);
    expect(manifest.runtime.family).toBe("fixed-canonical-sequence");
    expect(new Set(manifest.verbs.map((verb) => verb.operation))).toEqual(new Set(["inspect", "next", "previous"]));
    expect(manifest.terminalConditions).toHaveLength(0);
    expect(compileWorldForgePlanV2(manifest).jobs.every((job) =>
      job.requirements.runtime.family === "fixed-canonical-sequence")).toBe(true);
  });

  it("rejects a manifest whose runtime binding is edited away from its Arc", () => {
    const arc = withFamily(cleanRoom.arc, "encounter-simulation");
    const manifest = compileProjectionManifest(arc);
    const tampered = structuredClone(manifest);
    tampered.runtime.family = "fixed-canonical-sequence";
    tampered.runtime.authority = "axm.canonical-story@1";
    tampered.runtime.contract = {
      format: RUNTIME_FAMILY_FORMAT,
      family: "fixed-canonical-sequence",
    };
    expect(() => validateProjectionManifest(tampered, arc)).toThrow(/runtime family|authority/i);
  });
});
