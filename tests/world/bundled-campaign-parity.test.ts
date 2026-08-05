import { beforeEach, describe, expect, it } from "vitest";
import type { Agent, Arc, Challenge, Organization, RunReport } from "../../src/engine/types.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { resolveDramaCard } from "../../src/engine/drama.js";
import { runCycle, type ChallengeAssignment, type PendingRewardChoice } from "../../src/engine/cycle.js";
import { resolvePendingRewardChoice } from "../../src/engine/rewards.js";
import { challengeAccess, completedAttunementChains } from "../../src/engine/access.js";
import { parsePortableRun, type PortableRunExtensions } from "../../src/engine/portable-run.js";
import { projectMechanics } from "../../src/engine/projections.js";
import {
  compileArcToPlayScene,
  summarizeReport,
} from "../../src/play-pipeline/compile.js";
import { BUNDLED_CARTRIDGES, type Cartridge } from "../../src/world/cartridge.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { buildConsequence, newlyAvailableContracts } from "../../src/world/consequence.js";
import { appendResult, emptyLedger, type Ledger } from "../../src/world/ledger.js";
import {
  buildRodohPortableRun,
  importRodohPortableRun,
  rodohRuntimeMemory,
  type RodohRuntimeMemory,
} from "../../src/world/portable-run.js";
import { loadRun, type KVStorage } from "../../src/world/save.js";
import { recommendRewardRecipient } from "../../src/world/reward-fit.js";

class MemoryStorage implements Storage, KVStorage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

interface CampaignState {
  cartridge: Cartridge;
  arc: Arc;
  org: Organization;
  ledger: Ledger;
  extensions: PortableRunExtensions;
  openingChoice: string | null;
  openingChoiceId: string | null;
  attempts: Array<{ challengeId: string; outcome: RunReport["outcome"]; cycle: number }>;
  trainingStreak: number;
}

const RISKY_MARGIN_FLOOR = -6;
const TRAINING_PATIENCE = 4;

interface PartyPlan {
  agentIds: string[];
  failCount: number;
  tightCount: number;
  totalMargin: number;
  worstMargin: number;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [head, ...tail] = items;
  return [
    ...combinations(tail, size - 1).map((combo) => [head!, ...combo]),
    ...combinations(tail, size),
  ];
}

function evaluateParty(challenge: Challenge, party: Agent[], org: Organization, arc: Arc): PartyPlan {
  const projections = projectMechanics({ challenge, assignedAgents: party, org, arc });
  let failCount = 0;
  let tightCount = 0;
  let totalMargin = 0;
  let worstMargin = Number.POSITIVE_INFINITY;
  for (const projection of projections) {
    if (projection.assessment === "fail") failCount += 1;
    if (projection.assessment === "tight") tightCount += 1;
    totalMargin += projection.margin;
    worstMargin = Math.min(worstMargin, projection.margin);
  }
  return { agentIds: party.map((agent) => agent.id), failCount, tightCount, totalMargin, worstMargin };
}

function betterPlan(left: PartyPlan, right: PartyPlan): boolean {
  if (left.failCount !== right.failCount) return left.failCount < right.failCount;
  if (left.tightCount !== right.tightCount) return left.tightCount < right.tightCount;
  if (left.totalMargin !== right.totalMargin) return left.totalMargin > right.totalMargin;
  return left.agentIds.join() < right.agentIds.join();
}

function bestParty(challenge: Challenge, org: Organization, arc: Arc): PartyPlan | null {
  const available = Object.values(org.agents)
    .filter((agent) => agent.downedUntilCycle === null)
    .sort((left, right) => left.id.localeCompare(right.id));
  const min = challenge.rosterRequirements.minAgents;
  const max = Math.min(challenge.rosterRequirements.maxAgents, available.length);
  let best: PartyPlan | null = null;
  for (let size = min; size <= max; size += 1) {
    for (const party of combinations(available, size)) {
      const rolesOk = challenge.rosterRequirements.roleRequirements.every(
        (requirement) => party.filter((agent) => agent.role === requirement.roleId).length >= requirement.count,
      );
      if (!rolesOk) continue;
      const ids = party.map((agent) => agent.id);
      if (!challengeAccess(challenge, org, arc, ids).accessible) continue;
      const plan = evaluateParty(challenge, party, org, arc);
      if (best === null || betterPlan(plan, best)) best = plan;
    }
  }
  return best;
}

