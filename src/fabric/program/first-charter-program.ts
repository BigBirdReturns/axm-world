import { CLASSIC_TRIAL_IDS, type ClassicTrialId } from "../classics/catalog.js";

export const FIRST_CHARTER_PROGRAM_FORMAT = "axm-first-charter-program/1" as const;

export type FirstCharterChapterStatus =
  | "playable"
  | "vertical-slice"
  | "queued";

export interface FirstCharterChapter {
  readonly id: string;
  readonly number: number;
  readonly act: "I" | "II" | "III";
  readonly title: string;
  readonly gameForm: string;
  readonly worldBeat: string;
  readonly playerVerb: string;
  readonly consequence: string;
  readonly worldCellId: string;
  readonly template: "canvas" | "threejs";
  readonly status: FirstCharterChapterStatus;
  readonly existingTrialId?: ClassicTrialId;
}

export interface FirstCharterProgramOfRecord {
  readonly format: typeof FIRST_CHARTER_PROGRAM_FORMAT;
  readonly id: "program:first-charter";
  readonly title: "The First Charter";
  readonly worldId: "world:tiny-planet";
  readonly releaseRule: string;
  readonly cadence: {
    readonly candidateIntervalMinutes: 60;
    readonly playableChaptersPerWeek: 5;
    readonly promotionReviewsPerWeek: 1;
  };
  readonly chapterAcceptance: readonly string[];
  readonly chapters: readonly FirstCharterChapter[];
}

export const FIRST_CHARTER_CHAPTERS: readonly FirstCharterChapter[] = [
  {
    id: "chapter:01:balance-of-oaths",
    number: 1,
    act: "I",
    title: "Balance of Oaths",
    gameForm: "paddle duel",
    worldBeat: "Two houses submit their dispute to the Charter.",
    playerVerb: "keep the oath in motion",
    consequence: "restore the Seal of Judgment",
    worldCellId: "cell:archive:judgment",
    template: "canvas",
    status: "playable",
    existingTrialId: "balance-of-oaths",
  },
  {
    id: "chapter:02:wall-of-terms",
    number: 2,
    act: "I",
    title: "Wall of Terms",
    gameForm: "brickbreaker",
    worldBeat: "False clauses seal the living text behind a wall.",
    playerVerb: "break the false terms",
    consequence: "restore the Seal of Clarity",
    worldCellId: "cell:archive:clarity",
    template: "canvas",
    status: "playable",
    existingTrialId: "wall-of-terms",
  },
  {
    id: "chapter:03:serpent-of-memory",
    number: 3,
    act: "I",
    title: "Serpent of Memory",
    gameForm: "grid serpent",
    worldBeat: "The Charter can grow only by carrying what came before.",
    playerVerb: "recover the lost clauses",
    consequence: "restore the Seal of Continuity",
    worldCellId: "cell:archive:continuity",
    template: "canvas",
    status: "playable",
    existingTrialId: "serpent-of-memory",
  },
  {
    id: "chapter:04:swarm-at-the-gate",
    number: 4,
    act: "I",
    title: "Swarm at the Gate",
    gameForm: "fixed shooter",
    worldBeat: "The north gate is attacked before the village can organize.",
    playerVerb: "hold the line",
    consequence: "restore the Seal of Defense",
    worldCellId: "cell:village:north-gate",
    template: "canvas",
    status: "playable",
    existingTrialId: "swarm-at-the-gate",
  },
  {
    id: "chapter:05:courier-beyond-the-charter",
    number: 5,
    act: "I",
    title: "Courier Beyond the Charter",
    gameForm: "vector-space survival",
    worldBeat: "The final seal must survive beyond the world that made it.",
    playerVerb: "carry the seal through the debris field",
    consequence: "restore the Seal of Portability",
    worldCellId: "cell:orbit:courier-lane",
    template: "canvas",
    status: "playable",
    existingTrialId: "courier-beyond-the-charter",
  },
  {
    id: "chapter:06:bridge-of-rain",
    number: 6,
    act: "II",
    title: "Bridge of Rain",
    gameForm: "lane-crossing rescue",
    worldBeat: "Heavy rain divides the north village and strands its families.",
    playerVerb: "cross, repair, and escort",
    consequence: "reconnect the north village and open its market",
    worldCellId: "cell:village:north-bridge",
    template: "canvas",
    status: "vertical-slice",
  },
  {
    id: "chapter:07:market-of-masks",
    number: 7,
    act: "II",
    title: "Market of Masks",
    gameForm: "maze pursuit",
    worldBeat: "Impostors consume the names and obligations that hold the market together.",
    playerVerb: "recover names while evading the masks",
    consequence: "restore named vendors and durable relationships",
    worldCellId: "cell:village:north-market",
    template: "canvas",
    status: "queued",
  },
  {
    id: "chapter:08:orchard-of-sparks",
    number: 8,
    act: "II",
    title: "Orchard of Sparks",
    gameForm: "falling-block irrigation",
    worldBeat: "Storm debris blocks the channels that keep the village alive.",
    playerVerb: "shape falling material into working channels",
    consequence: "restore water, crops, and village resilience",
    worldCellId: "cell:village:north-orchard",
    template: "canvas",
    status: "queued",
  },
  {
    id: "chapter:09:beneath-the-first-stone",
    number: 9,
    act: "III",
    title: "Beneath the First Stone",
    gameForm: "dig-and-defend expedition",
    worldBeat: "An older covenant is discovered below the Charter road.",
    playerVerb: "excavate paths and contain what wakes",
    consequence: "add the buried covenant to the world memory without erasing it",
    worldCellId: "cell:underworld:first-stone",
    template: "canvas",
    status: "queued",
  },
  {
    id: "chapter:10:procession-of-the-unbound",
    number: 10,
    act: "III",
    title: "Procession of the Unbound",
    gameForm: "route-and-escort puzzle",
    worldBeat: "A displaced procession must cross a city whose rules keep changing.",
    playerVerb: "open routes and preserve the procession",
    consequence: "establish a protected route as permanent world law",
    worldCellId: "cell:city:procession-route",
    template: "canvas",
    status: "queued",
  },
  {
    id: "chapter:11:broken-constellation",
    number: 11,
    act: "III",
    title: "The Broken Constellation",
    gameForm: "rescue-and-defense flight",
    worldBeat: "The Charter worlds lose contact as their beacons fail.",
    playerVerb: "rescue couriers and relight the beacons",
    consequence: "join the worlds into a navigable constellation",
    worldCellId: "cell:orbit:broken-constellation",
    template: "canvas",
    status: "queued",
  },
  {
    id: "chapter:12:crown-of-the-charter",
    number: 12,
    act: "III",
    title: "Crown of the Charter",
    gameForm: "three-dimensional action-adventure finale",
    worldBeat: "Every restored seal is tested inside one living world.",
    playerVerb: "travel, fight, judge, repair, and choose",
    consequence: "resolve the First Contract and open the next world branch",
    worldCellId: "cell:capital:charter-crown",
    template: "threejs",
    status: "queued",
  },
] as const;

