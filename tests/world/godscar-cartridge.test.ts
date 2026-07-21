import { describe, expect, it } from "vitest";
import { KIND_GODS_OF_ILYON } from "../../src/arcs/index.js";
import { GODSCAR_EXTENSION_KEY, readGodscarPocketExtension } from "../../src/godscar/index.js";
import { BUNDLED_CARTRIDGES, KIND_GODS_OF_ILYON_CARTRIDGE } from "../../src/world/cartridge.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";

describe("The Kind Gods of Ilyon bundled cartridge", () => {
  it("is a normal identity-bound cartridge with inspectable Godscar source", () => {
    expect(BUNDLED_CARTRIDGES).toContain(KIND_GODS_OF_ILYON_CARTRIDGE);
    expect(KIND_GODS_OF_ILYON_CARTRIDGE.arc).toBe(KIND_GODS_OF_ILYON);
    expect(cartridgeIdentity(KIND_GODS_OF_ILYON_CARTRIDGE)).toMatch(/^cart1_[0-9a-f]{64}$/);
    expect(KIND_GODS_OF_ILYON.extensions?.[GODSCAR_EXTENSION_KEY]).toBeDefined();
    const source = readGodscarPocketExtension(KIND_GODS_OF_ILYON);
    expect(source?.pressures).toHaveLength(6);
    expect(source?.beats).toHaveLength(6);
    expect(source?.consequences).toHaveLength(6);
  });
});
