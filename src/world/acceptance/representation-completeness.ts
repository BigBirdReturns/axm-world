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
export type RepresentationProductionStatus = "prototype" | "mixed" | "complete";

export interface RepresentationAsset {
  id: string;
  sourcePath: string;
  kind: RepresentationAssetKind;
  accessibleEquivalent: string;
}

export interface RepresentationProductionSource {
  id: string;
  assetIds: string[];
  sourcePaths: string[];
  mediaType: string;
  sha256: string;
  width?: number;
  height?: number;
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
  production: {
    status: RepresentationProductionStatus;
    requiredAssetIds: string[];
    productionAssetIds: string[];
    prototypeAssetIds: string[];
    sources: RepresentationProductionSource[];
  };
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
    declaredRoles: number;
    productionRoles: number;
    prototypeRoles: number;
    productionSources: number;
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

function missingValues(required: readonly string[], actual: ReadonlySet<string>): string[] {
  return required.filter((value) => !actual.has(value)).sort();
}

function unknownValues(actual: readonly string[], allowed: ReadonlySet<string>): string[] {
  return actual.filter((value) => !allowed.has(value)).sort();
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
  const assetIdSet = new Set(assetIds);
  const duplicateAssetIds = duplicateValues(assetIds);
  if (duplicateAssetIds.length > 0) blockers.push(`Representation plan contains duplicate asset ids: ${duplicateAssetIds.join(", ")}.`);
  if (plan.assets.length < 12) blockers.push("Representation pack does not contain a production-sized role vocabulary.");
  const assets = new Map(plan.assets.map((asset) => [asset.id, asset]));
  for (const asset of plan.assets) {
    if (!nonEmpty(asset.id)) blockers.push("Representation plan contains a role without an id.");
    if (!asset.id.startsWith(`${plan.namespace}:`)) blockers.push(`Representation role ${asset.id || "<missing>"} escapes namespace ${plan.namespace}.`);
    if (!nonEmpty(asset.sourcePath)) blockers.push(`Representation role ${asset.id || "<missing>"} has no source path.`);
    if (!nonEmpty(asset.accessibleEquivalent)) blockers.push(`Representation role ${asset.id || "<missing>"} has no nonvisual equivalent.`);
    if (placeholderIdentity(asset.id)) blockers.push(`Representation role ${asset.id || "<missing>"} has placeholder identity.`);
  }

  function requireAsset(assetId: string, role: string): void {
    if (!nonEmpty(assetId) || !assets.has(assetId)) blockers.push(`${role} references missing representation role ${assetId || "<missing>"}.`);
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
    if (surface.assetIds.length === 0) blockers.push(`Surface ${surfaceId} contains no cartridge-owned representation roles.`);
    for (const assetId of surface.assetIds) requireAsset(assetId, `Surface ${surfaceId}`);
    if (!surface.desktop || !surface.mobile) blockers.push(`Surface ${surfaceId} is not represented on both desktop and mobile.`);
    if (!nonEmpty(surface.accessibleEquivalent)) blockers.push(`Surface ${surfaceId} has no nonvisual equivalent.`);
  }
  const coldEntry = surfacesById.get("cold-entry");
  if (coldEntry && !coldEntry.assetIds.includes(plan.bindings.identityAssetId)) {
    blockers.push("Cold entry does not carry the cartridge identity role.");
  }

  const production = plan.production;
  if (!production) {
    blockers.push("Production coverage manifest is absent.");
  } else {
    const requiredProductionIds = production.requiredAssetIds ?? [];
    const productionIds = production.productionAssetIds ?? [];
    const prototypeIds = production.prototypeAssetIds ?? [];
    const requiredSet = new Set(requiredProductionIds);
    const productionSet = new Set(productionIds);
    const prototypeSet = new Set(prototypeIds);

    for (const [label, values] of [
      ["required", requiredProductionIds],
      ["production", productionIds],
      ["prototype", prototypeIds],
    ] as const) {
      const duplicates = duplicateValues(values);
      if (duplicates.length > 0) blockers.push(`Production coverage contains duplicate ${label} roles: ${duplicates.join(", ")}.`);
      const unknown = unknownValues(values, assetIdSet);
      if (unknown.length > 0) blockers.push(`Production coverage contains unknown ${label} roles: ${unknown.join(", ")}.`);
    }

    const omittedRequired = missingValues(assetIds, requiredSet);
    if (omittedRequired.length > 0) blockers.push(`Production coverage omits declared roles: ${omittedRequired.join(", ")}.`);
    const extraRequired = unknownValues(requiredProductionIds, assetIdSet);
    if (extraRequired.length > 0) blockers.push(`Production coverage requires unknown roles: ${extraRequired.join(", ")}.`);

    const overlap = productionIds.filter((assetId) => prototypeSet.has(assetId)).sort();
    if (overlap.length > 0) blockers.push(`Production and prototype partitions overlap: ${overlap.join(", ")}.`);
    const partition = new Set([...productionIds, ...prototypeIds]);
    const unclassified = missingValues(requiredProductionIds, partition);
    if (unclassified.length > 0) blockers.push(`Production coverage leaves roles unclassified: ${unclassified.join(", ")}.`);

    const sourceIds = production.sources?.map((source) => source.id) ?? [];
    const duplicateSourceIds = duplicateValues(sourceIds);
    if (duplicateSourceIds.length > 0) blockers.push(`Production coverage contains duplicate source ids: ${duplicateSourceIds.join(", ")}.`);
    const sourcedProductionRoles = new Set<string>();
    for (const source of production.sources ?? []) {
      if (!nonEmpty(source.id)) blockers.push("Production source id is absent.");
      if (!nonEmpty(source.mediaType)) blockers.push(`Production source ${source.id || "<missing>"} has no media type.`);
      if (!/^[0-9a-f]{64}$/.test(source.sha256 ?? "")) blockers.push(`Production source ${source.id || "<missing>"} has no exact SHA-256.`);
      if (!Array.isArray(source.sourcePaths) || source.sourcePaths.length === 0 || source.sourcePaths.some((path) => !nonEmpty(path))) {
        blockers.push(`Production source ${source.id || "<missing>"} has no exact source paths.`);
      }
      if (!Array.isArray(source.assetIds) || source.assetIds.length === 0) blockers.push(`Production source ${source.id || "<missing>"} binds no representation roles.`);
      if ((source.width !== undefined && (!Number.isInteger(source.width) || source.width <= 0))
        || (source.height !== undefined && (!Number.isInteger(source.height) || source.height <= 0))) {
        blockers.push(`Production source ${source.id || "<missing>"} has invalid dimensions.`);
      }
      for (const assetId of source.assetIds ?? []) {
        if (!productionSet.has(assetId)) blockers.push(`Production source ${source.id || "<missing>"} binds non-production role ${assetId}.`);
        sourcedProductionRoles.add(assetId);
      }
    }
    const unsourcedProduction = missingValues(productionIds, sourcedProductionRoles);
    if (unsourcedProduction.length > 0) blockers.push(`Production roles lack an exact authored source: ${unsourcedProduction.join(", ")}.`);

    if (production.status === "prototype") blockers.push("Production coverage is prototype-only.");
    if (production.status === "mixed") blockers.push(`Production coverage is mixed: ${prototypeIds.length} declared roles still use prototype sources.`);
    if (production.status === "complete" && prototypeIds.length > 0) blockers.push(`Production coverage is marked complete but ${prototypeIds.length} prototype roles remain.`);
    if (production.status === "complete" && productionIds.length !== requiredProductionIds.length) {
      blockers.push("Production coverage is marked complete without covering every required role.");
    }
    if (production.status === "complete" && (production.sources?.length ?? 0) === 0) blockers.push("Complete production coverage has no authored sources.");
  }

  return {
    format: REPRESENTATION_EVALUATION_FORMAT,
    planId: plan.id,
    status: blockers.length === 0 ? "pass" : "fail",
    blockers,
    metrics: {
      declaredRoles: plan.assets.length,
      productionRoles: plan.production?.productionAssetIds?.length ?? 0,
      prototypeRoles: plan.production?.prototypeAssetIds?.length ?? plan.assets.length,
      productionSources: plan.production?.sources?.length ?? 0,
      surfaces: plan.surfaces.length,
      people: plan.bindings.people.length,
      objectives: plan.bindings.objectives.length,
      states: plan.bindings.states.length,
    },
  };
}
