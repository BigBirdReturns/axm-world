import { beforeEach, describe, expect, it } from "vitest";
import type { Arc, Organization, RunReport } from "../../src/engine/types.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { resolveDramaCard } from "../../src/engine/drama.js";
import { runCycle, type ChallengeAssignment } from "../../src/engine/cycle.js";
import { resolvePendingRewardChoice } from "../../src/engine/rewards.js";
import { challengeAccess } from "../../src/engine/access.js";
import { parsePortableRun, type PortableRunExtensions } from "../../src/engine/portable-run.js";
import {
  compileArcToPlayScene,
  recommendAgentsForChallenge,
  summarizeReport,
} from "../../src/play-pipeline/compile.js";
import { FIRST_CHARTER_CARTRIDGE, type Cartridge } from "../../src/world/cartridge.js";
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

function nextPlayableChallenge(state: CampaignState): { challengeId: string; agentIds: string[] } | null {
  const scene = compileArcToPlayScene(state.arc, state.org);
  const candidates = scene.nodes
    .filter((node) => node.status === "available")
    .sort((left, right) => left.tierIndex - right.tierIndex || left.difficulty - right.difficulty);
  for (const node of candidates) {
    const challenge = state.arc.challenges.find((candidate) => candidate.id === node.challengeId)!;
    const agentIds = recommendAgentsForChallenge(challenge, state.org, state.arc);
    if (agentIds.length < challenge.rosterRequirements.minAgents) continue;
    if (!challengeAccess(challenge, state.org, state.arc, agentIds).accessible) continue;
    return { challengeId: challenge.id, agentIds };
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
    const recommendation = recommendRewardRecipient(choice, nextOrg, state.arc);
    const winner = recommendation?.agentId ?? choice.eligibleAgentIds.find((id) => Boolean(nextOrg.agents[id]));
    expect(winner, `reward ${choice.itemId} must have a current eligible recipient`).toBeTruthy();
    if (!winner) continue;
    const resolved = resolvePendingRewardChoice(nextOrg, state.arc, choice, winner);
    expect(resolved.ok, `reward ${choice.itemId} must resolve through Arc law`).toBe(true);
    if (resolved.ok) nextOrg = resolved.org;
  }

  return { ...state, org: nextOrg, ledger, attempts };
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

describe("The First Charter production campaign", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as { localStorage?: Storage }).localStorage = storage;
  });

  it("plays all six authored challenges through World projections, crosses an exact v3 custody boundary, and returns a complete cartridge", () => {
    const cartridge = FIRST_CHARTER_CARTRIDGE;
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
    };

    let crossedCustodyBoundary = false;
    for (let cycle = 0; cycle < 30; cycle += 1) {
      state = advanceCampaign(state);
      const cleared = clearedChallengeIds(state.org);
      if (!crossedCustodyBoundary && cleared.size >= 3) {
        state = exactRoundTrip(storage, state);
        crossedCustodyBoundary = true;
      }
      if (state.arc.challenges.every((challenge) => clearedChallengeIds(state.org).has(challenge.id))) break;
    }

    const cleared = clearedChallengeIds(state.org);
    expect(crossedCustodyBoundary).toBe(true);
    expect([...cleared].sort()).toEqual(state.arc.challenges.map((challenge) => challenge.id).sort());
    expect(compileArcToPlayScene(state.arc, state.org).nodes.every((node) => node.status === "cleared")).toBe(true);
    expect(state.ledger.entries.filter((entry) => entry.outcome === "success").map((entry) => entry.challengeId))
      .toEqual(expect.arrayContaining(state.arc.challenges.map((challenge) => challenge.id)));
    expect(state.ledger.entries.every((entry) => entry.authoredArcDigest === digest)).toBe(true);
    expect(state.ledger.entries.every((entry) => entry.consequence.party.members.length > 0)).toBe(true);
    expect(state.attempts.some((attempt) => attempt.challengeId === "wardens-keep" && attempt.outcome === "success")).toBe(true);
    expect(state.org.cycle).toBeLessThanOrEqual(30);

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
  });
});
