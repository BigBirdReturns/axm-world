export const REPRESENTATION_PLAN_FORMAT = "rodoh-representation-plan/1" as const;
export const REPRESENTATION_EVALUATION_FORMAT = "rodoh-representation-evaluation/1" as const;

export const REQUIRED_REPRESENTATION_SURFACES = [
  "cold-entry",
  "authored-commitment",
  "first-action",
  "accepted-consequence",
  "playable-successor",
  "durable-record",
] as const;

export type RepresentationSurfaceId = typeof REQUIRED_REPRESENTATION_SURFACES[number];
export type RepresentationAssetKind =
  | "emblem"
  | "portrait"
  | "body"
  | "environment"
  | "mechanism"
  | "pressure-actor"
  | "route-mark"
  | "state-mark"
  | "record-mark";

export interface RepresentationAsset {
  id: string;
  sourcePath: string;
  kind: RepresentationAssetKind;
  accessibleEquivalent: string;
}

export interface RepresentationPlan {
  format: typeof REPRESENTATION_PLAN_FORMAT;
  id: string;
  namespace: string;
  classification: "authored-pilot-candidate" | "playable-authored-episode";
  candidate: {
    repository: string;
    authoredIdentity: string;
    experienceId: string;
  };
  provenance: {
    format: string;
    path: string;
  };
  renderer: {
    action: "cartridge-assets" | "primitive-only";
    neutralFallbackUsed: boolean;
  };
  requirements: {
    surfaceIds: RepresentationSurfaceId[];
    personIds: string[];
    objectiveIds: string[];
    stateIds: string[];
  };
  assets: RepresentationAsset[];
  bindings: {
    identityAssetId: string;
    people: Array<{
      personId: string;
      portraitAssetId: string;
      bodyAssetId: string;
    }>;
    objectives: Array<{
      objectiveId: string;
      idleAssetId: string;
      activeAssetId: string;
      completeAssetId: string;
    }>;
    states: Array<{
      stateId: string;
      assetId: string;
    }>;
  };
  surfaces: Array<{
    id: RepresentationSurfaceId;
    assetIds: string[];
    desktop: boolean;
    mobile: boolean;
    accessibleEquivalent: string;
  }>;
}

