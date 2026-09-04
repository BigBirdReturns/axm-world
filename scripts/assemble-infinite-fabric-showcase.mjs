import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());
const buildRoot = resolve(projectRoot, process.env.SHOWCASE_BUILD_ROOT ?? "docs/game");
const captureRoot = resolve(projectRoot, process.env.SHOWCASE_CAPTURE_DIR ?? "showcase-capture");
const outputRoot = resolve(
  projectRoot,
  process.env.SHOWCASE_OUTPUT_ROOT ?? "axm-infinite-fabric-showcase-preview",
);
const programSource = resolve(
  projectRoot,
  process.env.SHOWCASE_PROGRAM_PATH
    ?? "src/fabric/showcase/first-charter-showcase.program.json",
);
const serverSource = resolve(
  projectRoot,
  process.env.SHOWCASE_SERVER_PATH
    ?? "scripts/serve-infinite-fabric-showcase.mjs",
);
const candidateSha = process.env.CANDIDATE_SHA ?? "";

if (!/^[0-9a-f]{40}$/u.test(candidateSha)) {
  throw new Error("CANDIDATE_SHA must be the exact lowercase 40-character source commit");
}

async function requireFile(path, label) {
  const fileStat = await stat(path).catch(() => null);
  if (!fileStat?.isFile()) throw new Error(`${label} is missing: ${path}`);
}

async function requireDirectory(path, label) {
  const directoryStat = await stat(path).catch(() => null);
  if (!directoryStat?.isDirectory()) throw new Error(`${label} is missing: ${path}`);
}

async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Package assembly refuses symbolic link ${path}`);
      }
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await walk(root);
  return files;
}

function posixRelative(root, path) {
  return relative(root, path).split(sep).join("/");
}

function windowsLauncher(pathAndQuery) {
  const url = `http://127.0.0.1:8765${pathAndQuery}`;
  return [
    "@echo off",
    "setlocal",
    "cd /d \"%~dp0\"",
    "where node >nul 2>nul || (",
    "  echo Node.js is required to serve this static product.",
    "  pause",
    "  exit /b 1",
    ")",
    `start \"\" \"${url}\"`,
    "node serve.mjs",
    "",
  ].join("\r\n");
}

