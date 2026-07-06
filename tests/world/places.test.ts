import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { SPRITES, PIXEL_SPRITE_NAMES, spriteForRole, type PixelSpriteName } from "../../src/world/pixel-ui/PixelSprite.js";
import { personSprite } from "../../src/world/themes/first-charter/portrait-icons.js";
import type { PortraitSpec } from "../../src/world/pixel-ui/PixelPortrait.js";

// #73 — Places. The hall floor and encounter staging become staged scenes: bodies
// standing in a place. Same honesty rule as faces (#72): a body exists only for
// what the runtime can name — roster ROLES, the neutral person, the encounter's
// abstract threat, and AUTHORED people (keyed by authored id). No new mechanics,
// data, or image assets — grids in the asset standard, ground as pure CSS.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

const ALPHABET = new Set([".", "o", "s", "d", "h", "e", "m", "c", "t", "w"]);

function assertSpecIntegrity(name: string, spec: PortraitSpec): void {
  expect(spec.grid.length, `${name}: 16 rows`).toBe(16);
  for (const [i, row] of spec.grid.entries()) {
    expect(row.length, `${name} row ${i}: 16 chars`).toBe(16);
    for (const ch of row) {
      expect(ALPHABET.has(ch), `${name} row ${i}: token "${ch}" in the declared alphabet`).toBe(true);
      expect(ch.charCodeAt(0) < 128, `${name} row ${i}: ASCII only`).toBe(true);
      if (ch !== ".") expect(spec.palette[ch], `${name}: token "${ch}" has a palette color`).toBeTruthy();
    }
  }
}

describe("places (#73): sprite asset integrity", () => {
  it("every body sprite grid is 16x16, ASCII, in-alphabet, and fully paletted", () => {
    for (const name of PIXEL_SPRITE_NAMES) assertSpecIntegrity(name, SPRITES[name as PixelSpriteName]);
  });

  it("Maren Vos's authored standing body meets the same standard, keyed by authored id", () => {
    const spec = personSprite("charter-keeper");
    expect(spec).not.toBeNull();
    assertSpecIntegrity("charter-keeper-body", spec!);
    expect(personSprite("Maren Vos")).toBeNull();
  });

  it("bodies key off the ROLE with a neutral fallback — never an invented identity", () => {
    expect(spriteForRole("Vanguard")).toBe("vanguard");
    expect(spriteForRole("Skirmisher")).toBe("skirmisher");
    expect(spriteForRole("Mender")).toBe("mender");
    expect(spriteForRole("Flex")).toBe("person");
  });
});

describe("places (#73): staged scenes", () => {
  it("the hall has a floor to stand on, and you stand with your squad as bodies", () => {
    const hall = read("src/world/inhabited/HallScene.tsx");
    expect(hall).toContain('data-testid="hall-floor"');
    expect(hall).toContain('data-testid="hall-party-bodies"');
    // The squad shown is the SAME recommended party the quick-accept resolves with.
    expect(hall).toContain("world.recommendedParty(view.challengeId)");
    expect(hall).toContain("spriteForRole(m.role)");
    // The steward stands as her authored BODY in the scene (sprite in the scene,
    // portrait in the close-ups), with honest fallbacks.
    expect(hall).toContain("CartridgeSprite({ arcId: world.arc.meta.id, personId: person.id");
  });

  it("the encounter staging stages bodies, not rectangles", () => {
    const shell = read("src/world/encounter/EncounterShell.tsx");
    expect(shell).toContain("<PixelSprite name={spriteForRole(m.role)}");
    expect(shell).toContain('data-testid="encs-staging-threat-body"');
    // The threat stays the SITE's abstract danger — no invented named enemy.
    expect(shell).toContain('name="threat"');
  });

  it("the theme seam only gives bodies to cartridges that author people", () => {
    const seam = read("src/world/themes/CartridgeMotif.tsx");
    expect(seam).toContain("export function CartridgeSprite");
  });

  it("the ground is pure CSS — no image asset dependency entered the runtime", () => {
    const hall = read("src/world/inhabited/HallScene.tsx");
    expect(hall).toContain("repeating-linear-gradient");
    expect(hall).not.toMatch(/url\(/);
  });
});