export const FIRST_CHARTER_PROGRAM: FirstCharterProgramOfRecord = {
  format: FIRST_CHARTER_PROGRAM_FORMAT,
  id: "program:first-charter",
  title: "The First Charter",
  worldId: "world:tiny-planet",
  releaseRule: "A chapter counts only when an ordinary player can start, win or lose, change world state, and reopen the consequence from the same retained world.",
  cadence: {
    candidateIntervalMinutes: 60,
    playableChaptersPerWeek: 5,
    promotionReviewsPerWeek: 1,
  },
  chapterAcceptance: [
    "playable from Rodoh without source editing",
    "keyboard and gamepad semantic controls",
    "ordinary win and loss path",
    "world-state consequence with stable identity",
    "append-only memory event",
    "provider-free replay",
    "one captured thirty-to-sixty-second proof",
  ],
  chapters: FIRST_CHARTER_CHAPTERS,
};

export const FIRST_CHARTER_IMPLEMENTED_TRIAL_IDS = FIRST_CHARTER_CHAPTERS
  .flatMap((chapter) => chapter.existingTrialId ? [chapter.existingTrialId] : []);

export function assertFirstCharterProgram(): void {
  if (FIRST_CHARTER_CHAPTERS.length !== 12) throw new Error("The First Charter program must contain twelve chapters");
  const numbers = FIRST_CHARTER_CHAPTERS.map((chapter) => chapter.number);
  if (numbers.some((number, index) => number !== index + 1)) throw new Error("Chapter numbers must be contiguous from one");
  if (new Set(FIRST_CHARTER_CHAPTERS.map((chapter) => chapter.id)).size !== FIRST_CHARTER_CHAPTERS.length) {
    throw new Error("Chapter ids must be unique");
  }
  if (CLASSIC_TRIAL_IDS.some((trialId) => !FIRST_CHARTER_IMPLEMENTED_TRIAL_IDS.includes(trialId))) {
    throw new Error("Every existing Classic Trial must be admitted into the program of record");
  }
}

assertFirstCharterProgram();
