import { sha256Hex } from "../../engine/cartridge-digest.js";
import { validateProjectionManifest, type ProjectionManifest } from "./projection.js";
import type { WorldForgeJob } from "./types.js";

export const WORLD_FORGE_PLAN_V2_FORMAT = "rodoh-world-forge-plan/2" as const;
export interface WorldForgeJobV2 extends Omit<WorldForgeJob, "kind" | "sourceRefs"> {
  kind: "perception-interaction";
  contextId: string;
  requirements: Omit<ProjectionManifest, "format" | "scope" | "cartridge" | "expressionSlots">;
}
export interface WorldForgePlanV2 {
  format: typeof WORLD_FORGE_PLAN_V2_FORMAT;
  scope: "presentation-only";
  cartridge: ProjectionManifest["cartridge"];
  manifest: ProjectionManifest;
  jobs: WorldForgeJobV2[];
  planDigest: `wf2_${string}`;
}

/** The production compiler takes only the projection contract, never raw Arc.
 * Structured requirements travel with each job so prose cannot erase agency. */
export function compileWorldForgePlanV2(value: unknown): WorldForgePlanV2 {
  const manifest = validateProjectionManifest(value);
  const jobs: WorldForgeJobV2[] = manifest.expressionSlots.map((slot) => {
    const ids = new Set(slot.requirementIds);
    ids.add(slot.contextId);
    // Carry dependency closure even when a creator splits expression work into
    // several slots. A producer must not receive an action without its target
    // and required feedback, or a context without its containing spaces.
    let previousSize = -1;
    while (previousSize !== ids.size) {
      previousSize = ids.size;
      for (const entry of [...manifest.verbs, ...manifest.interactables, ...manifest.signals, ...manifest.feedback, ...manifest.terminalConditions]) {
        if (ids.has(entry.id)) ids.add(entry.contextId);
      }
      for (const context of manifest.contexts) if (ids.has(context.id) && context.parentId) ids.add(context.parentId);
      for (const action of manifest.verbs) if (ids.has(action.id)) {
        ids.add(action.contextId);
        ids.add(action.targetId);
        action.feedbackIds.forEach((id) => ids.add(id));
      }
      for (const target of manifest.interactables) if (ids.has(target.id)) target.verbIds.forEach((id) => ids.add(id));
    }
    const select = <T extends { id: string }>(entries: T[]) => entries.filter((entry) => ids.has(entry.id));
    const requirements = {
      runtime: manifest.runtime,
      contexts: select(manifest.contexts), verbs: select(manifest.verbs),
      interactables: select(manifest.interactables), signals: select(manifest.signals),
      feedback: select(manifest.feedback), terminalConditions: select(manifest.terminalConditions),
    };
    return {
      id: slot.id, kind: "perception-interaction", contextId: slot.contextId,
      label: manifest.contexts.find((entry) => entry.id === slot.contextId)!.label,
      brief: `${slot.brief}\nPlayer actions: ${requirements.verbs.map((entry) => `${entry.operation} (${entry.input})`).join(", ") || "perceive context"}. Express every attached requirement. Runtime guards and engine receipts remain authoritative; assets never execute outcome law.`,
      requirements,
      output: { acceptedMediaTypes: ["model/gltf-binary", "image/png", "image/svg+xml"], preferredMediaType: "model/gltf-binary", previewMediaType: "image/png", localOnly: true, presentationOnly: true },
      acceptance: { requiresRenderableContent: true, mustContainRemoteReferences: false, mayCarryRules: false, requiresPreview: true, requiresReceipt: true },
    };
  });
  const core = { format: WORLD_FORGE_PLAN_V2_FORMAT, scope: "presentation-only" as const, cartridge: manifest.cartridge, manifest, jobs };
  return { ...core, planDigest: `wf2_${sha256Hex(JSON.stringify(core))}` };
}
