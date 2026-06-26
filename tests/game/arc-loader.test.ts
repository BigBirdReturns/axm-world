import { describe, it, expect } from "vitest";
import { arcUrlParam, fetchArcText, MAX_ARC_BYTES } from "../../src/game/lib/arc-loader.js";

// A stub matching the slice of `fetch`/`Response` the loader actually uses.
function stubResponse(opts: {
  ok: boolean;
  status?: number;
  statusText?: string;
  text?: string;
  throwOnText?: boolean;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    statusText: opts.statusText ?? "",
    text: async () => {
      if (opts.throwOnText) throw new Error("stream broke");
      return opts.text ?? "";
    },
  } as unknown as Response;
}

describe("arcUrlParam", () => {
  it("extracts the arc param", () => {
    expect(arcUrlParam("?arc=https://example.com/a.json")).toBe("https://example.com/a.json");
  });

  it("trims surrounding whitespace", () => {
    expect(arcUrlParam("?arc=%20https://example.com/a.json%20")).toBe("https://example.com/a.json");
  });

  it("returns null when the param is absent", () => {
    expect(arcUrlParam("?foo=bar")).toBeNull();
    expect(arcUrlParam("")).toBeNull();
  });

  it("returns null when the param is empty", () => {
    expect(arcUrlParam("?arc=")).toBeNull();
    expect(arcUrlParam("?arc=%20%20")).toBeNull();
  });

  it("works with a leading-questionmark-less search string", () => {
    expect(arcUrlParam("arc=https://example.com/a.json")).toBe("https://example.com/a.json");
  });
});

describe("fetchArcText", () => {
  it("returns body text on a 200", async () => {
    const fetchImpl = (async () => stubResponse({ ok: true, text: '{"hello":1}' })) as unknown as typeof fetch;
    const result = await fetchArcText("https://example.com/a.json", fetchImpl);
    expect(result).toEqual({ ok: true, text: '{"hello":1}' });
  });

  it("rejects a non-http(s) scheme without fetching", async () => {
    let called = false;
    const fetchImpl = (async () => { called = true; return stubResponse({ ok: true }); }) as unknown as typeof fetch;
    const result = await fetchArcText("file:///etc/passwd", fetchImpl);
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Unsupported URL scheme/);
  });

  it("rejects an unparseable URL", async () => {
    const result = await fetchArcText("not a url", (async () => stubResponse({ ok: true })) as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Not a valid URL/);
  });

  it("surfaces a network error as a string instead of throwing", async () => {
    const fetchImpl = (async () => { throw new Error("ENOTFOUND"); }) as unknown as typeof fetch;
    const result = await fetchArcText("https://example.com/a.json", fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Network error.*ENOTFOUND/);
  });

  it("surfaces a non-OK HTTP status", async () => {
    const fetchImpl = (async () => stubResponse({ ok: false, status: 404, statusText: "Not Found" })) as unknown as typeof fetch;
    const result = await fetchArcText("https://example.com/missing.json", fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/HTTP 404 Not Found/);
  });

  it("surfaces a body-read failure", async () => {
    const fetchImpl = (async () => stubResponse({ ok: true, throwOnText: true })) as unknown as typeof fetch;
    const result = await fetchArcText("https://example.com/a.json", fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Could not read response body/);
  });

  it("rejects an oversized payload", async () => {
    const huge = "x".repeat(MAX_ARC_BYTES + 1);
    const fetchImpl = (async () => stubResponse({ ok: true, text: huge })) as unknown as typeof fetch;
    const result = await fetchArcText("https://example.com/big.json", fetchImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/too large/);
  });
});
