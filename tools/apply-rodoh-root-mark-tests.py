from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "tests/world/asset-standard.test.ts"
source = path.read_text()
start_marker = '  it("RodohRuntimeMark PIXELS: every row matches row 0\'s length", () => {'
end_marker = '\n});\n\n// ---------------------------------------------------------------------------\n// (b) Provenance headers'
start = source.find(start_marker)
end = source.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Could not locate the legacy Rodoh derivative test block.")

replacement = '''  it("Rodoh root source is the byte-exact constitutional 16x16 map", () => {
    const rootSource = read("src/world/brand/rodoh-root-mark.ts");
    const rows = extractRows(rootSource, "export const RODOH_ROOT_MARK_MAP = [", "] as const;");
    expect(rows).toEqual([
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
    ]);
    expect(rows).toHaveLength(16);
    for (const [index, row] of rows.entries()) {
      expect(row.length, `root row ${index}`).toBe(16);
      expect(row).toMatch(/^[.WM]+$/);
    }
  });

  it("Rodoh root source and renderer use only the locked root palette and transforms", () => {
    const rootSource = read("src/world/brand/rodoh-root-mark.ts");
    const runtime = read("src/world/brand/RodohRuntimeMark.tsx");
    expect(rootSource).toContain('cream: "#fffdf5"');
    expect(rootSource).toContain('moss: "#6B784D"');
    expect(rootSource).toContain('charcoal: "#1B1818"');
    expect(runtime).toContain('from "./rodoh-root-mark.js"');
    expect(runtime).toContain('shapeRendering="crispEdges"');
    expect(runtime).toContain('imageRendering: "pixelated"');
    expect(runtime).not.toContain("drop-shadow");
    expect(runtime).not.toContain("#ECE7D8");
    expect(runtime).not.toContain("#7C7F57");
    expect(runtime).not.toContain('viewBox="0 0 16 18"');
    expect(runtime).not.toContain("filter:");
  });
});'''

path.write_text(source[:start] + replacement + source[end + len('\n});'):])
print("Migrated the asset-standard guards to the constitutional Rodoh root mark.")