function stepAlreadyMet(
  step: { type: string; target: string },
  agent: Agent,
  org: Organization,
  done: Set<string>,
): boolean {
  switch (step.type) {
    case "challenge_clear":
      return agent.assignmentHistory.some((record) => record.challengeId === step.target && record.outcome === "success");
    case "reputation_threshold":
      return org.reputation >= Number(step.target);
    case "item_acquire":
      return agent.rewardHistory.some((record) => record.itemId === step.target)
        || Object.values(agent.equippedItems).includes(step.target);
    case "chain_complete":
      return done.has(step.target);
    default:
      return false;
  }
}

function completesChainOnAcquire(itemId: string, agent: Agent, org: Organization, arc: Arc): boolean {
  for (const chain of arc.attunementChains) {
    if (!chain.steps.some((step) => step.type === "item_acquire" && step.target === itemId)) continue;
    const done = completedAttunementChains(agent, org, arc);
    if (chain.steps.every((step) =>
      (step.type === "item_acquire" && step.target === itemId) || stepAlreadyMet(step, agent, org, done),
    )) return true;
  }
  return false;
}

function pickLootWinner(choice: PendingRewardChoice, org: Organization, arc: Arc): string | null {
  const eligible = choice.eligibleAgentIds
    .map((id) => org.agents[id])
    .filter((agent): agent is Agent => agent !== undefined)
    .sort((left, right) => left.id.localeCompare(right.id));
  const chainCompleter = eligible.find((agent) => completesChainOnAcquire(choice.itemId, agent, org, arc));
  if (chainCompleter) return chainCompleter.id;
  return recommendRewardRecipient(choice, org, arc)?.agentId ?? eligible[0]?.id ?? null;
}

function clearedChallengeIds(org: Organization): Set<string> {
  const cleared = new Set<string>();
  for (const agent of Object.values(org.agents)) {
    for (const record of agent.assignmentHistory) {
      if (record.outcome === "success") cleared.add(record.challengeId);
    }
  }
  return cleared;
}

function resolveAllDrama(state: CampaignState): CampaignState {
  let org = state.org;
  let openingChoice = state.openingChoice;
  let openingChoiceId = state.openingChoiceId;
  while (org.dramaQueue.length > 0) {
    const card = org.dramaQueue[0]!;
    const option = card.options[0]!;
    const result = resolveDramaCard(org, card.id, option.id, org.cycle);
    org = result.org;
    if (card.id.startsWith("opening:")) {
      openingChoice = option.label;
      openingChoiceId = option.id;
    }
  }
  return { ...state, org, openingChoice, openingChoiceId };
}

function assignIdleTraining(org: Organization, committedIds: readonly string[]): Organization {
  const committed = new Set(committedIds);
  const training = Object.values(org.agents)
    .filter((agent) => agent.downedUntilCycle === null && !committed.has(agent.id))
    .map((agent) => agent.id);
  return {
    ...org,
    infrastructure: {
      ...org.infrastructure,
      Training: { ...org.infrastructure.Training, assignedAgents: training },
    },
  };
}

function nextPlayableChallenge(state: CampaignState): { challengeId: string; agentIds: string[]; risky: boolean } | null {
  const scene = compileArcToPlayScene(state.arc, state.org);
  const candidates = scene.nodes
    .filter((node) => node.status === "available")
    .sort((left, right) => left.tierIndex - right.tierIndex || left.difficulty - right.difficulty);
  let risky: { challengeId: string; plan: PartyPlan } | null = null;
  for (const node of candidates) {
    const challenge = state.arc.challenges.find((candidate) => candidate.id === node.challengeId)!;
    const plan = bestParty(challenge, state.org, state.arc);
    if (!plan) continue;
    if (plan.failCount === 0) return { challengeId: challenge.id, agentIds: plan.agentIds, risky: false };
    if (risky === null || plan.worstMargin > risky.plan.worstMargin) risky = { challengeId: challenge.id, plan };
  }
  if (risky && (risky.plan.worstMargin >= RISKY_MARGIN_FLOOR || state.trainingStreak >= TRAINING_PATIENCE)) {
    return { challengeId: risky.challengeId, agentIds: risky.plan.agentIds, risky: true };
  }
  return null;
}

