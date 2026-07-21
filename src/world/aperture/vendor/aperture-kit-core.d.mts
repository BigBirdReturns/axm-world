export type ApertureLevel = "corpus" | "machine" | "surface" | "evidence";
export const APERTURE_KIT_VERSION: "1";
export const APERTURE_LEVELS: readonly ApertureLevel[];
export const APERTURE_SCALE_BOUNDS: Readonly<{ minimum: number; maximum: number }>;
export function semanticLevelForScale(scale: number, previousLevel?: ApertureLevel | null): ApertureLevel;
export function stableRingPosition(index: number, count: number, centerX: number, centerY: number, radiusX: number, radiusY?: number, phase?: number): { x: number; y: number; angle: number };
export function normalizedPins(value: string | string[], maximum?: number): string[];
export function selectBudgetedItems<T>(items: T[], options?: {
  query?: string;
  budget?: number;
  pinnedIds?: string[] | Set<string>;
  idFor?: (item: T) => string;
  textFor?: (item: T) => string;
  eligible?: (item: T) => boolean;
  compare?: (left: T, right: T) => number;
}): { visible: T[]; totalCount: number; eligibleCount: number; hiddenByBudget: number; filteredOut: number; ineligibleCount: number };
