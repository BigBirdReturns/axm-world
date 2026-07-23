import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const WAKING_TOWER = [
  "src/assets/karazhan/hall/waking-tower-environment.svg",
  "src/assets/karazhan/hall/seren-vale-portrait.svg",
  "src/assets/karazhan/hall/waking-tower-foreground.svg",
] as const;

const ILYON = [
  "src/assets/ilyon/observatory/ilyon-observatory-environment.svg",
  "src/assets/ilyon/observatory/aster-neral-portrait.svg",
  "src/assets/ilyon/observatory/ilyon-observatory-foreground.svg",
] as const;

const RODOH = [
  "src/assets/rodoh/bay/rodoh-bay-environment.svg",
  "src/assets/rodoh/bay/rodoh-bay-foreground.svg",
] as const;

function provenance(path: string): {
  format: string;
  status: string;
  authorship: string;
  releaseBoundary: string;
  assets: Array<{ path: string; role: string; viewBox: string }>;
  validation: { required: string[] };
} {
  return JSON.parse(read(path));
}

describe("production asset wave one", () => {
  it("ships eight standalone semantic vector assets", () => {
    for (const path of [...WAKING_TOWER, ...ILYON, ...RODOH]) {
      const source = read(path);
      expect(source, path).toContain("<svg");
      expect(source, path).toContain('role="img"');
      expect(source, path).toMatch(/viewBox="0 0 \d+ \d+"/);
      expect(source, path).toContain("<title id=\"title\">");
      expect(source, path).toContain("<desc id=\"desc\">");
      expect(source, path).not.toContain("data:image");
      expect(source.length, path).toBeGreaterThan(1_000);
    }
    expect(read(WAKING_TOWER[1])).toContain("Seren Vale, Warden of the Lamplit Survey");
    expect(read(ILYON[1])).toContain("Aster Neral, astronomer of Ilyon");
    expect(read(RODOH[0])).toContain("The Rodoh cartridge bay");
  });

  it("binds every asset through cartridge- or system-specific runtime CSS", () => {
    const tower = read("src/world/themes/karazhan/production-assets.css");
    for (const name of ["waking-tower-environment.svg", "seren-vale-portrait.svg", "waking-tower-foreground.svg"]) {
      expect(tower).toContain(name);
    }
    expect(tower).toContain(':root[data-cartridge="karazhan"]');
    expect(tower).toContain("@media (forced-colors: active)");

    const ilyon = read("src/world/themes/ilyon/production-assets.css");
    for (const name of ["ilyon-observatory-environment.svg", "aster-neral-portrait.svg", "ilyon-observatory-foreground.svg"]) {
      expect(ilyon).toContain(name);
    }
    expect(ilyon).toContain(':root[data-cartridge="ilyon"]');
    expect(ilyon).toContain(".godscar-pocket__cast article:first-child");
    expect(ilyon).toContain("@media (forced-colors: active)");

    const bay = read("src/world/rodoh-bay.css");
    expect(bay).toContain("rodoh-bay-environment.svg");
    expect(bay).toContain("rodoh-bay-foreground.svg");
    expect(bay).toContain(".rodoh-bay-screen");
    expect(bay).toContain("@media (max-width: 700px)");
    expect(bay).toContain("@media (forced-colors: active)");
  });

  it("mounts the production CSS and explicit cartridge-bay hooks in the player", () => {
    const player = read("src/world/Player.tsx");
    expect(player).toContain('import "./themes/karazhan/production-assets.css";');
    expect(player).toContain('import "./themes/ilyon/production-assets.css";');
    expect(player).toContain('import "./rodoh-bay.css";');
    expect(player).toContain('className="rodoh-bay-screen"');
    expect(player).toContain('data-testid="rodoh-cartridge-bay"');
    expect(player).toContain('className="rodoh-bay-shell"');
  });

  it("carries exact project-owned provenance and bounded release claims", () => {
    const manifests = [
      ["src/assets/karazhan/hall/provenance.json", WAKING_TOWER],
      ["src/assets/ilyon/observatory/provenance.json", ILYON],
      ["src/assets/rodoh/bay/provenance.json", RODOH],
    ] as const;

    for (const [path, assets] of manifests) {
      const manifest = provenance(path);
      expect(manifest.format).toBe("axm-runtime-asset-provenance/1");
      expect(manifest.status).toContain("production");
      expect(manifest.authorship).toContain("No external art");
      expect(manifest.releaseBoundary.length).toBeGreaterThan(80);
      expect(manifest.assets.map((entry) => entry.path)).toEqual(assets);
      expect(manifest.assets.every((entry) => entry.viewBox.startsWith("0 0 "))).toBe(true);
      expect(manifest.validation.required.length).toBeGreaterThanOrEqual(5);
    }
  });
});