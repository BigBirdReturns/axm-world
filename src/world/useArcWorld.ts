// The cartridge <-> world bridge. The player reads a cartridge: it bootstraps a
// populated org from the cartridge's arc, enqueues the cartridge's AUTHORED opening
// decision as a real drama card, and resolves every choice through the deterministic
// engine (runCycle, resolveDramaCard). axm-world authors nothing — it surfaces what
// the cartridge holds and shows what the engine returns. It also builds the custody
// object (manifest + arc + run state) so the cartridge can leave intact.

import { useCallback, useMemo, useState } from "react";
import type { Arc, DramaCard, DramaCardEffect, Organization, RunReport } from "../engine/types.js";
import type { ChallengeAssignment } from "../engine/cycle.js";
import { runCycle } from "../engine/cycle.js";
import { resolveDramaCard } from "../engine/drama.js";
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
import { FIRST_CHARTER_CARTRIDGE, type AuthoredEffect, type AuthoredOpening, type Cartridge } from "./cartridge.js";

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

export interface CustodyObject {
  format: "axm-cartridge-run/v1";
  manifest: Cartridge["manifest"];
  arc: Arc;
  runState: {
    cycle: number;
    openingChoice: string | null;
    clearedCount: number;
    totalNodes: number;
    roster: Array<{ name: string; morale: number; stress: number }>;
  };
}

export interface ArcWorld {
  cartridge: Cartridge;
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
  dispatches: DramaCard[];
  /** The authored/pending decision at the front of the queue, or null. */
  pendingDecision: DramaCard | null;
  /** The opening choice the player made (label), once made. */
  openingChoice: string | null;
  reqFor: (challengeId: string) => ChallengeReq;
  recommendedParty: (challengeId: string) => string[];
  lastReport: PlayReportView | null;
  runChallenge: (challengeId: string, agentIds: string[]) => void;
  resolveDecision: (optionId: string) => void;
  applyDowntime: (agentId: string, action: DowntimeAction) => void;
  /** The portable custody object: manifest + arc + run state. */
  buildExport: () => CustodyObject;
}

function expandEffects(effects: AuthoredEffect[], agentIds: string[]): DramaCardEffect[] {
  const out: DramaCardEffect[] = [];
  for (const e of effects) for (const id of agentIds) out.push({ target: id, type: e.type, value: e.value });
  return out;
}

function buildOpeningCard(opening: AuthoredOpening, org: Organization): DramaCard {
  const agentIds = Object.keys(org.agents);
  return {
    id: `opening:${opening.triggerType}`,
    cycleGenerated: 0,
    triggerType: opening.triggerType,
    agentsInvolved: agentIds,
    narrativeText: opening.narrativeText,
    options: opening.options.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      effects: expandEffects(o.effects, agentIds),
      hiddenEffects: [],
    })),
  };
}

export function useArcWorld(cartridge: Cartridge = FIRST_CHARTER_CARTRIDGE): ArcWorld {
  const arc = cartridge.arc;
  const [org, setOrg] = useState<Organization>(() => {
    const base = bootstrapOrg(arc);
    if (!cartridge.opening) return base;
    return { ...base, dramaQueue: [buildOpeningCard(cartridge.opening, base), ...base.dramaQueue] };
  });
  const [lastReport, setLastReport] = useState<PlayReportView | null>(null);
  const [openingChoice, setOpeningChoice] = useState<string | null>(null);

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
      if (node && node.status !== "available") return;
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

  const resolveDecision = useCallback(
    (optionId: string) => {
      const card = org.dramaQueue[0];
      if (!card) return;
      const opt = card.options.find((o) => o.id === optionId);
      const { org: next } = resolveDramaCard(org, card.id, optionId, org.cycle);
      setOrg(next);
      if (card.id.startsWith("opening:") && opt) setOpeningChoice(opt.label);
    },
    [org],
  );

  const applyDowntime = useCallback((agentId: string, action: DowntimeAction) => {
    setOrg((cur) => applyAgentDowntime(cur, agentId, action));
  }, []);

  const clearedCount = layout.nodes.filter((n) => n.status === "cleared").length;
  const totalNodes = layout.nodes.length;

  const buildExport = useCallback(
    (): CustodyObject => ({
      format: "axm-cartridge-run/v1",
      manifest: cartridge.manifest,
      arc: cartridge.arc,
      runState: {
        cycle: org.cycle,
        openingChoice,
        clearedCount,
        totalNodes,
        roster: Object.values(org.agents).map((a) => ({
          name: a.name,
          morale: Math.round(a.morale),
          stress: Math.round(a.stress),
        })),
      },
    }),
    [cartridge, org, openingChoice, clearedCount, totalNodes],
  );

  return {
    cartridge,
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
    dispatches: [...org.dramaQueue].reverse(),
    pendingDecision: org.dramaQueue[0] ?? null,
    openingChoice,
    reqFor,
    recommendedParty,
    lastReport,
    runChallenge,
    resolveDecision,
    applyDowntime,
    buildExport,
  };
}
