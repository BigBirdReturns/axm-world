import type {
  CompiledDemonstration,
  DemonstrationChapter,
  DemonstrationEdition,
  DemonstrationProposal,
} from "../../demonstration/contracts.js";
import {
  compileDemonstrationProgram,
  createEditionProposal,
  validateDemonstrationProgram,
} from "../../demonstration/compiler.js";
import rawShowcaseProgram from "./first-charter-showcase.program.json";

export type ShowcaseSceneKind =
  | "hero"
  | "projections"
  | "make"
  | "materialize"
  | "classics"
  | "memory"
  | "providers"
  | "custody";

export type ShowcaseWorldMoment = "root" | "star" | "village" | "rain";

export type ShowcaseChapter = DemonstrationChapter<
  ShowcaseSceneKind,
  ShowcaseWorldMoment
>;

const SHOWCASE_SCENES: readonly ShowcaseSceneKind[] = [
  "hero",
  "projections",
  "make",
  "materialize",
  "classics",
  "memory",
  "providers",
  "custody",
];

const SHOWCASE_WORLD_MOMENTS: readonly ShowcaseWorldMoment[] = [
  "root",
  "star",
  "village",
  "rain",
];

export const SHOWCASE_PROGRAM = validateDemonstrationProgram(
  rawShowcaseProgram,
  {
    allowedScenes: SHOWCASE_SCENES,
    allowedWorldMoments: SHOWCASE_WORLD_MOMENTS,
  },
);

export const SHOWCASE_EDITIONS: readonly DemonstrationEdition[] =
  SHOWCASE_PROGRAM.editions;

export const DEFAULT_SHOWCASE_PROPOSAL = createEditionProposal(
  SHOWCASE_PROGRAM,
  SHOWCASE_PROGRAM.defaultEditionId,
);

export function compileShowcaseProgram(
  proposal: DemonstrationProposal = DEFAULT_SHOWCASE_PROPOSAL,
): CompiledDemonstration<ShowcaseSceneKind, ShowcaseWorldMoment> {
  return compileDemonstrationProgram(SHOWCASE_PROGRAM, proposal);
}

export const DEFAULT_SHOWCASE = compileShowcaseProgram();

export const SHOWCASE_CHAPTERS: readonly ShowcaseChapter[] =
  DEFAULT_SHOWCASE.chapters;

export function showcaseEditionById(id: string | null): DemonstrationEdition {
  if (id) {
    const edition = SHOWCASE_EDITIONS.find((entry) => entry.id === id);
    if (edition) return edition;
  }
  return SHOWCASE_EDITIONS.find(
    (entry) => entry.id === SHOWCASE_PROGRAM.defaultEditionId,
  ) ?? SHOWCASE_EDITIONS[0]!;
}

export function clampShowcaseIndex(
  index: number,
  chapters: readonly ShowcaseChapter[] = SHOWCASE_CHAPTERS,
): number {
  return Math.min(chapters.length - 1, Math.max(0, index));
}

export function chapterIndexById(
  id: string | null,
  chapters: readonly ShowcaseChapter[] = SHOWCASE_CHAPTERS,
): number {
  if (!id) return 0;
  const index = chapters.findIndex((chapter) => chapter.id === id);
  return index < 0 ? 0 : index;
}
