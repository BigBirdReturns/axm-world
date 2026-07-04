import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

// i18n COVERAGE guard — the other half of localization correctness.
//
// tests/world/locale.test.ts proves every CATALOGUED message id has a zh-Hant
// counterpart (or is explicitly EN_ONLY). That only polices strings that already
// went through `t()`. This guard proves the *first* step: that user-facing CHROME
// text in the listed files is actually routed through `t()` at all — so a raw
// English literal can't ship untranslated by simply never becoming a key.
//
// It is deliberately an ALLOWLIST of already-clean files, not a repo-wide sweep:
// localization coverage grows one surface at a time, and every new or edited
// chrome surface must be swept clean and added here — the future in-shell
// identity strip included. That is the point: new UI is born obeying the
// chrome/content boundary instead of inheriting debt.
//
// The cartridge/content boundary is preserved by construction. Arc-authored
// values — cartridge name, domain, engine version, challenge names/titles/counts,
// resource names, doctrine text — flow verbatim as JSX expressions / message
// params and are NEVER catalogued as chrome. This guard only flags BARE
// user-facing literals (raw JSX text, user-facing attribute strings, string
// children), so authored content passing through as `{expr}` is never touched.

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

// Chrome files proven free of bare user-facing literals. GROW this list as
// surfaces are swept; never silently drop an entry.
const I18N_CLEAN_CHROME = [
  "src/world/Player.tsx",
  "src/world/components/CartridgeBayCard.tsx",
];

// Attributes that render as user-facing text, so a string literal in one is an
// untranslated label. Structural attributes (style, className, data-*, id,
// htmlFor, type, name, role, key) and component text props (label/caption) are
// intentionally out of scope for this guard.
const USER_FACING_ATTRS = new Set(["aria-label", "alt", "placeholder", "title"]);

// A "user-facing literal" is text with at least one real word. Punctuation-only
// runs used as separators/affordances ("·", "→", "—") are legitimate inline
// typography and are not flagged.
const HAS_WORD = /[A-Za-z]{2,}/;

interface Violation {
  line: number;
  kind: string;
  text: string;
}

function findBareLiterals(relPath: string): Violation[] {
  const source = fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
  const sf = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node): void => {
    // (1) Raw JSX text child: <div>Cartridge worlds that remember.</div>
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (HAS_WORD.test(text)) violations.push({ line: lineOf(node), kind: "jsx-text", text });
    }

    // (2) User-facing attribute with a bare string literal: aria-label="Remove"
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf);
      if (USER_FACING_ATTRS.has(name) && HAS_WORD.test(node.initializer.text)) {
        violations.push({ line: lineOf(node), kind: `attr:${name}`, text: node.initializer.text });
      }
    }

    // (3) A string literal rendered directly as a JSX child expression: {"Hello"}
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression) &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      HAS_WORD.test(node.expression.text)
    ) {
      violations.push({ line: lineOf(node), kind: "jsx-expr-string", text: node.expression.text });
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);
  return violations;
}

describe("i18n coverage: listed chrome files route user-facing text through t()", () => {
  it("the clean-chrome allowlist is non-empty and every listed file exists", () => {
    expect(I18N_CLEAN_CHROME.length).toBeGreaterThan(0);
    for (const rel of I18N_CLEAN_CHROME) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} is listed as clean chrome but does not exist`).toBe(true);
    }
  });

  it.each(I18N_CLEAN_CHROME)("%s has no bare user-facing string literals", (relPath) => {
    const violations = findBareLiterals(relPath);
    const report = violations.map((v) => `  ${relPath}:${v.line} [${v.kind}] "${v.text}"`).join("\n");
    expect(violations, `bare user-facing literal(s) found — route these through t():\n${report}`).toEqual([]);
  });
});
