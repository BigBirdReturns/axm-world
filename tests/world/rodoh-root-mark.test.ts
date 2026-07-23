import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  RODOH_ROOT_MARK_HEIGHT,
  RODOH_ROOT_MARK_MAP,
  RODOH_ROOT_MARK_PALETTE,
  RODOH_ROOT_MARK_WIDTH,
  rootMarkColor,
} from "../../src/world/brand/rodoh-root-mark.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const CONSTITUTIONAL_MAP = [
  "....W..W........",
  "..W..WW..W..W...",
  "...W.WWW.W.W....",
  "..W.WWWWW.WW....",
  "...WWWWWWW.W....",
  "..W.WWWWW..W....",
  "....WWWWW.......",
  ".....MWM........",
  "......M.........",
  "......M.....W...",
  "....M.M..W......",
  "...M..M.M.......",
  "...M..M.........",
  "......M.........",
  ".....MMM........",
  "....MMMMM.......",
] as const;

describe("constitutional Rodoh root mark", () => {
  it("holds the exact 16x16 coordinate ledger", () => {
    expect(RODOH_ROOT_MARK_WIDTH).toBe(16);
    expect(RODOH_ROOT_MARK_HEIGHT).toBe(16);
    expect(RODOH_ROOT_MARK_MAP).toEqual(CONSTITUTIONAL_MAP);
    expect(new Set(RODOH_ROOT_MARK_MAP.flatMap((row) => [...row]))).toEqual(new Set([".", "W", "M"]));
  });

  it("locks the root palette and refuses derivative colors", () => {
    expect(RODOH_ROOT_MARK_PALETTE).toEqual({
      cream: "#fffdf5",
      moss: "#6B784D",
      charcoal: "#1B1818",
    });
    expect(rootMarkColor("W")).toBe("#fffdf5");
    expect(rootMarkColor("M")).toBe("#6B784D");
    expect(rootMarkColor(".")).toBeNull();
    const runtime = read("src/world/brand/RodohRuntimeMark.tsx");
    expect(runtime).not.toContain("#ECE7D8");
    expect(runtime).not.toContain("#7C7F57");
    expect(runtime).not.toContain("#0D0C09");
    expect(runtime).not.toContain("#C24B2C");
  });

  it("pins upstream custody and quarantines application references", () => {
    const manifest = JSON.parse(read("src/world/brand/rodoh-root-mark.provenance.json")) as {
      format: string;
      dimensions: string;
      upstream: {
        commit: string;
        constitution: { blob: string };
        practiceDerivative: { blob: string };
        practiceTokens: { blob: string };
      };
      bannedTransforms: string[];
    };
    expect(manifest.format).toBe("axm-identity-custody/1");
    expect(manifest.dimensions).toBe("16x16");
    expect(manifest.upstream.commit).toBe("93a9740a26b0fafe5b5152103a8118a489afbcec");
    expect(manifest.upstream.constitution.blob).toBe("6ce2a3a6262a1190764117ec04ce687a1708271c");
    expect(manifest.upstream.practiceDerivative.blob).toBe("bc9a3eb2db82b21c6fdb58acb1d017c5a48cdedf");
    expect(manifest.upstream.practiceTokens.blob).toBe("5d03305a3fb7cd0982b1e34242ecc3588629f17f");
    expect(manifest.bannedTransforms).toContain("drop shadow");
    expect(manifest.bannedTransforms).toContain("fractional scale");

    const quarantine = read("docs/design/references/IDENTITY_REFERENCE_QUARANTINE.md");
    expect(quarantine).toContain("rodoh_platform_identity_system_guide.png");
    expect(quarantine).toContain("AXM-WORLD Logo Pack.html");
    expect(quarantine).toContain("not source authority");
  });

  it("renders without smoothing, shadows, redraws, or arbitrary palette props", () => {
    const runtime = read("src/world/brand/RodohRuntimeMark.tsx");
    expect(runtime).toContain('shapeRendering="crispEdges"');
    expect(runtime).toContain('imageRendering: "pixelated"');
    expect(runtime).toContain("Math.round(size / RODOH_ROOT_MARK_WIDTH)");
    expect(runtime).not.toContain("drop-shadow");
    expect(runtime).not.toContain("filter:");
    expect(runtime).not.toContain("bone?:");
    expect(runtime).not.toContain("olive?:");
    expect(runtime).not.toContain("16 18");
  });
});