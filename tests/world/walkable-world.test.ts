import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { isWorldInteractionUnlocked, isWorldNodeWithinRange, nearestWorldNode } from "../../src/world/proximity.js";
import type { WorldNode } from "../../src/world/contract.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function node(challengeId: string, position: [number, number, number]): WorldNode {
  return {
    id: `node-${challengeId}`,
    challengeId,
    title: challengeId,
    description: "",
    status: "available",
    difficulty: 1,
    tierIndex: 0,
    requirements: [],
    availableSinceCycle: 1,
    normal: [0, 1, 0],
    position,
  };
}

describe("walkable world vertical slice", () => {
  it("selects only the nearest authored place inside interaction range", () => {
    const nodes = [node("far", [5, 0, 0]), node("near", [1, 0, 0])];
    expect(nearestWorldNode([0, 0, 0], nodes, 2)?.challengeId).toBe("near");
    expect(nearestWorldNode([0, 0, 0], nodes, 0.5)).toBeNull();
    expect(isWorldNodeWithinRange([0, 0, 0], nodes[1]!, 2)).toBe(true);
    expect(isWorldNodeWithinRange([0, 0, 0], nodes[1]!, 0.5)).toBe(false);
  });

  it("keeps remote selection informational until physical proximity matches", () => {
    expect(isWorldInteractionUnlocked(null, null)).toBe(false);
    expect(isWorldInteractionUnlocked("cellar", null)).toBe(false);
    expect(isWorldInteractionUnlocked("cellar", "bridge-troll")).toBe(false);
    expect(isWorldInteractionUnlocked("cellar", "cellar")).toBe(true);
  });

  it("assembles controller, avatar, follow camera, terrain and contract proximity in World", () => {
    const source = read("src/world/WorldScreen.tsx");
    expect(source).toContain("<PlanetController");
    expect(source).toContain("<PlayerCharacter");
    expect(source).toContain("<FollowCamera");
    expect(source).toContain("nearestWorldNode");
    expect(source).toContain("ix.select(nearby.challengeId)");
    expect(source).toContain("ix.setNearbyId(nextId)");
    expect(source).toContain("INTERACTION_EXIT_RADIUS");
    expect(source).toContain("setVirtualWorldInput({ x: 0, y: 0, jump: false })");
    expect(source).toContain('data-testid="world-movement-pad"');
    expect(source).toContain("onClick={() => scheduleTapMovement({ y: 1 })}");
    const input = read("src/world/core/input.ts");
    expect(input).toContain("releaseVirtualMovement");
    expect(input).toContain("impulse?: boolean");
    expect(input).toContain("stateRef.current.impulse.x += detail.x ?? 0");
    expect(input).toContain("virtualRef.current = { x: 0, y: 0, jump: false }");
    const controller = read("src/world/core/PlanetController.tsx");
    expect(controller).toContain("sim.position.addScaledVector(tmp.impulseDir, 0.9)");
    expect(source).toContain('data-testid="world-proximity-status"');
    expect(source).not.toContain("onSelect={ix.select}");
    expect(source).not.toContain("OrbitControls");
  });

  it("gates shared shell actions on physical custody while World is active", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain('active.id !== "globe" || isWorldInteractionUnlocked(ix.selectedId, ix.nearbyId)');
    expect(shell).toContain("const selectionActive = selectionVisible && ix.selected?.status === \"available\"");
    expect(shell).toContain("const contractProps = ix.selected && selectionVisible");
  });

  it("keeps resolution and durable recording outside the renderer", () => {
    const screen = read("src/world/WorldScreen.tsx");
    const world = read("src/world/useArcWorld.ts");
    expect(screen).not.toContain("runChallenge(");
    expect(screen).not.toContain("appendResult(");
    expect(screen).not.toContain("saveRun(");
    expect(world).toContain("appendResult(");
    expect(world).toContain("saveRun(");
    expect(screen).toContain("changedId={world.lastReport?.challengeId}");
  });

  it("renders cleared locations as durable transformations, not session-only highlights", () => {
    const markers = read("src/world/components/NodeMarkers.tsx");
    const exportState = read("src/world/useArcWorld.ts");
    expect(markers).toContain('const transformed = node.status === "cleared"');
    expect(exportState).toContain("buildCustodyObject({ cartridge, org, openingChoice, nodes: layout.nodes, ledger, openingChoiceId })");
  });
});