function recordReport(
  state: CampaignState,
  report: RunReport,
  before: ReturnType<typeof compileArcToPlayScene>,
  afterOrg: Organization,
): Ledger {
  const challenge = state.arc.challenges.find((candidate) => candidate.id === report.challengeId)!;
  const view = summarizeReport(report, state.arc, (id) => afterOrg.agents[id]?.name ?? state.org.agents[id]?.name ?? id);
  const after = compileArcToPlayScene(state.arc, afterOrg);
  const consequence = buildConsequence({
    report,
    challenge,
    arc: state.arc,
    objectives: view.objectives,
    resolveAgent: (id) => {
      const agent = afterOrg.agents[id] ?? state.org.agents[id];
      const role = state.arc.roles.find((candidate) => candidate.id === agent?.role)?.name;
      return agent ? { name: agent.name, ...(role ? { role } : {}) } : { name: id };
    },
    resourceNames: {
      currency: state.arc.currencyName,
      reputation: state.arc.reputationName,
    },
    newlyAvailable: newlyAvailableContracts(before.nodes, after.nodes),
  });
  return appendResult(state.ledger, {
    challengeId: report.challengeId,
    challengeName: challenge.name,
    outcome: report.outcome,
    cycle: report.cycle,
    consequence,
  });
}

function advanceCampaign(state: CampaignState): CampaignState {
  state = resolveAllDrama(state);
  const selected = nextPlayableChallenge(state);
  const before = compileArcToPlayScene(state.arc, state.org);
  const challenge = selected
    ? state.arc.challenges.find((candidate) => candidate.id === selected.challengeId)!
    : null;
  const org = assignIdleTraining(state.org, selected?.agentIds ?? []);
  const assignments: ChallengeAssignment[] = selected && challenge
    ? [{
        challengeId: challenge.id,
        agentIds: selected.agentIds,
        tokensSpent: challenge.resourceSpend && org.resources.tokens > 0 ? 1 : 0,
      }]
    : [];
  const result = runCycle({ org, arc: state.arc, assignments });
  let nextOrg = result.org;
  let ledger = state.ledger;
  const attempts = [...state.attempts];

  for (const report of result.reports) {
    ledger = recordReport({ ...state, org }, report, before, nextOrg);
    attempts.push({ challengeId: report.challengeId, outcome: report.outcome, cycle: report.cycle });
  }

  for (const choice of result.pendingRewardChoices) {
    const winner = pickLootWinner(choice, nextOrg, state.arc);
    expect(winner, `reward ${choice.itemId} must have a current eligible recipient`).toBeTruthy();
    if (!winner) continue;
    const resolved = resolvePendingRewardChoice(nextOrg, state.arc, choice, winner);
    expect(resolved.ok, `reward ${choice.itemId} must resolve through Arc law`).toBe(true);
    if (resolved.ok) nextOrg = resolved.org;
  }

  return {
    ...state,
    org: nextOrg,
    ledger,
    attempts,
    trainingStreak: selected ? 0 : state.trainingStreak + 1,
  };
}

