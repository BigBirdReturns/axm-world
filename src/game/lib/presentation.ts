import type { Arc } from "../../engine/types.js";

export type PresentationId = "table" | "map" | "globe";

export interface PresentationOption {
  id: PresentationId;
  label: string;
  shortLabel: string;
  description: string;
  dimensionality: "2D" | "2.5D" | "3D";
  bestFor: string;
}

export const PRESENTATION_OPTIONS: PresentationOption[] = [
  {
    id: "table",
    label: "Charter Table",
    shortLabel: "2.5D Board",
    description: "A tilt-shift contract board: 3D-rendered, 2D-played, and built for management arcs.",
    dimensionality: "2.5D",
    bestFor: "Management, roster pressure, readable contract routes",
  },
  {
    id: "map",
    label: "Flat Map",
    shortLabel: "2D Map",
    description: "The fastest paper-map view over the same compiled PlayScene.",
    dimensionality: "2D",
    bestFor: "Debugging arcs, accessibility, instant scanning",
  },
  {
    id: "globe",
    label: "Globe",
    shortLabel: "3D Globe",
    description: "A spatial world view for arcs where traversal and place are the point.",
    dimensionality: "3D",
    bestFor: "Exploration, delivery routes, spatial adventures",
  },
];

const PRESENTATION_KEY = "axm-arc:presentation:v1";

export function presentationOption(id: PresentationId): PresentationOption {
  return PRESENTATION_OPTIONS.find((option) => option.id === id) ?? PRESENTATION_OPTIONS[0]!;
}

export function isPresentationId(value: string | null | undefined): value is PresentationId {
  return value === "table" || value === "map" || value === "globe";
}

export function preferredPresentationForArc(arc: Arc): PresentationId {
  const challengeCount = arc.challenges.length;
  const tierCount = arc.progressionTiers.length;
  const hasProgressionBoard = challengeCount > 1 && tierCount > 0;
  return hasProgressionBoard ? "table" : "map";
}

export function loadPresentationPreference(arc: Arc): PresentationId {
  try {
    const saved = localStorage.getItem(`${PRESENTATION_KEY}:${arc.meta.id}`);
    if (isPresentationId(saved)) return saved;
  } catch { /* noop */ }
  return preferredPresentationForArc(arc);
}

export function savePresentationPreference(arc: Arc, presentation: PresentationId): void {
  try {
    localStorage.setItem(`${PRESENTATION_KEY}:${arc.meta.id}`, presentation);
  } catch { /* noop */ }
}
