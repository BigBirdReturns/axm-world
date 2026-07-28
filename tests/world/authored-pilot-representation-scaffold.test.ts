import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const SCRIPT = resolve(ROOT, "scripts/assets/scaffold-authored-pilot-representation.mjs");
const AUTHORING = resolve(ROOT, "demos/underdrain-draft/authoring.json");
const PRESENTATION = resolve(ROOT, "demos/underdrain-draft/presentation.json");
const PEOPLE = "marta-sump,morrowcap,mrs-kett,dax-venn";
const STATES = "town-water-pressure,kett-water,fungus-contact,crown-grievance,rhea-status,evidence-custody,root-gate-open";
const COMMON = [
  "--authoring", AUTHORING,
  "--namespace", "underdrain",
  "--repository", "BigBirdReturns/axm-world",
  "--authored-identity", "underdrain-continuous-pilot-v2",
  "--experience-id", "underdrain-continuous-pilot-v2",
  "--people", PEOPLE,
  "--state-ids", STATES,
];

function run(extra: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...COMMON, ...extra], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("authored-pilot representation scaffold", () => {
  it("deterministically derives cast, mechanisms, states, and all six player surfaces", () => {
    const directory = mkdtempSync(join(tmpdir(), "representation-scaffold-"));
    const first = join(directory, "first.json");
    const second = join(directory, "second.json");
    const firstRun = run(["--output", first]);
    const secondRun = run(["--output", second]);
    expect(firstRun.status, firstRun.stderr || firstRun.stdout).toBe(0);
    expect(secondRun.status, secondRun.stderr || secondRun.stdout).toBe(0);
    expect(readFileSync(second)).toEqual(readFileSync(first));

    const receipt = JSON.parse(firstRun.stdout);
    expect(receipt).toMatchObject({
      format: "rodoh-representation-scaffold-receipt/1",
      status: "pass",
      mode: "generate",
      namespace: "underdrain",
      generatedAssetObligations: 41,
      derived: {
        people: ["dax-venn", "marta-sump", "morrowcap", "mrs-kett", "rhea-venn", "tess-loam"],
        objectives: [
          "diagnose-spore-valves",
          "inspect-living-trap",
          "open-crown-sluice",
          "operate-purge-wheel",
          "restore-kett-water",
        ],
        states: [
          "crown-grievance",
          "evidence-custody",
          "fungus-contact",
          "kett-water",
          "rhea-status",
          "root-gate-open",
          "town-water-pressure",
        ],
        surfaces: [
          "cold-entry",
          "authored-commitment",
          "first-action",
          "accepted-consequence",
          "playable-successor",
          "durable-record",
        ],
      },
    });

    const plan = readJson(first);
    expect(plan).toMatchObject({
      format: "rodoh-representation-plan/1",
      id: "underdrain-white-label-v1",
      namespace: "underdrain",
      classification: "authored-pilot-candidate",
      renderer: { action: "cartridge-assets", neutralFallbackUsed: false },
      candidate: {
        repository: "BigBirdReturns/axm-world",
        authoredIdentity: "underdrain-continuous-pilot-v2",
        experienceId: "underdrain-continuous-pilot-v2",
      },
    });
    expect(plan.requirements.people ?? plan.requirements.personIds).toEqual(receipt.derived.people);
    expect(plan.requirements.objectiveIds).toEqual(receipt.derived.objectives);
    expect(plan.requirements.stateIds).toEqual(receipt.derived.states);
    expect(plan.requirements.surfaceIds).toEqual(receipt.derived.surfaces);
    expect(plan.bindings.people).toHaveLength(6);
    expect(plan.bindings.objectives).toHaveLength(5);
    expect(plan.bindings.states).toHaveLength(7);
    expect(plan.surfaces).toHaveLength(6);
    expect(plan.assets.every((asset: { sourcePath: string; accessibleEquivalent: string }) =>
      asset.sourcePath.includes("TODO-") && asset.accessibleEquivalent.startsWith("TODO:"),
    )).toBe(true);
  });

  it("accepts the completed Underdrain plan against obligations derived from Arc authoring", () => {
    const result = run(["--presentation", PRESENTATION]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      format: "rodoh-representation-scaffold-receipt/1",
      status: "pass",
      mode: "check",
      namespace: "underdrain",
      missing: { surfaces: [], people: [], objectives: [], states: [] },
      blockers: [],
    });
  });

  it("fails before browser work when the representation omits a derived person and mechanism", () => {
    const directory = mkdtempSync(join(tmpdir(), "representation-missing-"));
    const broken = join(directory, "broken.json");
    const plan = readJson(PRESENTATION);
    plan.requirements.personIds = plan.requirements.personIds.filter((id: string) => id !== "tess-loam");
    plan.requirements.objectiveIds = plan.requirements.objectiveIds.filter((id: string) => id !== "open-crown-sluice");
    plan.bindings.people = plan.bindings.people.filter((binding: { personId: string }) => binding.personId !== "tess-loam");
    plan.bindings.objectives = plan.bindings.objectives.filter((binding: { objectiveId: string }) => binding.objectiveId !== "open-crown-sluice");
    writeFileSync(broken, `${JSON.stringify(plan, null, 2)}\n`);

    const result = run(["--presentation", broken]);
    expect(result.status).toBe(1);
    const receipt = JSON.parse(result.stdout);
    expect(receipt.status).toBe("fail");
    expect(receipt.missing).toMatchObject({
      people: ["tess-loam"],
      objectives: ["open-crown-sluice"],
    });
    expect(receipt.blockers).toEqual(expect.arrayContaining([
      "Representation requirements omit people: tess-loam.",
      "Representation requirements omit objectives: open-crown-sluice.",
      "No person binding for tess-loam.",
      "No objective binding for open-crown-sluice.",
    ]));
  });
});
