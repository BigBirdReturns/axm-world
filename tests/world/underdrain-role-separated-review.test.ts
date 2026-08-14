import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const json = (path: string) => JSON.parse(read(path));

describe("UNDERDRAIN role-separated software review", () => {
  it("publishes the complete three-seat review and fourth-seat acceptance contract", () => {
    const contract = json("unity/Fixtures/underdrain.role-separated-software-review.json");
    expect(contract).toMatchObject({
      format: "rodoh-underdrain-role-separated-review/1",
      reviewReceiptFormat: "rodoh-underdrain-role-separated-review-receipt/1",
      productId: "underdrain-bloom-below-unity6000-v1",
      challengeId: "breach-crown-pump",
      timingProfileId: "forgiving",
      softwareScope: "windows-player-product",
      physicalInstallationScope: "separate",
      independence: {
        minimumDistinctSeats: 3,
        minimumDistinctLineages: 3,
        minimumDistinctContexts: 3,
        artifactMutationAllowed: false,
        runtimeMayIssue: false,
        candidateAuthorMayIssue: false,
      },
      authority: {
        reviewMayAcceptArcConsequence: false,
        reviewMayAcceptPlayerProduct: false,
      },
    });
    expect(contract.learningSequence).toEqual([
      "diagnose-spore-valves",
      "operate-purge-wheel",
      "open-crown-sluice",
    ]);
    expect(contract.answers.allowedChoiceIds).toEqual(["emergency-plan", "service-tunnel", "truce-offer"]);
    expect(contract.answers.consequenceByOutcome).toEqual({
      success: "fact-pump-seven-balanced",
      partial: "fact-pump-seven-ceasefire",
      failure: "fact-crown-controls-pump-seven",
    });
  });

  it("requires exact packet custody, distinct lineages and contexts, and no issuance authority", () => {
    const common = read("scripts/lib/underdrain-role-review-common-v1.ps1");
    const kit = read("scripts/new-underdrain-role-separated-review-kit.ps1");
    const record = read("scripts/record-underdrain-role-separated-software-review.ps1");

    expect(common).toContain("Require-UnderdrainDistinct");
    expect(common).toContain("Require-UnderdrainIdentity");
    expect(common).toContain('Require-UnderdrainDigest $Value "lineage1_"');
    expect(common).toContain('Require-UnderdrainDigest $Value "ctx1_"');

    expect(kit).toContain("underdrain.role-separated-software-review.json");
    expect(kit).toContain('format = "rodoh-underdrain-role-separated-review-kit/1"');
    expect(kit).toContain('reviewIssued = $false');
    expect(kit).toContain('productAcceptance = "not-issued"');
    expect(kit).toContain('physicalInstallationEvidence = "separate"');

    expect(record).toContain('format -ne "rodoh-underdrain-role-separated-review/1"');
    expect(record).toContain("minimumDistinctSeats -ne 3");
    expect(record).toContain("Require-UnderdrainDistinct $seatIds");
    expect(record).toContain("Require-UnderdrainDistinct $lineageIds");
    expect(record).toContain("Require-UnderdrainDistinct $contextDigests");
    expect(record).toContain("playerPacketSha256");
    expect(record).toContain("observerPacketSha256");
    expect(record).toContain("contractSha256");
    expect(record).toContain('runtimeIssued = $false');
    expect(record).toContain('candidateAuthorIssued = $false');
    expect(record).toContain('productAcceptance = "not-issued"');
    expect(record).toContain('physicalHumanEvidence = "separate-not-inferred"');
  });

  it("accepts only through a fourth seat and keeps physical and Quest evidence separate", () => {
    const accept = read("scripts/accept-underdrain-player-product.ps1");
    expect(accept).toContain("RoleSeparatedReviewReceipt");
    expect(accept).toContain("AcceptanceSeatId");
    expect(accept).toContain("AcceptanceLineageId");
    expect(accept).toContain("AcceptanceContextDigest");
    expect(accept).toContain('format = "rodoh-underdrain-player-product-acceptance/2"');
    expect(accept).toContain('scope = "windows-software-player-product"');
    expect(accept).toContain("Final acceptance seat participated in the role-separated review");
    expect(accept).toContain("Final acceptance lineage participated in the role-separated review");
    expect(accept).toContain("Final acceptance context participated in the role-separated review");
    expect(accept).toContain('physicalHumanEvidence = "separate-not-required-for-software-scope"');
    expect(accept).toContain('questAcceptance = "not-issued"');
    expect(accept).toContain('physicalQuestAcceptance = "open"');
    expect(accept).not.toContain('rodoh-underdrain-independent-comprehension/1');
  });

  it("ships an executable admission and refusal fixture", () => {
    const fixture = read("scripts/test-underdrain-role-separated-review.ps1");
    expect(fixture).toContain("Valid role-separated review did not pass");
    expect(fixture).toContain("Valid Windows software-product acceptance did not pass");
    expect(fixture).toContain("Duplicate-lineage refusal");
    expect(fixture).toContain("Acceptance-seat overlap refusal");
    expect(fixture).toContain('physicalInstallationPerformed = $false');
    expect(fixture).toContain('questInvoked = $false');
  });
});
