export type StorageFailureReason = "quota" | "denied" | "unknown";

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: StorageFailureReason; message: string };

/** Convert browser storage exceptions into a stable, user-facing result. */
export function storageWriteFailure(error: unknown, operation: string): StorageWriteResult {
  const name = error instanceof Error ? error.name : "";
  const reason: StorageFailureReason = name === "QuotaExceededError"
    ? "quota"
    : name === "SecurityError" || name === "NotAllowedError"
      ? "denied"
      : "unknown";
  const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
  return { ok: false, reason, message: `${operation} failed.${detail}` };
}
