// The arc <-> world bridge. Holds engine `org` state, compiles the active arc into
// a PlayScene, places its nodes on the planet via contract.ts, and resolves a node
// through the SAME deterministic engine seam the 2D demo uses (buildPlayAssignment
// + runCycle). The 3D scene is a pure view over this hook.

import { useCallback, useMemo, useState } from "react";
import type {
  Agent,
  Arc,
  Facility,
  InfrastructureFacility,
  Organization,
  RunReport,
} from "../engine/types.js";
import { runCycle } from "../engine/cycle.js";
import {
  FIRST_CHARTER,
  FIRST_CHARTER_STARTING_RELATIONSHIPS,
  FIRST_CHARTER_STARTING_ROSTER,
} from "../arcs/index.js";
import {
  buildPlayAssignment,
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
  type PlayReportView,
} from "../play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG, type WorldLayout, type WorldNode } from "./contract.js";

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) {
    out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  }
  return out as Record<InfrastructureFacility, Facility>;
}

function buildDemoOrg(): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of FIRST_CHARTER_STARTING_ROSTER) agents[agent.id] = { ...agent };
  return {
    id: "world-demo",
    name: "Playable World Charter",
    reputation: 0,
    resources: { currency: 100, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [...FIRST_CHARTER_STARTING_RELATIONSHIPS],
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: 424242,
  };
}

export interface ArcWorld {
  arc: Arc;
  layout: WorldLayout;
  nodes: WorldNode[];
  cycle: number;
  resources: {
    currency: number;
    tokens: number;
    reputation: number;
    currencyName: string;
    tokenName: string;
    reputationName: string;
  };
  /** Names of the party that would be auto-assigned to a given challenge. */
  partyFor: (challengeId: string) => string[];
  lastReport: PlayReportView | null;
  /** Resolve a challenge through the deterministic engine and advance state. */
  runChallenge: (challengeId: string) => void;
}

export function useArcWorld(arc: Arc = FIRST_CHARTER): ArcWorld {
  const [org, setOrg] = useState<Organization>(() => buildDemoOrg());
  const [lastReport, setLastReport] = useState<PlayReportView | null>(null);

  const scene = useMemo(() => compileArcToPlayScene(arc, org), [arc, org]);
  const layout = useMemo(() => buildWorldLayout(scene, DEFAULT_WORLD_CONFIG), [scene]);

  const partyFor = useCallback(
    (challengeId: string): string[] => {
      const challenge = arc.challenges.find((c) => c.id === challengeId);
      if (!challenge) return [];
      return recommendAgentsForChallenge(challenge, org, arc).map((id) => org.agents[id]?.name ?? id);
    },
    [arc, org],
  );

  const runChallenge = useCallback(
    (challengeId: string) => {
      const challenge = arc.challenges.find((c) => c.id === challengeId);
      if (!challenge) return;
      const node = scene.nodes.find((n) => n.challengeId === challengeId);
      if (node && node.status === "locked") return;
      const assignment = buildPlayAssignment(challenge, org, arc);
      const result = runCycle({ org, arc, assignments: [assignment] });
      setOrg(result.org);
      const report: RunReport | undefined = result.reports[0];
      setLastReport(report ? summarizeReport(report, arc) : null);
    },
    [arc, org, scene],
  );

  return {
    arc,
    layout,
    nodes: layout.nodes,
    cycle: scene.cycle,
    resources: scene.resources,
    partyFor,
    lastReport,
    runChallenge,
  };
}
