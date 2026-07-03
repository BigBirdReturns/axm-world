// The cartridge <-> world bridge. The player reads a cartridge: it bootstraps a
// populated org from the cartridge's arc, enqueues the cartridge's AUTHORED opening
// decision as a real drama card, and resolves every choice through the deterministic
// engine (runCycle, resolveDramaCard). axm-world authors nothing. It surfaces what
// the cartridge holds and shows what the engine returns. It also builds the custody
// object (manifest + arc + run state) so the cartridge can leave intact.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Arc, DramaCard, DramaCardEffect, Organization, RunReport } from "../engine/types.js";
import type { ChallengeAssignment, PendingRewardChoice } from "../engine/cycle.js";
import { runCycle } from "../engine/cycle.js";
import { applyDifficultyMode } from "../engine/difficulty.js";
import { awardItem } from "../engine/rewards.js";
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
import { cartridgeIdentity } from "./cartridge-identity.js";
import { appendResult, emptyLedger, type Ledger } from "./ledger.js";
import { loadRun, saveRun } from "./save.js";
import {
  describeContract as describeContractReq,
  evaluateParty as evaluatePartyReq,
  recommendationRationale,
  buildFixPlan,
  type ContractRequirements,
  type FixSuggestion,
  type PartyReadiness,
} from "./readiness.js";
import { compileEncounter, type EncounterSpec } from "./encounter/compile-encounter.js";
import { resolveTokensSpent } from "./encounter/spend.js";

