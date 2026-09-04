import { describe, expect, it } from "vitest";
import { compileShowcaseProgram } from "../../src/fabric/showcase/timeline.js";
import { createDemonstrationRunLedger } from "../../src/fabric/showcase/run-ledger.js";

describe("demonstration run receipt", () => {
  it("records a local bounded event stream without issuing authority", () => {
    let now = Date.parse("2026-09-03T23:00:00.000Z");
    const ledger = createDemonstrationRunLedger(compileShowcaseProgram(), {
      now: () => now,
      sessionId: "demo-session:test",
    });
    ledger.bindDigest("a".repeat(64));
    now += 250;
    ledger.record("showcase.started", "one-world", {
      mode: "presenter",
      unsafe: { ignored: true },
      "bad key": "ignored",
    });
    now += 500;
    ledger.record("chapter.entered", "one-revision", {
      index: 1,
      autoplay: true,
    });
    const receipt = ledger.receipt();

    expect(receipt.format).toBe("axm-demonstration-run-receipt/1");
    expect(receipt.sessionId).toBe("demo-session:test");
    expect(receipt.demonstrationDigest).toBe("a".repeat(64));
    expect(receipt.telemetry).toBe("off");
    expect(receipt.events).toEqual([
      {
        sequence: 1,
        elapsedMs: 250,
        type: "showcase.started",
        chapterId: "one-world",
        data: { mode: "presenter" },
      },
      {
        sequence: 2,
        elapsedMs: 750,
        type: "chapter.entered",
        chapterId: "one-revision",
        data: { index: 1, autoplay: true },
      },
    ]);
    expect(receipt.authority).toEqual({
      telemetrySent: false,
      canonicalWorldMutated: false,
      productAcceptanceIssued: false,
    });
  });

  it("refuses non-SHA digest bindings and caps event growth", () => {
    const ledger = createDemonstrationRunLedger(compileShowcaseProgram(), {
      now: () => 0,
      sessionId: "demo-session:bounded",
      maximumEvents: 16,
    });
    expect(() => ledger.bindDigest("not-a-digest")).toThrow(/SHA-256/u);
    for (let index = 0; index < 40; index += 1) {
      ledger.record("chapter.entered", "one-world", { index });
    }
    expect(ledger.receipt().events).toHaveLength(16);
  });
});
