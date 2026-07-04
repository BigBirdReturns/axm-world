// The world-map projection is the "Planet-node" leg: the same WorldNode list the
// board reads, grouped into regions with derived state. These tests pin that it is
// a projection (region name = progression tier, state = engine status + selection),
// not a hand-placed map — that a cleared node reads as recorded, and that the three
// strategic reads the map layers on (region progress, arc-relative steepness, and
// the single "next" contract shared with the inhabited hall) are all derived from
// existing state, never invented.

import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG } from "../../src/world/contract.js";
import { deriveWorldMap, mapNodeState } from "../../src/world/worldmap/derive.js";
import { MAP_LEGEND, type MapMarker } from "../../src/world/worldmap/legend.js";
import { deriveHallView } from "../../src/world/inhabited/hall.js";
import { regionNameForTier } from "../../src/world/progression.js";
import { formatMessage } from "../../src/world/i18n/messages.js";

function nodesFor(org = bootstrapOrg(FIRST_CHARTER)) {
  const scene = compileArcToPlayScene(FIRST_CHARTER, org);
  return buildWorldLayout(scene, DEFAULT_WORLD_CONFIG).nodes;
}

/** Stamp a success record for a challenge — the same signal the board reads to mark
 *  a node cleared. */
function clearing(org: ReturnType<typeof bootstrapOrg>, challengeId: string): ReturnType<typeof bootstrapOrg> {
  const someAgent = Object.values(org.agents)[0]!;
  someAgent.assignmentHistory = [
    ...someAgent.assignmentHistory,
    { challengeId, cycle: 0, outcome: "success", performanceRating: 1 } as never,
  ];
  return org;
}

