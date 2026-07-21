import { describe, expect, it } from "vitest";
import { FIRST_CHARTER_CARTRIDGE, KARAZHAN_CARTRIDGE, KIND_GODS_OF_ILYON_CARTRIDGE } from "../../src/world/cartridge.js";
import { initialRuntimeMemory } from "../../src/world/runtime/RuntimeRouter.js";
import { RODOH_EXPERIENCE_EXTENSION, RODOH_RUNTIME_EXTENSION } from "../../src/world/portable-run.js";
import type { ArcWorld } from "../../src/world/useArcWorld.js";

function world(overrides: Partial<ArcWorld> = {}): ArcWorld {
  return {
    cartridge: FIRST_CHARTER_CARTRIDGE,
    arc: FIRST_CHARTER_CARTRIDGE.arc,
    cartridgeDigest: "cart1_test",
    extensions: {},
    ledger: { version: 2, authoredArcDigest: "cart1_test", entries: [] },
    arcComplete: false,
    ...overrides,
  } as ArcWorld;
}

describe("RuntimeRouter entry direction", () => {
  it("uses the digest-bound Program 001 direction only for a fresh exact cartridge", () => {
    expect(initialRuntimeMemory(world()).mode).toBe("guided");
    expect(initialRuntimeMemory(world({
      ledger: {
        version: 2,
        authoredArcDigest: "cart1_test",
        entries: [{ seq: 0 }] as ArcWorld["ledger"]["entries"],
      },
    })).mode).toBe("shell");
  });

  it("keeps a reload guided while the experience checkpoint survives — a recorded resolution is not a handoff", () => {
    const midGuided = world({
      ledger: {
        version: 2,
        authoredArcDigest: "cart1_test",
        entries: [{ seq: 0 }] as ArcWorld["ledger"]["entries"],
      },
      extensions: { [RODOH_EXPERIENCE_EXTENSION]: { version: 1 } },
    });
    expect(initialRuntimeMemory(midGuided).mode).toBe("guided");

    // A completed campaign returns to the shell even if a checkpoint lingers.
    expect(initialRuntimeMemory(world({
      arcComplete: true,
      extensions: { [RODOH_EXPERIENCE_EXTENSION]: { version: 1 } },
    })).mode).toBe("shell");
  });

  it("sends other cartridges directly to the reusable runtime", () => {
    expect(initialRuntimeMemory(world({
      cartridge: KARAZHAN_CARTRIDGE,
      arc: KARAZHAN_CARTRIDGE.arc,
    })).mode).toBe("shell");
    expect(initialRuntimeMemory(world({
      cartridge: KIND_GODS_OF_ILYON_CARTRIDGE,
      arc: KIND_GODS_OF_ILYON_CARTRIDGE.arc,
    })).mode).toBe("shell");

    const sameIdDifferentLaw = {
      ...FIRST_CHARTER_CARTRIDGE,
      arc: {
        ...FIRST_CHARTER_CARTRIDGE.arc,
        meta: { ...FIRST_CHARTER_CARTRIDGE.arc.meta, version: "99.0.0" },
      },
    };
    expect(initialRuntimeMemory(world({
      cartridge: sameIdDifferentLaw,
      arc: sameIdDifferentLaw.arc,
    })).mode).toBe("shell");
  });

  it("restores a holder's exact runtime representation before applying defaults", () => {
    const restored = initialRuntimeMemory(world({
      extensions: {
        [RODOH_RUNTIME_EXTENSION]: {
          version: 1,
          mode: "shell",
          representation: "aperture",
        },
      },
    }));
    expect(restored).toEqual({ version: 1, mode: "shell", representation: "aperture" });
  });
});
