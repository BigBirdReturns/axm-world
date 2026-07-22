import { describe, expect, it } from "vitest";
import type { Arc } from "../../src/engine/types.js";
import {
  compileRegisteredSourcePlane,
  SOURCE_PLANE_REGISTRY,
} from "../../src/source-planes/index.js";
import {
  inspectWorldSourcePlanes,
  primaryWorldSourcePlane,
} from "../../src/world/source-plane-inspection.js";

describe("World source-plane inspection", () => {
  it("projects every registered creator source through the Arc-owned registry", () => {
    for (const definition of SOURCE_PLANE_REGISTRY) {
      const source = definition.starter();
      const compiled = compileRegisteredSourcePlane(source);
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;

      const result = inspectWorldSourcePlanes(compiled.arc);
      expect(result.known).toEqual([{
        id: definition.id,
        format: definition.format,
        extensionKey: definition.extensionKey,
        label: definition.label,
        shortLabel: definition.shortLabel,
        status: "valid",
        source,
        errors: [],
      }]);
      expect(result.unknownExtensionKeys).toEqual([]);
      expect(primaryWorldSourcePlane(compiled.arc)).toEqual(result.known[0]);
    }
  });

  it("identifies unknown extension namespaces without discarding their values", () => {
    const compiled = compileRegisteredSourcePlane(SOURCE_PLANE_REGISTRY[1]!.starter());
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const unknown = {
      "holder.private@7": { memory: ["preserve", 3, true] },
      "future.player@2": { address: "exact" },
    };
    const arc: Arc = {
      ...compiled.arc,
      extensions: { ...compiled.arc.extensions, ...unknown },
    };

    const result = inspectWorldSourcePlanes(arc);
    expect(result.known[0]?.id).toBe("dark-tomb-pocket");
    expect(result.unknownExtensionKeys).toEqual(["future.player@2", "holder.private@7"]);
    expect(arc.extensions?.["holder.private@7"]).toEqual(unknown["holder.private@7"]);
    expect(arc.extensions?.["future.player@2"]).toEqual(unknown["future.player@2"]);
  });

  it("reports invalid recognized source rather than replacing it with receiver inference", () => {
    const compiled = compileRegisteredSourcePlane(SOURCE_PLANE_REGISTRY[0]!.starter());
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const arc: Arc = {
      ...compiled.arc,
      extensions: {
        ...compiled.arc.extensions,
        "godscar.dark-tomb@1": { format: "dark-tomb-pocket/1", broken: true },
      },
    };

    const result = inspectWorldSourcePlanes(arc);
    expect(result.known).toHaveLength(2);
    expect(result.known[0]).toMatchObject({ id: "godscar-pocket", status: "valid" });
    expect(result.known[1]).toMatchObject({ id: "dark-tomb-pocket", status: "invalid" });
    expect(result.known[1]!.errors.join("\n")).toContain("Invalid Dark Tomb pocket");
    expect(result.unknownExtensionKeys).toEqual([]);
  });

  it("returns no source plane for a neutral cartridge with only unregistered memory", () => {
    const arc: Arc = {
      ...compileRegisteredSourcePlane(SOURCE_PLANE_REGISTRY[0]!.starter()).ok
        ? (compileRegisteredSourcePlane(SOURCE_PLANE_REGISTRY[0]!.starter()) as { ok: true; arc: Arc }).arc
        : (() => { throw new Error("fixture did not compile"); })(),
      extensions: { "creator.neutral@1": { exact: true } },
    };
    const result = inspectWorldSourcePlanes(arc);
    expect(result.known).toEqual([]);
    expect(result.unknownExtensionKeys).toEqual(["creator.neutral@1"]);
    expect(primaryWorldSourcePlane(arc)).toBeNull();
  });
});