function exactRoundTrip(storage: MemoryStorage, state: CampaignState): CampaignState {
  const digest = cartridgeIdentity(state.cartridge);
  const runtime: RodohRuntimeMemory = { version: 1, mode: "shell", representation: "aperture" };
  const portable = buildRodohPortableRun({
    cartridge: state.cartridge,
    org: state.org,
    pendingRewardChoices: [],
    extensions: {
      ...state.extensions,
      "future.player@9": { retained: true, atCycle: state.org.cycle },
    },
    ledger: state.ledger,
    openingChoice: state.openingChoice,
    openingChoiceId: state.openingChoiceId,
    runtime,
  });
  const expected = parsePortableRun(portable);

  storage.clear();
  const imported = importRodohPortableRun(storage, JSON.stringify(portable));
  expect(imported.ok).toBe(true);
  if (!imported.ok) return state;
  const loaded = loadRun(storage, { arc: imported.value.cartridge.arc, authoredArcDigest: digest });
  expect(loaded).not.toBeNull();
  if (!loaded) return state;
  const extensions = loaded.extensions ?? {};
  expect(loaded.org).toEqual(expected.org);
  expect(loaded.ledger).toEqual(state.ledger);
  expect(extensions["future.player@9"]).toEqual({ retained: true, atCycle: state.org.cycle });
  expect(rodohRuntimeMemory(extensions)?.representation).toBe("aperture");

  return {
    ...state,
    cartridge: imported.value.cartridge,
    arc: imported.value.cartridge.arc,
    org: loaded.org,
    ledger: loaded.ledger,
    extensions,
    openingChoice: loaded.openingChoice ?? null,
    openingChoiceId: loaded.openingChoiceId ?? null,
  };
}

describe("bundled campaign parity", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as { localStorage?: Storage }).localStorage = storage;
  });

  it.each(BUNDLED_CARTRIDGES.map((cartridge) => [cartridge.manifest.name, cartridge] as const))(
    "%s plays its entire campaign through World projections and exact v3 custody",
    (_name, cartridge) => {
      const digest = cartridgeIdentity(cartridge);
      let state: CampaignState = {
        cartridge,
        arc: cartridge.arc,
        org: foundOrganization(cartridge.arc),
        ledger: emptyLedger(digest),
        extensions: {},
        openingChoice: null,
        openingChoiceId: null,
        attempts: [],
        trainingStreak: 0,
      };

      let crossedCustodyBoundary = false;
      const maxCycles = cartridge.arc.meta.id === "karazhan" || cartridge.arc.meta.id === "lamp-district" ? 100 : 60;
      for (let cycle = 0; cycle < maxCycles; cycle += 1) {
        state = advanceCampaign(state);
        const cleared = clearedChallengeIds(state.org);
        if (!crossedCustodyBoundary && cleared.size >= Math.min(3, state.arc.challenges.length)) {
          state = exactRoundTrip(storage, state);
          crossedCustodyBoundary = true;
        }
        if (state.arc.challenges.every((challenge) => cleared.has(challenge.id))) break;
      }

      const cleared = clearedChallengeIds(state.org);
      expect(crossedCustodyBoundary).toBe(true);
      expect([...cleared].sort()).toEqual(state.arc.challenges.map((challenge) => challenge.id).sort());
      expect(compileArcToPlayScene(state.arc, state.org).nodes.every((node) => node.status === "cleared")).toBe(true);
      expect(state.ledger.entries.filter((entry) => entry.outcome === "success").map((entry) => entry.challengeId))
        .toEqual(expect.arrayContaining(state.arc.challenges.map((challenge) => challenge.id)));
      expect(state.ledger.entries.every((entry) => entry.authoredArcDigest === digest)).toBe(true);
      expect(state.ledger.entries.every((entry) => entry.consequence.party.members.length > 0)).toBe(true);
      expect(state.org.cycle).toBeLessThanOrEqual(maxCycles);

      const finalPortable = buildRodohPortableRun({
        cartridge: state.cartridge,
        org: state.org,
        extensions: state.extensions,
        ledger: state.ledger,
        openingChoice: state.openingChoice,
        openingChoiceId: state.openingChoiceId,
        runtime: { version: 1, mode: "shell", representation: "aperture" },
      });
      const finalRestored = parsePortableRun(finalPortable);
      expect(finalRestored.org).toEqual(state.org);
      expect(finalRestored.authoredArcDigest).toBe(digest);
      expect(finalRestored.extensions["future.player@9"]).toEqual(expect.objectContaining({ retained: true }));
    },
    60_000,
  );
});
