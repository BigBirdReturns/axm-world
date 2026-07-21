import fs from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("offline constitutional runtime", () => {
  it("boots with no third-party font or asset dependency", () => {
    const html = read("index.html");
    expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic|https?:\/\//i);
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("rodoh-mark.svg");
  });

  it("ships an installable same-origin manifest", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as Record<string, unknown>;
    expect(manifest["name"]).toBe("Rodoh Cartridge Runtime");
    expect(manifest["start_url"]).toBe("./");
    expect(manifest["scope"]).toBe("./");
    expect(manifest["display"]).toBe("standalone");
    expect(JSON.stringify(manifest)).not.toMatch(/https?:\/\//i);
  });

  it("registers an offline shell that refuses cross-origin caching and never interprets cartridge state", () => {
    const entry = read("src/game/main.tsx");
    const worker = read("public/service-worker.js");
    expect(entry).toContain("navigator.serviceWorker.register");
    expect(entry).toContain("document.baseURI");
    expect(worker).toContain("url.origin !== self.location.origin");
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain("caches.match");
    expect(worker).not.toMatch(/localStorage|cartridgeDigest|runCycle|ledger/i);
  });
});
