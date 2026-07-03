import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Guard tests for the single visual-asset standard codified in
// docs/design/references/component-inventory.md ("Asset standard" section):
// provenance headers, grid integrity, honest citations, component location,
// and a typography-only glyph allowlist. Follows the file-content-guard idiom
// established by tests/world/pixel-ui-integration.test.ts (fs.readFileSync +
// assertions on raw source text) rather than importing React components,
// since several of the things being checked (grid literals, comment headers)
// live in source text that isn't exported by the modules themselves.

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

function listFiles(dirRelPath: string, extensions: string[]): string[] {
  const dirAbs = path.join(REPO_ROOT, dirRelPath);
  if (!fs.existsSync(dirAbs)) return [];
  const entries = fs.readdirSync(dirAbs, { recursive: true }) as string[];
  return entries
    .filter((entry) => extensions.some((ext) => entry.endsWith(ext)))
    .map((entry) => path.join(dirRelPath, entry).split(path.sep).join("/"));
}

// ---------------------------------------------------------------------------
// (a) Grid integrity
// ---------------------------------------------------------------------------

/** Extract every quoted row string inside a named array/object literal block. */
function extractRows(source: string, blockStartMarker: string, blockEndMarker: string): string[] {
  const startIdx = source.indexOf(blockStartMarker);
  expect(startIdx, `expected to find "${blockStartMarker}" in source`).toBeGreaterThanOrEqual(0);
  const endIdx = source.indexOf(blockEndMarker, startIdx);
  expect(endIdx, `expected to find "${blockEndMarker}" after "${blockStartMarker}"`).toBeGreaterThan(startIdx);
  const block = source.slice(startIdx, endIdx);
  const rows: string[] = [];
  const rowRegex = /"([^"\\]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(block))) {
    rows.push(m[1] ?? "");
  }
  return rows;
}

