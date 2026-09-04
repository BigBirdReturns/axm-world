import {
  DEMONSTRATION_RUN_RECEIPT_FORMAT,
  type CompiledDemonstration,
} from "../../demonstration/contracts.js";

export type DemonstrationRunEventType =
  | "studio.opened"
  | "direction.compiled"
  | "proposal.revised"
  | "version.saved"
  | "version.restored"
  | "link.copied"
  | "publication.exported"
  | "showcase.started"
  | "chapter.entered"
  | "showcase.paused"
  | "showcase.resumed"
  | "showcase.completed"
  | "evidence.opened";

export interface DemonstrationRunEvent {
  readonly sequence: number;
  readonly elapsedMs: number;
  readonly type: DemonstrationRunEventType;
  readonly chapterId?: string;
  readonly data?: Readonly<Record<string, string | number | boolean>>;
}

export interface DemonstrationRunReceipt {
  readonly format: typeof DEMONSTRATION_RUN_RECEIPT_FORMAT;
  readonly sessionId: string;
  readonly programId: string;
  readonly programVersion: string;
  readonly proposalId: string;
  readonly editionId: string;
  readonly demonstrationDigest: string | null;
  readonly startedAt: string;
  readonly exportedAt: string;
  readonly telemetry: "off";
  readonly events: readonly DemonstrationRunEvent[];
  readonly authority: {
    readonly telemetrySent: false;
    readonly canonicalWorldMutated: false;
    readonly productAcceptanceIssued: false;
  };
}

export interface DemonstrationRunLedger {
  readonly sessionId: string;
  bindDigest(digest: string): void;
  record(
    type: DemonstrationRunEventType,
    chapterId?: string,
    data?: Readonly<Record<string, unknown>>,
  ): void;
  receipt(): DemonstrationRunReceipt;
}

export interface DemonstrationRunLedgerOptions {
  readonly now?: () => number;
  readonly sessionId?: string;
  readonly maximumEvents?: number;
}

function makeSessionId(): string {
  if (globalThis.crypto?.randomUUID) {
    return `demo-session:${globalThis.crypto.randomUUID().toLowerCase()}`;
  }
  return `demo-session:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeData(
  input: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, string | number | boolean>> | undefined {
  if (!input) return undefined;
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input).slice(0, 16)) {
    if (!/^[a-z0-9][a-z0-9._:-]{0,63}$/u.test(key)) continue;
    if (typeof value === "string") output[key] = value.slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "boolean") output[key] = value;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

export function createDemonstrationRunLedger(
  compiled: CompiledDemonstration,
  options: DemonstrationRunLedgerOptions = {},
): DemonstrationRunLedger {
  const now = options.now ?? (() => Date.now());
  const maximumEvents = Math.max(16, Math.min(2_048, options.maximumEvents ?? 512));
  const started = now();
  const startedAt = new Date(started).toISOString();
  const sessionId = options.sessionId ?? makeSessionId();
  const events: DemonstrationRunEvent[] = [];
  let demonstrationDigest: string | null = null;

  return {
    sessionId,
    bindDigest(digest) {
      if (!/^[0-9a-f]{64}$/u.test(digest)) {
        throw new Error("Demonstration digest must be lowercase SHA-256");
      }
      demonstrationDigest = digest;
    },
    record(type, chapterId, data) {
      if (events.length >= maximumEvents) return;
      const safeData = sanitizeData(data);
      events.push({
        sequence: events.length + 1,
        elapsedMs: Math.max(0, Math.round(now() - started)),
        type,
        ...(chapterId ? { chapterId: chapterId.slice(0, 128) } : {}),
        ...(safeData ? { data: safeData } : {}),
      });
    },
    receipt() {
      return {
        format: DEMONSTRATION_RUN_RECEIPT_FORMAT,
        sessionId,
        programId: compiled.programId,
        programVersion: compiled.programVersion,
        proposalId: compiled.proposal.id,
        editionId: compiled.edition.id,
        demonstrationDigest,
        startedAt,
        exportedAt: new Date(now()).toISOString(),
        telemetry: "off",
        events: structuredClone(events),
        authority: {
          telemetrySent: false,
          canonicalWorldMutated: false,
          productAcceptanceIssued: false,
        },
      };
    },
  };
}

export function downloadJson(
  filename: string,
  value: unknown,
): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
