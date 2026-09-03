import { z } from "zod";

const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

export const InfiniteFabricAlphaReceiptSchema = z.object({
  format: z.literal("axm-infinite-fabric-alpha-receipt/0"),
  status: z.enum(["pass", "held"]),
  worldId: z.literal("world:tiny-planet"),
  sourceCartridgeRef: z.literal("cartridge:first-charter"),
  worldRevisionSha256: Sha256Schema,
  law: z.object({
    mode: z.literal("arc"),
    authorityDigestSha256: Sha256Schema,
    receiverMayAuthorOutcomes: z.literal(false),
  }).strict(),
  projections: z.object({
    board: z.literal(true),
    map: z.literal(true),
    planet: z.literal(true),
    play: z.literal(true),
    oneWorldRevision: z.literal(true),
  }).strict(),
  play: z.object({
    sphericalMovement: z.literal(true),
    keyboard: z.literal(true),
    gamepad: z.literal(true),
    encounterResolved: z.literal(true),
    acceptedArcConsequence: z.literal(true),
  }).strict(),
  generation: z.object({
    structuredPatchOnly: z.literal(true),
    previewedBeforeAcceptance: z.literal(true),
    acceptedPatchCount: z.number().int().min(2),
    functionalGeneratedCell: z.literal(true),
    functionalGeneratedNpc: z.literal(true),
    functionalGeneratedQuest: z.literal(true),
    existingBehaviorRevised: z.literal(true),
    arbitraryCanonicalCode: z.literal(false),
    lawChangedByProvider: z.literal(false),
    ledgerWrittenDirectlyByProvider: z.literal(false),
  }).strict(),
  continuity: z.object({
    priorRevisionRecoverable: z.literal(true),
    worldReactionVisible: z.literal(true),
    memoryLedgerAppendOnly: z.literal(true),
    exportImportPassed: z.literal(true),
    providerUnavailableReplayPassed: z.literal(true),
    networkUnavailableReplayPassed: z.literal(true),
  }).strict(),
  providerSubstitution: z.object({
    providersUsed: z.array(z.string().min(1).max(128)).min(2),
    samePatchContract: z.literal(true),
    providerRequiredDuringPlay: z.literal(false),
  }).strict(),
  nonClaims: z.array(z.string().min(1)).min(1),
}).strict();

export type InfiniteFabricAlphaReceipt = z.infer<typeof InfiniteFabricAlphaReceiptSchema>;
