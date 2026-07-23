import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { COMMON_SHIP_STARTER } from "../../src/common-ship/templates.js";
import { expandCommonShipProfileCards } from "../../src/world/common-ship/CommonShipScene.js";
import { hasCompositionVerdict } from "../../src/world/encounter/EncounterShell.js";
import { getPresentations } from "../../src/world/presentations.js";
import { setLocale } from "../../src/world/i18n/index.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Gate 6 review regressions", () => {
  it("does not present a fabricated Common Watch verdict for cartridges without composition tests", () => {
    expect(hasCompositionVerdict(null)).toBe(false);
    expect(hasCompositionVerdict({ results: [] })).toBe(false);
    expect(hasCompositionVerdict({ results: [{ id: "role-coverage" }] })).toBe(true);
  });

  it("localizes the Common Ship representation metadata", () => {
    try {
      setLocale("zh-Hant");
      const presentation = getPresentations().find((entry) => entry.id === "common-ship");
      expect(presentation).toMatchObject({
        label: "共同船艦",
        blurb: "跨越不同身體、時鐘、棲地與繼承義務編組值班。",
        controlsHint: "選擇一項行動、編組值班、檢視 Arc 判定，然後提交。",
        purpose: "將船艦作為共享政體管理，而非以人類常態為基準的載具。",
      });
    } finally {
      setLocale("en");
    }
  });

  it("uses npm.cmd for the permanent Gate 6 launcher on Windows", () => {
    const source = read("scripts/run-relief-circuit-gate6.mjs");
    expect(source).toContain('process.platform === "win32" ? "npm.cmd" : "npm"');
    expect(source).toContain("spawn(npmCommand,");
    expect(source).not.toContain('spawn("npm",');
  });

  it("renders and resolves every cast member sharing one embodiment profile", () => {
    const profile = structuredClone(COMMON_SHIP_STARTER.embodimentProfiles[0]!);
    const first = { ...COMMON_SHIP_STARTER.cast[0]!, profileId: profile.id };
    const second = { ...COMMON_SHIP_STARTER.cast[1]!, profileId: profile.id };
    const cards = expandCommonShipProfileCards(
      [{ source: profile, cast: [first, second] }],
      [
        { id: `founder:${first.id}`, name: first.name },
        { id: `founder:${second.id}`, name: second.name },
      ],
    );

    expect(cards.map((entry) => entry.member?.id)).toEqual([first.id, second.id]);
    expect(cards.map((entry) => entry.agent?.id)).toEqual([`founder:${first.id}`, `founder:${second.id}`]);
  });
});
