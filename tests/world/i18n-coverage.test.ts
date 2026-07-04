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
  "src/world/shell/ProgramIdentityStrip.tsx",
  "src/world/inhabited/HallScene.tsx",
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

// Text of a BARE string/template literal (no interpolation), or null. Covers
// both "x" and `x`: the expression forms `={"x"}` / `={`x`}` render raw English
// exactly like `="x"`, so the guard must treat them identically. A template WITH
// substitutions (`Loading ${name}`) is not bare — it composes content — and is
// intentionally not treated as a flat literal here.
function bareLiteralText(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function scanSource(source: string, fileName: string): Violation[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];
  const lineOf = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node): void => {
    // (1) Raw JSX text child: <div>Cartridge worlds that remember.</div>
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (HAS_WORD.test(text)) violations.push({ line: lineOf(node), kind: "jsx-text", text });
    }

    // (2) User-facing attribute with a bare literal, in EITHER form:
    //     aria-label="Remove"   or   aria-label={"Remove"} / {`Remove`}
    // The expression forms wrap the literal in a JsxExpression, so a naive
    // isStringLiteral(initializer) check would miss them.
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf);
      if (USER_FACING_ATTRS.has(name)) {
        const init = node.initializer;
        const text = ts.isStringLiteral(init)
          ? init.text
          : ts.isJsxExpression(init)
            ? bareLiteralText(init.expression)
            : null;
        if (text !== null && HAS_WORD.test(text)) {
          violations.push({ line: lineOf(node), kind: `attr:${name}`, text });
        }
      }
    }

    // (3) A bare literal rendered directly as a JSX child expression:
    //     {"Hello"} / {`Hello`}
    if (
      ts.isJsxExpression(node) &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      const text = bareLiteralText(node.expression);
      if (text !== null && HAS_WORD.test(text)) {
        violations.push({ line: lineOf(node), kind: "jsx-expr-string", text });
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);
  return violations;
}

function findBareLiterals(relPath: string): Violation[] {
  return scanSource(fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8"), relPath);
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

describe("i18n coverage: detector recognizes every bare-literal form", () => {
  const wrap = (jsx: string): string => `export const C = () => (${jsx});`;
  const texts = (jsx: string): string[] => scanSource(wrap(jsx), "snippet.tsx").map((v) => v.text);

  it("flags raw JSX text", () => {
    expect(texts("<div>Cartridge worlds that remember.</div>")).toContain("Cartridge worlds that remember.");
  });

  it("flags user-facing attribute literals in string AND expression form", () => {
    // The gap the Codex review flagged: expression-wrapped attribute literals
    // (and no-substitution templates) render raw English but evade a naive
    // isStringLiteral(initializer) check.
    expect(texts(`<button aria-label="Remove item" />`)).toContain("Remove item");
    expect(texts(`<button aria-label={"Remove item"} />`)).toContain("Remove item");
    expect(texts("<input placeholder={`Search here`} />")).toContain("Search here");
  });

  it("flags string- and template-literal JSX children", () => {
    expect(texts(`<span>{"Bare child text"}</span>`)).toContain("Bare child text");
    expect(texts("<span>{`Bare child text`}</span>")).toContain("Bare child text");
  });

  it("does not flag t() calls, content expressions, punctuation, or structural attributes", () => {
    expect(texts(`<span>{t("boot.enter")}</span>`)).toEqual([]);
    expect(texts("<span>{cartridge.manifest.name}</span>")).toEqual([]);
    expect(texts(`<span>{" · "}</span>`)).toEqual([]);
    expect(texts("<span> → </span>")).toEqual([]);
    expect(texts(`<div data-testid="open-cartridge" />`)).toEqual([]);
    expect(texts(`<label htmlFor="cartridge-file-input">{t("boot.openCartridge")}</label>`)).toEqual([]);
    // A substituting template is content composition, not a flat chrome literal.
    expect(texts("<span aria-label={`Loading ${name}`} />")).toEqual([]);
  });
});
