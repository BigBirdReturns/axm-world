import type { InfiniteFabricWorld } from "../contracts.js";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable in this runtime");
  }
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeWorldRevisionSha256(world: InfiniteFabricWorld): Promise<string> {
  const payload: InfiniteFabricWorld = structuredClone(world);
  payload.revisionSha256 = "0".repeat(64);
  return sha256Hex(canonicalJson(payload));
}

export async function sealWorldRevision(world: InfiniteFabricWorld): Promise<InfiniteFabricWorld> {
  const sealed: InfiniteFabricWorld = structuredClone(world);
  sealed.revisionSha256 = await computeWorldRevisionSha256(sealed);
  return sealed;
}
