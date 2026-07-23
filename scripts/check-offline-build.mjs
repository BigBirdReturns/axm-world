import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.resolve(REPO_ROOT, process.argv[2] ?? "docs/game");

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

function relative(file) {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

if (!fs.existsSync(buildDir)) {
  throw new Error(`offline build guard: missing build directory ${relative(buildDir)}`);
}

const files = listFiles(buildDir);
const textFiles = files.filter((file) => /\.(?:css|html|js|mjs)$/i.test(file));
const errors = [];
const css = [];

for (const file of textFiles) {
  const source = fs.readFileSync(file, "utf8");
  const rel = relative(file);

  if (/fonts\.(?:googleapis|gstatic)\.com/i.test(source)) {
    errors.push(`${rel}: external Google Fonts host`);
  }
  if (/https?:\/\/[^\s"'()]+\.(?:woff2?|ttf|otf)(?:[?#][^\s"'()]*)?/i.test(source)) {
    errors.push(`${rel}: absolute external font asset URL`);
  }
  if (/@import\s+(?:url\(\s*)?["']?(?:https?:)?\/\//i.test(source)) {
    errors.push(`${rel}: external stylesheet import`);
  }
  for (const tag of source.match(/<link\b[^>]*>/gi) ?? []) {
    const loadsStyleOrFont = /\b(?:stylesheet|preconnect|dns-prefetch)\b/i.test(tag)
      || /\bas\s*=\s*["']?font\b/i.test(tag);
    if (loadsStyleOrFont && /(?:https?:)?\/\//i.test(tag)) {
      errors.push(`${rel}: external stylesheet or connection hint`);
    }
  }
  if (file.endsWith(".css")) css.push(source);
}

const allCss = css.join("\n");
for (const family of ["Barlow Condensed", "Lora", "IBM Plex Mono"]) {
  const escaped = family.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`font-family:\\s*['\"]?${escaped}['\"]?`, "i").test(allCss)) {
    errors.push(`built CSS: missing bundled ${family} face`);
  }
}

const fontUrls = [...allCss.matchAll(/url\(\s*(['"]?)([^)'"\s]+\.(?:woff2?|ttf|otf)(?:[?#][^)'"\s]*)?)\1\s*\)/gi)]
  .map((match) => match[2]);
if (fontUrls.length === 0) errors.push("built CSS: no local font asset references");
for (const url of fontUrls) {
  if (/^(?:https?:)?\/\//i.test(url) || /^data:/i.test(url)) {
    errors.push(`built CSS: font is not a same-origin asset (${url})`);
  }
}

const fontAssets = files.filter((file) => /\.(?:woff2?|ttf|otf)$/i.test(file));
if (fontAssets.length === 0) errors.push("build artifact: no emitted font assets");
const fontAssetNames = new Set(fontAssets.map((file) => path.basename(file)));
for (const url of fontUrls) {
  const assetName = path.posix.basename(url.split(/[?#]/, 1)[0]);
  if (!fontAssetNames.has(assetName)) {
    errors.push(`built CSS: missing referenced font asset (${url})`);
  }
}
if (!files.some((file) => relative(file) === "docs/game/licenses/runtime-fonts-OFL-1.1.txt")) {
  errors.push("build artifact: missing runtime font license");
}

if (errors.length > 0) {
  throw new Error(`offline build guard failed:\n- ${errors.join("\n- ")}`);
}

console.log(
  `offline build guard passed: ${fontAssets.length} local font assets; no external font dependencies`,
);
