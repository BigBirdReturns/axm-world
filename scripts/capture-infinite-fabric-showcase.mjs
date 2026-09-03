import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SHOWCASE_BASE_URL ?? "http://127.0.0.1:5173";
const outputRoot = resolve(process.env.SHOWCASE_CAPTURE_DIR ?? "showcase-capture");
const sourceCommit = process.env.CANDIDATE_SHA ?? null;

const EXECUTIVE_CHAPTERS = [
  "one-world",
  "one-revision",
  "say-the-change",
  "world-grows",
  "play-the-story",
  "world-remembers",
  "providers-rotate",
  "take-it-home",
];

const EXECUTIVE_STILLS = [
  ["one-world", 2_400, "00-one-world.png"],
  ["say-the-change", 5_400, "02-say-the-change.png"],
  ["world-grows", 2_400, "03-world-grows.png"],
  ["play-the-story", 5_400, "04-play-the-story.png"],
  ["world-remembers", 2_400, "05-world-remembers.png"],
  ["take-it-home", 2_400, "07-take-it-home.png"],
];

const SOCIAL_STILLS = [
  ["one-world", 1_700, "social-00-one-world-9x16.png"],
  ["world-grows", 2_200, "social-03-world-grows-9x16.png"],
  ["take-it-home", 2_200, "social-07-take-it-home-9x16.png"],
];

const errors = [];
const captures = [];

