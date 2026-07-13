import { describe, expect, it } from "vitest";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge.js";
import { compatibilityReceipt, RUN_FORMAT_VERSION } from "../../src/world/compatibility.js";
import { buildCustodyObject } from "../../src/world/custody.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout } from "../../src/world/contract.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { emptyLedger } from "../../src/world/ledger.js";

describe("compatibility receipt", () => {
  it("makes the same-major guarantee and its edges executable", () => {
    const manifest = FIRST_CHARTER_CARTRIDGE.manifest;
    expect(compatibilityReceipt(manifest, "1.2.0").status).toBe("compatible");
    expect(compatibilityReceipt({ ...manifest, engineVersion: "1.2.0" }, "1.1.9").status).toBe("runtime-too-old");
    expect(compatibilityReceipt(manifest, "2.0.0").status).toBe("migration-required");
    expect(compatibilityReceipt({ ...manifest, engineVersion: "future" }).status).toBe("unknown");
  });

  it("serializes identity, schema versions, boundary, ledger, and transformations together", () => {
    const cartridge = FIRST_CHARTER_CARTRIDGE;
    const org = bootstrapOrg(cartridge.arc);
    const nodes = buildWorldLayout(compileArcToPlayScene(cartridge.arc, org)).nodes;
    const custody = buildCustodyObject({ cartridge, org, openingChoice: null, nodes, ledger: emptyLedger(cartridgeIdentity(cartridge)) });
    expect(custody.format).toBe(RUN_FORMAT_VERSION);
    expect(custody.compatibility).toMatchObject({ status: "compatible", policy: "same-major", runFormat: RUN_FORMAT_VERSION });
    expect(custody.compatibility.guarantee).toContain("major-version migration is not implied");
  });
});
