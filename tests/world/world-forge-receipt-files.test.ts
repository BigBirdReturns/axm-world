import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readContainedFile, readReceiptFile } from "../../scripts/world-forge/receipt-files.js";

const temporary: string[] = [];
afterEach(() => { for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "forge-receipt-"));
  temporary.push(directory);
  const root = join(directory, "assets");
  mkdirSync(join(root, "nested"), { recursive: true });
  const bytes = Buffer.from("local expression bytes");
  writeFileSync(join(root, "nested", "asset.bin"), bytes);
  const receipt = { path: "nested/asset.bin", bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") };
  return { directory, root, bytes, receipt };
}

describe("provider-neutral receipt file boundary", () => {
  it("returns the exact verified bytes with either local separator convention", () => {
    const { root, bytes, receipt } = fixture();
    expect(readReceiptFile(root, receipt)).toEqual(bytes);
    expect(readReceiptFile(root, { ...receipt, path: "nested\\asset.bin" })).toEqual(bytes);
    expect(readReceiptFile(root, { ...receipt, path: "./nested//asset.bin" })).toEqual(bytes);
    writeFileSync(join(root, "..preview"), bytes);
    expect(readContainedFile(root, "..preview")).toEqual(bytes);
  });

  it("refuses changed bytes, incorrect length, malformed digests and missing products", () => {
    const { root, receipt } = fixture();
    expect(() => readReceiptFile(root, { ...receipt, bytes: receipt.bytes + 1 })).toThrow("Byte length mismatch");
    expect(() => readReceiptFile(root, { ...receipt, sha256: "f".repeat(64) })).toThrow("SHA-256 mismatch");
    expect(() => readReceiptFile(root, { ...receipt, sha256: "claimed-pass" })).toThrow("Invalid file receipt");
    expect(() => readReceiptFile(root, { ...receipt, bytes: NaN })).toThrow("Invalid file receipt");
    expect(() => readReceiptFile(root, { ...receipt, path: "missing.bin" })).toThrow();
    writeFileSync(join(root, receipt.path), Buffer.alloc(receipt.bytes));
    expect(() => readReceiptFile(root, receipt)).toThrow("SHA-256 mismatch");
  });

  it.each(["", "../sibling/file", "nested/../../file", "..\\file", "/absolute",
    "C:\\file", "C:file", "\\\\host\\share", "https://host/file", "asset:stream", "file\0"])(
    "refuses non-local or ambiguous receipt path %j", (path) => {
      expect(() => readContainedFile(fixture().root, path)).toThrow("local and relative");
    },
  );

  it("refuses directories and linked sibling-root escapes for assets and previews", () => {
    const { root, directory, bytes, receipt } = fixture();
    expect(() => readContainedFile(root, ".")).toThrow("escapes asset root");
    expect(() => readContainedFile(root, "nested")).toThrow("not a file");
    const sibling = join(directory, "assets-sibling");
    mkdirSync(sibling);
    writeFileSync(join(sibling, "asset.bin"), bytes);
    symlinkSync(sibling, join(root, "escape"), process.platform === "win32" ? "junction" : "dir");
    expect(() => readContainedFile(root, "escape/asset.bin")).toThrow("escapes asset root");
    expect(() => readReceiptFile(root, { ...receipt, path: "escape/asset.bin" })).toThrow("escapes asset root");
  });
});
