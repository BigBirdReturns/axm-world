import { z } from "zod";

export const QuickPlayActionSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["button", "axis1", "axis2"]),
  required: z.boolean().default(false),
}).strict();

export const QuickPlayCartridgeSchema = z.object({
  format: z.literal("axm-quickplay-cartridge/0"),
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(160),
  entry: z.literal("game.html"),
  engine: z.object({
    kind: z.literal("web"),
    template: z.enum(["canvas2d", "threejs", "phaser", "playcanvas"]),
  }).strict(),
  law: z.object({
    mode: z.literal("self-contained"),
  }).strict(),
  controls: z.object({
    actions: z.array(QuickPlayActionSchema).min(1),
  }).strict(),
  capabilities: z.object({
    network: z.literal(false),
    storage: z.literal("host"),
    audio: z.boolean(),
    fullscreen: z.boolean(),
    pointerLock: z.boolean(),
  }).strict(),
  provenance: z.object({
    promptSha256: z.string().regex(/^[0-9a-f]{64}$/),
    sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
    buildSha256: z.string().regex(/^[0-9a-f]{64}$/),
    builder: z.string().min(1).max(128),
    provider: z.string().min(1).max(128),
  }).strict(),
}).strict();

export type QuickPlayAction = z.infer<typeof QuickPlayActionSchema>;
export type QuickPlayCartridge = z.infer<typeof QuickPlayCartridgeSchema>;

export const QUICKPLAY_BASE_ACTIONS: readonly QuickPlayAction[] = [
  { id: "move", kind: "axis2", required: false },
  { id: "look", kind: "axis2", required: false },
  { id: "primary", kind: "button", required: true },
  { id: "secondary", kind: "button", required: false },
  { id: "menu", kind: "button", required: true },
] as const;