export interface RosterGear {
  id: string;
  name: string;
  slot: string;
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

export interface PendingLootChoice {
  id: string;
  itemId: string;
  itemName: string;
  slot: string;
  bonuses: Record<string, number>;
  flavorText: string;
  sourceChallenge: string;
  eligibleAgents: Array<{ id: string; name: string; role: string }>;
}

export interface LastEquipEvent {
  choiceId: string;
  itemId: string;
  itemName: string;
  slot: string;
  bonuses: Record<string, number>;
  sourceChallenge: string;
  agentId: string;
  agentName: string;
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
  /** The cartridge's authored content identity (cart1_...): cartridgeDigest of
   *  its arc. Surfaces show THIS, never a claimed manifest value. */
  cartridgeDigest: string;
  /** Append-only run ledger for this program, every entry stamped with
   *  cartridgeDigest. */
  ledger: Ledger;
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
  /** The playable-encounter projection of the contract (objectives, hazards,
   * party slots, resolutions) — same source record as the board card. Pass a
   * difficultyModeId to preview the contract under an authored posture. */
  encounterFor: (challengeId: string, difficultyModeId?: string | null) => EncounterSpec | null;
  /** Faithful projection of the resolver for a candidate party, optionally under
   * an authored difficulty posture and/or resource-spend (tokensSpent narrows the
   * projected risk band without moving the mean). */
  evaluateParty: (challengeId: string, agentIds: string[], difficultyModeId?: string | null, tokensSpent?: number) => PartyReadiness | null;
  /** Plain-language reason the recommended party is the recommended party. */
  recommendationFor: (challengeId: string) => string | null;
  /** Actionable fixes for a weak party: add/swap/downtime/risk. */
  fixPlanFor: (challengeId: string, agentIds: string[]) => FixSuggestion[] | null;
  /** Resolve effect/agent IDs into player-readable names for decision previews. */
  effectTargetName: (targetId: string) => string;
  pendingLoot: PendingLootChoice[];
  claimLoot: (choiceId: string, agentId: string) => void;
  /** Last reward equip, kept only to stage the immediate after-equip rail transition. */
  lastEquip: LastEquipEvent | null;
  lastReport: PlayReportView | null;
  /** Difficulty modes the cartridge authors (empty for most arcs). The shell
   * only renders a mode picker when this is non-empty. */
  difficultyModes: Arc["difficultyModes"];
  /** Selected mode id, or null for base difficulty. Applied on the next run. */
  difficultyModeId: string | null;
  setDifficultyModeId: (id: string | null) => void;
  runChallenge: (challengeId: string, agentIds: string[], difficultyModeId?: string | null, tokensSpent?: number) => void;
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

function roleName(arc: Arc, id: string | null): string {
  if (!id) return "Flex";
  return arc.roles.find((r) => r.id === id)?.name ?? id;
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
  const cartridgeDigest = useMemo(() => cartridgeIdentity(cartridge), [cartridge]);
  // Digest-guarded restore: a saved run is reloaded ONLY when it belongs to this
  // exact authored program (cartridgeDigest). Otherwise boot fresh — custody
  // state can never resurrect into a different authored cartridge.
  const restored = useMemo(
    () => loadRun(localStorage, { arc, authoredArcDigest: cartridgeDigest }),
    [arc, cartridgeDigest],
  );
  const [org, setOrg] = useState<Organization>(() => {
    if (restored) return restored.org;
    const base = bootstrapOrg(arc);
    if (!cartridge.opening) return base;
    return { ...base, dramaQueue: [buildOpeningCard(cartridge.opening, base), ...base.dramaQueue] };
  });
  const [ledger, setLedger] = useState<Ledger>(() => restored?.ledger ?? emptyLedger(cartridgeDigest));
  const [lastReport, setLastReport] = useState<PlayReportView | null>(null);
  const [difficultyModeId, setDifficultyModeId] = useState<string | null>(null);
  const [pendingRewardChoices, setPendingRewardChoices] = useState<PendingRewardChoice[]>([]);
  const [lastEquip, setLastEquip] = useState<LastEquipEvent | null>(null);
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
          .map((it) => ({ id: it.id, name: it.name, slot: it.slot, bonuses: it.statBonuses })),
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

  // Resolve a challenge, applying an authored difficulty mode when one is chosen.
  // Ungated presentation of the same transform runCycle uses (engine/difficulty.ts),
  // so the encounter's objectives and projection preview the posture the resolver
  // will actually apply. A null/unknown mode returns the base challenge unchanged.
  const challengeWithMode = useCallback(
    (challengeId: string, modeId: string | null | undefined) => {
      const c = arc.challenges.find((x) => x.id === challengeId);
      if (!c) return null;
      if (!modeId) return c;
      const mode = arc.difficultyModes.find((m) => m.id === modeId);
      return mode ? applyDifficultyMode(c, mode) : c;
    },
    [arc],
  );

  const encounterFor = useCallback(
    (challengeId: string, difficultyModeId?: string | null): EncounterSpec | null => {
      const c = challengeWithMode(challengeId, difficultyModeId);
      return c ? compileEncounter(c, org, arc) : null;
    },
    [arc, org, challengeWithMode],
  );

  const evaluateParty = useCallback(
    (challengeId: string, agentIds: string[], difficultyModeId?: string | null, tokensSpent?: number): PartyReadiness | null => {
      const c = challengeWithMode(challengeId, difficultyModeId);
      if (!c) return null;
      const party = agentIds.map((id) => org.agents[id]).filter((a): a is NonNullable<typeof a> => !!a);
      return evaluatePartyReq(c, party, arc, tokensSpent ?? 0);
    },
    [arc, org, challengeWithMode],
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
    (challengeId: string, agentIds: string[], modeOverride?: string | null, tokensSpentOverride?: number) => {
      const challenge = arc.challenges.find((c) => c.id === challengeId);
      if (!challenge) return;
      const node = scene.nodes.find((n) => n.challengeId === challengeId);
      if (node && node.status !== "available") return;
      // The encounter's posture choice wins when supplied (including an explicit
      // null = base); otherwise fall back to the board-level mode selection.
      const effectiveMode = modeOverride !== undefined ? modeOverride : difficultyModeId;
      // Spend is explicit: the encounter passes an exact count (including 0);
      // callers that pass nothing (auto-resolve, board quick-run) spend 0 — no
      // implicit debit. The vendored resolver honors tokensSpent only for a
      // lever-authored challenge, so an implicit default would be hidden agency.
      const effectiveTokens = resolveTokensSpent(tokensSpentOverride, org.resources.tokens);
      const assignment: ChallengeAssignment = {
        challengeId,
        agentIds: agentIds.slice(0, challenge.rosterRequirements.maxAgents),
        tokensSpent: effectiveTokens,
        // Base difficulty unless a mode is chosen; the vendored runCycle applies
        // the transform (engine/difficulty.ts).
        ...(effectiveMode !== null ? { difficultyModeId: effectiveMode } : {}),
      };
      setLastEquip(null);
      const result = runCycle({ org, arc, assignments: [assignment] });
      setOrg(result.org);
      setPendingRewardChoices(result.pendingRewardChoices);
      const report: RunReport | undefined = result.reports[0];
      const agentName = (id: string): string => result.org.agents[id]?.name ?? org.agents[id]?.name ?? id;
      setLastReport(report ? summarizeReport(report, arc, agentName) : null);
      if (report) {
        setLedger((cur) =>
          appendResult(cur, {
            challengeId: report.challengeId,
            challengeName: challenge.name,
            outcome: report.outcome,
            cycle: report.cycle,
          }),
        );
      }
    },
    [arc, org, scene, difficultyModeId],
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

  const pendingLoot = useMemo<PendingLootChoice[]>(
    () => pendingRewardChoices.map((choice) => {
      const item = arc.items.find((it) => it.id === choice.itemId);
      return {
        id: `${choice.sourceChallenge}:${choice.itemId}:${choice.cycle}`,
        itemId: choice.itemId,
        itemName: item?.name ?? choice.itemId,
        slot: item?.slot ?? "item",
        bonuses: item?.statBonuses ?? {},
        flavorText: item?.flavorText ?? "Recovered from the contract.",
        sourceChallenge: choice.sourceChallenge,
        eligibleAgents: choice.eligibleAgentIds
          .map((id) => org.agents[id])
          .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent))
          .map((agent) => ({ id: agent.id, name: agent.name, role: roleName(arc, agent.role) })),
      };
    }),
    [arc, org.agents, pendingRewardChoices],
  );

