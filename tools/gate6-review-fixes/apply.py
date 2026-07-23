from __future__ import annotations

from pathlib import Path

ROOT = Path.cwd()


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text()
    if new in source:
        return
    if old not in source:
        raise SystemExit(f"Expected Gate 6 review target not found in {path}")
    target.write_text(source.replace(old, new, 1))


# 1. Ordinary cartridges must not display an empty Common Watch verdict.
replace_once(
    "src/world/encounter/EncounterShell.tsx",
    '''const GRADE_KEY = {
  success: "outcome.cleared",
  partial: "outcome.partial",
  failure: "outcome.failed",
} as const;

''',
    '''const GRADE_KEY = {
  success: "outcome.cleared",
  partial: "outcome.partial",
  failure: "outcome.failed",
} as const;

export function hasCompositionVerdict(
  composition: { results: readonly unknown[] } | null | undefined,
): boolean {
  return (composition?.results.length ?? 0) > 0;
}

''',
)
replace_once(
    "src/world/encounter/EncounterShell.tsx",
    '''  const composition = useMemo(
    () => world.evaluateCompositionFor(challengeId, committed),
    [world, challengeId, committed],
  );
''',
    '''  const composition = useMemo(
    () => world.evaluateCompositionFor(challengeId, committed),
    [world, challengeId, committed],
  );
  const showCompositionVerdict = hasCompositionVerdict(composition);
''',
)
replace_once(
    "src/world/encounter/EncounterShell.tsx",
    "  const compositionOk = composition?.feasible ?? true;\n",
    "  const compositionOk = showCompositionVerdict ? (composition?.feasible ?? false) : true;\n",
)
replace_once(
    "src/world/encounter/EncounterShell.tsx",
    "              {composition && (\n",
    "              {showCompositionVerdict && composition && (\n",
)

# 2. Common Ship representation metadata follows the locale catalog.
replace_once(
    "src/world/presentations.tsx",
    '''      id: "common-ship",
      label: "Common Ship",
      blurb: "Compose watches across bodies, clocks, habitats, and inherited obligations.",
      Scene: CommonShipScene,
      controlsHint: "Select an operation, compose the watch, inspect the Arc verdict, then commit.",
      purpose: "Manage the vessel as a shared polity rather than a human-normal vehicle.",
''',
    '''      id: "common-ship",
      label: t("presentations.commonShip.label"),
      blurb: t("presentations.commonShip.blurb"),
      Scene: CommonShipScene,
      controlsHint: t("presentations.commonShip.controlsHint"),
      purpose: t("presentations.commonShip.purpose"),
''',
)
replace_once(
    "src/world/i18n/messages.ts",
    '  | "presentations.underworld.purpose"\n',
    '''  | "presentations.underworld.purpose"
  | "presentations.commonShip.label"
  | "presentations.commonShip.blurb"
  | "presentations.commonShip.controlsHint"
  | "presentations.commonShip.purpose"
''',
)
replace_once(
    "src/world/i18n/messages.ts",
    '    "presentations.underworld.purpose": "The Dark Tomb as an inhabited political architecture. Read the hub, Long Alarm, signature budget, layers, and persistent consequences without replacing Arc law.",\n',
    '''    "presentations.underworld.purpose": "The Dark Tomb as an inhabited political architecture. Read the hub, Long Alarm, signature budget, layers, and persistent consequences without replacing Arc law.",
    "presentations.commonShip.label": "Common Ship",
    "presentations.commonShip.blurb": "Compose watches across bodies, clocks, habitats, and inherited obligations.",
    "presentations.commonShip.controlsHint": "Select an operation, compose the watch, inspect the Arc verdict, then commit.",
    "presentations.commonShip.purpose": "Manage the vessel as a shared polity rather than a human-normal vehicle.",
''',
)
replace_once(
    "src/world/i18n/messages.ts",
    '    "presentations.underworld.purpose": "將黑暗墓域呈現為有人居住的政治建築。讀取樞紐、長期警報、訊號預算、層次與持續後果，不取代 Arc 規則。",\n',
    '''    "presentations.underworld.purpose": "將黑暗墓域呈現為有人居住的政治建築。讀取樞紐、長期警報、訊號預算、層次與持續後果，不取代 Arc 規則。",
    "presentations.commonShip.label": "共同船艦",
    "presentations.commonShip.blurb": "跨越不同身體、時鐘、棲地與繼承義務編組值班。",
    "presentations.commonShip.controlsHint": "選擇一項行動、編組值班、檢視 Arc 判定，然後提交。",
    "presentations.commonShip.purpose": "將船艦作為共享政體管理，而非以人類常態為基準的載具。",
''',
)

