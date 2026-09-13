import { z } from "zod";
import {
  WORLD_EXPRESSION_PACK_FORMAT,
  type WorldExpressionPack,
  type WorldExpressionPackValidation,
  type WorldForgePlan,
} from "./types.js";

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const assetSchema = z.object({
  slotId: z.string().min(1),
  path: z.string().min(1),
  previewPath: z.string().min(1),
  mediaType: z.enum(["model/gltf-binary", "image/png", "image/svg+xml"]),
  sha256,
  bytes: z.number().int().positive(),
  producer: z.string().min(1),
  sourceClass: z.enum(["generated", "project-authored", "licensed"]),
  license: z.string().min(1).optional(),
  sourceUri: z.string().min(1).optional(),
});

const packSchema = z.object({
  format: z.literal(WORLD_EXPRESSION_PACK_FORMAT),
  cartridgeDigest: z.string().regex(/^cart1_[0-9a-f]{64}$/),
  planDigest: z.string().regex(/^wf1_[0-9a-f]{64}$/),
  assets: z.array(assetSchema),
});

function isLocalRelativePath(value: string): boolean {
  if (/^[A-Za-z]:[\\/]/.test(value) || /^[\\/]/.test(value) || value.includes("://")) return false;
  return !value.split(/[\\/]+/).some((part) => part === "..");
}
export function validateWorldExpressionPack(
  value: unknown,
  plan: WorldForgePlan,
  coverage: "partial" | "complete" = "complete",
): WorldExpressionPackValidation {
  const parsed = packSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), pack: null };
  }
  const pack = parsed.data as WorldExpressionPack;
  const errors: string[] = [];
  if (pack.cartridgeDigest !== plan.cartridge.digest) errors.push("cartridgeDigest does not match the forge plan");
  if (pack.planDigest !== plan.planDigest) errors.push("planDigest does not match the forge plan");

  const slots = new Map(plan.jobs.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  for (const asset of pack.assets) {
    if (seen.has(asset.slotId)) errors.push(`duplicate slot receipt: ${asset.slotId}`);
    seen.add(asset.slotId);
    const slot = slots.get(asset.slotId);
    if (!slot) errors.push(`unknown slot receipt: ${asset.slotId}`);
    else if (!slot.output.acceptedMediaTypes.includes(asset.mediaType)) {
      errors.push(`unsupported media type for ${asset.slotId}: ${asset.mediaType}`);
    }
    if (!isLocalRelativePath(asset.path)) errors.push(`asset path must be local and relative: ${asset.path}`);
    if (!isLocalRelativePath(asset.previewPath)) errors.push(`preview path must be local and relative: ${asset.previewPath}`);
    if (asset.sourceClass === "licensed" && (!asset.license || !asset.sourceUri)) {
      errors.push(`licensed asset ${asset.slotId} requires license and sourceUri`);
    }
  }

  if (coverage === "complete") {
    for (const required of slots.keys()) {
      if (!seen.has(required)) errors.push(`missing required slot receipt: ${required}`);
    }
  }
  return { ok: errors.length === 0, errors, pack: errors.length === 0 ? pack : null };
}
