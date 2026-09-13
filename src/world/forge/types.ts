export const WORLD_FORGE_PLAN_FORMAT = "rodoh-world-forge-plan/1" as const;
export const WORLD_FORGE_PLAN_DIGEST_PREFIX = "wf1_" as const;

export type WorldForgeAssetKind =
  | "region-environment"
  | "role-actor"
  | "encounter-setpiece"
  | "item-prop";

export type WorldForgeMediaType =
  | "model/gltf-binary"
  | "image/png"
  | "image/svg+xml";

export type WorldForgeSourceKind =
  | "arc"
  | "progression-tier"
  | "role"
  | "challenge"
  | "mechanic-check"
  | "item";

export interface WorldForgeSourceRef {
  kind: WorldForgeSourceKind;
  id: string;
}

export interface WorldForgeOutputContract {
  acceptedMediaTypes: WorldForgeMediaType[];
  preferredMediaType: WorldForgeMediaType;
  previewMediaType: "image/png";
  localOnly: true;
  presentationOnly: true;
}

export interface WorldForgeJob {
  id: string;
  kind: WorldForgeAssetKind;
  label: string;
  brief: string;
  sourceRefs: WorldForgeSourceRef[];
  output: WorldForgeOutputContract;
  acceptance: {
    requiresRenderableContent: true;
    mustContainRemoteReferences: false;
    mayCarryRules: false;
    requiresPreview: true;
    requiresReceipt: true;
  };
}
export interface WorldForgeRegion {
  id: string;
  name: string;
  brief: string;
  challengeIds: string[];
}

export interface WorldForgePlanCore {
  format: typeof WORLD_FORGE_PLAN_FORMAT;
  cartridge: {
    id: string;
    version: string;
    digest: string;
    name: string;
    domain: string;
    description: string;
  };
  scope: "presentation-only";
  regions: WorldForgeRegion[];
  jobs: WorldForgeJob[];
}

export interface WorldForgePlan extends WorldForgePlanCore {
  planDigest: `${typeof WORLD_FORGE_PLAN_DIGEST_PREFIX}${string}`;
}

export const WORLD_EXPRESSION_PACK_FORMAT = "rodoh-world-expression-pack/1" as const;

export interface WorldExpressionAssetReceipt {
  slotId: string;
  path: string;
  previewPath: string;
  mediaType: WorldForgeMediaType;
  sha256: string;
  bytes: number;
  producer: string;
  sourceClass: "generated" | "project-authored" | "licensed";
  license?: string;
  sourceUri?: string;
}

export interface WorldExpressionPack {
  format: typeof WORLD_EXPRESSION_PACK_FORMAT;
  cartridgeDigest: string;
  planDigest: string;
  assets: WorldExpressionAssetReceipt[];
}

export interface WorldExpressionPackValidation {
  ok: boolean;
  errors: string[];
  pack: WorldExpressionPack | null;
}