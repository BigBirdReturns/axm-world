import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Transport-only receipt: neither file integrity nor materialization grants approval. */
export interface ReceiptFile {
  path: string;
  sha256: string;
  bytes: number;
}

/** Read a local file after lexical and real-path containment checks.
 * The caller must keep the asset tree stable during audit (no concurrent writers).
 */
export function readContainedFile(root: string, path: string): Buffer {
  // Check both separator conventions even when auditing a Windows pack on Unix.
  const parts = path.split(/[\\/]/);
  if (!path || /[:\u0000-\u001f]/.test(path) || /^[\\/]/.test(path)
    || parts.some((part) => part === "..")) {
    throw new Error(`Receipt path must be local and relative: ${path}`);
  }
  const realRoot = realpathSync(root);
  const candidate = realpathSync(resolve(realRoot, ...parts));
  const rel = relative(realRoot, candidate);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Receipt path escapes asset root: ${path}`);
  }
  if (!statSync(candidate).isFile()) throw new Error(`Receipt path is not a file: ${path}`);
  return readFileSync(candidate);
}

/** Verify the returned bytes, not a producer's claimed status or source label. */
export function readReceiptFile(root: string, receipt: ReceiptFile): Buffer {
  if (!Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0
    || !/^[0-9a-f]{64}$/.test(receipt.sha256)) {
    throw new Error(`Invalid file receipt: ${receipt.path}`);
  }
  const bytes = readContainedFile(root, receipt.path);
  if (bytes.length !== receipt.bytes) throw new Error(`Byte length mismatch for ${receipt.path}`);
  if (createHash("sha256").update(bytes).digest("hex") !== receipt.sha256) {
    throw new Error(`SHA-256 mismatch for ${receipt.path}`);
  }
  return bytes;
}
