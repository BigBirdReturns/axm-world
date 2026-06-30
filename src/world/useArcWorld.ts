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
import {
  describeContract as describeContractReq,
  evaluateParty as evaluatePartyReq,
  recommendationRationale,
  buildFixPlan,
  type ContractRequirements,
  type FixSuggestion,
  type PartyReadiness,
} from "./readiness.js";

export interface RosterGear {
  name: string;
  bonuses: Record<string, number>;
}

export interface RosterMember {
  id: string;
  name: string;
  role: string;
  stress: number;
  morale: number;
  downed: boolean;
  /** Visible attribute scores, so assignment can be judged against contract checks. */
  attributes: Record<string, number>;
  /** Equipped items and their stat bonuses (empty until loot is earned). */
  gear: RosterGear[];
  /** Active affliction label, if any (it penalizes resolution). */
  affliction: string | null;
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
  /** Structured requirements (roles, checks, thresholds) for the contract panel. */
  describeContract: (challengeId: string) => ContractRequirements | null;
  /** Faithful projection of the resolver for a candidate party. */
  evaluateParty: (challengeId: string, agentIds: string[]) => PartyReadiness | null;
  /** Plain-language reason the recommended party is the recommended party. */
  recommendationFor: (challengeId: string) => string | null;
  /** Actionable fixes for a weak party: add/swap/downtime/risk. */
  fixPlanFor: (challengeId: string, agentIds: string[]) => FixSuggestion[] | null;
  /** Resolve effect/agent IDs into player-readable names for decision previews. */
  effectTargetName: (targetId: string) => string;
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
        attributes: a.attributes,
        gear: Object.values(a.equippedItems)
          .map((itemId) => arc.items.find((it) => it.id === itemId))
          .filter((it): it is NonNullable<typeof it> => !!it)
          .map((it) => ({ name: it.name, bonuses: it.statBonuses })),
        affliction: a.afflictionState.kind === "none" ? null : a.afflictionState.kind,
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

  const describeContract = useCallback(
    (challengeId: string): ContractRequirements | null => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      return c ? describeContractReq(c, arc) : null;
    },
    [arc],
  );

  const evaluateParty = useCallback(
    (challengeId: string, agentIds: string[]): PartyReadiness | null => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      if (!c) return null;
      const party = agentIds.map((id) => org.agents[id]).filter((a): a is NonNullable<typeof a> => !!a);
      return evaluatePartyReq(c, party, arc);
    },
    [arc, org],
  );

  const recommendationFor = useCallback(
    (challengeId: string): string | null => {
      const req = describeContract(challengeId);
      return req ? recommendationRationale(req) : null;
    },
    [describeContract],
  );

  const fixPlanFor = useCallback(
    (challengeId: string, agentIds: string[]): FixSuggestion[] | null => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      if (!c) return null;
      const party = agentIds.map((id) => org.agents[id]).filter((a): a is NonNullable<typeof a> => !!a);
      const readiness = evaluatePartyReq(c, party, arc);
      return buildFixPlan({ challenge: c, party, roster: Object.values(org.agents), arc, readiness });
    },
    [arc, org],
  );

  const effectTargetName = useCallback(
    (targetId: string): string => {
      if (targetId === "_org_") return arc.meta.name;
      return org.agents[targetId]?.name ?? targetId;
    },
    [arc.meta.name, org.agents],
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
    describeContract,
    evaluateParty,
    recommendationFor,
    fixPlanFor,
    effectTargetName,
    lastReport,
    runChallenge,
    resolveDecision,
    applyDowntime,
    buildExport,
  };
}
