import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LAMP_DISTRICT } from "../../src/arcs/lamp-district.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout, DEFAULT_WORLD_CONFIG } from "../../src/world/contract.js";
import { deriveUnderworldView, inspectDarkTombWorld } from "../../src/world/underworld/dark-tomb.js";
import { UnderworldScene } from "../../src/world/underworld/UnderworldScene.js";

describe("Dark Tomb Underworld receiver", () => {
  it("reads the registered source without compiling or inferring it", () => {
    const inspection = inspectDarkTombWorld(LAMP_DISTRICT);
    expect(inspection.status).toBe("valid");
    if (inspection.status !== "valid") return;
    expect(inspection.source.identity.id).toBe("lamp-district");
    expect(inspection.source.anatomy).toHaveLength(7);
    expect(inspection.source.delves).toHaveLength(8);
  });

  it("derives seven layers and exact engine-owned Tomb state", () => {
    const inspection = inspectDarkTombWorld(LAMP_DISTRICT);
    expect(inspection.status).toBe("valid");
    if (inspection.status !== "valid") return;
    const org = foundOrganization(LAMP_DISTRICT);
    const scene = compileArcToPlayScene(LAMP_DISTRICT, org);
    const layout = buildWorldLayout(scene, DEFAULT_WORLD_CONFIG);
    const view = deriveUnderworldView({
      source: inspection.source,
      nodes: layout.nodes,
      cartridgeState: {
        ...(org.cartridgeState ?? {}),
        "alarm-phase": "wake",
        "signature-status": "breached",
        "visibility-status": "exposed",
        "consequence:constituency:school-lamp-ledger": true,
      },
    });
    expect(view.layers).toHaveLength(7);
    expect(view.alarmPhase).toBe("wake");
    expect(view.signatureStatus).toBe("breached");
    expect(view.visibilityStatus).toBe("exposed");
    expect(view.hubChanged).toBe(true);
    expect(view.inherited.filter((entry) => entry.inherited)).toHaveLength(1);
  });

  it("keeps the first available movement visible in the layer projection", () => {
    const inspection = inspectDarkTombWorld(LAMP_DISTRICT);
    if (inspection.status !== "valid") throw new Error("fixture invalid");
    const org = foundOrganization(LAMP_DISTRICT);
    const scene = compileArcToPlayScene(LAMP_DISTRICT, org);
    const layout = buildWorldLayout(scene, DEFAULT_WORLD_CONFIG);
    const view = deriveUnderworldView({ source: inspection.source, nodes: layout.nodes, cartridgeState: org.cartridgeState ?? {} });
    expect(view.availableChallengeId).toBe("keep-the-school-lamps");
    expect(view.layers.some((layer) => layer.delves.some((entry) => entry.node?.status === "available"))).toBe(true);
  });

  it("renders the civic hub, seven-layer map, and expedition ledger from source data", () => {
    const org = foundOrganization(LAMP_DISTRICT);
    const scene = compileArcToPlayScene(LAMP_DISTRICT, org);
    const layout = buildWorldLayout(scene, DEFAULT_WORLD_CONFIG);
    const world = {
      arc: LAMP_DISTRICT,
      cartridgeState: org.cartridgeState ?? {},
      nodes: layout.nodes,
      totalNodes: layout.nodes.length,
    } as Parameters<typeof UnderworldScene>[0]["world"];
    const interaction = {
      selectedId: "keep-the-school-lamps",
      select: () => undefined,
    } as unknown as Parameters<typeof UnderworldScene>[0]["interaction"];
    const html = renderToStaticMarkup(createElement(UnderworldScene, { world, interaction }));
    expect(html).toContain('data-testid="underworld-scene"');
    expect(html).toContain('data-testid="underworld-cross-section"');
    expect((html.match(/data-testid="underworld-layer-/g) ?? []).length).toBe(7);
    expect(html).toContain("Keep the School Lamps");
    expect(html).toContain("Anja Vei");
  });
});
