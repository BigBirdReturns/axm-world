// The arc <-> world bridge. Given a cartridge's arc, it generates a populated org via
// the spoke's generic bootstrap (works for ANY arc, not just First Charter), compiles
// the arc into a PlayScene, places its nodes on the planet via contract.ts, and
// resolves a node through the SAME deterministic engine seam. The 3D scene and HUD are
// pure views over this hook.

import { useCallback, useMemo, useState } from "react";
import type { Arc, Organization, RunReport } from "../engine/types.js";
import type { ChallengeAssignment } from "../engine/cycle.js";
import { runCycle } from "../engine/cycle.js";
import { FIRST_CHARTER } from "../arcs/index.js";
import { bootstrapOrg } from "../spoke/bootstrap.js";
import {
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
  type PlayReportView,
  type PlayScene,
} from "../play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG, type WorldLayout, type WorldNode } from "./contract.js";
import { applyAgentDowntime, type DowntimeAction } from "./agent-management.js";

export interface RosterMember {
  id: string;
  name: string;
  role: string;
  stress: number;
  morale: number;
  downed: boolean;
}

export interface ChallengeReq {
  minAgents: number;
  maxAgents: number;
}

export interface ArcWorld {
  arc: Arc;
  scene: PlayScene;
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
  roster: RosterMember[];
  clearedCount: number;
  totalNodes: number;
  arcComplete: boolean;
  reqFor: (challengeId: string) => ChallengeReq;
  recommendedParty: (challengeId: string) => string[];
  lastReport: PlayReportView | null;
  /** Resolve a challenge with a chosen party through the deterministic engine. */
  runChallenge: (challengeId: string, agentIds: string[]) => void;
  /** Between-cycle management: rest/train/rally an agent (moves stress/morale). */
  applyDowntime: (agentId: string, action: DowntimeAction) => void;
}

export function useArcWorld(arc: Arc = FIRST_CHARTER): ArcWorld {
  const [org, setOrg] = useState<Organization>(() => bootstrapOrg(arc));
  const [lastReport, setLastReport] = useState<PlayReportView | null>(null);

  const scene = useMemo(() => compileArcToPlayScene(arc, org), [arc, org]);
  const layout = useMemo(() => buildWorldLayout(scene, DEFAULT_WORLD_CONFIG), [scene]);

  const roster = useMemo<RosterMember[]>(
    () =>
      Object.values(org.agents).map((a) => ({
        id: a.id,
        name: a.name,
        role: arc.roles.find((r) => r.id === a.role)?.name ?? a.role ?? "Flex",
        stress: Math.round(a.stress),
        morale: Math.round(a.morale),
        downed: a.downedUntilCycle !== null,
      })),
    [org, arc],
  );

  const reqFor = useCallback(
    (challengeId: string): ChallengeReq => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      return {
        minAgents: c?.rosterRequirements.minAgents ?? 1,
        maxAgents: c?.rosterRequirements.maxAgents ?? 1,
      };
    },
    [arc],
  );

  const recommendedParty = useCallback(
    (challengeId: string): string[] => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      return c ? recommendAgentsForChallenge(c, org, arc) : [];
    },
    [arc, org],
  );

  const runChallenge = useCallback(
    (challengeId: string, agentIds: string[]) => {
      const challenge = arc.challenges.find((c) => c.id === challengeId);
      if (!challenge) return;
      const node = scene.nodes.find((n) => n.challengeId === challengeId);
      if (node && node.status !== "available") return; // gate: only available nodes run
      const assignment: ChallengeAssignment = {
        challengeId,
        agentIds: agentIds.slice(0, challenge.rosterRequirements.maxAgents),
        tokensSpent: org.resources.tokens > 0 ? 1 : 0,
      };
      const result = runCycle({ org, arc, assignments: [assignment] });
      setOrg(result.org);
      const report: RunReport | undefined = result.reports[0];
      setLastReport(report ? summarizeReport(report, arc) : null);
    },
    [arc, org, scene],
  );

  const applyDowntime = useCallback((agentId: string, action: DowntimeAction) => {
    setOrg((cur) => applyAgentDowntime(cur, agentId, action));
  }, []);

  const clearedCount = layout.nodes.filter((n) => n.status === "cleared").length;
  const totalNodes = layout.nodes.length;

  return {
    arc,
    scene,
    layout,
    nodes: layout.nodes,
    cycle: scene.cycle,
    resources: scene.resources,
    roster,
    clearedCount,
    totalNodes,
    arcComplete: totalNodes > 0 && clearedCount === totalNodes,
    reqFor,
    recommendedParty,
    lastReport,
    runChallenge,
    applyDowntime,
  };
}
