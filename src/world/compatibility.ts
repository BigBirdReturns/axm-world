import type { CartridgeManifest } from "./cartridge.js";
import { LEDGER_SCHEMA_VERSION } from "./ledger.js";
import { SAVE_SCHEMA_VERSION } from "./save.js";

export const RUNTIME_ENGINE_VERSION = "1.0.0";
export const RUN_FORMAT_VERSION = "axm-cartridge-run/v2" as const;

export type CompatibilityStatus = "compatible" | "runtime-too-old" | "migration-required" | "unknown";

export interface CompatibilityReceipt {
  status: CompatibilityStatus;
  policy: "same-major";
  authoredEngineVersion: string;
  runtimeEngineVersion: string;
  cartridgeVersion: number;
  runFormat: typeof RUN_FORMAT_VERSION;
  saveSchemaVersion: number;
  ledgerSchemaVersion: number;
  guarantee: string;
}

function semverParts(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compareVersion(a: [number, number, number], b: [number, number, number]): number {
  for (let index = 0; index < 3; index++) {
    const difference = a[index]! - b[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export function compatibilityReceipt(manifest: CartridgeManifest, runtimeEngineVersion = RUNTIME_ENGINE_VERSION): CompatibilityReceipt {
  const required = semverParts(manifest.engineVersion);
  const runtime = semverParts(runtimeEngineVersion);
  let status: CompatibilityStatus = "unknown";
  if (required && runtime) {
    status = required[0] !== runtime[0]
      ? "migration-required"
      : compareVersion(runtime, required) < 0
        ? "runtime-too-old"
        : "compatible";
  }
  return {
    status,
    policy: "same-major",
    authoredEngineVersion: manifest.engineVersion,
    runtimeEngineVersion,
    cartridgeVersion: manifest.cartridgeVersion,
    runFormat: RUN_FORMAT_VERSION,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    ledgerSchemaVersion: LEDGER_SCHEMA_VERSION,
    guarantee: "Inspectable export and reload within the declared same-major engine contract; major-version migration is not implied.",
  };
}
