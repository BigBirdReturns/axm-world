import type {
  CanonicalStoryAssetReference,
  CanonicalStorySource,
} from "../../canonical-story/index.js";

export const CANONICAL_STORY_ASSET_FILE_MAX_BYTES = 128 * 1024 * 1024;
export const CANONICAL_STORY_ASSET_BATCH_MAX_BYTES = 1024 * 1024 * 1024;

export interface CanonicalStoryHolderFile {
  readonly name: string;
  readonly size: number;
  readonly type?: string;
  readonly webkitRelativePath?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface VerifiedCanonicalStoryAsset {
  asset: CanonicalStoryAssetReference;
  file: CanonicalStoryHolderFile;
  selectedPath: string;
}

export interface CanonicalStoryAssetVerification {
  verified: VerifiedCanonicalStoryAsset[];
  unmatchedPaths: string[];
  verifiedBytes: number;
}

function normalize(pathValue: string): string {
  const value = pathValue.replaceAll("\\", "/").replace(/^\.\//, "");
  if (value.startsWith("/") || /^[A-Za-z]:\//.test(value)) {
    throw new Error(`Selected asset path is absolute: ${pathValue}`);
  }
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) {
    throw new Error(`Selected asset path escapes its root: ${pathValue}`);
  }
  return parts.join("/");
}

function basename(pathValue: string): string {
  return pathValue.slice(pathValue.lastIndexOf("/") + 1);
}

export function canonicalStoryAssets(story: CanonicalStorySource): CanonicalStoryAssetReference[] {
  return story.episodes.flatMap((episode) => episode.chapters)
    .flatMap((chapter) => [
      ...chapter.panels.map((panel) => panel.asset),
      ...chapter.plates.map((plate) => plate.asset),
    ]);
}

function matchAsset(
  storyAssets: readonly CanonicalStoryAssetReference[],
  selectedPath: string,
  fileName: string,
): CanonicalStoryAssetReference | null {
  const exact = storyAssets.filter((asset) =>
    selectedPath === asset.path || selectedPath.endsWith(`/${asset.path}`));
  if (exact.length > 1) {
    throw new Error(`Selected path ${selectedPath} matches more than one canonical asset.`);
  }
  if (exact.length === 1) return exact[0]!;
  const byName = storyAssets.filter((asset) => basename(asset.path) === fileName);
  if (byName.length > 1) {
    throw new Error(`Selected file ${fileName} is ambiguous; select its containing estate directory.`);
  }
  return byName[0] ?? null;
}

export async function sha256Bytes(value: ArrayBuffer | Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  const digest = await subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCanonicalStoryAssetFiles(
  story: CanonicalStorySource,
  files: readonly CanonicalStoryHolderFile[],
): Promise<CanonicalStoryAssetVerification> {
  if (files.length === 0) throw new Error("Select at least one canonical story asset.");
  const assets = canonicalStoryAssets(story);
  const matched = new Map<string, { file: CanonicalStoryHolderFile; selectedPath: string }>();
  const unmatchedPaths: string[] = [];
  let selectedBytes = 0;

  for (const file of files) {
    const selectedPath = normalize(file.webkitRelativePath?.trim() || file.name);
    const asset = matchAsset(assets, selectedPath, file.name);
    if (!asset) {
      unmatchedPaths.push(selectedPath);
      continue;
    }
    if (matched.has(asset.path)) throw new Error(`More than one selected file claims ${asset.path}.`);
    if (file.size > CANONICAL_STORY_ASSET_FILE_MAX_BYTES) {
      throw new Error(`${selectedPath} exceeds the per-file verification ceiling.`);
    }
    selectedBytes += file.size;
    if (selectedBytes > CANONICAL_STORY_ASSET_BATCH_MAX_BYTES) {
      throw new Error("Selected canonical story assets exceed the batch verification ceiling.");
    }
    matched.set(asset.path, { file, selectedPath });
  }

  if (matched.size === 0) throw new Error("None of the selected files match the canonical story asset ledger.");

  const verified: VerifiedCanonicalStoryAsset[] = [];
  const failures: string[] = [];
  for (const asset of assets) {
    const selection = matched.get(asset.path);
    if (!selection) continue;
    if (selection.file.size !== asset.bytes) {
      failures.push(`${asset.path}: expected ${asset.bytes} bytes, received ${selection.file.size}.`);
      continue;
    }
    const digest = await sha256Bytes(await selection.file.arrayBuffer());
    if (digest !== asset.sha256) {
      failures.push(`${asset.path}: SHA-256 does not match the canonical asset receipt.`);
      continue;
    }
    verified.push({ asset, file: selection.file, selectedPath: selection.selectedPath });
  }

  if (failures.length > 0) {
    throw new Error(`Canonical story asset verification refused the selected batch:\n${failures.join("\n")}`);
  }
  return {
    verified,
    unmatchedPaths,
    verifiedBytes: verified.reduce((sum, entry) => sum + entry.asset.bytes, 0),
  };
}
