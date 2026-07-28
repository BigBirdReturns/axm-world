import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REPRESENTATION_PLAN_FORMAT,
  evaluateRepresentationPlan,
  type RepresentationPlan,
} from "../../src/world/acceptance/representation-completeness.js";

const ROOT = resolve(import.meta.dirname, "../..");
const DEMOS = resolve(ROOT, "demos");
const FIRST_PARTY_CLASSIFICATIONS = new Set([
  "authored-pilot-candidate",
  "playable-authored-episode",
]);

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function confined(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`);
}

function repositoryPath(path: string): string {
  return relative(ROOT, path).split(sep).join("/");
}

const authoringFiles = walk(DEMOS).filter((path) => path.endsWith(`${sep}authoring.json`));
const firstPartyPilots = authoringFiles.flatMap((path) => {
  const authoring = readJson(path);
  return FIRST_PARTY_CLASSIFICATIONS.has(authoring.classification)
    ? [{ path, directory: dirname(path), authoring }]
    : [];
});

describe("first-party authored-pilot representation discovery", () => {
  it("discovers at least one governed first-party pilot instead of auditing only the frozen v1 rollup", () => {
    expect(firstPartyPilots.map((entry) => repositoryPath(entry.path)))
      .toContain("demos/underdrain-draft/authoring.json");
  });

  for (const candidate of firstPartyPilots) {
    const label = repositoryPath(candidate.directory);
    it(`${label} carries a complete cartridge-owned representation plan`, () => {
      const presentationPath = join(candidate.directory, "presentation.json");
      expect(existsSync(presentationPath), `${label} is outside representation custody`).toBe(true);
      const plan = readJson(presentationPath) as RepresentationPlan;
      expect(plan.format).toBe(REPRESENTATION_PLAN_FORMAT);
      expect(plan.classification).toBe(candidate.authoring.classification);
      const result = evaluateRepresentationPlan(plan);
      expect(result, result.blockers.join("\n")).toMatchObject({ status: "pass", blockers: [] });

      const provenancePath = resolve(candidate.directory, plan.provenance.path);
      expect(confined(candidate.directory, provenancePath)).toBe(true);
      expect(existsSync(provenancePath), `missing ${repositoryPath(provenancePath)}`).toBe(true);
      expect(readJson(provenancePath).format).toBe(plan.provenance.format);

      for (const asset of plan.assets) {
        const sourcePath = resolve(candidate.directory, asset.sourcePath);
        expect(confined(candidate.directory, sourcePath), `${asset.id} escapes candidate custody`).toBe(true);
        expect(existsSync(sourcePath), `missing ${repositoryPath(sourcePath)} for ${asset.id}`).toBe(true);
      }
    });
  }
});
