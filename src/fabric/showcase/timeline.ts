import type {
  CompiledDemonstration,
  DemonstrationChapter,
  DemonstrationEdition,
  DemonstrationProposal,
} from "../../demonstration/contracts.js";
import {
  compileDemonstrationProgram,
  createEditionProposal,
  decodeDemonstrationProposal,
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

export type ShowcaseProposalStatus = "base" | "edition" | "encoded" | "refused";

export interface ShowcaseProgramResolution {
  readonly compiled: CompiledDemonstration<ShowcaseSceneKind, ShowcaseWorldMoment>;
  readonly status: ShowcaseProposalStatus;
  readonly error?: string;
}

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

export function showcaseEditionById(id: string | null): DemonstrationEdition {
  if (id) {
    const edition = SHOWCASE_EDITIONS.find((entry) => entry.id === id);
    if (edition) return edition;
  }
  return SHOWCASE_EDITIONS.find(
    (entry) => entry.id === SHOWCASE_PROGRAM.defaultEditionId,
  ) ?? SHOWCASE_EDITIONS[0]!;
}

export function resolveShowcaseProgram(search: string): ShowcaseProgramResolution {
  const params = new URLSearchParams(search);
  const encoded = params.get("proposal");
  if (encoded) {
    try {
      const proposal = decodeDemonstrationProposal(encoded, SHOWCASE_PROGRAM);
      return {
        compiled: compileShowcaseProgram(proposal),
        status: "encoded",
      };
    } catch (error) {
      return {
        compiled: DEFAULT_SHOWCASE,
        status: "refused",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const requestedEdition = params.get("edition");
  if (requestedEdition) {
    const edition = SHOWCASE_EDITIONS.find((entry) => entry.id === requestedEdition);
    if (!edition) {
      return {
        compiled: DEFAULT_SHOWCASE,
        status: "refused",
        error: `Unknown demonstration edition ${requestedEdition}`,
      };
    }
    return {
      compiled: compileShowcaseProgram(
        createEditionProposal(SHOWCASE_PROGRAM, edition.id),
      ),
      status: "edition",
    };
  }

  return {
    compiled: DEFAULT_SHOWCASE,
    status: "base",
  };
}

const ACTIVE_SEARCH =
  typeof globalThis.location === "undefined" ? "" : globalThis.location.search;

export const ACTIVE_SHOWCASE_RESOLUTION = resolveShowcaseProgram(ACTIVE_SEARCH);
export const ACTIVE_SHOWCASE = ACTIVE_SHOWCASE_RESOLUTION.compiled;
export const SHOWCASE_CHAPTERS: readonly ShowcaseChapter[] =
  ACTIVE_SHOWCASE.chapters;

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
