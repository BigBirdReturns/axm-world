import type { ApertureLevel } from "./aperture-kit-core.mjs";
export type ApertureMode = "map" | "trace" | "surface";
export interface ApertureKitState {
  version?: "1";
  mode: ApertureMode;
  scale: number;
  level: ApertureLevel;
  focus: string | null;
  query: string;
  budget: number;
  pins: string[];
}
export const APERTURE_KIT_STATE_VERSION: "1";
export function apertureStateKeys(prefix?: string): string[];
export function readApertureKitState(input?: string | URLSearchParams, prefix?: string): ApertureKitState | null;
export function writeApertureKitState(state: ApertureKitState, input?: string | URLSearchParams, prefix?: string): URLSearchParams;
export function buildApertureKitUrl(state: ApertureKitState, href: string, prefix?: string): string;
