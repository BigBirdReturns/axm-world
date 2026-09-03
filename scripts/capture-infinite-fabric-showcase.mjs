import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SHOWCASE_BASE_URL ?? "http://127.0.0.1:5173";
const outputRoot = resolve(process.env.SHOWCASE_CAPTURE_DIR ?? "showcase-capture");
const videoScratch = resolve(outputRoot, "video-scratch");

const chapters = [
  "one-world",
  "one-revision",
  "say-the-change",
  "world-grows",
  "play-the-story",
  "world-remembers",
  "providers-rotate",
  "take-it-home",
];
const chapterCaptureMs = [2400, 1900, 5400, 2400, 5400, 2400, 2200, 2400];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(videoScratch, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  colorScheme: "dark",
  reducedMotion: "no-preference",
  recordVideo: {
    dir: videoScratch,
    size: { width: 1920, height: 1080 },
  },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

// Capture owns chapter timing. Starting with autoplay disabled prevents network and
// cold WebGL initialization from advancing past the first chapter before the
// recorder has established custody of the timeline.
await page.goto(`${baseUrl}/showcase.html?autoplay=0&loop=0&clean=1`, {
  waitUntil: "domcontentloaded",
});
await page.getByTestId("infinite-fabric-showcase").waitFor({ state: "visible", timeout: 30_000 });
await page.getByRole("button", { name: "start muted" }).click();
await page.getByTestId("showcase-start").waitFor({ state: "detached", timeout: 10_000 });

const pauseDirector = async () => {
  await page.getByRole("button", { name: "pause", exact: true }).click({ force: true });
};
const playDirector = async () => {
  await page.getByRole("button", { name: "play", exact: true }).click({ force: true });
};
const nextChapter = async () => {
  await page.getByRole("button", { name: "next →", exact: true }).click({ force: true });
};

// The start action enables the normal automatic director. Pause it immediately so
// every captured cut is advanced exclusively by this script.
await pauseDirector();
await page.waitForFunction(
  () => document.querySelector("[data-testid='infinite-fabric-showcase']")?.getAttribute("data-chapter") === "one-world",
  undefined,
  { timeout: 10_000 },
);

const stills = [];
for (let index = 0; index < chapters.length; index += 1) {
  const chapter = chapters[index];
  await page.waitForFunction(
    (expected) => document.querySelector("[data-testid='infinite-fabric-showcase']")?.getAttribute("data-chapter") === expected,
    chapter,
    { timeout: 15_000 },
  );

  // Resume only long enough to animate this chapter into its representative
  // state, then freeze it before the automatic chapter boundary. The explicit
  // Play/Pause controls avoid keyboard-focus ambiguity in capture mode.
  await playDirector();
  await page.waitForTimeout(chapterCaptureMs[index] ?? 2200);
  await pauseDirector();
  await page.waitForTimeout(260);

  if ([0, 2, 3, 4, 5, 7].includes(index)) {
    const name = `${String(index).padStart(2, "0")}-${chapter}.png`;
    await page.screenshot({ path: resolve(outputRoot, name), fullPage: true });
    stills.push(name);
  }
  await page.waitForTimeout(480);
  if (index < chapters.length - 1) await nextChapter();
}
await page.waitForTimeout(1200);

const video = page.video();
await context.close();
const sourceVideo = await video?.path();
const finalVideo = resolve(outputRoot, "axm-infinite-fabric-showcase.webm");
if (!sourceVideo) throw new Error("Playwright did not produce a showcase video");
await rename(sourceVideo, finalVideo);
await rm(videoScratch, { recursive: true, force: true });
await browser.close();

const videoStat = await stat(finalVideo);
const receipt = {
  format: "axm-infinite-fabric-showcase-capture/0",
  status: errors.length === 0 ? "pass" : "held",
  baseUrl,
  viewport: [1920, 1080],
  chapters,
  chapterCaptureMs,
  directorControl: "explicit-play-pause-next",
  stills,
  video: {
    path: "axm-infinite-fabric-showcase.webm",
    bytes: videoStat.size,
  },
  browserErrors: errors,
  authority: {
    modelProviderInvoked: false,
    canonicalWorldMutated: false,
    productAcceptanceIssued: false,
  },
};
await writeFile(
  resolve(outputRoot, "capture-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);

if (errors.length > 0) {
  throw new Error(`Showcase capture reported browser errors:\n${errors.join("\n")}`);
}

console.log(JSON.stringify(receipt, null, 2));
