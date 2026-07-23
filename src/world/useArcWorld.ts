// The cartridge <-> world bridge. The player reads a cartridge: it bootstraps a
// populated org from the Arc-owned founding law, enqueues the Arc-owned opening
// decision as a real drama card, and resolves every choice through the deterministic
// engine (runCycle, resolveDramaCard). axm-world authors nothing. It surfaces what
// the cartridge holds and shows what the engine returns. It also builds the custody
// object (manifest + arc + run state) so the cartridge can leave intact.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Arc, DramaCard, Organization, RunReport } from "../engine/types.js";
import type { CartridgeStateValue, CompositionEvaluation } from "../engine/abi13.js";
import { evaluateComposition } from "../engine/composition.js";
import { normalizePortableRunExtensions, type JsonValue, type PortableRunExtensions, type PortableRunV3 } from "../engine/portable-run.js";
import type { ChallengeAssignment, PendingRewardChoice } from "../engine/cycle.js";
import { runCycle } from "../engine/cycle.js";
import { applyDifficultyMode } from "../engine/difficulty.js";
import { resolvePendingRewardChoice } from "../engine/rewards.js";
import { foundOrganization } from "../engine/founding.js";
import {
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
  type PlayReportView,
  type PlayScene,
} from "../play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG, type WorldLayout, type WorldNode } from "./contract.js";
import { applyAgentDowntime, type DowntimeAction } from "./agent-management.js";
import { recommendRewardRecipient } from "./reward-fit.js";
import { FIRST_CHARTER_CARTRIDGE, type Cartridge } from "./cartridge.js";
import { cartridgeIdentity } from "./cartridge-identity.js";
import { appendResult, emptyLedger, type Ledger, type LedgerEntry } from "./ledger.js";
import { buildConsequence, newlyAvailableContracts } from "./consequence.js";
import { loadRun, saveRun } from "./save.js";
import { buildRodohPortableRun, withRodohExtensions } from "./portable-run.js";
import type { StorageWriteResult } from "./storage-result.js";
export type CustodyObject = PortableRunV3;
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
import { resolveWorldDecision, type DecisionResponse } from "./decision.js";
import { connectedOperationForReport } from "./common-ship/connected-relief.js";
import { CONNECTED_OPERATION_EXTENSION_KEY } from "../engine/connected-operation.js";

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
  recommendedAgentId: string | null;
  recommendationReason: string | null;
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
  decisionBasis: "merit" | "seniority" | "need" | "favoritism" | "rotation";
  moraleChanges: Array<{ agentId: string; agentName: string; before: number; after: number }>;
}

export interface RewardMemory {
  itemId: string;
  itemName: string;
  sourceChallenge: string;
  agentId: string;
  agentName: string;
  decisionBasis: "merit" | "seniority" | "need" | "favoritism" | "rotation";
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
  /** Exact engine-owned creator state. Receivers may display it, never infer or mutate it. */
  cartridgeState: Readonly<Record<string, CartridgeStateValue>>;
  roster: RosterMember[];
  clearedCount: number;
  totalNodes: number;
  arcComplete: boolean;
  dispatches: DramaCard[];
  /** The authored/pending decision at the front of the queue, or null. */
  pendingDecision: DramaCard | null;
  /** The opening choice the player made (label), once made. */
  openingChoice: string | null;
  /** Stable authored option id for the opening choice. Older saves may lack it. */
  openingChoiceId: string | null;
  /** Losslessly preserved portable-run extension namespaces. */
  extensions: PortableRunExtensions;
  /** Update one runtime-owned extension while preserving every unknown namespace. */
  setExtension: (namespace: string, value: JsonValue | null) => void;
  /** Last local save result. A failed write never masquerades as remembered state. */
  saveStatus: StorageWriteResult;
  reqFor: (challengeId: string) => ChallengeReq;
  recommendedParty: (challengeId: string) => string[];
  /** Structured requirements (roles, checks, thresholds) for the contract panel. */
  describeContract: (challengeId: string) => ContractRequirements | null;
  /** The playable-encounter projection of the contract (objectives, hazards,
   * party slots, resolutions) — same source record as the board card. Pass a
   * difficultyModeId to preview the contract under an authored posture. */
  encounterFor: (challengeId: string, difficultyModeId?: string | null) => EncounterSpec | null;
  /** Arc-owned engine 1.3 composition law for a candidate party. */
  evaluateCompositionFor: (challengeId: string, agentIds: string[]) => CompositionEvaluation | null;
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
  /** Latest Arc-recorded reward precedent. Unlike lastEquip, this survives reload. */
  latestReward: RewardMemory | null;
  lastReport: PlayReportView | null;
  /** Exact engine report for the last session resolution, including composition and state changes. */
  lastEngineReport: RunReport | null;
  /** The full ledger entry for the last resolved run THIS SESSION — the SAME record
   *  the ledger persists (challengeName + outcome + cycle + seq + the structured
   *  consequence). Surfaced so the result overlay and revisit modal render stored
   *  facts, not a re-interpretation, and mirror the ledger's own shape. Null after
   *  reload (gated by lastReport); the ledger holds the persisted history. */
  lastRecord: LedgerEntry | null;
  /** Difficulty modes the cartridge authors (empty for most arcs). The shell
   * only renders a mode picker when this is non-empty. */
  difficultyModes: Arc["difficultyModes"];
  /** Selected mode id, or null for base difficulty. Applied on the next run. */
  difficultyModeId: string | null;
  setDifficultyModeId: (id: string | null) => void;
  runChallenge: (challengeId: string, agentIds: string[], difficultyModeId?: string | null, tokensSpent?: number) => void;
  /** Commits through the engine and returns the authoritative presentation receipt. */
  resolveDecision: (optionId: string) => DecisionResponse | null;
  applyDowntime: (agentId: string, action: DowntimeAction) => void;
  /** Advance one ordinary engine cycle with the selected watch assigned to Training. */
  runPreparationCycle: (agentIds: string[]) => void;
  /** The exact portable custody object: Arc + engine save + runtime extensions. */
  buildExport: () => CustodyObject;
}