  const claimLoot = useCallback((choiceId: string, agentId: string) => {
    const choice = pendingRewardChoices.find((entry) => `${entry.sourceChallenge}:${entry.itemId}:${entry.cycle}` === choiceId);
    const item = choice ? arc.items.find((it) => it.id === choice.itemId) : null;
    const agent = org.agents[agentId] ?? null;
    if (!choice || !item || !agent || !choice.eligibleAgentIds.includes(agentId)) return;

    setOrg((current) => awardItem(current, agentId, item, current.cycle, choice.sourceChallenge));
    setLastEquip({
      choiceId,
      itemId: item.id,
      itemName: item.name,
      slot: item.slot,
      bonuses: item.statBonuses,
      sourceChallenge: choice.sourceChallenge,
      agentId,
      agentName: agent.name,
    });
    setPendingRewardChoices((current) => current.filter((entry) => `${entry.sourceChallenge}:${entry.itemId}:${entry.cycle}` !== choiceId));
  }, [arc, org.agents, pendingRewardChoices]);

  const clearedCount = layout.nodes.filter((n) => n.status === "cleared").length;
  const totalNodes = layout.nodes.length;

  // Persist the run whenever org or ledger changes, keyed by the authored-arc
  // digest so reload restores exactly this program's state (see the guarded
  // restore above). Costume prefs persist elsewhere; this is the run itself.
  useEffect(() => {
    saveRun(localStorage, { arc, authoredArcDigest: cartridgeDigest, state: { org, ledger } });
  }, [arc, cartridgeDigest, org, ledger]);

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
    cartridgeDigest,
    ledger,
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
    encounterFor,
    evaluateParty,
    recommendationFor,
    fixPlanFor,
    effectTargetName,
    pendingLoot,
    claimLoot,
    lastEquip,
    lastReport,
    difficultyModes: arc.difficultyModes,
    difficultyModeId,
    setDifficultyModeId,
    runChallenge,
    resolveDecision,
    applyDowntime,
    buildExport,
  };
}
