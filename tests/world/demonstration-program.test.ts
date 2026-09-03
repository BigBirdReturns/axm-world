import { describe, expect, it } from "vitest";
import {
  compileDemonstrationProgram,
  computeDemonstrationDigest,
  createEditionProposal,
  decodeDemonstrationProposal,
  encodeDemonstrationProposal,
  validateDemonstrationProgram,
  validateDemonstrationProposal,
} from "../../src/demonstration/compiler.js";
import { compileNaturalLanguageDirection } from "../../src/demonstration/direction.js";
import {
  DEMONSTRATION_PROPOSAL_FORMAT,
  type DemonstrationProgram,
} from "../../src/demonstration/contracts.js";
import {
  DEFAULT_SHOWCASE,
  SHOWCASE_PROGRAM,
  compileShowcaseProgram,
} from "../../src/fabric/showcase/timeline.js";

const scenes = [
  "hero",
  "projections",
  "make",
  "materialize",
  "classics",
  "memory",
  "providers",
  "custody",
] as const;
const moments = ["root", "star", "village", "rain"] as const;

describe("governed demonstration program", () => {
  it("compiles the executive cut with every claim bound to evidence", () => {
    expect(DEFAULT_SHOWCASE.edition.id).toBe("executive");
    expect(DEFAULT_SHOWCASE.chapters).toHaveLength(8);
    expect(DEFAULT_SHOWCASE.totalDurationMs).toBeGreaterThan(60_000);
    expect(DEFAULT_SHOWCASE.evidence.length).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_SHOWCASE.chapters.every((chapter) => chapter.evidenceRefs.length > 0)).toBe(true);
    expect(DEFAULT_SHOWCASE.policy.runtimeCodeGeneration).toBe(false);
    expect(DEFAULT_SHOWCASE.policy.telemetryDefault).toBe("off");
  });

  it("compiles a bounded social cut without rewriting source claims", () => {
    const proposal = createEditionProposal(SHOWCASE_PROGRAM, "social");
    const compiled = compileShowcaseProgram(proposal);
    expect(compiled.aspect).toBe("9:16");
    expect(compiled.autoplay).toBe(true);
    expect(compiled.clean).toBe(true);
    expect(compiled.chapters.map((chapter) => chapter.id)).toEqual([
      "one-world",
      "say-the-change",
      "world-grows",
      "play-the-story",
      "take-it-home",
    ]);
    expect(compiled.chapters.map((chapter) => chapter.claim)).toEqual(
      SHOWCASE_PROGRAM.chapters
        .filter((chapter) => compiled.chapters.some((entry) => entry.id === chapter.id))
        .map((chapter) => chapter.claim),
    );
  });

  it("round-trips a source-bound proposal through a shareable base64url envelope", () => {
    const direction = compileNaturalLanguageDirection(
      SHOWCASE_PROGRAM,
      "Make a 45 second vertical custody demo, muted, clean, and one pass.",
    );
    const encoded = encodeDemonstrationProposal(direction.proposal);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/u);
    const decoded = decodeDemonstrationProposal(encoded, SHOWCASE_PROGRAM);
    expect(decoded).toEqual(direction.proposal);
    const compiled = compileDemonstrationProgram(SHOWCASE_PROGRAM, decoded);
    expect(compiled.aspect).toBe("9:16");
    expect(compiled.sound).toBe(false);
    expect(compiled.clean).toBe(true);
    expect(compiled.loop).toBe(false);
    expect(compiled.chapters.map((chapter) => chapter.id)).toEqual([
      "one-world",
      "world-remembers",
      "providers-rotate",
      "take-it-home",
    ]);
    expect(compiled.totalDurationMs).toBeGreaterThanOrEqual(40_000);
    expect(compiled.totalDurationMs).toBeLessThanOrEqual(50_000);
  });

  it("produces stable digests and changes them when the bounded cut changes", async () => {
    const executive = compileShowcaseProgram();
    const proof = compileShowcaseProgram(createEditionProposal(SHOWCASE_PROGRAM, "proof"));
    const first = await computeDemonstrationDigest(executive);
    const second = await computeDemonstrationDigest(executive);
    const changed = await computeDemonstrationDigest(proof);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(second).toBe(first);
    expect(changed).not.toBe(first);
  });

  it("refuses a chapter whose claim has no resolvable evidence", () => {
    const tampered = structuredClone(SHOWCASE_PROGRAM) as any;
    tampered.chapters[0].evidenceRefs = ["evidence:invented"];
    expect(() => validateDemonstrationProgram(tampered, {
      allowedScenes: scenes,
      allowedWorldMoments: moments,
    })).toThrow(/unknown evidence/u);
  });

  it("refuses a new rendering adapter hidden inside a program revision", () => {
    const tampered = structuredClone(SHOWCASE_PROGRAM) as any;
    tampered.chapters[0].scene = "arbitrary-generated-code";
    expect(() => validateDemonstrationProgram(tampered, {
      allowedScenes: scenes,
      allowedWorldMoments: moments,
    })).toThrow(/must be one of/u);
  });

  it("refuses policy drift that would let a provider rewrite claims", () => {
    const tampered = structuredClone(SHOWCASE_PROGRAM) as any;
    tampered.policy.claimTextMutable = true;
    expect(() => validateDemonstrationProgram(tampered, {
      allowedScenes: scenes,
      allowedWorldMoments: moments,
    })).toThrow(/claimTextMutable/u);
  });

  it("refuses proposal fields outside the bounded direction surface", () => {
    const proposal = {
      format: DEMONSTRATION_PROPOSAL_FORMAT,
      id: "proposal:tampered",
      programId: SHOWCASE_PROGRAM.id,
      baseVersion: SHOWCASE_PROGRAM.version,
      editionId: "executive",
      claimOverride: "Trust the generated claim",
    };
    expect(() => validateDemonstrationProposal(proposal, SHOWCASE_PROGRAM))
      .toThrow(/unsupported field claimOverride/u);
  });

  it("refuses stale proposals after the source program version moves", () => {
    const proposal = {
      ...createEditionProposal(SHOWCASE_PROGRAM),
      baseVersion: "0.9.0",
    };
    expect(() => compileDemonstrationProgram(
      SHOWCASE_PROGRAM as DemonstrationProgram,
      proposal,
    )).toThrow(/expected 1\.0\.0/u);
  });
});