/** Advance one ordinary engine cycle with the selected watch temporarily
 * assigned to the existing Training facility. All readiness changes, recovery,
 * drama, resource costs, and time passage come from Arc-owned cycle law. The
 * temporary assignment is restored afterward so a one-cycle preparation act does
 * not silently become a permanent infrastructure policy. */
export function runWatchPreparationCycle(
  org: Organization,
  arc: Arc,
  agentIds: string[],
): ReturnType<typeof runCycle> | null {
  const training = [...new Set(agentIds)]
    .filter((id) => org.agents[id]?.downedUntilCycle === null)
    .sort();
  if (training.length === 0) return null;

  const previousAssigned = [...(org.infrastructure.Training?.assignedAgents ?? [])];
  const prepared: Organization = {
    ...org,
    infrastructure: {
      ...org.infrastructure,
      Training: { ...org.infrastructure.Training, assignedAgents: training },
    },
  };
  const result = runCycle({ org: prepared, arc, assignments: [] });
  return {
    ...result,
    org: {
      ...result.org,
      infrastructure: {
        ...result.org.infrastructure,
        Training: { ...result.org.infrastructure.Training, assignedAgents: previousAssigned },
      },
    },
  };
}

function roleName(arc: Arc, id: string | null): string {
  if (!id) return "Flex";
  return arc.roles.find((r) => r.id === id)?.name ?? id;
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
    // Fresh boot uses the same Arc-owned founding transition as every other
    // client. No World-local roster, resource, seed, relationship, or opening
    // policy can diverge under the same cartridge identity.
    return foundOrganization(arc);
  });
  const [ledger, setLedger] = useState<Ledger>(() => restored?.ledger ?? emptyLedger(cartridgeDigest));
  const [lastReport, setLastReport] = useState<PlayReportView | null>(null);
  const [lastEngineReport, setLastEngineReport] = useState<RunReport | null>(null);
  const [difficultyModeId, setDifficultyModeId] = useState<string | null>(null);
  const [pendingRewardChoices, setPendingRewardChoices] = useState<PendingRewardChoice[]>(
    () => restored?.pendingRewardChoices ?? [],
  );
  const [lastEquip, setLastEquip] = useState<LastEquipEvent | null>(null);
  const [openingChoice, setOpeningChoice] = useState<string | null>(() => restored?.openingChoice ?? null);
  const [openingChoiceId, setOpeningChoiceId] = useState<string | null>(() => restored?.openingChoiceId ?? null);
  const [extensions, setExtensions] = useState<PortableRunExtensions>(() => restored?.extensions ?? {});
  const [saveStatus, setSaveStatus] = useState<StorageWriteResult>({ ok: true });
  const setExtension = useCallback((namespace: string, value: JsonValue | null) => {
    setExtensions((current) => {
      const next: Record<string, JsonValue> = { ...current };
      if (value === null) delete next[namespace];
      else next[namespace] = value;
      return normalizePortableRunExtensions(next);
    });
  }, []);

  const currentExtensions = useCallback((params?: {
    ledger?: Ledger;
    openingChoice?: string | null;
    openingChoiceId?: string | null;
  }) => withRodohExtensions(extensions, {
    cartridge,
    ledger: params?.ledger ?? ledger,
    openingChoice: params?.openingChoice !== undefined ? params.openingChoice : openingChoice,
    openingChoiceId: params?.openingChoiceId !== undefined ? params.openingChoiceId : openingChoiceId,
  }), [cartridge, extensions, ledger, openingChoice, openingChoiceId]);

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

  const evaluateCompositionFor = useCallback(
    (challengeId: string, agentIds: string[]): CompositionEvaluation | null => {
      const challenge = arc.challenges.find((candidate) => candidate.id === challengeId);
      if (!challenge) return null;
      const agents = agentIds
        .map((id) => org.agents[id])
        .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent));
      return evaluateComposition({ challenge, agents, arc });
    },
    [arc, org.agents],
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
      setLastEngineReport(report ?? null);
      const agentName = (id: string): string => result.org.agents[id]?.name ?? org.agents[id]?.name ?? id;
      const view = report ? summarizeReport(report, arc, agentName) : null;
      setLastReport(view);
      if (report) {
        const connected = connectedOperationForReport({ arc, org: result.org, report, extensions });
        if (connected) setExtension(CONNECTED_OPERATION_EXTENSION_KEY, connected);
      }
      if (report && view) {
        // The HONEST post-run unlock delta: contracts available AFTER this run that
        // were not available BEFORE (real access state, not the brief's aspirational
        // hint — so a clear that only partially satisfies a gate opens nothing here).
        const newlyAvailable = newlyAvailableContracts(scene.nodes, compileArcToPlayScene(arc, result.org).nodes);
        // Build the structured, durable consequence record from THIS run's report
        // (see consequence.ts) and stamp it onto the ledger entry that proves the
        // run happened — one resolved run → one entry → one consequence.
        const consequence = buildConsequence({
          report,
          challenge,
          arc,
          objectives: view.objectives,
          resolveAgent: (id) => {
            const agent = result.org.agents[id] ?? org.agents[id];
            return agent ? { name: agent.name, role: roleName(arc, agent.role) } : { name: id };
          },
          resourceNames: { currency: scene.resources.currencyName, reputation: scene.resources.reputationName },
          newlyAvailable,
        });
        setLedger((cur) =>
          appendResult(cur, {
            challengeId: report.challengeId,
            challengeName: challenge.name,
            outcome: report.outcome,
            cycle: report.cycle,
            consequence,
          }),
        );
      }
    },
    [arc, org, scene, difficultyModeId, extensions, setExtension],
  );

  const resolveDecision = useCallback(
    (optionId: string) => {
      const resolution = resolveWorldDecision(org, optionId);
      if (!resolution) return null;
      const nextOpeningChoice = resolution.openingChoice?.label ?? openingChoice;
      const nextOpeningChoiceId = resolution.openingChoice?.optionId ?? openingChoiceId;
      // Persist the adjudicated state before returning the receipt to Shell. The
      // response therefore cannot appear before reload-safe state exists.
      const written = saveRun(localStorage, {
        arc,
        authoredArcDigest: cartridgeDigest,
        state: {
          org: resolution.org,
          ledger,
          pendingRewardChoices,
          openingChoice: nextOpeningChoice,
          openingChoiceId: nextOpeningChoiceId,
          extensions: currentExtensions({
            openingChoice: nextOpeningChoice,
            openingChoiceId: nextOpeningChoiceId,
          }),
        },
      });
      setSaveStatus(written);
      setOrg(resolution.org);
      if (resolution.openingChoice) {
        setOpeningChoice(resolution.openingChoice.label);
        setOpeningChoiceId(resolution.openingChoice.optionId);
      }
      return resolution.response;
    },
    [arc, cartridgeDigest, currentExtensions, ledger, openingChoice, openingChoiceId, org, pendingRewardChoices],
  );

  const applyDowntime = useCallback((agentId: string, action: DowntimeAction) => {
    setOrg((cur) => applyAgentDowntime(cur, agentId, action));
  }, []);

  const runPreparationCycle = useCallback((agentIds: string[]) => {
    const result = runWatchPreparationCycle(org, arc, agentIds);
    if (!result) return;
    setOrg(result.org);
    setPendingRewardChoices(result.pendingRewardChoices);
    setLastReport(null);
    setLastEngineReport(null);
    setLastEquip(null);
  }, [arc, org]);

  const pendingLoot = useMemo<PendingLootChoice[]>(
    () => pendingRewardChoices.map((choice) => {
      const item = arc.items.find((it) => it.id === choice.itemId);
      const recommendation = recommendRewardRecipient(choice, org, arc);
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
        recommendedAgentId: recommendation?.agentId ?? null,
        recommendationReason: recommendation?.reason ?? null,
      };
    }),
    [arc, org.agents, pendingRewardChoices],
  );

  const latestReward = useMemo<RewardMemory | null>(() => {
    const precedent = [...org.precedents].reverse().find((entry) => entry.type === "reward" && entry.winner);
    if (!precedent?.winner) return null;
    const itemId = typeof precedent.context.itemId === "string" ? precedent.context.itemId : null;
    const sourceChallenge = typeof precedent.context.challengeId === "string" ? precedent.context.challengeId : null;
    const agent = org.agents[precedent.winner];
    const item = itemId ? arc.items.find((candidate) => candidate.id === itemId) : null;
    if (!itemId || !sourceChallenge || !agent) return null;
    return {
      itemId,
      itemName: item?.name ?? itemId,
      sourceChallenge,
      agentId: agent.id,
      agentName: agent.name,
      decisionBasis: precedent.decisionBasis,
    };
  }, [arc.items, org.agents, org.precedents]);

  const claimLoot = useCallback((choiceId: string, agentId: string) => {
    const choice = pendingRewardChoices.find((entry) => `${entry.sourceChallenge}:${entry.itemId}:${entry.cycle}` === choiceId);
    const item = choice ? arc.items.find((it) => it.id === choice.itemId) : null;
    const agent = org.agents[agentId] ?? null;
    if (!choice || !item || !agent || !choice.eligibleAgentIds.includes(agentId)) return;

    const resolution = resolvePendingRewardChoice(org, arc, choice, agentId);
    if (!resolution.ok) return;
    const moraleChanges = choice.eligibleAgentIds.flatMap((eligibleId) => {
      const before = org.agents[eligibleId];
      const after = resolution.org.agents[eligibleId];
      if (!before || !after || before.morale === after.morale) return [];
      return [{ agentId: eligibleId, agentName: after.name, before: before.morale, after: after.morale }];
    });
    setOrg(resolution.org);
    setLastEquip({
      choiceId,
      itemId: item.id,
      itemName: item.name,
      slot: item.slot,
      bonuses: item.statBonuses,
      sourceChallenge: choice.sourceChallenge,
      agentId,
      agentName: agent.name,
      decisionBasis: resolution.precedent.decisionBasis,
      moraleChanges,
    });
    setPendingRewardChoices((current) => current.filter((entry) => `${entry.sourceChallenge}:${entry.itemId}:${entry.cycle}` !== choiceId));
  }, [arc, org, pendingRewardChoices]);

  const clearedCount = layout.nodes.filter((n) => n.status === "cleared").length;
  const totalNodes = layout.nodes.length;

  // Persist the run whenever org or ledger changes, keyed by the authored-arc
  // digest so reload restores exactly this program's state (see the guarded
  // restore above). Costume prefs persist elsewhere; this is the run itself.
  useEffect(() => {
    const written = saveRun(localStorage, {
      arc,
      authoredArcDigest: cartridgeDigest,
      state: {
        org,
        ledger,
        pendingRewardChoices,
        openingChoice,
        openingChoiceId,
        extensions: currentExtensions(),
      },
    });
    setSaveStatus(written);
  }, [arc, cartridgeDigest, currentExtensions, org, ledger, pendingRewardChoices, openingChoice, openingChoiceId]);

  const buildExport = useCallback(
    (): CustodyObject => buildRodohPortableRun({
      cartridge,
      org,
      pendingRewardChoices,
      extensions,
      ledger,
      openingChoice,
      openingChoiceId,
    }),
    [cartridge, extensions, ledger, openingChoice, openingChoiceId, org, pendingRewardChoices],
  );

  // The last resolved run's full ledger entry, THIS SESSION: gated by lastReport
  // (which is set together with the ledger append at resolve, and cleared on
  // reload), it is the freshly-appended entry — the same record the ledger holds,
  // with the structured consequence + its cycle/order.
  const lastRecord: LedgerEntry | null = lastReport ? ledger.entries[ledger.entries.length - 1] ?? null : null;

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
    cartridgeState: org.cartridgeState ?? {},
    roster,
    clearedCount,
    totalNodes,
    arcComplete: totalNodes > 0 && clearedCount === totalNodes,
    dispatches: [...org.dramaQueue].reverse(),
    pendingDecision: org.dramaQueue[0] ?? null,
    openingChoice,
    openingChoiceId,
    extensions,
    setExtension,
    saveStatus,
    reqFor,
    recommendedParty,
    describeContract,
    encounterFor,
    evaluateCompositionFor,
    evaluateParty,
    recommendationFor,
    fixPlanFor,
    effectTargetName,
    pendingLoot,
    claimLoot,
    lastEquip,
    latestReward,
    lastReport,
    lastEngineReport,
    lastRecord,
    difficultyModes: arc.difficultyModes,
    difficultyModeId,
    setDifficultyModeId,
    runChallenge,
    resolveDecision,
    applyDowntime,
    runPreparationCycle,
    buildExport,
  };
}
