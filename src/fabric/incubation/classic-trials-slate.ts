import {
  CLASSIC_TRIALS,
  type ClassicTrialId,
} from "../classics/catalog.js";

export const ARCADE_INCUBATION_SLATE_FORMAT =
  "axm-arcade-incubation-slate/1" as const;

export interface ArcadePrototypeCandidate {
  readonly id: `candidate:${ClassicTrialId}`;
  readonly trialId: ClassicTrialId;
  readonly title: string;
  readonly mechanic: string;
  readonly implementationStatus: "playable-prototype";
  readonly canonicalWorldAssignment: null;
  readonly programOfRecordStanding: false;
  readonly programOfRecordStrategyTitle: false;
  readonly arcConsequenceAuthority: "none";
  readonly productAcceptance: "not-issued";
}

export interface ArcadeIncubationSlate {
  readonly format: typeof ARCADE_INCUBATION_SLATE_FORMAT;
  readonly id: "slate:classic-trials-prototypes";
  readonly purpose: string;
  readonly candidates: readonly ArcadePrototypeCandidate[];
}

export const CLASSIC_TRIALS_INCUBATION_SLATE: ArcadeIncubationSlate = {
  format: ARCADE_INCUBATION_SLATE_FORMAT,
  id: "slate:classic-trials-prototypes",
  purpose:
    "Retain executable arcade mechanics as unassigned prototype candidates without inventing cartridge canon, ProgramOfRecord standing, or PROGRAM OF RECORD title identity.",
  candidates: CLASSIC_TRIALS.map((trial) => ({
    id: `candidate:${trial.id}`,
    trialId: trial.id,
    title: trial.title,
    mechanic: trial.mechanic,
    implementationStatus: "playable-prototype",
    canonicalWorldAssignment: null,
    programOfRecordStanding: false,
    programOfRecordStrategyTitle: false,
    arcConsequenceAuthority: "none",
    productAcceptance: "not-issued",
  })),
};

export function assertClassicTrialsIncubationSlate(): void {
  if (CLASSIC_TRIALS_INCUBATION_SLATE.candidates.length !== CLASSIC_TRIALS.length) {
    throw new Error("Every retained Classic Trial prototype must appear in the incubation slate");
  }
  for (const candidate of CLASSIC_TRIALS_INCUBATION_SLATE.candidates) {
    if (candidate.canonicalWorldAssignment !== null) {
      throw new Error(`Prototype ${candidate.id} acquired an unreviewed world assignment`);
    }
    if (candidate.programOfRecordStanding || candidate.programOfRecordStrategyTitle) {
      throw new Error(`Prototype ${candidate.id} acquired invalid Program of Record identity`);
    }
    if (candidate.arcConsequenceAuthority !== "none") {
      throw new Error(`Prototype ${candidate.id} acquired unissued ARC authority`);
    }
  }
}

assertClassicTrialsIncubationSlate();
