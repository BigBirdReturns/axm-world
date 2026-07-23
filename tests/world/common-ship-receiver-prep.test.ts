import { describe, expect, it } from "vitest";
import { compileCommonShipPocket } from "../../src/common-ship/compiler.js";
import { COMMON_SHIP_STARTER } from "../../src/common-ship/templates.js";
import type { WorldNode } from "../../src/world/contract.js";
import {
  deriveCommonShipView,
  inspectCommonShipWorld,
} from "../../src/world/common-ship/common-ship.js";

function nodesForSource(): WorldNode[] {
  return COMMON_SHIP_STARTER.watches.map((watch, index) => ({
    id: `node-${watch.id}`,
    challengeId: watch.id,
    title: watch.name,
    description: watch.description,
    status: index === 0 ? "cleared" : index === 1 ? "available" : "locked",
    difficulty: watch.difficulty,
    tierIndex: index,
    requirements: [],
    availableSinceCycle: index === 1 ? 2 : null,
    normal: [1, 0, 0],
    position: [10, 0, 0],
  }));
}

describe("Gate 6 Common Ship receiver preparation", () => {
  it("recognizes registered Common Ship source without compiling or repairing it in World", () => {
    const arc = compileCommonShipPocket(COMMON_SHIP_STARTER);
    const inspection = inspectCommonShipWorld(arc);
    expect(inspection.status).toBe("valid");
    if (inspection.status !== "valid") return;
    expect(inspection.source).toEqual(COMMON_SHIP_STARTER);
  });

  it("derives profiles, watch status, and ship state from existing authority", () => {
    const view = deriveCommonShipView({
      source: COMMON_SHIP_STARTER,
      nodes: nodesForSource(),
      cartridgeState: {
        "habitat-integrity": 3,
        "compatibility-debt": 2,
      },
      selectedChallengeId: COMMON_SHIP_STARTER.watches[1]?.id ?? null,
    });

    expect(view.profiles).toHaveLength(COMMON_SHIP_STARTER.embodimentProfiles.length);
    expect(view.profiles.flatMap((profile) => profile.cast).map((member) => member.id).sort()).toEqual(
      COMMON_SHIP_STARTER.cast.map((member) => member.id).sort(),
    );
    expect(view.watches[0]).toMatchObject({ cleared: true, active: false });
    expect(view.watches[1]).toMatchObject({ cleared: false, active: true });
    expect(view.availableChallengeId).toBe(COMMON_SHIP_STARTER.watches[1]?.id);
    expect(view.clearedCount).toBe(1);

    const state = new Map(view.shipState.map((track) => [track.source.kind, track]));
    expect(state.get("habitat-integrity")).toMatchObject({ value: 3, changed: true });
    expect(state.get("compatibility-debt")).toMatchObject({ value: 2, changed: true });
    expect(state.get("translation-trust")).toMatchObject({
      value: COMMON_SHIP_STARTER.shipState.find((track) => track.kind === "translation-trust")?.value,
      changed: false,
    });
    expect(view.hasChangedState).toBe(true);
  });

  it("does not manufacture composition verdicts or state transitions", () => {
    const view = deriveCommonShipView({
      source: COMMON_SHIP_STARTER,
      nodes: nodesForSource(),
      cartridgeState: {},
    });

    expect(Object.keys(view)).not.toEqual(expect.arrayContaining([
      "feasible",
      "compositionReceipts",
      "stateEffects",
      "resolvedOutcome",
    ]));
    expect(view.shipState.map((track) => track.value)).toEqual(
      COMMON_SHIP_STARTER.shipState.map((track) => track.value),
    );
  });
});
