import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, KIND_GODS_OF_ILYON } from "../../src/arcs/index.js";
import type { PortraitSpec } from "../../src/world/pixel-ui/PixelPortrait.js";
import { GodscarPocketPanel } from "../../src/world/aperture/GodscarPocketPanel.js";
import {
  CartridgeEmblem,
  CartridgeMotif,
  CartridgePressureMark,
} from "../../src/world/themes/CartridgeMotif.js";
import {
  ILYON_DOLL_APPEARANCES,
  ILYON_ROLE_BINDINGS,
  ILYON_ROLE_SPECS,
  personPortrait,
  personSprite,
} from "../../src/world/themes/ilyon/portrait-icons.js";
import {
  locationMotif,
  pressureMotif,
  factionMotif,
  evidenceMotif,
  consequenceMotif,
} from "../../src/world/themes/ilyon/motif-icons.js";

const ALPHABET = new Set([".", "o", "s", "d", "h", "e", "m", "c", "t", "w"]);

function assertSpecIntegrity(name: string, spec: PortraitSpec): void {
  expect(spec.grid, `${name}: rows`).toHaveLength(16);
  for (const [index, row] of spec.grid.entries()) {
    expect(row.length, `${name} row ${index}`).toBe(16);
    for (const token of row) {
      expect(ALPHABET.has(token), `${name} row ${index}: ${token}`).toBe(true);
      expect(token.charCodeAt(0), `${name} row ${index}: ASCII`).toBeLessThan(128);
      if (token !== ".") expect(spec.palette[token], `${name}: palette for ${token}`).toBeTruthy();
    }
  }
}

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("Ilyon white-label asset pack", () => {
  it("ships five cartridge-owned portrait/body pairs and binds every Godscar role to them", () => {
    expect(Object.keys(ILYON_ROLE_SPECS).sort()).toEqual([
      "auditor",
      "exception",
      "interlocutor",
      "protector",
      "witness",
    ]);
    expect(Object.values(ILYON_ROLE_BINDINGS).every((id) => id.startsWith("ilyon:"))).toBe(true);

    for (const [roleId, specs] of Object.entries(ILYON_ROLE_SPECS)) {
      assertSpecIntegrity(`${roleId} portrait`, specs.portrait);
      assertSpecIntegrity(`${roleId} body`, specs.body);
      const appearance = ILYON_DOLL_APPEARANCES[ILYON_ROLE_BINDINGS[roleId as keyof typeof ILYON_ROLE_BINDINGS]];
      expect(appearance?.portraitSpec).toBe(specs.portrait);
      expect(appearance?.bodySpec).toBe(specs.body);
      expect(appearance?.identityTreatment).toBe("authored");
    }
  });

  it("keys the five exact founder identities to their authored visual responsibilities", () => {
    for (const id of ["aster-neral", "talan-rook", "iri-sable", "cael-arvon", "nacre-deep-tide"]) {
      expect(personPortrait(id), `${id} portrait`).not.toBeNull();
      expect(personSprite(id), `${id} body`).not.toBeNull();
    }
    expect(personPortrait("Aster Neral")).toBeNull();
    expect(personSprite("unknown-founder")).toBeNull();
  });

  it("gives every campaign beat a distinct motif while retaining bounded defaults", () => {
    const ids = KIND_GODS_OF_ILYON.challenges.map((challenge) => challenge.id);
    const motifs = ids.map(locationMotif);
    expect(new Set(motifs).size).toBe(6);
    expect(locationMotif("unknown")).toBe("tideAstrolabe");
    expect(pressureMotif("excluded-actor")).toBe("oceanVoice");
    expect(factionMotif("final-humanity")).toBe("benefactors");
    expect(evidenceMotif("dead-star-ruins")).toBe("deadStar");
    expect(consequenceMotif("forked-infrastructure")).toBe("forkedSystems");
  });

  it("dispatches Ilyon motifs and emblem through the same neutral-safe cartridge seam", () => {
    const beat = renderToStaticMarkup(
      React.createElement(CartridgeMotif, {
        arcId: KIND_GODS_OF_ILYON.meta.id,
        challengeId: "hear-the-ocean",
      }),
    );
    expect(beat).toContain('data-ilyon-glyph="oceanVoice"');

    const emblem = renderToStaticMarkup(
      React.createElement(CartridgeEmblem, { arcId: KIND_GODS_OF_ILYON.meta.id }),
    );
    expect(emblem).toContain('data-ilyon-glyph="tideAstrolabe"');

    expect(CartridgeMotif({ arcId: "unknown-cartridge", challengeId: "anything" })).toBeNull();
    expect(CartridgePressureMark({ arcId: FIRST_CHARTER.meta.id, kind: "pocket" })).toBeNull();
  });

  it("turns the Godscar Aperture into an illustrated constitutional record", () => {
    const html = renderToStaticMarkup(
      React.createElement(GodscarPocketPanel, { arc: KIND_GODS_OF_ILYON }),
    );
    expect((html.match(/data-testid="godscar-cast-member"/g) ?? [])).toHaveLength(5);
    expect((html.match(/data-testid="ilyon-pressure-mark-/g) ?? [])).toHaveLength(6);
    expect((html.match(/data-testid="ilyon-evidence-mark-/g) ?? [])).toHaveLength(3);
    expect((html.match(/data-testid="ilyon-faction-mark-/g) ?? [])).toHaveLength(3);
    expect((html.match(/data-testid="ilyon-consequence-mark-/g) ?? [])).toHaveLength(6);
    expect(html).toContain('data-appearance="ilyon:exception"');
  });

  it("records provenance and keeps the visual pack inside the governed asset homes", () => {
    for (const rel of [
      "src/world/themes/ilyon/motif-icons.tsx",
      "src/world/themes/ilyon/portrait-icons.tsx",
    ]) {
      const head = read(rel).split("\n").slice(0, 40).join("\n");
      expect(head).toContain("Source:");
      expect(head).toContain("Grid:");
      expect(head).toContain("Encoding:");
    }
    const css = read("src/world/themes/ilyon/ilyon.css");
    expect(css).toContain(':root[data-cartridge="ilyon"]');
    expect(css).toContain(".pixel-doll-portrait");
    expect(css).toContain('[data-testid="hall-scene"]');
    expect(css).toContain(".godscar-pocket__cast");
  });
});
