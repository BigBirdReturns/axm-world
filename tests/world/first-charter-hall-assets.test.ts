import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("First Charter Hall production vertical slice", () => {
  const assets = [
    "src/assets/first-charter/hall/charter-hall-environment.svg",
    "src/assets/first-charter/hall/maren-vos-portrait.svg",
    "src/assets/first-charter/hall/charter-hall-foreground.svg",
  ] as const;

  it("ships three standalone original runtime assets with semantic SVG metadata", () => {
    for (const path of assets) {
      const source = read(path);
      expect(source, path).toContain("<svg");
      expect(source, path).toMatch(/viewBox="0 0 \d+ \d+"/);
      expect(source, path).not.toContain("data:image");
      expect(source.length, path).toBeGreaterThan(1_000);
    }
    expect(read(assets[0])).toContain("<title id=\"title\">The First Charter founding hall</title>");
    expect(read(assets[1])).toContain("<title id=\"title\">Maren Vos, Charter-Keeper</title>");
  });

  it("binds the environment, portrait, and framing files into the actual Hall runtime", () => {
    const css = read("src/world/themes/first-charter/first-charter.css");
    expect(css).toContain('url("../../../assets/first-charter/hall/charter-hall-environment.svg")');
    expect(css).toContain('url("../../../assets/first-charter/hall/maren-vos-portrait.svg")');
    expect(css).toContain('url("../../../assets/first-charter/hall/charter-hall-foreground.svg")');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('@media (max-width: 780px)');
  });

  it("carries an honest provenance and release-boundary manifest", () => {
    const provenance = JSON.parse(read("src/assets/first-charter/hall/provenance.json")) as {
      format: string;
      status: string;
      authorship: string;
      releaseBoundary: string;
      assets: Array<{ path: string; role: string }>;
      validation: { required: string[] };
    };
    expect(provenance.format).toBe("axm-runtime-asset-provenance/1");
    expect(provenance.status).toBe("production-vertical-slice");
    expect(provenance.authorship).toContain("No external art");
    expect(provenance.releaseBoundary).toContain("does not claim");
    expect(provenance.assets.map((entry) => entry.path)).toEqual(assets);
    expect(provenance.assets.map((entry) => entry.role)).toEqual([
      "runtime environment",
      "runtime authored-person portrait",
      "runtime framing overlay",
    ]);
    expect(provenance.validation.required).toHaveLength(4);
  });
});