describe("world-map projection", () => {
  it("groups nodes into regions named by the progression tier", () => {
    const map = deriveWorldMap(nodesFor(), FIRST_CHARTER, null);
    expect(map.regions.map((r) => r.name)).toContain("Proving Grounds");
    // Every location came from a real node; nothing invented.
    const allTitles = map.regions.flatMap((r) => r.locations.map((l) => l.title));
    expect(allTitles).toContain("The Cellar");
    // Regions preserve tier order.
    expect(map.regions.map((r) => r.tierIndex)).toEqual([...map.regions.map((r) => r.tierIndex)].sort((a, b) => a - b));
    // The overall roll-up counts every node.
    expect(map.total).toBe(map.regions.reduce((s, r) => s + r.locations.length, 0));
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

  it("a cleared contract reads as a recorded location and lifts region + overall progress", () => {
    const map = deriveWorldMap(nodesFor(clearing(bootstrapOrg(FIRST_CHARTER), "cellar")), FIRST_CHARTER, null);
    const cellarLoc = map.regions.flatMap((r) => r.locations).find((l) => l.challengeId === "cellar")!;
    expect(cellarLoc.state).toBe("recorded");
    // Overall recorded count moved, and the cellar's region reports 1 recorded.
    expect(map.recorded).toBe(1);
    const provingGrounds = map.regions.find((r) => r.locations.some((l) => l.challengeId === "cellar"))!;
    expect(provingGrounds.recorded).toBe(1);
  });

  it("rolls each region up to a locked / active / complete status from its locations", () => {
    // Cold start: tier-1 (Proving Grounds) is open, tier-2 is entirely locked.
    const cold = deriveWorldMap(nodesFor(), FIRST_CHARTER, null);
    const proving = cold.regions.find((r) => r.name === "Proving Grounds")!;
    const later = cold.regions.find((r) => r.name !== "Proving Grounds")!;
    expect(proving.status).toBe("active");
    expect(later.status).toBe("locked");

    // Clear every challenge in Proving Grounds → that region reads complete.
    let org = bootstrapOrg(FIRST_CHARTER);
    for (const id of ["cellar", "bridge-troll", "merchant-escort"]) org = clearing(org, id);
    const done = deriveWorldMap(nodesFor(org), FIRST_CHARTER, null);
    expect(done.regions.find((r) => r.name === "Proving Grounds")!.status).toBe("complete");
  });

  it("flags high-authored-difficulty contracts as steep, arc-relative — not the easy ones", () => {
    const map = deriveWorldMap(nodesFor(), FIRST_CHARTER, null);
    const byId = new Map(map.regions.flatMap((r) => r.locations).map((l) => [l.challengeId, l] as const));
    // First Charter's difficulty range is 10..55; the top band (>= 37) is steep.
    expect(byId.get("wardens-keep")!.steep).toBe(true); // 55
    expect(byId.get("bandit-camp")!.steep).toBe(true); // 40
    expect(byId.get("cellar")!.steep).toBe(false); // 10
    expect(byId.get("bridge-troll")!.steep).toBe(false); // 18
  });

  it("a flat-difficulty arc produces no steepness signal", () => {
    // A synthetic node set where every contract is equally hard has no upper band,
    // so nothing reads as steep (avoids a meaningless all-or-nothing warning).
    const nodes = nodesFor().map((n) => ({ ...n, difficulty: 20 }));
    const map = deriveWorldMap(nodes, FIRST_CHARTER, null);
    expect(map.regions.flatMap((r) => r.locations).every((l) => !l.steep)).toBe(true);
  });

  it("marks exactly one 'next' contract, and it is the same node the hall's steward holds", () => {
    const nodes = nodesFor();
    const map = deriveWorldMap(nodes, FIRST_CHARTER, null);
    const nextLocs = map.regions.flatMap((r) => r.locations).filter((l) => l.next);
    expect(nextLocs).toHaveLength(1);
    // Map ↔ hall agreement: the highlighted contract is the steward's held contract.
    expect(map.nextChallengeId).toBe(deriveHallView(nodes).challengeId);
    expect(nextLocs[0]!.challengeId).toBe(map.nextChallengeId);
    // Cold start, the first available contract is The Cellar.
    expect(map.nextChallengeId).toBe("cellar");
  });

  it("names the steward's held contract and the map's next pin by the SAME region", () => {
    // The map's next pin and the hall's held contract are already proven to be the
    // same node; this pins that both surfaces NAME its place identically, via the
    // shared regionNameForTier — so the player reads one place, not two systems.
    const nodes = nodesFor();
    const map = deriveWorldMap(nodes, FIRST_CHARTER, null);
    const hall = deriveHallView(nodes);
    const heldNode = nodes.find((n) => n.challengeId === hall.challengeId)!;
    const nextRegion = map.regions.find((r) => r.locations.some((l) => l.challengeId === map.nextChallengeId))!;
    expect(regionNameForTier(FIRST_CHARTER, heldNode.tierIndex)).toBe(nextRegion.name);
    // Cold start, that shared region is Proving Grounds.
    expect(nextRegion.name).toBe("Proving Grounds");
  });

  it("regionNameForTier returns the authored tier name, with a neutral fallback for an undefined tier", () => {
    expect(regionNameForTier(FIRST_CHARTER, 0)).toBe("Proving Grounds");
    expect(regionNameForTier(FIRST_CHARTER, 1)).toBe("The Contract");
    expect(regionNameForTier(FIRST_CHARTER, 999)).toBe("The Field");
  });

  it("moves 'next' forward as contracts are recorded, and drops it once all are cleared", () => {
    // Clear the cellar: the next contract advances to the following available node,
    // still in lockstep with the hall.
    const afterCellar = nodesFor(clearing(bootstrapOrg(FIRST_CHARTER), "cellar"));
    const map = deriveWorldMap(afterCellar, FIRST_CHARTER, null);
    expect(map.nextChallengeId).not.toBe("cellar");
    expect(map.nextChallengeId).toBe(deriveHallView(afterCellar).challengeId);

    // Clear everything: the steward is fulfilled, so there is no next node to mark.
    let org = bootstrapOrg(FIRST_CHARTER);
    for (const id of ["cellar", "bridge-troll", "merchant-escort", "mine-collapse", "bandit-camp", "wardens-keep"]) {
      org = clearing(org, id);
    }
    const allDone = deriveWorldMap(nodesFor(org), FIRST_CHARTER, null);
    expect(allDone.nextChallengeId).toBeNull();
    expect(allDone.regions.flatMap((r) => r.locations).some((l) => l.next)).toBe(false);
  });
});

describe("world-map legend", () => {
  // Every distinct marker WorldMap.tsx actually paints on a pin, derived exactly as
  // the component renders it: the node state always, plus the "steep" overlay (shown
  // unless recorded) and the shared "next" tag. This is the ground truth the legend
  // must explain — no marker unexplained, none invented.
  function markersRendered(map: ReturnType<typeof deriveWorldMap>): Set<MapMarker> {
    const seen = new Set<MapMarker>();
    for (const loc of map.regions.flatMap((r) => r.locations)) {
      seen.add(loc.state);
      if (loc.steep && loc.state !== "recorded") seen.add("steep");
      if (loc.next) seen.add("next");
    }
    return seen;
  }

  it("explains exactly the marker set the map can render — no marker unexplained, none invented", () => {
    // Drive First Charter through the states that surface every marker: a cold map
    // (available / locked / steep / next), one with a pin selected (active), and one
    // with a contract cleared (recorded).
    const seen = new Set<MapMarker>();
    for (const m of markersRendered(deriveWorldMap(nodesFor(), FIRST_CHARTER, null))) seen.add(m);
    for (const m of markersRendered(deriveWorldMap(nodesFor(), FIRST_CHARTER, "cellar"))) seen.add(m);
    const cleared = nodesFor(clearing(bootstrapOrg(FIRST_CHARTER), "cellar"));
    for (const m of markersRendered(deriveWorldMap(cleared, FIRST_CHARTER, null))) seen.add(m);

    // All six markers actually appeared, so the scenarios are honest…
    expect(seen).toEqual(new Set<MapMarker>(["available", "active", "recorded", "locked", "steep", "next"]));
    // …and the legend covers that set exactly — bijection, no gaps, no extras.
    expect(new Set(MAP_LEGEND.map((e) => e.marker))).toEqual(seen);
  });

  it("lists each marker once and resolves every term + gloss in both locales", () => {
    const markers = MAP_LEGEND.map((e) => e.marker);
    expect(new Set(markers).size).toBe(markers.length);
    for (const entry of MAP_LEGEND) {
      for (const id of [entry.term, entry.gloss] as const) {
        // A catalogued id never falls through to returning the raw id.
        expect(formatMessage("en", id)).not.toBe(id);
        expect(formatMessage("zh-Hant", id)).not.toBe(id);
      }
    }
  });
});
