// ── Generic org bootstrap ──────────────────────────────────────────────────
//
// The spoke's job is to make *any* arc playable, not just the one bundled
// tutorial. The bundled arc (first-charter) ships with a hand-authored starting
// roster, relationships, and opening drama. Every other cartridge — an arc
// imported from a file, a stranger's website, the designer — used to drop the
// player into an empty charter with `agents: {}`. Technically it "loaded"; it
// wasn't playable.
//
// `bootstrapOrg` closes that gap. Given nothing but an Arc, it derives a real,
// populated starting organization by driving the engine's own `generateAgent`
// against the arc's tiers/roles/attributes/namePool. It is deterministic: the
// same arc + same seed always produces the same opening state, which is the
// whole point of a portable cartridge — hand someone the arc and a seed and
// they get your exact game.

import type { Arc, Agent, Facility, InfrastructureFacility, Organization, Relationship } from "../engine/types.js";
import { generateAgent } from "../engine/character.js";
import { Rng, hashSeed } from "../engine/prng.js";

export interface BootstrapOptions {
  /** Number of agents to seed the roster with. Defaults to 6. */
  rosterSize?: number;
  /**
   * Deterministic seed for roster generation. Omit for a stable seed derived
   * from the arc id (same cartridge → same opening every time). Pass a random
   * value if you want a fresh charter per new game.
   */
  seed?: number;
  /** Starting currency. Defaults to 100. */
  startingCurrency?: number;
  /** Starting reroll/assignment tokens. Defaults to 2. */
  startingTokens?: number;
}

const FACILITY_NAMES: InfrastructureFacility[] = [
  "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
];

// Quarters + Recreation come online at level 1 so the org can house and rest its
// opening roster; the rest start dormant and are built up through play. Mirrors
// the bundled app's `defaultFacilities`.
function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const name of FACILITY_NAMES) {
    out[name] = {
      type: name,
      level: name === "Quarters" || name === "Recreation" ? 1 : 0,
      assignedAgents: [],
    };
  }
  return out as Record<InfrastructureFacility, Facility>;
}

// Tiers sorted weakest-first by stat budget. A starting roster should lean on
// the cheapest tiers and reach up only occasionally, so the player has room to
// grow rather than starting at the ceiling.
function tiersWeakestFirst(arc: Arc) {
  return [...arc.tiers].sort((a, b) => a.statBudgetMin - b.statBudgetMin);
}

// Build a starting roster for an arbitrary arc. Every available role is
// represented at least once (cycling through arc.roles), agents are drawn
// mostly from the lowest tier with an occasional step up, and each agent is
// generated with its own deterministic sub-seed so the roster is reproducible.
export function bootstrapRoster(arc: Arc, opts: BootstrapOptions = {}): Agent[] {
  const tiers = tiersWeakestFirst(arc);
  if (tiers.length === 0) return [];

  const baseTier = tiers[0]!;
  const stepUpTier = tiers[Math.min(1, tiers.length - 1)]!;
  const roles = arc.roles;
  const size = Math.max(0, opts.rosterSize ?? 6);
  const seedBase = opts.seed ?? hashSeed(arc.meta.id, "bootstrap-roster");

  const agents: Agent[] = [];
  for (let i = 0; i < size; i++) {
    // Every third slot reaches up a tier for variety; the rest stay at base.
    const tier = i % 3 === 2 ? stepUpTier : baseTier;
    const preferredRoleId = roles.length > 0 ? roles[i % roles.length]!.id : undefined;
    const rng = new Rng(hashSeed(seedBase, "agent", i));
    agents.push(generateAgent({ rng, tier, arc, cycle: 0, preferredRoleId }));
  }
  return agents;
}

// Seed an opening relationship: if two agents share a role they are natural
// rivals competing for the same slot. This gives the drama system something to
// build on from cycle 0 without authoring arc-specific content. Generic echo of
// first-charter's hand-authored skirmisher rivalry.
export function bootstrapRelationships(roster: Agent[]): Relationship[] {
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      if (roster[i]!.role && roster[i]!.role === roster[j]!.role) {
        return [{ agentIds: [roster[i]!.id, roster[j]!.id], state: "Rivalrous", affinity: -5 }];
      }
    }
  }
  return [];
}

// Produce a complete, playable Organization for any arc. This is the spoke's
// cartridge slot: arc in, runnable game out.
export function bootstrapOrg(arc: Arc, opts: BootstrapOptions = {}): Organization {
  const roster = bootstrapRoster(arc, opts);
  const agents: Record<string, Agent> = {};
  for (const agent of roster) agents[agent.id] = agent;

  return {
    id: "player-charter",
    name: "Your Charter",
    reputation: 0,
    resources: {
      currency: opts.startingCurrency ?? 100,
      materials: 0,
      tokens: opts.startingTokens ?? 2,
    },
    infrastructure: defaultFacilities(),
    agents,
    relationships: bootstrapRelationships(roster),
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: opts.seed ?? hashSeed(arc.meta.id, "bootstrap-org"),
  };
}
