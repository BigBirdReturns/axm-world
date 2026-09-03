export const DEMONSTRATION_PROGRAM_FORMAT = "axm-demonstration-program/1" as const;
export const DEMONSTRATION_PROPOSAL_FORMAT = "axm-demonstration-proposal/1" as const;
export const DEMONSTRATION_RUN_RECEIPT_FORMAT = "axm-demonstration-run-receipt/1" as const;

export type DemonstrationAspect = "16:9" | "4:5" | "9:16";
export type DemonstrationEvidenceKind =
  | "runtime"
  | "source"
  | "workflow"
  | "artifact"
  | "boundary";

export interface DemonstrationEvidence {
  readonly id: string;
  readonly kind: DemonstrationEvidenceKind;
  readonly tier: string;
  readonly title: string;
  readonly claim: string;
  readonly locator: string;
}

export interface DemonstrationChapter<
  TScene extends string = string,
  TWorldMoment extends string = string,
> {
  readonly id: string;
  readonly indexLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly claim: string;
  readonly scene: TScene;
  readonly durationMs: number;
  readonly worldMoment: TWorldMoment;
  readonly evidenceRefs: readonly string[];
  readonly focusTags: readonly string[];
}

export interface DemonstrationEdition {
  readonly id: string;
  readonly label: string;
  readonly audience: string;
  readonly summary: string;
  readonly chapterIds: readonly string[];
  readonly durationScale: number;
  readonly autoplay: boolean;
  readonly loop: boolean;
  readonly clean: boolean;
  readonly sound: boolean;
  readonly aspect: DemonstrationAspect;
}

export interface DemonstrationPolicy {
  readonly proposalOnly: true;
  readonly claimTextMutable: false;
  readonly evidenceMutable: false;
  readonly runtimeCodeGeneration: false;
  readonly providerRuntimeDependency: false;
  readonly telemetryDefault: "off";
  readonly publishDefault: "local";
}

export interface DemonstrationProgram<
  TScene extends string = string,
  TWorldMoment extends string = string,
> {
  readonly format: typeof DEMONSTRATION_PROGRAM_FORMAT;
  readonly id: string;
  readonly version: string;
  readonly productId: string;
  readonly title: string;
  readonly description: string;
  readonly defaultEditionId: string;
  readonly evidence: readonly DemonstrationEvidence[];
  readonly chapters: readonly DemonstrationChapter<TScene, TWorldMoment>[];
  readonly editions: readonly DemonstrationEdition[];
  readonly policy: DemonstrationPolicy;
}

export interface DemonstrationProposal {
  readonly format: typeof DEMONSTRATION_PROPOSAL_FORMAT;
  readonly id: string;
  readonly programId: string;
  readonly baseVersion: string;
  readonly editionId: string;
  readonly chapterIds?: readonly string[];
  readonly durationScale?: number;
  readonly autoplay?: boolean;
  readonly loop?: boolean;
  readonly clean?: boolean;
  readonly sound?: boolean;
  readonly aspect?: DemonstrationAspect;
  readonly focus?: string;
  readonly direction?: string;
}

export interface CompiledDemonstration<
  TScene extends string = string,
  TWorldMoment extends string = string,
> {
  readonly programId: string;
  readonly programVersion: string;
  readonly productId: string;
  readonly title: string;
  readonly edition: DemonstrationEdition;
  readonly proposal: DemonstrationProposal;
  readonly chapters: readonly DemonstrationChapter<TScene, TWorldMoment>[];
  readonly evidence: readonly DemonstrationEvidence[];
  readonly totalDurationMs: number;
  readonly autoplay: boolean;
  readonly loop: boolean;
  readonly clean: boolean;
  readonly sound: boolean;
  readonly aspect: DemonstrationAspect;
  readonly policy: DemonstrationPolicy;
}

export interface DemonstrationValidationOptions<
  TScene extends string = string,
  TWorldMoment extends string = string,
> {
  readonly allowedScenes: readonly TScene[];
  readonly allowedWorldMoments: readonly TWorldMoment[];
  readonly minimumChapterDurationMs?: number;
  readonly maximumChapterDurationMs?: number;
}

export interface DirectionCompilation {
  readonly proposal: DemonstrationProposal;
  readonly matchedControls: readonly string[];
  readonly warnings: readonly string[];
}
