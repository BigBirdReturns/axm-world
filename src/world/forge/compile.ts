import { cartridgeDigest, sha256Hex } from "../../engine/cartridge-digest.js";
import type { Arc, ArcRole, Challenge, Item, ProgressionTier } from "../../engine/types.js";
import {
  WORLD_FORGE_PLAN_DIGEST_PREFIX,
  WORLD_FORGE_PLAN_FORMAT,
  type WorldForgeJob,
  type WorldForgeOutputContract,
  type WorldForgePlan,
  type WorldForgePlanCore,
  type WorldForgeRegion,
} from "./types.js";

const COMMODITY_OUTPUT: WorldForgeOutputContract = {
  acceptedMediaTypes: ["model/gltf-binary", "image/png", "image/svg+xml"],
  preferredMediaType: "model/gltf-binary",
  previewMediaType: "image/png",
  localOnly: true,
  presentationOnly: true,
};

const ACCEPTANCE = {
  requiresRenderableContent: true as const,
  mustContainRemoteReferences: false as const,
  mayCarryRules: false as const,
  requiresPreview: true as const,
  requiresReceipt: true as const,
};

function byId<T extends { id: string }>(values: T[]): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}
function strongestRoleSignals(role: ArcRole, arc: Arc): string {
  const ranked = Object.entries(role.attributeWeights)
    .filter(([, weight]) => weight !== 0)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 3)
    .map(([id, weight]) => `${arc.attributes.find((a) => a.id === id)?.name ?? id} ${weight}`);
  return ranked.length ? ranked.join(", ") : "no weighted attribute emphasis";
}

function mechanicBrief(challenge: Challenge): string {
  return challenge.mechanicChecks
    .map((check) => `${check.name}: ${check.description} [${check.failureConsequence.type}, severity ${check.failureConsequence.severity}]`)
    .join(" | ");
}

function regionFor(tier: ProgressionTier): WorldForgeRegion {
  return {
    id: tier.id,
    name: tier.name,
    brief: tier.flavorText,
    challengeIds: [...tier.challenges],
  };
}

function job(id: string, kind: WorldForgeJob["kind"], label: string, brief: string, sourceRefs: WorldForgeJob["sourceRefs"]): WorldForgeJob {
  return { id, kind, label, brief, sourceRefs, output: COMMODITY_OUTPUT, acceptance: ACCEPTANCE };
}

function regionJob(tier: ProgressionTier, arc: Arc): WorldForgeJob {
  const challengeNames = tier.challenges
    .map((id) => arc.challenges.find((challenge) => challenge.id === id)?.name ?? id)
    .join(", ");
  return job(`region:${tier.id}`, "region-environment", tier.name,
    `Build the traversable ${tier.name} region for ${arc.meta.name}. ${tier.flavorText} Authored encounters in this region: ${challengeNames || "none"}. Preserve ${arc.meta.domain} semantics; geometry is presentation only.`,
    [{ kind: "arc", id: arc.meta.id }, { kind: "progression-tier", id: tier.id }]);
}
function roleJob(role: ArcRole, arc: Arc): WorldForgeJob {
  return job(`role:${role.id}`, "role-actor", role.name,
    `Create a reusable actor for the ${role.name} role in ${arc.meta.name}. Mechanical emphasis: ${strongestRoleSignals(role, arc)}. Do not invent stats, abilities, factions, or rules.`,
    [{ kind: "arc", id: arc.meta.id }, { kind: "role", id: role.id }]);
}

function encounterJob(challenge: Challenge, arc: Arc): WorldForgeJob {
  const checks = challenge.mechanicChecks.map((check) => ({ kind: "mechanic-check" as const, id: check.id }));
  return job(`encounter:${challenge.id}`, "encounter-setpiece", challenge.name,
    `Build a reusable spatial setpiece for ${challenge.name} in ${arc.meta.name}. ${challenge.description} Difficulty ${challenge.difficultyRating}. Authored mechanics: ${mechanicBrief(challenge)}. The setpiece may express hazards visually but may not decide outcomes.`,
    [{ kind: "arc", id: arc.meta.id }, { kind: "challenge", id: challenge.id }, ...checks]);
}

function itemJob(item: Item, arc: Arc): WorldForgeJob {
  const bonuses = Object.entries(item.statBonuses).map(([id, value]) => `${id} ${value >= 0 ? "+" : ""}${value}`).join(", ");
  return job(`item:${item.id}`, "item-prop", item.name,
    `Create a reusable prop for ${item.name} in ${arc.meta.name}. Slot: ${item.slot}. ${item.flavorText} Authored stat references: ${bonuses || "none"}. Visualize the authored object without adding gameplay effects.`,
    [{ kind: "arc", id: arc.meta.id }, { kind: "item", id: item.id }]);
}

export function compileWorldForgePlan(arc: Arc): WorldForgePlan {
  const digest = cartridgeDigest(arc);
  const regions = byId(arc.progressionTiers).map(regionFor);
  const jobs: WorldForgeJob[] = [
    ...byId(arc.progressionTiers).map((tier) => regionJob(tier, arc)),
    ...byId(arc.roles).map((role) => roleJob(role, arc)),
    ...byId(arc.challenges).map((challenge) => encounterJob(challenge, arc)),
    ...byId(arc.items).map((item) => itemJob(item, arc)),
  ];
  if (regions.length === 0) {
    regions.push({ id: "root", name: arc.meta.name, brief: arc.meta.description, challengeIds: byId(arc.challenges).map((challenge) => challenge.id) });
    jobs.unshift(job("region:root", "region-environment", arc.meta.name,
      `Build the traversable root environment for ${arc.meta.name}. ${arc.meta.description} Preserve ${arc.meta.domain} semantics; geometry is presentation only.`,
      [{ kind: "arc", id: arc.meta.id }]));
  }

  const core: WorldForgePlanCore = {
    format: WORLD_FORGE_PLAN_FORMAT,
    cartridge: {
      id: arc.meta.id,
      version: arc.meta.version,
      digest,
      name: arc.meta.name,
      domain: arc.meta.domain,
      description: arc.meta.description,
    },
    scope: "presentation-only",
    regions,
    jobs,
  };
  const planDigest = `${WORLD_FORGE_PLAN_DIGEST_PREFIX}${sha256Hex(JSON.stringify(core))}` as const;
  return { ...core, planDigest };
}