describe("asset standard: grid integrity", () => {
  const pixelIconSource = read("src/world/pixel-ui/PixelIcon.tsx");
  const markSource = read("src/world/brand/RodohRuntimeMark.tsx");

  it("PixelIcon GRIDS: every row is exactly 32 chars", () => {
    const rows = extractRows(pixelIconSource, "const GRIDS: Record<PixelIconName, string[]>", "const OUTLINE_COLOR");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.length).toBe(32);
    }
  });

  it("PixelIcon GRIDS: every char is in the declared alphabet `. # o w`", () => {
    const rows = extractRows(pixelIconSource, "const GRIDS: Record<PixelIconName, string[]>", "const OUTLINE_COLOR");
    const alphabet = new Set([".", "#", "o", "w"]);
    const seen = new Set<string>();
    for (const row of rows) {
      for (const ch of row) {
        seen.add(ch);
        expect(alphabet.has(ch), `unexpected token "${ch}" in a PixelIcon grid row`).toBe(true);
      }
    }
    // Reverse check: no dead token in the declared alphabet (each of . # o w
    // is actually used by at least one icon somewhere).
    for (const token of alphabet) {
      expect(seen.has(token), `declared PixelIcon token "${token}" never appears in any grid`).toBe(true);
    }
  });

  it("RodohRuntimeMark PIXELS: every row matches row 0's length", () => {
    const rows = extractRows(markSource, "const PIXELS = [", "function colorFor");
    expect(rows.length).toBeGreaterThan(0);
    const expectedLength = (rows[0] ?? "").length;
    rows.forEach((row, i) => {
      expect(row.length, `PIXELS row ${i} ("${row}") should be ${expectedLength} chars like row 0`).toBe(expectedLength);
    });
  });

  it("RodohRuntimeMark: every grid char is handled by colorFor and vice versa (no dead tokens)", () => {
    const rows = extractRows(markSource, "const PIXELS = [", "function colorFor");
    const gridChars = new Set<string>();
    for (const row of rows) {
      for (const ch of row) gridChars.add(ch);
    }

    // Parse the actual `case "x":` tokens out of colorFor() so this check
    // stays honest if the function is ever edited, rather than hardcoding
    // the token list here.
    const colorForMatch = markSource.match(/function colorFor[\s\S]*?\n\}/);
    expect(colorForMatch, "expected to find a colorFor() function").not.toBeNull();
    const colorForBody = colorForMatch![0];
    const caseTokens = new Set<string>();
    const caseRegex = /case\s+"([^"]+)":/g;
    let m: RegExpExecArray | null;
    while ((m = caseRegex.exec(colorForBody))) {
      caseTokens.add(m[1] ?? "");
    }
    expect(caseTokens.size).toBeGreaterThan(0);

    // "0" is background/transparent and intentionally has no colorFor case.
    const paintedGridChars = new Set([...gridChars].filter((c) => c !== "0"));

    // Every painted grid char must be handled by colorFor.
    for (const ch of paintedGridChars) {
      expect(caseTokens.has(ch), `grid uses token "${ch}" with no colorFor case`).toBe(true);
    }
    // Every colorFor case must actually appear in the grid (the bug this
    // guard is here to catch: colorFor's "e"/SEED case with no "e" in PIXELS).
    for (const token of caseTokens) {
      expect(paintedGridChars.has(token), `colorFor handles "${token}" but it never appears in PIXELS`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// (b) Provenance headers
// ---------------------------------------------------------------------------

describe("asset standard: provenance headers", () => {
  const files = [
    "src/world/pixel-ui/PixelIcon.tsx",
    "src/world/themes/first-charter/motif-icons.tsx",
    "src/world/brand/RodohRuntimeMark.tsx",
  ];

  it.each(files)("%s has Source:/Grid:/Encoding: within its first 40 lines", (relPath) => {
    const head = read(relPath).split("\n").slice(0, 40).join("\n");
    expect(head).toContain("Source:");
    expect(head).toContain("Grid:");
    expect(head).toContain("Encoding:");
  });
});

// ---------------------------------------------------------------------------
// (c) Citation integrity
// ---------------------------------------------------------------------------

describe("asset standard: citation integrity", () => {
  it("every *.png/*.html/*.zip citation in src/world and docs/design/references resolves to a real file", () => {
    const referenceDirs = ["docs/design/references", "docs/design/harvest"];
    const realBasenames: string[] = [];
    for (const dir of referenceDirs) {
      const dirAbs = path.join(REPO_ROOT, dir);
      if (!fs.existsSync(dirAbs)) continue;
      for (const entry of fs.readdirSync(dirAbs, { recursive: true }) as string[]) {
        const full = path.join(dirAbs, entry);
        if (fs.statSync(full).isFile()) {
          realBasenames.push(path.basename(entry));
        }
      }
    }
    expect(realBasenames.length).toBeGreaterThan(0);

    const scanFiles = [
      ...listFiles("src/world", [".ts", ".tsx"]),
      ...listFiles("docs/design/references", [".md"]),
    ];

    const citationRegex = /[\w][\w.-]*\.(?:png|html|zip)\b/g;
    const broken: string[] = [];

    for (const relPath of scanFiles) {
      const source = read(relPath);
      const lines = source.split("\n");
      lines.forEach((line, lineIdx) => {
        const matches = line.match(citationRegex);
        if (!matches) return;
        for (const token of matches) {
          // Doc prose that explicitly narrates a *historical, mangled*
          // filename (never a live citation to a currently-required asset,
          // e.g. README.md's note about an upload process mangling
          // "AXM-WORLD Logo Pack.html" into "AXM-WORLD20Pack.html" before it
          // was renamed back) is not a citation this guard should enforce.
          // Look at a small surrounding window since prose wraps across
          // lines and "mangled" may be one line above the filename itself.
          const windowStart = Math.max(0, lineIdx - 2);
          const contextWindow = lines.slice(windowStart, lineIdx + 1).join(" ");
          if (/mangled/i.test(contextWindow)) return;

          const resolved = realBasenames.some(
            (real) => real === token || real.endsWith(token) || token.endsWith(real),
          );
          if (!resolved) {
            broken.push(`${relPath}:${lineIdx + 1}: "${token}"`);
          }
        }
      });
    }

    expect(broken, `broken/nonexistent asset citations:\n${broken.join("\n")}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (d) Location rule: no pixel-grid literal outside the three allowed homes
// ---------------------------------------------------------------------------

const ALLOWED_GRID_DIRS = ["src/world/pixel-ui", "src/world/themes", "src/world/brand"];

/**
 * Heuristic: a pixel-grid literal is 3+ consecutive quoted string literals,
 * all the same length (>= 8 chars), drawn from a small character set (a real
 * pixel-grid alphabet is tiny — ". # o w" or "0 p w b m s l r" — while
 * ordinary UI strings of fixed length practically never share both traits).
 */
function hasGridLiteral(source: string): boolean {
  const stringRegex = /"((?:[^"\\]|\\.)*)"/g;
  const matches: { value: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = stringRegex.exec(source))) {
    matches.push({ value: m[1] ?? "", index: m.index });
  }
  for (let i = 0; i + 2 < matches.length; i++) {
    const a = matches[i]!;
    const b = matches[i + 1]!;
    const c = matches[i + 2]!;
    const closeTogether = c.index - a.index < 200;
    if (!closeTogether) continue;
    const len = a.value.length;
    if (len < 8) continue;
    if (!(b.value.length === len && c.value.length === len)) continue;
    const distinctChars = new Set([a, b, c].flatMap((r) => r.value.split("")));
    if (distinctChars.size <= 6) return true;
  }
  return false;
}

describe("asset standard: location rule", () => {
  it("no .tsx file outside pixel-ui/themes/brand defines a pixel-grid literal", () => {
    const allTsx = listFiles("src/world", [".tsx"]);
    const outside = allTsx.filter(
      (relPath) => !ALLOWED_GRID_DIRS.some((dir) => relPath.startsWith(`${dir}/`)),
    );
    expect(outside.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const relPath of outside) {
      if (hasGridLiteral(read(relPath))) offenders.push(relPath);
    }
    expect(offenders, `unexpected pixel-grid literal(s) outside pixel-ui/themes/brand:\n${offenders.join("\n")}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (e) Glyph allowlist: only typography, never pictographs/emoji, outside the
// icon/brand/i18n directories.
// ---------------------------------------------------------------------------

// Generous on purpose — punctuation, arrows, and box-drawing are legitimate
// runtime typography and other in-flight work may add more of it. Strict on
// pictographs/emoji: none of those belong outside pixel-ui/themes/brand
// (icons should be PixelIcon/MotifIcon, not glyphs).
const TYPOGRAPHY_EXEMPT = new Set<string>([
  // General punctuation
  "§", // section sign (spec/reference section citations)
  "¶", // pilgraph sign
  "·", // middle dot (label separators)
  "•", // bullet
  "‣", // triangular bullet
  "–", // en dash
  "—", // em dash
  "…", // ellipsis
  "†", "‡", // dagger / double dagger
  "“", "”", "‘", "’", // curly quotes
  "«", "»", // guillemets
  // Math / comparison
  "×", // multiplication sign
  "÷",
  "±",
  "≈",
  "≠",
  "≥", // used in "≥ 44px" target-size copy
  "≤",
  // Currency
  "€", "£", "¥", "¢",
  // Arrows
  "→", "←", "↑", "↓", "↔", "⇒", "⇐", "⤓",
  // Guillemets (single/double angle quotes — back-nav affordances, punctuation)
  "‹", "›", "«", "»",
  // Box drawing (ASCII-art dividers/frames)
  "─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼",
  // Geometric / bullet-style markers (disclosure carets, status dots)
  "▸", "▹", "▾", "▴", "▲", "▼", "►", "◄",
  "●", "○", "◆", "◇", "◈", "◧", "◨", "▪", "▫", "▤",
  // Check / cross marks (state indicators, not colorful emoji)
  "✓", "✔", "✗", "✘",
  // Warning triangle (monochrome alert glyph, not a color emoji)
  "⚠",
]);

describe("asset standard: glyph allowlist", () => {
  it("non-ASCII glyphs in gameplay .tsx files are all typography, not pictographs/emoji", () => {
    const excludedDirs = ["pixel-ui", "themes", "brand", "dev", "i18n"];
    const allTsx = listFiles("src/world", [".tsx"]);
    const scanned = allTsx.filter((relPath) => {
      const parts = relPath.split("/");
      // parts[0]="src", parts[1]="world", parts[2]=first subdir
      const topDir = parts[2] ?? "";
      return !excludedDirs.includes(topDir);
    });
    expect(scanned.length).toBeGreaterThan(0);

    const found = new Map<string, string>(); // char -> first file it was seen in
    for (const relPath of scanned) {
      const source = read(relPath);
      for (const ch of source) {
        if (ch.charCodeAt(0) > 127 && !found.has(ch)) {
          found.set(ch, relPath);
        }
      }
    }

    const notExempt: string[] = [];
    for (const [ch, relPath] of found) {
      if (!TYPOGRAPHY_EXEMPT.has(ch)) {
        notExempt.push(`"${ch}" (U+${ch.codePointAt(0)!.toString(16).toUpperCase()}) first seen in ${relPath}`);
      }
    }
    expect(notExempt, `non-typography glyph(s) found outside icon directories:\n${notExempt.join("\n")}`).toEqual([]);
  });
});
