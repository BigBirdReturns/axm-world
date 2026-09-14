import { z } from "zod";
import type { Arc } from "../../engine/types.js";
import "../../engine/abi13.js";
import { cartridgeDigest } from "../../engine/cartridge-digest.js";
import { spendLeverFor } from "../encounter/compile-encounter.js";
import { RuntimeFamilyContractSchema, selectRuntimeFamily, RUNTIME_FAMILIES } from "../../engine/runtime-family.js";
import { STRATEGY_BOARD_PROGRAM_EXTENSION_KEY } from "../../engine/strategy-board/program.js";
import { resolveRuntimeHost } from "../runtime/host-registry.js";
import { CANONICAL_STORY_EXTENSION_KEY } from "../../canonical-story/index.js";

const runtimeBindingSchema = z.object({
  family: z.enum(["encounter-simulation", "fixed-canonical-sequence", "strategy-board"]),
  authority: z.enum(["runCycle", "axm.canonical-story@1", "axm.strategy-board@1"]),
  selection: z.enum(["legacy", "explicit"]),
  contract: RuntimeFamilyContractSchema.optional(),
}).strict().superRefine((binding, ctx) => {
  const authority = binding.family === "encounter-simulation"
    ? "runCycle"
    : binding.family === "strategy-board"
      ? STRATEGY_BOARD_PROGRAM_EXTENSION_KEY
      : CANONICAL_STORY_EXTENSION_KEY;
  if (binding.authority !== authority || (binding.selection === "explicit"
    ? binding.contract?.family !== binding.family : binding.contract !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Contradictory runtime family/authority declaration" });
  }
});

export const PROJECTION_MANIFEST_FORMAT = "axm-world-projection/1" as const;
const ref = z.object({ authority: z.enum(["authored", "runtime"]), path: z.string().min(1) }).strict();
const identified = { id: z.string().min(1), label: z.string(), source: ref };
const verb = z.object({
  ...identified, contextId: z.string(), targetId: z.string(),
  operation: z.enum(["inspect", "next", "previous", "select-party", "select-mode", "allocate-resource", "commit", "review-result", "choose-decision", "claim-reward", "move", "purchase", "auction", "pass", "program-action", "interfere", "review-ledger"]),
  input: z.string(), guards: z.array(z.string()), feedbackIds: z.array(z.string()).min(1),
}).strict();
export const projectionManifestSchema = z.object({
  format: z.literal(PROJECTION_MANIFEST_FORMAT), scope: z.literal("presentation-only"),
  runtime: runtimeBindingSchema,
  cartridge: z.object({ id: z.string(), digest: z.string().regex(/^cart1_[0-9a-f]{64}$/), name: z.string() }).strict(),
  contexts: z.array(z.object({ ...identified, parentId: z.string().nullable(), description: z.string() }).strict()),
  verbs: z.array(verb),
  interactables: z.array(z.object({ ...identified, contextId: z.string(), verbIds: z.array(z.string()).min(1) }).strict()),
  signals: z.array(z.object({ ...identified, contextId: z.string(), binding: ref, semantics: z.enum(["access", "readiness", "composition", "state", "receipt"]), description: z.string() }).strict()),
  feedback: z.array(z.object({ ...identified, contextId: z.string(), trigger: z.enum(["inspect", "input-change", "resolution"]), requirement: z.string() }).strict()),
  terminalConditions: z.array(z.object({ ...identified, contextId: z.string(), scope: z.enum(["encounter", "run"]), resultSource: ref }).strict()),
  expressionSlots: z.array(z.object({ id: z.string(), contextId: z.string(), brief: z.string(), requirementIds: z.array(z.string()).min(1) }).strict()),
}).strict();
export type ProjectionManifest = z.infer<typeof projectionManifestSchema>;
type Ref = z.infer<typeof ref>;
const authored = (path: string): Ref => ({ authority: "authored", path });
const runtime = (path: string): Ref => ({ authority: "runtime", path });
const pointer = (value: string) => value.replaceAll("~", "~0").replaceAll("/", "~1");

/** Data requirements, not a run snapshot or executable law. JSON pointers address
 * authored records; runtime paths name existing derivations, not callable code. */
export function compileProjectionManifest(arc: Arc): ProjectionManifest {
  const resolution = resolveRuntimeHost(arc);
  if (!resolution.ok) throw new Error(resolution.refusal.message);
  const selection = selectRuntimeFamily(arc, RUNTIME_FAMILIES);
  const storyHost = resolution.selection.host === "canonical-story";
  const strategyHost = resolution.selection.host === "strategy-board";
  const manifest: ProjectionManifest = {
    format: PROJECTION_MANIFEST_FORMAT, scope: "presentation-only",
    runtime: {
      family: storyHost ? "fixed-canonical-sequence" : strategyHost ? "strategy-board" : "encounter-simulation",
      authority: storyHost ? CANONICAL_STORY_EXTENSION_KEY : strategyHost ? STRATEGY_BOARD_PROGRAM_EXTENSION_KEY : "runCycle",
      selection: selection.kind === "selected" ? "explicit" : "legacy",
      ...(selection.kind === "selected" ? { contract: selection.contract } : {}),
    },
    cartridge: { id: arc.meta.id, name: arc.meta.name, digest: cartridgeDigest(arc) },
    contexts: [{ id: "world", label: arc.meta.name, source: authored("/meta"), parentId: null, description: arc.meta.description }],
    verbs: [], interactables: [], signals: [], feedback: [], terminalConditions: [], expressionSlots: [],
  };
  if (resolution.selection.host === "canonical-story") {
    const story = resolution.selection.story;
    manifest.contexts[0]!.source = authored(`/extensions/${CANONICAL_STORY_EXTENSION_KEY}`);
    manifest.contexts[0]!.label = story.identity.title;
    manifest.contexts[0]!.description = "Present the canonical fixed sequence and exact source; unresolved source remains visibly unavailable.";
    story.episodes.forEach((episode, ei) => episode.chapters.forEach((chapter, ci) => chapter.panels.forEach((panel, pi) => {
      const contextId = `panel:${panel.id}`;
      const source = authored(`/extensions/${CANONICAL_STORY_EXTENSION_KEY}/episodes/${ei}/chapters/${ci}/panels/${pi}`);
      manifest.contexts.push({ id: contextId, label: panel.id, source, parentId: "world", description: "Render the authored panel, exact text and asset availability; no generated replacement source." });
      const feedbackId = `${contextId}:feedback`;
      manifest.feedback.push({ id: feedbackId, label: "Canonical cursor", contextId, source, trigger: "input-change", requirement: "Show the canonical cursor and transition receipt. At the published extent show completion or the declared unavailable continuation; never fabricate a branch." });
      for (const operation of ["inspect", "next", "previous"] as const) {
        const id = `${contextId}:${operation}`;
        const targetId = `${id}:target`;
        manifest.verbs.push({ id, label: operation, contextId, targetId, operation, source,
          input: operation === "inspect" ? "canonicalStoryPanel(story, panelId)" : operation === "next" ? "advanceCanonicalStory(story, cursor)" : "retreatCanonicalStory(story, cursor)",
          guards: ["validated canonical-story authority", "cursor belongs to this story", "navigation follows authored panel links and published extent"], feedbackIds: [feedbackId] });
        manifest.interactables.push({ id: targetId, label: operation, contextId, source, verbIds: [id] });
      }
      manifest.signals.push({ id: `${contextId}:receipt`, label: "Canonical transition", contextId, source, binding: runtime("CanonicalStoryTransitionReceipt"), semantics: "receipt", description: "Canonical navigation receipt, not a simulation outcome." });
    })));
    for (const context of manifest.contexts) {
      manifest.expressionSlots.push({ id: `expression:${context.id}`, contextId: context.id, brief: context.description,
        requirementIds: [context.id, ...[...manifest.verbs, ...manifest.interactables, ...manifest.feedback, ...manifest.signals].filter((entry) => entry.contextId === context.id).map((entry) => entry.id)] });
    }
    return validateProjectionManifest(manifest);
  }
  if (resolution.selection.host === "strategy-board") {
    const program = resolution.selection.program;
    const def = program.definition;
    const root = `/extensions/${STRATEGY_BOARD_PROGRAM_EXTENSION_KEY}`;
    manifest.contexts[0]!.source = authored(root);
    manifest.contexts[0]!.label = def.name;
    manifest.contexts[0]!.description = def.description;
    const worldFeedbackId = "world:strategy-feedback";
    manifest.feedback.push({
      id: worldFeedbackId, label: "Authoritative turn receipt", contextId: "world",
      source: runtime("StrategyExecutionState.execution.ledger"), trigger: "resolution",
      requirement: "Show the exact phase, acting seat, resource mutations, ownership changes, milestone locks and terminal receipt emitted by the Strategy Board executor.",
    });
    const addVerb = (contextId: string, label: string, operation: ProjectionManifest["verbs"][number]["operation"], source: Ref, input: string, guards: string[], feedbackId = worldFeedbackId) => {
      const id = `${contextId}:verb:${operation}:${manifest.verbs.length}`;
      const targetId = `${id}:target`;
      manifest.verbs.push({ id, label, contextId, targetId, operation, source, input, guards, feedbackIds: [feedbackId] });
      manifest.interactables.push({ id: targetId, label, contextId, source, verbIds: [id] });
    };
    def.spaces.forEach((space, index) => {
      const contextId = `space:${space.id}`;
      const source = authored(`${root}/definition/spaces/${index}`);
      const feedbackId = `${contextId}:feedback`;
      manifest.contexts.push({ id: contextId, label: space.name, source, parentId: "world", description: `${space.region} · ${space.type}` });
      manifest.feedback.push({ id: feedbackId, label: "Space resolution", contextId, source: runtime("StrategyExecutionState.positions/ownership"), trigger: "resolution", requirement: "Show authoritative occupancy, ownership and any toll or acquisition result after resolution." });
      addVerb(contextId, `Inspect ${space.name}`, "inspect", source, "spaceId", [], feedbackId);
      addVerb(contextId, `Move to ${space.name}`, "move", source, "destinationSpaceId", ["phase is movementResolution", "destination is adjacent to active seat position"], feedbackId);
      manifest.signals.push({ id: `${contextId}:state`, label: "Space state", contextId, source, binding: runtime("StrategyExecutionState.positions/ownership"), semantics: "state", description: "Current occupants and authoritative asset owner, if any." });
    });
    def.controlAssets.forEach((asset, index) => {
      if (asset.ownershipModel !== "buyable") return;
      const contextId = `space:${asset.sitedOnSpaceId}`;
      addVerb(contextId, `Buy ${asset.name}`, "purchase", authored(`${root}/definition/controlAssets/${index}`), "assetId", ["listed by listExecutableStrategyActions", "acting seat can pay authored acquisition cost"]);
    });
    def.auctions.forEach((auction, index) => {
      const asset = def.controlAssets.find((item) => item.id === auction.assetId)!;
      addVerb(`space:${asset.sitedOnSpaceId}`, `Auction ${asset.name}`, "auction", authored(`${root}/definition/auctions/${index}`), "explicit bid sequence", ["listed by listExecutableStrategyActions", "each bid is valid and payable"]);
    });
    def.programActions.forEach((action, index) => addVerb("world", action.name, "program-action", authored(`${root}/definition/programActions/${index}`), "program action id", ["phase is programAction", "doctrine permits action", "acting seat can afford complete authored mutation set"]));
    def.interferences.forEach((interference, index) => addVerb("world", interference.name, "interfere", authored(`${root}/definition/interferences/${index}`), "interference id", ["phase is reactionInterference", "action is authored as interferable", "reacting seat can pay cost"]));
    addVerb("world", "Pass", "pass", authored(`${root}/definition`), "null", ["pass is listed as a legal action for the current choice phase"]);
    addVerb("world", "Review ledger", "review-ledger", runtime("StrategyExecutionState.execution.ledger"), "ledger cursor", ["recorded events exist"]);
    manifest.signals.push({ id: "world:turn-state", label: "Turn state", contextId: "world", source: authored(root), binding: runtime("StrategyExecutionState.quarter/phase/activeSeatIndex"), semantics: "state", description: "Quarter, authoritative phase and active/acting seats." });
    manifest.signals.push({ id: "world:resource-state", label: "Resource ledgers", contextId: "world", source: authored(`${root}/definition/resources`), binding: runtime("StrategyExecutionState.seats[].balances"), semantics: "state", description: "Exact per-seat balances after recorded mutations." });
    def.endings.forEach((ending, index) => manifest.terminalConditions.push({ id: `ending:${ending.id}`, label: ending.name, contextId: "world", scope: "run", source: authored(`${root}/definition/endings/${index}`), resultSource: runtime("StrategyExecutionState.execution.terminal") }));
    for (const context of manifest.contexts) {
      const requirements = [...manifest.verbs, ...manifest.interactables, ...manifest.signals, ...manifest.feedback, ...manifest.terminalConditions].filter((entry) => entry.contextId === context.id);
      manifest.expressionSlots.push({ id: `expression:${context.id}`, contextId: context.id, brief: context.description, requirementIds: [context.id, ...requirements.map((entry) => entry.id)] });
    }
    return validateProjectionManifest(manifest);
  }
  arc.progressionTiers.forEach((tier, index) => manifest.contexts.push({
    id: `tier:${tier.id}`, label: tier.name, source: authored(`/progressionTiers/${index}`), parentId: "world", description: tier.flavorText,
  }));
  const worldChoice = (operation: "choose-decision" | "claim-reward", source: Ref, input: string, guard: string, requirement: string) => {
    const id = `world:${operation}`;
    manifest.verbs.push({ id, label: operation, contextId: "world", targetId: `${id}:target`, operation, input, guards: [guard], feedbackIds: [`${id}:feedback`], source });
    manifest.interactables.push({ id: `${id}:target`, label: operation, contextId: "world", source, verbIds: [id] });
    manifest.feedback.push({ id: `${id}:feedback`, label: operation, contextId: "world", source, trigger: "resolution", requirement });
  };
  if (arc.opening || arc.narrativeEvents.length) worldChoice("choose-decision", arc.opening ? authored("/opening") : authored("/narrativeEvents"), "resolveDecision(optionId)", "pending engine decision and authored option exist", `Expose the pending authored narrative and options verbatim; show the engine decision receipt and saved memory. ${arc.opening?.narrativeText ?? ""}`);
  if (arc.challenges.some((challenge) => Object.values(challenge.outcomes).some((outcome) => outcome.rewardTable.length))) worldChoice("claim-reward", runtime("pendingLoot"), "claimLoot(choiceId, agentId)", "pending reward choice and eligible recipient exist", "Show eligible recipients and fit before selection, then the actual equip receipt. A possible reward is not owned loot.");
  arc.challenges.forEach((challenge, index) => {
    const contextId = `encounter:${challenge.id}`;
    const base = `/challenges/${index}`;
    const tier = arc.progressionTiers.find((entry) => entry.challenges.includes(challenge.id));
    manifest.contexts.push({ id: contextId, label: challenge.name, source: authored(base), parentId: tier ? `tier:${tier.id}` : "world", description: challenge.description });
    const feedbackIds = ["inspect", "input-change", "resolution"].map((phase) => `${contextId}:feedback:${phase}`);
    const requirements = [
      `Expose authored objectives: ${challenge.mechanicChecks.map((check) => `${check.name}: ${check.description}`).join(" | ")}. Read completion criteria at ${base}/completionCriteria. Possible outcomes are previews: ${Object.entries(challenge.outcomes).map(([grade, outcome]) => `${grade}: ${outcome.narrative}`).join(" | ")}`,
      "Reflect the selected input and current engine-backed readiness; explain unmet gates. A forecast is not a result.",
      "Expose the engine outcome, check reasons, actual state changes and recorded receipt separately; retain partial and failure continuations.",
    ];
    (["inspect", "input-change", "resolution"] as const).forEach((trigger, i) => manifest.feedback.push({
      id: feedbackIds[i]!, label: trigger, contextId, trigger, requirement: requirements[i]!,
      source: i === 0 ? authored(base) : runtime(i === 1 ? "evaluateParty" : "runCycle.reports"),
    }));
    const addVerb = (operation: ProjectionManifest["verbs"][number]["operation"], input: string, source: Ref, guards: string[]) => {
      const id = `${contextId}:verb:${operation}`;
      const targetId = `${contextId}:target:${operation}`;
      manifest.verbs.push({ id, label: operation, contextId, targetId, operation, input, guards, source, feedbackIds: [...feedbackIds] });
      manifest.interactables.push({ id: targetId, label: challenge.name, contextId, source, verbIds: [id] });
    };
    addVerb("inspect", "challengeId", authored(base), []);
    // A party control binds actual assignment input; current eligibility and
    // whether alternatives exist are runtime questions, never guessed from art.
    addVerb("select-party", "assignments[].agentIds", authored(`${base}/rosterRequirements`), ["eligible roster alternatives exist", "evaluateParty", "challengeAccess"]);
    if (arc.difficultyModes.length) addVerb("select-mode", "difficultyModeId", authored("/difficultyModes"), ["authored mode", "applyDifficultyMode", "challengeAccess"]);
    if (spendLeverFor(challenge)) addVerb("allocate-resource", "assignments[].tokensSpent", authored(base), ["spendOffer.available", "spendOffer.maxSpend", "resolveTokensSpent"]);
    addVerb("commit", "assignments[]", authored(base), ["challengeAccess", "runtime validates committed assignment"]);
    addVerb("review-result", "report.challengeId", runtime("runCycle.reports"), ["stored report exists"]);
    const signal = (semantics: ProjectionManifest["signals"][number]["semantics"], source: Ref, description: string) => manifest.signals.push({
      id: `${contextId}:signal:${semantics}`, label: semantics, contextId, semantics, source, binding: semantics === "composition" ? runtime("evaluateCompositionFor") : source, description,
    });
    signal("access", runtime("challengeAccess"), "Availability and reasons; never imply that inspecting grants access.");
    signal("readiness", runtime("evaluateParty"), "Selected party feasibility and projected checks, distinct from resolved outcomes.");
    signal("receipt", runtime("runCycle.reports"), "Actual outcome and recorded changes after adjudication.");
    if (challenge.compositionConstraints?.length) signal("composition", authored(`${base}/compositionConstraints`), `Display engine composition results for ${challenge.compositionConstraints.map((entry) => entry.label).join(", ")}, rejection reasons, dependencies and single points of failure; do not recompute constraints.`);
    manifest.terminalConditions.push({ id: `${contextId}:terminal`, label: "Encounter resolution", contextId, scope: "encounter", source: authored(`${base}/completionCriteria`), resultSource: runtime("runCycle.reports[].outcome") });
  });
  (arc.stateDefinitions ?? []).forEach((definition, index) => {
    if (definition.visibility === "private") return;
    const id = `state:${definition.id}`;
    const source = authored(`/stateDefinitions/${index}`);
    const feedbackId = `${id}:feedback`;
    manifest.signals.push({ id, label: definition.label, contextId: "world", semantics: "state", source, binding: runtime(`org.cartridgeState/${pointer(definition.id)}`), description: `${definition.description} Initial is an authored default, not evidence of a changed run.` });
    manifest.feedback.push({ id: feedbackId, label: definition.label, contextId: "world", trigger: "resolution", source: runtime("runCycle.reports[].stateChanges"), requirement: "Make recorded before/after and reason perceptible without inventing a change." });
    manifest.verbs.push({ id: `${id}:inspect`, label: "inspect", operation: "inspect", contextId: "world", targetId: `${id}:target`, input: definition.id, guards: [], source, feedbackIds: [feedbackId] });
    manifest.interactables.push({ id: `${id}:target`, label: definition.label, contextId: "world", source, verbIds: [`${id}:inspect`] });
  });
  for (const context of manifest.contexts) {
    const requirements = [...manifest.verbs, ...manifest.interactables, ...manifest.signals, ...manifest.feedback, ...manifest.terminalConditions].filter((entry) => entry.contextId === context.id);
    manifest.expressionSlots.push({ id: `expression:${context.id}`, contextId: context.id, brief: context.description, requirementIds: [context.id, ...requirements.map((entry) => entry.id)] });
  }
  return validateProjectionManifest(manifest);
}

/** Reject malformed graphs before sending any production work to a provider. */
export function validateProjectionManifest(value: unknown, arc?: Arc): ProjectionManifest {
  const manifest = projectionManifestSchema.parse(value);
  if (arc) {
    const expected = compileProjectionManifest(arc);
    if (manifest.cartridge.digest !== expected.cartridge.digest || JSON.stringify(manifest.runtime) !== JSON.stringify(expected.runtime)) throw new Error("Projection runtime family/authority does not match cartridge");
  }
  const allowedOperations: Record<ProjectionManifest["runtime"]["family"], ReadonlySet<ProjectionManifest["verbs"][number]["operation"]>> = {
    "fixed-canonical-sequence": new Set(["inspect", "next", "previous"]),
    "encounter-simulation": new Set(["inspect", "select-party", "select-mode", "allocate-resource", "commit", "review-result", "choose-decision", "claim-reward"]),
    "strategy-board": new Set(["inspect", "move", "purchase", "auction", "pass", "program-action", "interfere", "review-ledger"]),
  };
  const family = manifest.runtime.family;
  if (manifest.verbs.some((verb) => !allowedOperations[family].has(verb.operation))) {
    throw new Error("Projection verbs contradict runtime family authority");
  }
  if ((family === "fixed-canonical-sequence" && manifest.terminalConditions.length > 0)
    || (family === "encounter-simulation" && manifest.terminalConditions.some((entry) => entry.scope !== "encounter"))
    || (family === "strategy-board" && manifest.terminalConditions.some((entry) => entry.scope !== "run"))) {
    throw new Error("Projection terminal conditions contradict runtime family authority");
  }
  const entries = [...manifest.contexts, ...manifest.verbs, ...manifest.interactables, ...manifest.signals, ...manifest.feedback, ...manifest.terminalConditions, ...manifest.expressionSlots];
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error("Duplicate projection id");
  const requireId = (id: string, collection: readonly { id: string }[]) => {
    if (!collection.some((entry) => entry.id === id)) throw new Error(`Unknown projection reference: ${id}`);
  };
  for (const entry of entries) if ("contextId" in entry) requireId(entry.contextId, manifest.contexts);
  for (const context of manifest.contexts) {
    const seen = new Set([context.id]);
    let parent = context.parentId;
    while (parent !== null) {
      requireId(parent, manifest.contexts);
      if (seen.has(parent)) throw new Error("Cyclic projection contexts");
      seen.add(parent);
      parent = manifest.contexts.find((entry) => entry.id === parent)!.parentId;
    }
  }
  for (const action of manifest.verbs) {
    requireId(action.targetId, manifest.interactables);
    const target = manifest.interactables.find((entry) => entry.id === action.targetId)!;
    if (target.contextId !== action.contextId || !target.verbIds.includes(action.id)) throw new Error("Inconsistent interaction binding");
    action.feedbackIds.forEach((id) => requireId(id, manifest.feedback));
  }
  for (const target of manifest.interactables) target.verbIds.forEach((id) => {
    requireId(id, manifest.verbs);
    if (manifest.verbs.find((entry) => entry.id === id)!.targetId !== target.id) throw new Error("Inconsistent target binding");
  });
  for (const slot of manifest.expressionSlots) slot.requirementIds.forEach((id) => requireId(id, entries.filter((entry) => !("requirementIds" in entry))));
  const covered = new Set(manifest.expressionSlots.flatMap((slot) => slot.requirementIds));
  for (const entry of entries) if (!("requirementIds" in entry) && !covered.has(entry.id)) throw new Error(`Uncovered projection requirement: ${entry.id}`);
  return manifest;
}
