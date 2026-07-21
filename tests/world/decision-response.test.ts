import { describe, expect, it } from "vitest";
import type { DramaCard, Organization } from "../../src/engine/types.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge.js";
import { buildCustodyObject } from "../../src/world/custody.js";
import { groupDecisionEffects, resolveWorldDecision } from "../../src/world/decision.js";
import { openingReactionTone } from "../../src/world/components/OpeningDecisionStage.js";
import { emptyLedger } from "../../src/world/ledger.js";
import { loadRun, saveRun, type KVStorage } from "../../src/world/save.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { rodohOpeningMemory } from "../../src/world/portable-run.js";

function fakeStorage(): KVStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

function openingOrg(): Organization {
  const base = bootstrapOrg(FIRST_CHARTER_CARTRIDGE.arc);
  const agentIds = Object.keys(base.agents);
  const card: DramaCard = {
    id: "opening:founding-oath",
    cycleGenerated: 0,
    triggerType: "founding-oath",
    agentsInvolved: agentIds,
    narrativeText: "Choose the hall's oath.",
    options: [{
      id: "open-charter",
      label: "Swear the open charter",
      description: "The hall remains its own.",
      effects: agentIds.flatMap((target) => [
        { target, type: "morale", value: 8 },
        { target, type: "loyalty", value: 3 },
      ]),
      hiddenEffects: [],
    }],
  };
  return { ...base, dramaQueue: [card] };
}

describe("decision commit and authoritative readback", () => {
  it("commits first, removes the card, and reports only actual engine deltas", () => {
    const before = openingOrg();
    const result = resolveWorldDecision(before, "open-charter");
    expect(result).not.toBeNull();
    expect(result!.org.dramaQueue).toHaveLength(0);
    expect(result!.openingChoice).toEqual({ optionId: "open-charter", label: "Swear the open charter" });
    expect(result!.response).toMatchObject({
      cardId: "opening:founding-oath",
      optionId: "open-charter",
      label: "Swear the open charter",
    });

    for (const [id, agent] of Object.entries(before.agents)) {
      const next = result!.org.agents[id]!;
      expect(next.morale).toBe(Math.min(100, agent.morale + 8));
      expect(next.hiddenAttributes.loyalty).toBe(Math.min(20, agent.hiddenAttributes.loyalty + 3));
    }
    for (const effect of result!.response.effects) {
      expect(effect.after - effect.before).toBe(effect.delta);
      expect(effect.delta).not.toBe(0);
    }
  });

  it("persists the exact option and applied state across reload and custody export", () => {
    const result = resolveWorldDecision(openingOrg(), "open-charter")!;
    const digest = cartridgeIdentity(FIRST_CHARTER_CARTRIDGE);
    const ledger = emptyLedger(digest);
    const storage = fakeStorage();
    saveRun(storage, {
      arc: FIRST_CHARTER_CARTRIDGE.arc,
      authoredArcDigest: digest,
      state: {
        org: result.org,
        ledger,
        openingChoice: result.openingChoice!.label,
        openingChoiceId: result.openingChoice!.optionId,
      },
    });

    const restored = loadRun(storage, { arc: FIRST_CHARTER_CARTRIDGE.arc, authoredArcDigest: digest })!;
    expect(restored.openingChoice).toBe("Swear the open charter");
    expect(restored.openingChoiceId).toBe("open-charter");
    expect(restored.org.dramaQueue).toHaveLength(0); // resume cannot replay the oath
    for (const [id, agent] of Object.entries(result.org.agents)) {
      expect(restored.org.agents[id]?.morale).toBe(agent.morale);
      expect(restored.org.agents[id]?.stress).toBe(agent.stress);
      expect(restored.org.agents[id]?.hiddenAttributes.loyalty).toBe(agent.hiddenAttributes.loyalty);
    }

    const exported = buildCustodyObject({
      cartridge: FIRST_CHARTER_CARTRIDGE,
      org: restored.org,
      openingChoice: restored.openingChoice ?? null,
      openingChoiceId: restored.openingChoiceId ?? null,
      nodes: [],
      ledger,
    });
    const parsedExport = parsePortableRun(exported);
    expect(rodohOpeningMemory(parsedExport.extensions)).toEqual({
      version: 1,
      openingChoiceId: "open-charter",
      openingChoice: "Swear the open charter",
    });
    expect(parsedExport.org).toEqual(restored.org);
  });

  it("does not fabricate a response for a stale or invalid selection", () => {
    const org = openingOrg();
    expect(resolveWorldDecision(org, "not-an-option")).toBeNull();
    expect(org.dramaQueue).toHaveLength(1);
  });

  it("groups actual deltas for direction while retaining the exact receipt", () => {
    const response = resolveWorldDecision(openingOrg(), "open-charter")!.response;
    const groups = groupDecisionEffects(response.effects);
    const agentCount = Object.keys(openingOrg().agents).length;
    expect(groups).toEqual([
      { type: "morale", count: agentCount, minDelta: 8, maxDelta: 8 },
      { type: "loyalty", count: agentCount, minDelta: 3, maxDelta: 3 },
    ]);
    expect(response.effects).toHaveLength(agentCount * 2);
    expect(openingReactionTone(response)).toBe("lifted");
  });

  it("derives strained and steady stage direction only from proven effects", () => {
    const base = resolveWorldDecision(openingOrg(), "open-charter")!.response;
    expect(openingReactionTone()).toBe("waiting");
    expect(openingReactionTone({
      ...base,
      effects: [{ target: "agent-1", type: "stress", before: 2, after: 7, delta: 5 }],
    })).toBe("strained");
    expect(openingReactionTone({ ...base, effects: [] })).toBe("steady");
  });
});
