import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const ASSETS = [
  "src/assets/relief-circuit/vessel/relief-circuit-environment.svg",
  "src/assets/relief-circuit/vessel/ilya-venn-portrait.svg",
  "src/assets/relief-circuit/vessel/nima-quell-portrait.svg",
  "src/assets/relief-circuit/vessel/orun-sable-portrait.svg",
  "src/assets/relief-circuit/vessel/tessara-one-portrait.svg",
  "src/assets/relief-circuit/vessel/arden-pell-portrait.svg",
  "src/assets/relief-circuit/vessel/cinder-continuing-portrait.svg",
  "src/assets/relief-circuit/vessel/relief-circuit-cross-section.svg",
  "src/assets/relief-circuit/vessel/relief-circuit-symbol-atlas.svg",
] as const;

const CAST = [
  ["Ilya Venn", "rapid-response pilot"],
  ["Nima Quell", "aquatic care worker"],
  ["Orun Sable", "high-gravity maintainer"],
  ["Tessara One", "Manyborn mediator"],
  ["Arden Pell", "nine-year analyst"],
  ["Cinder Continuing", "Counterborn vessel fork"],
] as const;

describe("Relief Circuit production asset preparation", () => {
  it("ships nine project-owned semantic vector sources", () => {
    for (const path of ASSETS) {
      const source = read(path);
      expect(source, path).toContain("<svg");
      // The required W3C namespace is declarative SVG syntax. The actual offline
      // custody guard rejects only network-bearing href and xlink:href values.
      expect(source, path).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(source, path).toContain('role="img"');
      expect(source, path).toMatch(/viewBox="0 0 \d+ \d+"/);
      expect(source, path).toContain("<title id=\"title\">");
      expect(source, path).toContain("<desc id=\"desc\">");
      expect(source, path).not.toContain("data:image");
      expect(source, path).not.toMatch(/(?:href|xlink:href)=["']https?:\/\//);
      expect(source.length, path).toBeGreaterThan(2_000);
    }
  });

  it("gives every exact founding cast member a distinct embodied portrait", () => {
    const portraitPaths = ASSETS.filter((path) => path.endsWith("-portrait.svg"));
    expect(portraitPaths).toHaveLength(6);
    const combined = portraitPaths.map(read).join("\n");
    for (const [name, embodiment] of CAST) {
      expect(combined).toContain(name);
      expect(combined).toContain(embodiment);
    }
    expect(read("src/assets/relief-circuit/vessel/tessara-one-portrait.svg")).toContain("none of which is presented as the original body");
    expect(read("src/assets/relief-circuit/vessel/cinder-continuing-portrait.svg")).toContain("several divergent bodies");
  });

  it("depicts the actual Common Ship operating vocabulary", () => {
    const environment = read(ASSETS[0]);
    expect(environment).toContain("DRY COMMAND / HOST BASELINE");
    expect(environment).toContain("AQUATIC CARE / PRESSURE CONTINUITY");
    expect(environment).toContain("HIGH-GRAVITY WORK / LOAD-RATED ROUTE");
    expect(environment).toContain("COUNTERBORN CONTINUITY / DIVERGENT FORKS");

    const crossSection = read("src/assets/relief-circuit/vessel/relief-circuit-cross-section.svg");
    for (const label of [
      "TRANSIT BODY",
      "HABITAT BANDS",
      "COMMON THRESHOLDS",
      "TRANSLATION MESH",
      "WATCH LATTICE",
      "CONTINUITY COMMONS",
      "COMMON CHARTER",
      "SCARWAY TO LAMP DISTRICT",
    ]) {
      expect(crossSection).toContain(label);
    }

    const atlas = read("src/assets/relief-circuit/vessel/relief-circuit-symbol-atlas.svg");
    for (const label of [
      "ROLE COVERAGE",
      "TEMPORAL OVERLAP",
      "HABITAT COMPAT.",
      "TRANSLATION RESILIENCE",
      "HANDOFF CONTINUITY",
      "LIFE-FRACTION FAIRNESS",
      "HABITAT INTEGRITY",
      "TEMPORAL COHERENCE",
      "TRANSLATION TRUST",
      "ROSTER RESILIENCE",
      "STORES AND CARE",
      "CONTINUITY",
      "VISIBILITY",
      "COMPATIBILITY DEBT",
    ]) {
      expect(atlas).toContain(label);
    }
  });

  it("records an explicit pre-Gate-6 custody boundary", () => {
    const manifest = JSON.parse(read("src/assets/relief-circuit/vessel/provenance.json")) as {
      format: string;
      status: string;
      authorship: string;
      releaseBoundary: string;
      assets: Array<{ path: string; subject?: string }>;
      validation: { required: string[] };
    };
    expect(manifest.format).toBe("axm-runtime-asset-provenance/1");
    expect(manifest.status).toBe("production-asset-pack-prepared");
    expect(manifest.authorship).toContain("No external art");
    expect(manifest.releaseBoundary).toContain("does not claim Gate 6 is executable");
    expect(manifest.assets.map((entry) => entry.path)).toEqual(ASSETS);
    expect(manifest.assets.filter((entry) => entry.subject).map((entry) => entry.subject)).toEqual(CAST.map(([name]) => expect.stringContaining(name)));
    expect(manifest.validation.required).toContain("all six founding cast members have distinct authored portraits bound to their actual embodiment claims");
    expect(manifest.validation.required).toContain("no asset is imported by World before Gate 5 source authority is accepted");
  });

  it("does not prematurely bind the prepared pack into the current World runtime", () => {
    const player = read("src/world/Player.tsx");
    for (const path of ASSETS) {
      expect(player).not.toContain(path.split("/").at(-1));
    }
  });
});