function watchPage(page, label) {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label} console: ${message.text()}`);
  });
}

function encodeProposal(proposal) {
  return Buffer.from(JSON.stringify(proposal), "utf8").toString("base64url");
}

function showcaseUrl({ edition, proposal, chapter, autoplay = true, clean = true }) {
  const url = new URL("/showcase.html", baseUrl);
  if (edition) url.searchParams.set("edition", edition);
  if (proposal) url.searchParams.set("proposal", encodeProposal(proposal));
  if (chapter) url.searchParams.set("chapter", chapter);
  url.searchParams.set("autoplay", autoplay ? "1" : "0");
  url.searchParams.set("loop", "0");
  url.searchParams.set("clean", clean ? "1" : "0");
  url.searchParams.set("sound", "0");
  return url.toString();
}

async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function describeFile(path, relativePath) {
  const fileStat = await stat(path);
  return {
    path: relativePath,
    bytes: fileStat.size,
    sha256: await sha256File(path),
  };
}

async function waitForRuntime(page, expected) {
  await page.getByTestId("infinite-fabric-showcase").waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => {
      const html = document.documentElement;
      return html.dataset.demoReady === "true"
        && /^[0-9a-f]{64}$/u.test(html.dataset.demoDigest ?? "");
    },
    undefined,
    { timeout: 30_000 },
  );
  const runtime = await page.evaluate(() => window.AxmShowcaseRuntime);
  if (runtime.editionId !== expected.edition) {
    throw new Error(`Expected edition ${expected.edition}, received ${runtime.editionId}`);
  }
  if (runtime.aspect !== expected.aspect) {
    throw new Error(`Expected aspect ${expected.aspect}, received ${runtime.aspect}`);
  }
  if (runtime.proposalStatus !== expected.proposalStatus) {
    throw new Error(
      `Expected proposal status ${expected.proposalStatus}, received ${runtime.proposalStatus}`,
    );
  }
  if (!runtime.digest || !/^[0-9a-f]{64}$/u.test(runtime.digest)) {
    throw new Error("Showcase runtime did not expose a source-bound SHA-256 digest");
  }
  return runtime;
}

async function captureVideo(browser, configuration) {
  const scratch = resolve(outputRoot, `video-scratch-${configuration.id}`);
  await rm(scratch, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });
  const context = await browser.newContext({
    viewport: configuration.viewport,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    recordVideo: {
      dir: scratch,
      size: configuration.viewport,
    },
  });
  const page = await context.newPage();
  watchPage(page, `video:${configuration.id}`);
  await page.goto(configuration.url, { waitUntil: "domcontentloaded" });
  const runtime = await waitForRuntime(page, configuration.expected);
  const lastChapter = runtime.chapterIds.at(-1);
  if (!lastChapter) throw new Error(`Video ${configuration.id} has no chapters`);
  await page.waitForFunction(
    (chapterId) => document
      .querySelector("[data-testid='infinite-fabric-showcase']")
      ?.getAttribute("data-chapter") === chapterId,
    lastChapter,
    { timeout: runtime.totalDurationMs + 30_000 },
  );
  await page.waitForTimeout(configuration.finalHoldMs);
  const video = page.video();
  await context.close();
  const sourceVideo = await video?.path();
  if (!sourceVideo) throw new Error(`Playwright did not produce ${configuration.id}`);
  const destination = resolve(outputRoot, configuration.filename);
  await rename(sourceVideo, destination);
  await rm(scratch, { recursive: true, force: true });
  const file = await describeFile(destination, configuration.filename);
  const record = {
    id: configuration.id,
    kind: "video",
    edition: runtime.editionId,
    aspect: runtime.aspect,
    viewport: [configuration.viewport.width, configuration.viewport.height],
    programId: runtime.programId,
    programVersion: runtime.programVersion,
    demonstrationDigest: runtime.digest,
    proposalId: runtime.proposalId,
    proposalStatus: runtime.proposalStatus,
    chapterIds: runtime.chapterIds,
    ...file,
  };
  captures.push(record);
  return record;
}

async function captureStill(browser, configuration) {
  const context = await browser.newContext({
    viewport: configuration.viewport,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  watchPage(page, `still:${configuration.id}`);
  await page.goto(configuration.url, { waitUntil: "domcontentloaded" });
  const runtime = await waitForRuntime(page, configuration.expected);
  await page.waitForFunction(
    (chapterId) => document
      .querySelector("[data-testid='infinite-fabric-showcase']")
      ?.getAttribute("data-chapter") === chapterId,
    configuration.chapter,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(configuration.captureMs);
  const destination = resolve(outputRoot, configuration.filename);
  await page.screenshot({ path: destination, fullPage: false });
  await context.close();
  const file = await describeFile(destination, configuration.filename);
  const record = {
    id: configuration.id,
    kind: "still",
    edition: runtime.editionId,
    aspect: runtime.aspect,
    viewport: [configuration.viewport.width, configuration.viewport.height],
    programId: runtime.programId,
    programVersion: runtime.programVersion,
    demonstrationDigest: runtime.digest,
    proposalId: runtime.proposalId,
    proposalStatus: runtime.proposalStatus,
    chapterIds: runtime.chapterIds,
    chapterId: configuration.chapter,
    captureMs: configuration.captureMs,
    ...file,
  };
  captures.push(record);
  return record;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

try {
  const executiveUrl = showcaseUrl({ autoplay: true, clean: true });
  const executive = await captureVideo(browser, {
    id: "executive-16x9",
    filename: "axm-infinite-fabric-showcase.webm",
    viewport: { width: 1920, height: 1080 },
    url: executiveUrl,
    expected: { edition: "executive", aspect: "16:9", proposalStatus: "base" },
    finalHoldMs: 7_600,
  });
  if (JSON.stringify(executive.chapterIds) !== JSON.stringify(EXECUTIVE_CHAPTERS)) {
    throw new Error("Executive capture chapter order drifted from the admitted source program");
  }

  for (const [chapter, captureMs, filename] of EXECUTIVE_STILLS) {
    await captureStill(browser, {
      id: `executive-${chapter}-16x9`,
      filename,
      viewport: { width: 1920, height: 1080 },
      chapter,
      captureMs,
      url: showcaseUrl({ chapter, autoplay: true, clean: true }),
      expected: { edition: "executive", aspect: "16:9", proposalStatus: "base" },
    });
  }

  const socialUrl = showcaseUrl({ edition: "social", autoplay: true, clean: true });
  await captureVideo(browser, {
    id: "social-9x16",
    filename: "axm-infinite-fabric-showcase-social-9x16.webm",
    viewport: { width: 1080, height: 1920 },
    url: socialUrl,
    expected: { edition: "social", aspect: "9:16", proposalStatus: "edition" },
    finalHoldMs: 4_600,
  });

  for (const [chapter, captureMs, filename] of SOCIAL_STILLS) {
    await captureStill(browser, {
      id: `social-${chapter}-9x16`,
      filename,
      viewport: { width: 1080, height: 1920 },
      chapter,
      captureMs,
      url: showcaseUrl({ edition: "social", chapter, autoplay: true, clean: true }),
      expected: { edition: "social", aspect: "9:16", proposalStatus: "edition" },
    });
  }

  const proofProposal = {
    format: "axm-demonstration-proposal/1",
    id: "proposal:capture:proof-4x5",
    programId: "demo:first-charter-infinite-fabric",
    baseVersion: "1.0.0",
    editionId: "proof",
    aspect: "4:5",
    autoplay: true,
    loop: false,
    clean: true,
    sound: false,
    direction: "Capture the source-bound proof edition as a clean 4:5 evidence plate.",
  };
  await captureStill(browser, {
    id: "proof-say-the-change-4x5",
    filename: "proof-02-say-the-change-4x5.png",
    viewport: { width: 1080, height: 1350 },
    chapter: "say-the-change",
    captureMs: 5_000,
    url: showcaseUrl({
      proposal: proofProposal,
      chapter: "say-the-change",
      autoplay: true,
      clean: true,
    }),
    expected: { edition: "proof", aspect: "4:5", proposalStatus: "encoded" },
  });
} finally {
  await browser.close();
}

const programDigests = {};
for (const capture of captures) {
  const key = `${capture.edition}:${capture.aspect}`;
  const existing = programDigests[key];
  if (existing && existing !== capture.demonstrationDigest) {
    errors.push(`digest disagreement for ${key}: ${existing} != ${capture.demonstrationDigest}`);
  } else {
    programDigests[key] = capture.demonstrationDigest;
  }
}

const receipt = {
  format: "axm-infinite-fabric-showcase-capture/1",
  status: errors.length === 0 ? "pass" : "held",
  createdAt: new Date().toISOString(),
  sourceCommit,
  baseUrl,
  directorControl: "source-programmed-multi-edition-capture",
  programDigests,
  captures,
  browserErrors: errors,
  authority: {
    modelProviderInvoked: false,
    canonicalWorldMutated: false,
    telemetrySent: false,
    productAcceptanceIssued: false,
  },
};
await writeFile(
  resolve(outputRoot, "capture-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
  "utf8",
);

if (errors.length > 0) {
  throw new Error(`Showcase capture reported held evidence:\n${errors.join("\n")}`);
}

console.log(JSON.stringify(receipt, null, 2));
