import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REPRESENTATION_PLAN_FORMAT,
  REPRESENTATION_PRODUCTION_FORMAT,
  evaluateRepresentationPlan,
  type RepresentationPlan,
  type RepresentationProductionCoverage,
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
  it("discovers governed first-party candidates instead of auditing only the frozen v1 rollup", () => {
    expect(firstPartyPilots.map((entry) => repositoryPath(entry.path)))
      .toContain("demos/underdrain-draft/authoring.json");
  });

  for (const candidate of firstPartyPilots) {
    const label = repositoryPath(candidate.directory);
    it(`${label} carries role, provenance, and exact production-coverage custody`, () => {
      const presentationPath = join(candidate.directory, "presentation.json");
      const productionPath = join(candidate.directory, "production.json");
      expect(existsSync(presentationPath), `${label} is outside representation-role custody`).toBe(true);
      expect(existsSync(productionPath), `${label} has no production-coverage receipt`).toBe(true);
      const plan = readJson(presentationPath) as RepresentationPlan;
      const production = readJson(productionPath) as RepresentationProductionCoverage;
      expect(plan.format).toBe(REPRESENTATION_PLAN_FORMAT);
      expect(production.format).toBe(REPRESENTATION_PRODUCTION_FORMAT);
      expect(plan.classification).toBe(candidate.authoring.classification);
      const result = evaluateRepresentationPlan(plan, production);
      if (production.status === "complete") {
        expect(result, result.blockers.join("\n")).toMatchObject({ status: "pass", blockers: [] });
      } else {
        expect(result.status).toBe("fail");
        expect(result.blockers.some((blocker) => blocker.startsWith("Production coverage is "))).toBe(true);
      }

      const provenancePath = resolve(candidate.directory, plan.provenance.path);
      expect(confined(candidate.directory, provenancePath)).toBe(true);
      expect(existsSync(provenancePath), `missing ${repositoryPath(provenancePath)}`).toBe(true);
      expect(readJson(provenancePath).format).toBe(plan.provenance.format);

      for (const asset of plan.assets) {
        const sourcePath = resolve(candidate.directory, asset.sourcePath);
        expect(confined(candidate.directory, sourcePath), `${asset.id} escapes candidate custody`).toBe(true);
        expect(existsSync(sourcePath), `missing ${repositoryPath(sourcePath)} for ${asset.id}`).toBe(true);
      }
      for (const source of production.sources) {
        expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
        for (const path of source.sourcePaths) {
          const sourcePath = resolve(candidate.directory, path);
          expect(confined(candidate.directory, sourcePath), `${source.id} escapes candidate custody`).toBe(true);
          expect(existsSync(sourcePath), `missing ${repositoryPath(sourcePath)} for ${source.id}`).toBe(true);
        }
      }
    });
  }
});