function shellLauncher(pathAndQuery) {
  return [
    "#!/usr/bin/env sh",
    "set -eu",
    "cd \"$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\"",
    "command -v node >/dev/null 2>&1 || { echo \"Node.js is required.\" >&2; exit 1; }",
    "PORT=\"${PORT:-8765}\"",
    `URL=\"http://127.0.0.1:\${PORT}${pathAndQuery}\"`,
    "if command -v xdg-open >/dev/null 2>&1; then",
    "  xdg-open \"$URL\" >/dev/null 2>&1 || true",
    "elif command -v open >/dev/null 2>&1; then",
    "  open \"$URL\" >/dev/null 2>&1 || true",
    "fi",
    "PORT=\"$PORT\" node serve.mjs",
    "",
  ].join("\n");
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await requireDirectory(buildRoot, "production build");
await requireDirectory(captureRoot, "showcase capture");
await requireFile(programSource, "demonstration program");
await requireFile(serverSource, "portable server");
for (const entry of ["index.html", "fabric.html", "classics.html", "showcase.html", "studio.html"]) {
  await requireFile(resolve(buildRoot, entry), `built ${entry}`);
}
await requireFile(resolve(captureRoot, "capture-receipt.json"), "capture receipt");

const captureReceipt = parseJson(
  await readFile(resolve(captureRoot, "capture-receipt.json"), "utf8"),
  "capture receipt",
);
if (captureReceipt.format !== "axm-infinite-fabric-showcase-capture/1") {
  throw new Error(`Unexpected capture receipt ${String(captureReceipt.format)}`);
}
if (captureReceipt.status !== "pass") {
  throw new Error("Capture receipt is not in pass state");
}
if (captureReceipt.sourceCommit !== candidateSha) {
  throw new Error(
    `Capture source ${String(captureReceipt.sourceCommit)} does not match ${candidateSha}`,
  );
}
if (!Array.isArray(captureReceipt.captures) || captureReceipt.captures.length < 2) {
  throw new Error("Capture receipt does not contain the production capture matrix");
}

const program = parseJson(await readFile(programSource, "utf8"), "demonstration program");
if (program.format !== "axm-demonstration-program/1") {
  throw new Error(`Unexpected demonstration program ${String(program.format)}`);
}
if (!Array.isArray(program.editions) || program.editions.length < 5) {
  throw new Error("Demonstration program does not expose the admitted production editions");
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(buildRoot, outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, "capture"), { recursive: true });
await cp(captureRoot, resolve(outputRoot, "capture"), { recursive: true, force: true });
await cp(programSource, resolve(outputRoot, "DEMONSTRATION_PROGRAM.json"), { force: true });
await cp(serverSource, resolve(outputRoot, "serve.mjs"), { force: true });

const paths = {
  studio: "/studio.html",
  executive: "/showcase.html",
  booth: "/showcase.html?edition=booth&autoplay=1&loop=1&clean=1",
  social: "/showcase.html?edition=social&autoplay=1&loop=0&clean=1",
  proof: "/showcase.html?edition=proof&autoplay=0&loop=0&clean=0",
};
const urls = Object.fromEntries(
  Object.entries(paths).map(([key, value]) => [key, `http://127.0.0.1:8765${value}`]),
);

const launchers = [
  ["RUN_STUDIO.cmd", windowsLauncher(paths.studio)],
  ["RUN_SHOWCASE.cmd", windowsLauncher(paths.executive)],
  ["RUN_BOOTH.cmd", windowsLauncher(paths.booth)],
  ["RUN_SOCIAL.cmd", windowsLauncher(paths.social)],
  ["run-studio.sh", shellLauncher(paths.studio)],
  ["run-showcase.sh", shellLauncher(paths.executive)],
];
for (const [name, content] of launchers) {
  const path = resolve(outputRoot, name);
  await writeFile(path, content, "utf8");
  if (name.endsWith(".sh")) await chmod(path, 0o755);
}
await writeFile(
  resolve(outputRoot, "LIVE_LINKS.json"),
  `${JSON.stringify({ format: "axm-demonstration-live-links/1", urls }, null, 2)}\n`,
  "utf8",
);

const captureFiles = captureReceipt.captures.map((capture, index) => {
  if (
    !capture
    || typeof capture !== "object"
    || typeof capture.id !== "string"
    || typeof capture.path !== "string"
    || typeof capture.sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(capture.sha256)
  ) {
    throw new Error(`Capture receipt entry ${index} is malformed`);
  }
  return {
    id: capture.id,
    kind: capture.kind,
    edition: capture.edition,
    aspect: capture.aspect,
    path: `capture/${capture.path}`,
    bytes: capture.bytes,
    sha256: capture.sha256,
    demonstrationDigest: capture.demonstrationDigest,
  };
});
for (const capture of captureFiles) {
  const path = resolve(outputRoot, capture.path);
  await requireFile(path, `capture ${capture.id}`);
  const actual = await sha256File(path);
  if (actual !== capture.sha256) {
    throw new Error(`Capture digest mismatch for ${capture.path}`);
  }
}

const manifest = {
  format: "axm-infinite-fabric-showcase/1",
  status: "source-browser-capture-package-qualified",
  createdAt: new Date().toISOString(),
  sourceCommit: candidateSha,
  program: {
    path: "DEMONSTRATION_PROGRAM.json",
    id: program.id,
    version: program.version,
    format: program.format,
    digests: captureReceipt.programDigests,
  },
  entries: {
    studio: "studio.html",
    executive: "showcase.html",
    tinyWorld: "fabric.html",
    classicTrials: "classics.html",
    cartridgeRuntime: "index.html",
  },
  liveLinks: "LIVE_LINKS.json",
  editions: program.editions.map((edition) => ({
    id: edition.id,
    aspect: edition.aspect,
    autoplay: edition.autoplay,
    loop: edition.loop,
    clean: edition.clean,
    chapterIds: edition.chapterIds,
  })),
  captures: captureFiles,
  launchers: launchers.map(([name]) => name),
  operatingBoundary: {
    providerInvokedDuringCapture: false,
    providerRequiredDuringPlayback: false,
    networkRequiredDuringPackagedPlayback: false,
    telemetryDefault: "off",
    claimTextMutableByProposal: false,
    evidenceMutableByProposal: false,
    runtimeCodeGeneration: false,
    canonicalWorldMutatedDuringCapture: false,
    productAcceptanceIssued: false,
  },
};
await writeFile(
  resolve(outputRoot, "SHOWCASE_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const readme = `AXM INFINITE FABRIC DEMONSTRATION PRODUCT\n\nSOURCE\n  Commit: ${candidateSha}\n  Program: ${String(program.id)} ${String(program.version)}\n\nSTART\n  Windows: double-click RUN_STUDIO.cmd\n  macOS/Linux: run ./run-studio.sh\n\nDIRECT ENTRY\n  RUN_SHOWCASE.cmd   executive presenter\n  RUN_BOOTH.cmd      unattended clean loop\n  RUN_SOCIAL.cmd     vertical social cut\n\nThe Foundry turns bounded natural-language direction into a source-bound\ndemonstration proposal, previews the actual product, retains local versions,\nproduces a stable proposal URL, and exports a publication record with its\nevidence map and local run receipt. Proposals may select and order admitted\nchapters, tune timing, and choose operating mode. They cannot rewrite claim\ntext, evidence, law, or canonical runtime code.\n\nSHOWCASE CONTROLS\n  Right / Left   next or previous chapter\n  Space          play or pause\n  C              clean capture mode\n  F              fullscreen\n  R              restart\n\nCAPTURE\n  capture/axm-infinite-fabric-showcase.webm\n  capture/axm-infinite-fabric-showcase-social-9x16.webm\n  capture/capture-receipt.json\n\nVERIFY\n  SHA256SUMS binds every file inside this directory.\n\nAUTHORITY\n  No model provider was invoked during capture. No provider is required during\n  playback. No telemetry is sent by default. This package does not issue human\n  enjoyment, live-provider generation, household hardware, or product acceptance.\n`;
await writeFile(resolve(outputRoot, "README.txt"), readme, "utf8");

const checksumPath = resolve(outputRoot, "SHA256SUMS");
const internalFiles = (await listFiles(outputRoot)).filter((path) => path !== checksumPath);
const checksumLines = [];
for (const path of internalFiles) {
  checksumLines.push(`${await sha256File(path)}  ${posixRelative(outputRoot, path)}`);
}
await writeFile(checksumPath, `${checksumLines.join("\n")}\n`, "utf8");

for (const line of checksumLines) {
  const separator = line.indexOf("  ");
  const expected = line.slice(0, separator);
  const relativePath = line.slice(separator + 2);
  const actual = await sha256File(resolve(outputRoot, relativePath));
  if (actual !== expected) {
    throw new Error(`Internal checksum verification failed for ${relativePath}`);
  }
}

const archivePath = `${outputRoot}.zip`;
const archiveSidecarPath = `${archivePath}.sha256`;
const releaseReceiptPath = `${outputRoot}.release.json`;
await rm(archivePath, { force: true });
await rm(archiveSidecarPath, { force: true });
await rm(releaseReceiptPath, { force: true });
const zip = spawnSync(
  "zip",
  ["-X", "-q", "-r", archivePath, basename(outputRoot)],
  { cwd: dirname(outputRoot), encoding: "utf8" },
);
if (zip.status !== 0) {
  throw new Error(`zip failed: ${zip.stderr || zip.stdout || `exit ${zip.status}`}`);
}
const archiveStat = await stat(archivePath);
const archiveSha256 = await sha256File(archivePath);
await writeFile(
  archiveSidecarPath,
  `${archiveSha256}  ${basename(archivePath)}\n`,
  "utf8",
);
const releaseReceipt = {
  format: "axm-infinite-fabric-showcase-release/1",
  status: "pass",
  sourceCommit: candidateSha,
  programId: program.id,
  programVersion: program.version,
  packageDirectory: basename(outputRoot),
  packageFiles: internalFiles.length + 1,
  internalLedger: {
    path: "SHA256SUMS",
    entries: checksumLines.length,
    sha256: await sha256File(checksumPath),
  },
  archive: {
    path: basename(archivePath),
    bytes: archiveStat.size,
    sha256: archiveSha256,
  },
  captures: captureFiles,
  authority: manifest.operatingBoundary,
};
await writeFile(
  releaseReceiptPath,
  `${JSON.stringify(releaseReceipt, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(releaseReceipt, null, 2));