export interface RepresentationEvaluation {
  format: typeof REPRESENTATION_EVALUATION_FORMAT;
  planId: string;
  status: "pass" | "fail";
  blockers: string[];
  metrics: {
    assets: number;
    surfaces: number;
    people: number;
    objectives: number;
    states: number;
  };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function placeholderIdentity(value: string): boolean {
  return /(?:^|[:/_-])(placeholder|generic|debug|wireframe|prototype|bare-doll|neutral)(?:$|[:/_-])/i.test(value);
}

export function evaluateRepresentationPlan(plan: RepresentationPlan): RepresentationEvaluation {
  const blockers: string[] = [];
  if (plan.format !== REPRESENTATION_PLAN_FORMAT) blockers.push(`Unsupported representation plan format: ${String(plan.format)}.`);
  if (!nonEmpty(plan.id)) blockers.push("Representation plan identity is absent.");
  if (!nonEmpty(plan.namespace)) blockers.push("Representation namespace is absent.");
  if (!nonEmpty(plan.candidate.repository)) blockers.push("Candidate repository is absent.");
  if (!nonEmpty(plan.candidate.authoredIdentity)) blockers.push("Authored identity is absent.");
  if (!nonEmpty(plan.candidate.experienceId)) blockers.push("Experience identity is absent.");
  if (!nonEmpty(plan.provenance.format) || !nonEmpty(plan.provenance.path)) blockers.push("Representation provenance is absent.");
  if (plan.renderer.action !== "cartridge-assets") blockers.push("Final action representation is primitive-only rather than cartridge-owned.");
  if (plan.renderer.neutralFallbackUsed) blockers.push("First-party candidate uses the neutral white-label fallback.");

  const assetIds = plan.assets.map((asset) => asset.id);
  const duplicateAssetIds = duplicateValues(assetIds);
  if (duplicateAssetIds.length > 0) blockers.push(`Representation plan contains duplicate asset ids: ${duplicateAssetIds.join(", ")}.`);
  if (plan.assets.length < 12) blockers.push("Representation pack does not contain a production-sized asset vocabulary.");
  const assets = new Map(plan.assets.map((asset) => [asset.id, asset]));
  for (const asset of plan.assets) {
    if (!nonEmpty(asset.id)) blockers.push("Representation plan contains an asset without an id.");
    if (!asset.id.startsWith(`${plan.namespace}:`)) blockers.push(`Asset ${asset.id || "<missing>"} escapes namespace ${plan.namespace}.`);
    if (!nonEmpty(asset.sourcePath)) blockers.push(`Asset ${asset.id || "<missing>"} has no source path.`);
    if (!nonEmpty(asset.accessibleEquivalent)) blockers.push(`Asset ${asset.id || "<missing>"} has no nonvisual equivalent.`);
    if (placeholderIdentity(asset.id) || placeholderIdentity(asset.sourcePath)) blockers.push(`Asset ${asset.id || "<missing>"} is a placeholder or neutral fallback.`);
  }

  function requireAsset(assetId: string, role: string): void {
    if (!nonEmpty(assetId) || !assets.has(assetId)) blockers.push(`${role} references missing asset ${assetId || "<missing>"}.`);
  }

  requireAsset(plan.bindings.identityAssetId, "Cartridge identity");

  const requiredPeople = new Set(plan.requirements.personIds);
  const peopleById = new Map(plan.bindings.people.map((binding) => [binding.personId, binding]));
  const duplicatePeople = duplicateValues(plan.bindings.people.map((binding) => binding.personId));
  if (duplicatePeople.length > 0) blockers.push(`Representation plan contains duplicate person bindings: ${duplicatePeople.join(", ")}.`);
  for (const personId of requiredPeople) {
    const binding = peopleById.get(personId);
    if (!binding) {
      blockers.push(`Required person ${personId} has no authored portrait/body binding.`);
      continue;
    }
    requireAsset(binding.portraitAssetId, `Person ${personId} portrait`);
    requireAsset(binding.bodyAssetId, `Person ${personId} body`);
  }

  const requiredObjectives = new Set(plan.requirements.objectiveIds);
  const objectivesById = new Map(plan.bindings.objectives.map((binding) => [binding.objectiveId, binding]));
  const duplicateObjectives = duplicateValues(plan.bindings.objectives.map((binding) => binding.objectiveId));
  if (duplicateObjectives.length > 0) blockers.push(`Representation plan contains duplicate objective bindings: ${duplicateObjectives.join(", ")}.`);
  for (const objectiveId of requiredObjectives) {
    const binding = objectivesById.get(objectiveId);
    if (!binding) {
      blockers.push(`Required objective ${objectiveId} has no visible mechanism-state binding.`);
      continue;
    }
    requireAsset(binding.idleAssetId, `Objective ${objectiveId} idle state`);
    requireAsset(binding.activeAssetId, `Objective ${objectiveId} active state`);
    requireAsset(binding.completeAssetId, `Objective ${objectiveId} completed state`);
  }

  const requiredStates = new Set(plan.requirements.stateIds);
  const statesById = new Map(plan.bindings.states.map((binding) => [binding.stateId, binding]));
  const duplicateStates = duplicateValues(plan.bindings.states.map((binding) => binding.stateId));
  if (duplicateStates.length > 0) blockers.push(`Representation plan contains duplicate state bindings: ${duplicateStates.join(", ")}.`);
  for (const stateId of requiredStates) {
    const binding = statesById.get(stateId);
    if (!binding) {
      blockers.push(`Required persistent state ${stateId} has no visual mark.`);
      continue;
    }
    requireAsset(binding.assetId, `Persistent state ${stateId}`);
  }

  const requiredSurfaces = new Set<RepresentationSurfaceId>([
    ...REQUIRED_REPRESENTATION_SURFACES,
    ...plan.requirements.surfaceIds,
  ]);
  const surfacesById = new Map(plan.surfaces.map((surface) => [surface.id, surface]));
  const duplicateSurfaces = duplicateValues(plan.surfaces.map((surface) => surface.id));
  if (duplicateSurfaces.length > 0) blockers.push(`Representation plan contains duplicate surface bindings: ${duplicateSurfaces.join(", ")}.`);
  for (const surfaceId of requiredSurfaces) {
    const surface = surfacesById.get(surfaceId);
    if (!surface) {
      blockers.push(`Required surface ${surfaceId} has no cartridge-owned representation.`);
      continue;
    }
    if (surface.assetIds.length === 0) blockers.push(`Surface ${surfaceId} contains no cartridge-owned assets.`);
    for (const assetId of surface.assetIds) requireAsset(assetId, `Surface ${surfaceId}`);
    if (!surface.desktop || !surface.mobile) blockers.push(`Surface ${surfaceId} is not represented on both desktop and mobile.`);
    if (!nonEmpty(surface.accessibleEquivalent)) blockers.push(`Surface ${surfaceId} has no nonvisual equivalent.`);
  }
  const coldEntry = surfacesById.get("cold-entry");
  if (coldEntry && !coldEntry.assetIds.includes(plan.bindings.identityAssetId)) {
    blockers.push("Cold entry does not carry the cartridge identity asset.");
  }

  return {
    format: REPRESENTATION_EVALUATION_FORMAT,
    planId: plan.id,
    status: blockers.length === 0 ? "pass" : "fail",
    blockers,
    metrics: {
      assets: plan.assets.length,
      surfaces: plan.surfaces.length,
      people: plan.bindings.people.length,
      objectives: plan.bindings.objectives.length,
      states: plan.bindings.states.length,
    },
  };
}
