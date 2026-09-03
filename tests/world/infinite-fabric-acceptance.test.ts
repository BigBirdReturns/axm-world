import { describe, expect, it } from "vitest";
import { InfiniteFabricAlphaReceiptSchema } from "../../src/fabric/acceptance.js";

const digest = (character: string) => character.repeat(64);

const accepted = {
  format: "axm-infinite-fabric-alpha-receipt/0",
  status: "pass",
  worldId: "world:tiny-planet",
  sourceCartridgeRef: "cartridge:first-charter",
  worldRevisionSha256: digest("a"),
  law: {
    mode: "arc",
    authorityDigestSha256: digest("b"),
    receiverMayAuthorOutcomes: false,
  },
  projections: {
    board: true,
    map: true,
    planet: true,
    play: true,
    oneWorldRevision: true,
  },
  play: {
    sphericalMovement: true,
    keyboard: true,
    gamepad: true,
    encounterResolved: true,
    acceptedArcConsequence: true,
  },
  generation: {
    structuredPatchOnly: true,
    previewedBeforeAcceptance: true,
    acceptedPatchCount: 2,
    functionalGeneratedCell: true,
    functionalGeneratedNpc: true,
    functionalGeneratedQuest: true,
    existingBehaviorRevised: true,
    arbitraryCanonicalCode: false,
    lawChangedByProvider: false,
    ledgerWrittenDirectlyByProvider: false,
  },
  continuity: {
    priorRevisionRecoverable: true,
    worldReactionVisible: true,
    memoryLedgerAppendOnly: true,
    exportImportPassed: true,
    providerUnavailableReplayPassed: true,
    networkUnavailableReplayPassed: true,
  },
  providerSubstitution: {
    providersUsed: ["provider-a", "provider-b"],
    samePatchContract: true,
    providerRequiredDuringPlay: false,
  },
  nonClaims: [
    "multiplayer acceptance",
    "Quest acceptance",
    "marketplace readiness",
  ],
};

describe("Infinite Fabric alpha acceptance", () => {
  it("admits the complete Tiny World generative persistence transaction", () => {
    const receipt = InfiniteFabricAlphaReceiptSchema.parse(accepted);
    expect(receipt.status).toBe("pass");
    expect(receipt.projections.oneWorldRevision).toBe(true);
    expect(receipt.providerSubstitution.providersUsed).toHaveLength(2);
  });

  it("refuses a pretty one-off demo that lacks persistence or provider substitution", () => {
    const demoOnly: unknown = {
      ...accepted,
      continuity: {
        ...accepted.continuity,
        providerUnavailableReplayPassed: false,
      },
      providerSubstitution: {
        providersUsed: ["provider-a"],
        samePatchContract: true,
        providerRequiredDuringPlay: false,
      },
    };
    expect(() => InfiniteFabricAlphaReceiptSchema.parse(demoOnly)).toThrow();
  });
});
