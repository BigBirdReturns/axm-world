// Gate parity with the hub (engine:sync @ axm-arc 35a4e2b): world's board must
// render the SAME gate decisions runCycle enforces — milestone gates AND
// attunement gates — and expose difficulty modes only where the cartridge
// authors them. Exercised against the vendored Karazhan arc, whose Curator
// (Master's Key, half the party) and Nightbane (Blackened Urn bearer) are the
// two attunement shapes the engine supports.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import type { Agent, Facility, InfrastructureFacility, Organization } from "../../src/engine/types.js";
import { FIRST_CHARTER, KARAZHAN, KARAZHAN_STARTING_ROSTER } from "../../src/arcs/index.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  return out as Record<InfrastructureFacility, Facility>;
}

function karazhanOrg(mutate?: (agents: Record<string, Agent>) => void): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of KARAZHAN_STARTING_ROSTER) {
    agents[agent.id] = { ...agent, assignmentHistory: [...agent.assignmentHistory] };
  }
  mutate?.(agents);
  return {
    id: "gate-parity-test",
    name: "Gate Parity Test",
    reputation: 0,
    resources: { currency: 150, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [],
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: 77,
  };
}

const wing1 = [
  { challengeId: "attumen", cycle: 1, outcome: "success" as const },
  { challengeId: "moroes", cycle: 2, outcome: "success" as const },
  { challengeId: "maiden", cycle: 3, outcome: "success" as const },
  { challengeId: "opera", cycle: 4, outcome: "success" as const },
];

describe("attunement gates on the board (acceptance 4-6)", () => {
  it("fresh org: wing-1 available, Orrery Warden locked by the Surveyor's Key", () => {
    const scene = compileArcToPlayScene(KARAZHAN, karazhanOrg());
    const byId = new Map(scene.nodes.map((n) => [n.challengeId, n]));
    expect(byId.get("attumen")!.status).toBe("available");
    expect(byId.get("curator")!.status).toBe("locked");
    // The lock renders its reason: the authored chain name, not an id.
    expect(byId.get("curator")!.requirements.join(" ")).toContain("The Surveyor's Key");
    expect(byId.get("curator")!.requirements.join(" ")).toContain("50% of party");
  });

  it("milestones alone do not open the Curator — the attunement half must also hold", () => {
    // Only 3 of 10 raiders are tower-proven: opera-cleared milestone is met,
    // but ceil(0.5 * minAgents 7) = 4 attuned are needed to field any party.
    const roster = Object.keys(karazhanOrg().agents).slice(0, 3);
    const org = karazhanOrg((agents) => {
      for (const id of roster) agents[id]!.assignmentHistory = [...wing1];
    });
    const scene = compileArcToPlayScene(KARAZHAN, org);
    expect(scene.nodes.find((n) => n.challengeId === "curator")!.status).toBe("locked");
  });

  it("half the raid attuned opens the Curator", () => {
    const org = karazhanOrg((agents) => {
      for (const id of Object.keys(agents).slice(0, 5)) agents[id]!.assignmentHistory = [...wing1];
    });
    const scene = compileArcToPlayScene(KARAZHAN, org);
    expect(scene.nodes.find((n) => n.challengeId === "curator")!.status).toBe("available");
  });

  it("The Bell-Woken Wyrm stays locked after the Cinder Prince until an attuned agent holds the urn", () => {
    const spire = [...wing1,
      { challengeId: "curator", cycle: 5, outcome: "success" as const },
      { challengeId: "aran", cycle: 6, outcome: "success" as const },
      { challengeId: "prince", cycle: 7, outcome: "success" as const },
    ];
    const withoutUrn = karazhanOrg((agents) => {
      for (const id of Object.keys(agents)) agents[id]!.assignmentHistory = [...spire];
    });
    const locked = compileArcToPlayScene(KARAZHAN, withoutUrn);
    const lockedNode = locked.nodes.find((n) => n.challengeId === "nightbane")!;
    expect(lockedNode.status).toBe("locked");
    expect(lockedNode.requirements.join(" ")).toContain("The Bell-Blackened Urn");

    const withUrn = karazhanOrg((agents) => {
      for (const id of Object.keys(agents)) agents[id]!.assignmentHistory = [...spire];
      const bearer = Object.values(agents)[0]!;
      bearer.rewardHistory = [{ itemId: "blackened-urn", cycle: 7, challengeId: "prince" }];
    });
    const open = compileArcToPlayScene(KARAZHAN, withUrn);
    expect(open.nodes.find((n) => n.challengeId === "nightbane")!.status).toBe("available");
  });
});

describe("difficulty mode exposure (acceptance 7)", () => {
  it("the shell renders the picker only for cartridges that author modes", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('data-testid="difficulty-mode-picker"');
    expect(regions).toContain("difficultyModes.length > 0");
    const world = read("src/world/useArcWorld.ts");
    expect(world).toContain("difficultyModeId");
    // First Charter authors no modes; Karazhan authors heroic.
    expect(FIRST_CHARTER.difficultyModes).toHaveLength(0);
    expect(KARAZHAN.difficultyModes.map((m) => m.id)).toEqual(["heroic"]);
  });
});

describe("first-charter regression (acceptance 8)", () => {
  it("first-charter boards compile with the same gates as before the sync", () => {
    const agents: Record<string, Agent> = {};
    for (const a of KARAZHAN_STARTING_ROSTER) agents[a.id] = { ...a };
    const scene = compileArcToPlayScene(FIRST_CHARTER, { ...karazhanOrg(), agents: {} });
    const byId = new Map(scene.nodes.map((n) => [n.challengeId, n]));
    expect(byId.get("cellar")!.status).toBe("available");
    expect(byId.get("wardens-keep")!.status).toBe("locked");
    // mine-collapse is attunement-gated by the Veteran of the Charter chain —
    // world now renders that gate too, matching hub enforcement.
    expect(byId.get("mine-collapse")!.status).toBe("locked");
    expect(byId.get("mine-collapse")!.requirements.join(" ")).toContain("Veteran of the Charter");
  });
});
