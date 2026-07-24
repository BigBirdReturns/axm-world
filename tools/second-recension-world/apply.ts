import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BUNDLED_CARTRIDGES } from "../../src/world/cartridge.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";

const ROOT = process.cwd();
const expectedPath = path.join(ROOT, "src/world/bundled-digests.ts");
const legacyPath = path.join(ROOT, "src/world/legacy-revisions.ts");

function parseDigestMap(source: string): Record<string, string> {
  return Object.fromEntries(
    [...source.matchAll(/["']?([a-z0-9-]+)["']?\s*:\s*"(cart1_[0-9a-f]{64})"/g)]
      .map((match) => [match[1]!, match[2]!]),
  );
}

const order = ["first-charter", "karazhan", "kind-gods-of-ilyon", "lamp-district", "relief-circuit"];
const oldExpected = parseDigestMap(await readFile(expectedPath, "utf8"));
const actual = Object.fromEntries(
  BUNDLED_CARTRIDGES.map((cartridge) => [cartridge.manifest.id, cartridgeIdentity(cartridge)]),
);
for (const id of order) if (!actual[id]) throw new Error(`Missing bundled cartridge ${id}.`);

await writeFile(expectedPath, `// Expected content-identity digests of the bundled cartridges — the golden
// manifest for Program 001 (The First Charter) and its siblings.
//
// This file is a COMMITTED EXPECTATION, updated intentionally after exact
// authored-law review. The golden-digest guard recomputes each bundled
// cartridge identity and refuses silent changes.

export const EXPECTED_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
${order.map((id) => `  "${id}": "${actual[id]}",`).join("\n")}
};
`, "utf8");

const legacy = parseDigestMap(await readFile(legacyPath, "utf8"));
for (const [id, oldDigest] of Object.entries(oldExpected)) {
  if (actual[id] !== oldDigest) legacy[id] = oldDigest;
}
await writeFile(legacyPath, `/** Most recent historical bundled identities. These are evidence locators only:
 * they are never aliases for current cartridge identity and their save blobs are
 * never moved or rewritten under a new digest. */
export const LEGACY_BUNDLED_DIGESTS: Readonly<Record<string, string>> = {
${order.filter((id) => legacy[id]).map((id) => `  "${id}": "${legacy[id]}",`).join("\n")}
};
`, "utf8");

const test = `import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLED_CARTRIDGES } from "../../src/world/cartridge.js";
import { EXPECTED_BUNDLED_DIGESTS } from "../../src/world/bundled-digests.js";
import { LEGACY_BUNDLED_DIGESTS } from "../../src/world/legacy-revisions.js";
import { readSecondRecensionNote } from "../../src/godscar/second-recension.js";
import { SOURCE_PLANE_REGISTRY } from "../../src/source-planes/registry.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import { connectedOperationFromRun } from "../../src/engine/connected-operation.js";

function sourceFor(id: string): { notes?: unknown; identity?: { version?: string; parentCanons?: string[] } } {
  const cartridge = BUNDLED_CARTRIDGES.find((candidate) => candidate.manifest.id === id);
  if (!cartridge) throw new Error(\`Missing bundled cartridge \${id}\`);
  const source = Object.values(cartridge.arc.extensions ?? {}).find((value) =>
    value && typeof value === "object" && !Array.isArray(value) &&
    (value as { identity?: { id?: string } }).identity?.id === id
  );
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(\`Missing source extension for \${id}\`);
  return source as { notes?: unknown; identity?: { version?: string; parentCanons?: string[] } };
}

describe("Second Recension Books I-III in Rodoh", () => {
  it("vendors three source planes and no Book IV implementation", () => {
    expect(SOURCE_PLANE_REGISTRY.map((entry) => entry.format)).toEqual([
      "godscar-pocket/1", "dark-tomb-pocket/1", "common-ship-pocket/1",
    ]);
    expect(SOURCE_PLANE_REGISTRY.some((entry) => /book.?iv|lineage/i.test(entry.id + entry.format + entry.label))).toBe(false);
  });

  it.each([
    ["kind-gods-of-ilyon", "book-i", "1.1.0", "The Consequence Plane"],
    ["lamp-district", "book-ii", "1.1.0", "The Living Tomb"],
    ["relief-circuit", "book-iii", "1.1.0", "The Expanded Commonship"],
  ] as const)("preserves the reviewed %s note", (id, bookId, version, parentTitle) => {
    const source = sourceFor(id);
    const note = readSecondRecensionNote(source.notes as never);
    expect(note?.bookId).toBe(bookId);
    expect(note?.preservesFirstRecension).toBe(true);
    expect(note?.bookIVExcluded).toBe(true);
    expect(source.identity?.version).toBe(version);
    expect(source.identity?.parentCanons?.some((entry) => entry.includes(parentTitle))).toBe(true);
  });

  it("keeps the immediate prior identities as historical locators", () => {
    for (const id of ["kind-gods-of-ilyon", "lamp-district", "relief-circuit"]) {
      expect(LEGACY_BUNDLED_DIGESTS[id]).toBeTruthy();
      expect(EXPECTED_BUNDLED_DIGESTS[id]).not.toBe(LEGACY_BUNDLED_DIGESTS[id]);
    }
  });

  it("preserves expanded cross-book custody", () => {
    const json = readFileSync(new URL("../../cartridges/relief-circuit-lamp-district.run.json", import.meta.url), "utf8");
    const connected = connectedOperationFromRun(parsePortableRun(json));
    expect(connected?.operation.transfer.provenance).toHaveLength(3);
    expect(connected?.operation.transfer.decisions).toHaveLength(3);
    expect(connected?.operation.transfer.dissent).toHaveLength(1);
    expect(connected?.operation.transfer.uncertainty).toHaveLength(1);
    expect(connected?.operation.transfer.obligations).toHaveLength(3);
    expect(connected?.operation.transfer.unknownMemory).toHaveProperty("meridian.unparsed@1");
    expect(connected?.operation.returnLedger.dissent).toHaveLength(1);
    expect(connected?.operation.returnLedger.unknownMemory).toHaveProperty("lamp-district.uninterpreted@1");
  });
});
`;
await writeFile(path.join(ROOT, "tests/world/second-recension-books-1-3.test.ts"), test, "utf8");

await writeFile(path.join(ROOT, "docs/SECOND_RECENSION_BOOKS_I-III_ALIGNMENT.md"), `# Second Recension alignment: Books I-III

**World authority:** exact Arc source plane \`e4e41c7faec9755429c4f6b6f5ab715c5c3d17e5\`.

Rodoh consumes the professionally reviewed Second Recension addenda without registering or implementing Book IV.

- Ilyon carries Book I's Consequence Plane and bounded sector receipt law.
- The Dark Tomb starter and Lamp District carry Book II's Lineage Scar, reproductive overhead, surface sovereignty, Negative Confederation, host, and layered-opening ledgers.
- The Common Ship starter and Relief Circuit carry Book III's expanded profile, public geometry, preparation, connected-operation, and vessel-continuity ledgers.
- \`axm-connected-operation/v1\` preserves optional provenance, decisions, dissent, uncertainty, obligations, and unknown memory.
- First-recension source without the note remains valid and all three source-plane format identifiers remain at \`/1\`.
- Prior Ilyon, Lamp District, and Relief Circuit identities remain historical locators, not aliases.

No Book IV source plane, compiler, receiver, Program number, or runtime branch is present.
`, "utf8");

console.log(JSON.stringify({ oldExpected, actual, legacy }, null, 2));
