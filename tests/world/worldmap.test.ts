// The world-map projection is the "Planet-node" leg: the same WorldNode list the
// board reads, grouped into regions with derived state. These tests pin that it is
// a projection (region name = progression tier, state = engine status + selection),
// not a hand-placed map — and that a cleared node reads as recorded.

import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG } from "../../src/world/contract.js";
import { groupNodesByRegion, mapNodeState } from "../../src/world/worldmap/derive.js";

function nodesFor(org = bootstrapOrg(FIRST_CHARTER)) {
  const scene = compileArcToPlayScene(FIRST_CHARTER, org);
  return buildWorldLayout(scene, DEFAULT_WORLD_CONFIG).nodes;
}

describe("world-map projection", () => {
  it("groups nodes into regions named by the progression tier", () => {
    const regions = groupNodesByRegion(nodesFor(), FIRST_CHARTER, null);
    expect(regions.map((r) => r.name)).toContain("Proving Grounds");
    // Every location came from a real node; nothing invented.
    const allTitles = regions.flatMap((r) => r.locations.map((l) => l.title));
    expect(allTitles).toContain("The Cellar");
    // Regions preserve tier order.
    expect(regions.map((r) => r.tierIndex)).toEqual([...regions.map((r) => r.tierIndex)].sort((a, b) => a - b));
  });

  it("derives the four map states from status + selection", () => {
    const nodes = nodesFor();
    const cellar = nodes.find((n) => n.challengeId === "cellar")!;
    // Available by default; becomes 'active' when it is the selected node.
    expect(mapNodeState(cellar, null)).toBe("available");
    expect(mapNodeState(cellar, "cellar")).toBe("active");
    // A locked node stays locked regardless of selection.
    const locked = nodes.find((n) => n.status === "locked");
    if (locked) expect(mapNodeState(locked, locked.challengeId)).toBe("locked");
  });

  it("a cleared contract reads as a recorded location", () => {
    // Simulate a clear by stamping a success record, the same signal the board reads.
    const org = bootstrapOrg(FIRST_CHARTER);
    const someAgent = Object.values(org.agents)[0]!;
    someAgent.assignmentHistory = [
      ...someAgent.assignmentHistory,
      { challengeId: "cellar", cycle: 0, outcome: "success", performanceRating: 1 } as never,
    ];
    const regions = groupNodesByRegion(nodesFor(org), FIRST_CHARTER, null);
    const cellarLoc = regions.flatMap((r) => r.locations).find((l) => l.challengeId === "cellar")!;
    expect(cellarLoc.state).toBe("recorded");
  });
});