# 3. The permanent Gate 6 command resolves npm correctly on Windows.
replace_once(
    "scripts/run-relief-circuit-gate6.mjs",
    '''const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
''',
    '''const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(npmCommand, ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
''',
)
replace_once(
    "scripts/run-relief-circuit-gate6.mjs",
    'let serverLog = "";\n',
    '''let serverLog = "";
let serverError = null;
server.on("error", (error) => { serverError = error; });
''',
)
replace_once(
    "scripts/run-relief-circuit-gate6.mjs",
    '''async function ready() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
''',
    '''async function ready() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverError) throw serverError;
''',
)

# 4. Neutral Common Ships render and resolve every cast member assigned to a profile.
replace_once(
    "src/world/common-ship/CommonShipScene.tsx",
    '''import type { CommonShipEmbodimentProfile } from "../../common-ship/embodiment.js";
import type { CommonShipWatchBlueprintV2 } from "../../common-ship/embodiment.js";
''',
    '''import type {
  CommonShipCastMemberV2,
  CommonShipEmbodimentProfile,
  CommonShipWatchBlueprintV2,
} from "../../common-ship/embodiment.js";
import type { CommonShipProfileView } from "./common-ship.js";
''',
)
replace_once(
    "src/world/common-ship/CommonShipScene.tsx",
    '''function rangeText(range: { min: number; max: number } | null, unit: string): string {
  return range ? `${range.min}–${range.max}${unit}` : "variable";
}

''',
    '''function rangeText(range: { min: number; max: number } | null, unit: string): string {
  return range ? `${range.min}–${range.max}${unit}` : "variable";
}

export interface CommonShipProfileCardEntry<T extends { id: string; name: string }> {
  profile: CommonShipEmbodimentProfile;
  member: CommonShipCastMemberV2 | undefined;
  agent: T | undefined;
}

export function expandCommonShipProfileCards<T extends { id: string; name: string }>(
  profiles: readonly CommonShipProfileView[],
  roster: readonly T[],
): CommonShipProfileCardEntry<T>[] {
  return profiles.flatMap((entry) => {
    const members: Array<CommonShipCastMemberV2 | undefined> = entry.cast.length > 0
      ? entry.cast
      : [undefined];
    return members.map((member) => ({
      profile: entry.source,
      member,
      agent: member
        ? roster.find((candidate) => candidate.name === member.name || candidate.id.endsWith(`:${member.id}`) || candidate.id === member.id)
        : undefined,
    }));
  });
}

''',
)
replace_once(
    "src/world/common-ship/CommonShipScene.tsx",
    '''          <section className="commonship__profiles" aria-label="embodiment profiles">
            {view.profiles.map((entry) => {
              const member = entry.cast[0];
              const agent = member
                ? world.roster.find((candidate) => candidate.name === member.name || candidate.id.endsWith(`:${member.id}`) || candidate.id === member.id)
                : undefined;
              return (
                <ProfileCard
                  key={entry.source.id}
                  profile={entry.source}
                  member={member}
                  agentId={agent?.id ?? null}
                  portrait={isReliefCircuitProgram && member ? ASSET.portraits[member.id] : undefined}
                  selected={agent ? party.has(agent.id) : false}
                  onToggle={() => agent && interaction.toggleAgent(agent.id)}
                />
              );
            })}
          </section>
''',
    '''          <section className="commonship__profiles" aria-label="embodiment profiles">
            {expandCommonShipProfileCards(view.profiles, world.roster).map(({ profile, member, agent }) => (
              <ProfileCard
                key={`${profile.id}:${member?.id ?? "unassigned"}`}
                profile={profile}
                member={member}
                agentId={agent?.id ?? null}
                portrait={isReliefCircuitProgram && member ? ASSET.portraits[member.id] : undefined}
                selected={agent ? party.has(agent.id) : false}
                onToggle={() => agent && interaction.toggleAgent(agent.id)}
              />
            ))}
          </section>
''',
)

regression = ROOT / "tests/world/gate6-review-regressions.test.ts"
regression.write_text('''import fs from "node:fs";
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
''')

print("Applied four Gate 6 review fixes and regression contracts.")
