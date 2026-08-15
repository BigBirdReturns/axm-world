import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const json = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));

describe("UNDERDRAIN Shape Field shadow boundary", () => {
  it("keeps the experiment outside presentation-manifest v1 and the exact current product-acceptance denominator", () => {
    const presentationSchema = json("unity/Schemas/rodoh-action-presentation-manifest-v1.schema.json");
    const presentation = json("unity/Fixtures/underdrain.authored-presentation.template.json");
    const shadow = json("unity/Fixtures/underdrain.shape-field-shadow.template.json");

    expect(presentationSchema.additionalProperties).toBe(false);
    expect(presentationSchema.properties.surfaceAssets).toBeUndefined();
    expect(presentation.format).toBe("rodoh-action-presentation-manifest/1");
    expect(shadow.format).toBe("rodoh-underdrain-shape-field-shadow/0");
    expect(shadow.state).toBe("contract-only");
    expect(shadow.baseline.currentWorldHead).toBe("7130afd86dc8bf0796db529e43ad4707c76f8627");
    expect(shadow.baseline.currentWorldTree).toBe("6266da333c1ab65cbc3b1f348f06f88e8bd1625c");
    expect(shadow.baseline.currentTargetHostStarterFormat).toBe("rodoh-underdrain-target-host-start/1");
    expect(shadow.baseline.currentHostBootstrapFormat).toBe("rodoh-underdrain-windows-host-bootstrap/1");
    expect(shadow.baseline.currentCommissioningStateFormat).toBe("rodoh-underdrain-windows-commissioning-state/1");
    expect(shadow.baseline.currentSoftwareReviewFormat).toBe("rodoh-underdrain-role-separated-review-receipt/1");
    expect(shadow.baseline.currentWindowsAcceptanceFormat).toBe("rodoh-underdrain-player-product-acceptance/2");
    expect(shadow.baseline.retainedSourceQualificationWorldCommit).toBe("786fb453a7b1f524bca88dbf4d7df2d73cab9a3a");
    expect(shadow.shapeFieldRelease.version).toBe("0.1.1");
    expect(shadow.shapeFieldRelease.selectedAsset).toBeNull();
    expect(shadow.isolation).toMatchObject({
      sidecarOnly: true,
      mutatesPresentationManifestV1: false,
      changesArcLaw: false,
      changesInteractionGeometry: false,
      changesRegistration: false,
      changesInputTrace: false,
      entersCurrentProductAcceptanceDenominator: false,
    });
    expect(shadow.authority).toEqual({
      candidateAuthority: "Arc replay required",
      namedRepresentationApproval: "not-issued",
      windowsPlayerProductAcceptance: "not-issued",
      questAcceptance: "not-issued",
      physicalAcceptance: "not-issued",
    });
  });
});
