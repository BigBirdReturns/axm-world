#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const FORMAT = "rodoh-representation-plan/1";
const RECEIPT_FORMAT = "rodoh-representation-scaffold-receipt/1";
const SURFACES = [
  "cold-entry",
  "authored-commitment",
  "first-action",
  "accepted-consequence",
  "playable-successor",
  "durable-record",
];

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function required(name, pattern = null) {
  const value = option(name);
  if (!value || (pattern && !pattern.test(value))) {
    throw new Error(`${name} is absent or invalid.`);
  }
  return value;
}
function values(name) {
  const raw = option(name, "");
  return [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))].sort();
}
function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}
function writeJson(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`);
}
function sorted(values) {
  return [...new Set(values)].sort();
}
function asset(namespace, suffix, kind, accessibleEquivalent) {
  return {
    id: `${namespace}:${suffix}`,
    sourcePath: `assets/TODO-${suffix.replaceAll(":", "-")}.svg`,
    kind,
    accessibleEquivalent: `TODO: ${accessibleEquivalent}`,
  };
}
function fail(message, details = {}) {
  const receipt = { format: RECEIPT_FORMAT, status: "fail", error: message, ...details };
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = 1;
}

function derive(authoring, extraPeople, stateIds) {
  if (!authoring || typeof authoring !== "object") throw new Error("Authoring root must be an object.");
  if (!authoring.classification || !["authored-pilot-candidate", "playable-authored-episode"].includes(authoring.classification)) {
    throw new Error(`Authoring classification ${String(authoring.classification)} is not a first-party pilot.`);
  }
  const experiences = Object.values(authoring.authoredExperiences?.experiences ?? {});
  const people = [];
  for (const experience of experiences) {
    if (experience?.entry?.playerRoleId) people.push(experience.entry.playerRoleId);
    for (const reveal of experience?.reveals ?? []) {
      if (reveal?.actorId) people.push(reveal.actorId);
    }
  }
  people.push(...extraPeople);

  const objectiveIds = [];
  for (const encounter of Object.values(authoring.actionObjectives?.encounters ?? {})) {
    objectiveIds.push(...Object.keys(encounter ?? {}));
  }

  return {
    people: sorted(people),
    objectives: sorted(objectiveIds),
    states: sorted(stateIds),
    surfaces: [...SURFACES],
  };
}

function createSkeleton({ authoring, namespace, repository, authoredIdentity, experienceId, derived }) {
  const assets = [
    asset(namespace, "emblem", "emblem", `${authoring.title ?? namespace} cartridge identity emblem.`),
    asset(namespace, "scene-cold-entry", "environment", "Inhabited cold-entry situation."),
    asset(namespace, "scene-authored-commitment", "environment", "Authored commitment surface and proposing actors."),
    asset(namespace, "scene-first-action", "environment", "Mechanism-driven first action environment."),
    asset(namespace, "scene-accepted-consequence", "environment", "Accepted persistent world change."),
    asset(namespace, "scene-playable-successor", "environment", "Implemented playable successor."),
    asset(namespace, "record-seal", "record-mark", "Durable record identity and inherited state."),
  ];
  for (const personId of derived.people) {
    assets.push(asset(namespace, `portrait-${personId}`, "portrait", `Portrait or equivalent for ${personId}.`));
    assets.push(asset(namespace, `body-${personId}`, "body", `Standing body or equivalent for ${personId}.`));
  }
  for (const objectiveId of derived.objectives) {
    for (const state of ["idle", "active", "complete"]) {
      assets.push(asset(namespace, `mechanism-${objectiveId}-${state}`, "mechanism", `${objectiveId} mechanism in ${state} state.`));
    }
  }
  for (const stateId of derived.states) {
    assets.push(asset(namespace, `state-${stateId}`, "state-mark", `Persistent state mark for ${stateId}.`));
  }

  const surfaceAsset = {
    "cold-entry": `${namespace}:scene-cold-entry`,
    "authored-commitment": `${namespace}:scene-authored-commitment`,
    "first-action": `${namespace}:scene-first-action`,
    "accepted-consequence": `${namespace}:scene-accepted-consequence`,
    "playable-successor": `${namespace}:scene-playable-successor`,
    "durable-record": `${namespace}:record-seal`,
  };

  return {
    format: FORMAT,
    id: `${namespace}-white-label-v1`,
    namespace,
    classification: authoring.classification,
    candidate: { repository, authoredIdentity, experienceId },
    provenance: {
      format: "rodoh-original-asset-provenance/1",
      path: "assets/provenance.json",
    },
    renderer: { action: "cartridge-assets", neutralFallbackUsed: false },
    requirements: {
      surfaceIds: derived.surfaces,
      personIds: derived.people,
      objectiveIds: derived.objectives,
      stateIds: derived.states,
    },
    assets,
    bindings: {
      identityAssetId: `${namespace}:emblem`,
      people: derived.people.map((personId) => ({
        personId,
        portraitAssetId: `${namespace}:portrait-${personId}`,
        bodyAssetId: `${namespace}:body-${personId}`,
      })),
      objectives: derived.objectives.map((objectiveId) => ({
        objectiveId,
        idleAssetId: `${namespace}:mechanism-${objectiveId}-idle`,
        activeAssetId: `${namespace}:mechanism-${objectiveId}-active`,
        completeAssetId: `${namespace}:mechanism-${objectiveId}-complete`,
      })),
      states: derived.states.map((stateId) => ({
        stateId,
        assetId: `${namespace}:state-${stateId}`,
      })),
    },
    surfaces: derived.surfaces.map((id) => ({
      id,
      assetIds: [surfaceAsset[id]],
      desktop: true,
      mobile: true,
      accessibleEquivalent: `TODO: nonvisual equivalent for ${id}.`,
    })),
  };
}

function missingValues(requiredValues, actualValues) {
  const actual = new Set(actualValues ?? []);
  return requiredValues.filter((value) => !actual.has(value));
}

function checkPlan(plan, expected) {
  const blockers = [];
  if (plan.format !== FORMAT) blockers.push(`Expected ${FORMAT}, received ${String(plan.format)}.`);
  if (plan.namespace !== expected.namespace) blockers.push(`Expected namespace ${expected.namespace}, received ${String(plan.namespace)}.`);
  if (plan.classification !== expected.classification) blockers.push(`Expected classification ${expected.classification}, received ${String(plan.classification)}.`);
  if (plan.candidate?.repository !== expected.repository) blockers.push("Candidate repository does not match the scaffold inputs.");
  if (plan.candidate?.authoredIdentity !== expected.authoredIdentity) blockers.push("Authored identity does not match the scaffold inputs.");
  if (plan.candidate?.experienceId !== expected.experienceId) blockers.push("Experience identity does not match the scaffold inputs.");
  if (plan.renderer?.action !== "cartridge-assets") blockers.push("Action renderer is not cartridge-assets.");
  if (plan.renderer?.neutralFallbackUsed !== false) blockers.push("Neutral fallback remains enabled.");

  const missing = {
    surfaces: missingValues(expected.derived.surfaces, plan.requirements?.surfaceIds),
    people: missingValues(expected.derived.people, plan.requirements?.personIds),
    objectives: missingValues(expected.derived.objectives, plan.requirements?.objectiveIds),
    states: missingValues(expected.derived.states, plan.requirements?.stateIds),
  };
  for (const [kind, ids] of Object.entries(missing)) {
    if (ids.length > 0) blockers.push(`Representation requirements omit ${kind}: ${ids.join(", ")}.`);
  }

  const peopleBindings = new Set((plan.bindings?.people ?? []).map((binding) => binding.personId));
  const objectiveBindings = new Set((plan.bindings?.objectives ?? []).map((binding) => binding.objectiveId));
  const stateBindings = new Set((plan.bindings?.states ?? []).map((binding) => binding.stateId));
  const surfaceBindings = new Set((plan.surfaces ?? []).map((surface) => surface.id));
  for (const personId of expected.derived.people) if (!peopleBindings.has(personId)) blockers.push(`No person binding for ${personId}.`);
  for (const objectiveId of expected.derived.objectives) if (!objectiveBindings.has(objectiveId)) blockers.push(`No objective binding for ${objectiveId}.`);
  for (const stateId of expected.derived.states) if (!stateBindings.has(stateId)) blockers.push(`No persistent-state binding for ${stateId}.`);
  for (const surfaceId of expected.derived.surfaces) if (!surfaceBindings.has(surfaceId)) blockers.push(`No surface binding for ${surfaceId}.`);
  return { blockers, missing };
}

try {
  const authoringPath = required("--authoring");
  const namespace = required("--namespace", /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const repository = required("--repository");
  const authoring = readJson(authoringPath);
  const authoredIdentity = option("--authored-identity", authoring.id);
  const experienceId = option("--experience-id", authoring.id);
  const extraPeople = values("--people");
  const stateIds = values("--state-ids");
  const derived = derive(authoring, extraPeople, stateIds);
  const expected = {
    namespace,
    repository,
    authoredIdentity,
    experienceId,
    classification: authoring.classification,
    derived,
  };
  const presentationPath = option("--presentation");
  const outputPath = option("--output");

  if (presentationPath) {
    const plan = readJson(presentationPath);
    const checked = checkPlan(plan, expected);
    const receipt = {
      format: RECEIPT_FORMAT,
      status: checked.blockers.length === 0 ? "pass" : "fail",
      mode: "check",
      authoring: resolve(authoringPath),
      presentation: resolve(presentationPath),
      namespace,
      derived,
      missing: checked.missing,
      blockers: checked.blockers,
    };
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (checked.blockers.length > 0) process.exitCode = 1;
  } else if (outputPath) {
    const plan = createSkeleton({ authoring, namespace, repository, authoredIdentity, experienceId, derived });
    writeJson(outputPath, plan);
    process.stdout.write(`${JSON.stringify({
      format: RECEIPT_FORMAT,
      status: "pass",
      mode: "generate",
      authoring: resolve(authoringPath),
      output: resolve(outputPath),
      namespace,
      derived,
      generatedAssetObligations: plan.assets.length,
      note: "Generated TODO sources and accessible equivalents are intentionally incomplete until the cartridge-owned pack is authored.",
    }, null, 2)}\n`);
  } else {
    fail("Supply either --presentation for check mode or --output for generation mode.", { authoring: resolve(authoringPath), namespace, derived });
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
