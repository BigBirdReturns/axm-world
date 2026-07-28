import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const DEMO = resolve(ROOT, "demos/underdrain-draft");
const SOURCE = resolve(DEMO, "source");
const HTML = [
  readFileSync(resolve(SOURCE, "head.html"), "utf8"),
  readFileSync(resolve(SOURCE, "body.html"), "utf8"),
  readFileSync(resolve(SOURCE, "authoring-block.html"), "utf8"),
  "<script>",
  readFileSync(resolve(SOURCE, "app-01.js"), "utf8"),
  readFileSync(resolve(SOURCE, "app-02.js"), "utf8"),
  "</script>",
  readFileSync(resolve(SOURCE, "tail.html"), "utf8"),
].join("");
const AUTHORING_BYTES = readFileSync(resolve(DEMO, "authoring.json"));
const AUTHORING = JSON.parse(AUTHORING_BYTES.toString("utf8"));
const PLAYTEST = JSON.parse(readFileSync(resolve(DEMO, "playtest.json"), "utf8"));

describe("UNDERDRAIN standalone demo", () => {
  it("rebuilds one exact executable file with no remote runtime or dynamic code", () => {
    expect(createHash("sha256").update(HTML).digest("hex")).toBe(
      "1a1993a726dffbe5e95f122127b74eef9af49f82cf57f78fb5b3c7af8eb78aee",
    );
    expect(HTML).not.toMatch(/<script[^>]+src=/i);
    expect(HTML).not.toMatch(/<link[^>]+stylesheet/i);
    expect(HTML).not.toMatch(/https?:\/\//i);
    expect(HTML).not.toMatch(/\bfetch\s*\(/);
    expect(HTML).not.toMatch(/\bWebSocket\b|\bEventSource\b|\bserviceWorker\b/);
    expect(HTML).not.toMatch(/\bMath\.random\b|\beval\s*\(|\bnew Function\b/);
    const scripts = [...HTML.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    const executable = scripts.find((entry) => !/application\/json/.test(entry[1]))?.[2];
    expect(executable).toBeTruthy();
    expect(() => new Script(executable!, { filename: "underdrain-inline.js" })).not.toThrow();
  });

  it("mirrors the exact Arc authoring manifest", () => {
    const match = HTML.match(/<script id="underdrain-authoring" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual(AUTHORING);
    expect(createHash("sha256").update(AUTHORING_BYTES).digest("hex")).toBe(
      "6703fe3e424a41d1f86d46ed32bc48c9306676aa0d4336561edf462140fb3bbf",
    );
    expect(AUTHORING).toMatchObject({
      format: "rodoh-underdrain-standalone/1",
      id: "underdrain-draft",
      arcAuthority: "axm-action-receipt/1",
      narrativeAuthority: "axm-narrative-rails/1",
      actionProfile: {
        format: "axm-action-profile/1",
        encounters: { "breach-crown-pump": { arenaKit: "lane", playerKit: "hammer", durationSeconds: 90 } },
      },
      seriesConstitution: {
        noCleanReset: true,
        bPlotMustCollide: true,
        acceptedOutcomeCannotBeReinterpreted: true,
      },
    });
  });

  it("keeps execution deterministic, accessible, and provisional", () => {
    for (const marker of [
      "const TICK_RATE=30",
      'authority:"Arc replay required"',
      "campaignEffect:null",
      "prefers-reduced-motion",
      'data-hold="attack"',
      'data-hold="interact"',
      "rodoh-underdrain-provisional-run/1",
      "acttrace1_",
      "actstate1_",
      "provrun1_",
    ]) expect(HTML).toContain(marker);
    expect(HTML).toContain("A-plot / B-plot collision");
    expect(HTML.match(/class="beat"/g)).toHaveLength(7);
    expect(HTML.match(/class="strategy/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("retains the balanced nine-case playtest receipt", () => {
    expect(PLAYTEST).toMatchObject({
      format: "rodoh-underdrain-playtest/1",
      status: "pass",
      summary: { runs: 9, success: 8, partials: 1, failures: 0, medianTicks: 696 },
      checks: {
        deterministicFixedStep: true,
        noExternalRuntime: true,
        touchControlsPresent: true,
        reducedMotionPresent: true,
        receiptAuthority: "Arc replay required",
        campaignEffect: null,
      },
    });
    expect(new Set(PLAYTEST.cases.map((entry: { strategy: string }) => entry.strategy))).toEqual(
      new Set(["emergency-plan", "service-tunnel", "truce-offer"]),
    );
    expect(new Set(PLAYTEST.cases.map((entry: { seed: number }) => entry.seed))).toEqual(
      new Set([1337, 2026, 4242]),
    );
  });
});
