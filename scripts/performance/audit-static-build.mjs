#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}
const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}

const buildRoot = resolve(option("--build") ?? "docs/game");
const budgetsPath = resolve(option("--budgets") ?? "docs/performance/RODOH_PERFORMANCE_BUDGETS.json");
const outputPath = option("--output") ? resolve(option("--output")) : null;
if (!existsSync(buildRoot)) fail(`Build directory is absent: ${buildRoot}`);
const budgets = JSON.parse(readFileSync(budgetsPath, "utf8")).staticBuild;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function svgElements(text) {
  return [...text.matchAll(/<([A-Za-z][A-Za-z0-9:_-]*)(?:\s|\/?>)/g)]
    .filter((match) => !match[0].startsWith("</") && !match[0].startsWith("<?") && !match[0].startsWith("<!"))
    .length;
}
function externalReferences(path, text) {
  const extension = extname(path).toLowerCase();
  if (extension === ".html" || extension === ".svg") {
    return [...text.matchAll(/\b(?:src|href|xlink:href)\s*=\s*["'](?:https?:)?\/\//gi)].length;
  }
  if (extension === ".css") return [...text.matchAll(/url\(\s*["']?(?:https?:)?\/\//gi)].length;
  return 0;
}

const files = walk(buildRoot).sort();
const rows = files.map((path) => {
  const bytes = statSync(path).size;
  const extension = extname(path).toLowerCase();
  const text = [".html", ".css", ".svg"].includes(extension) ? readFileSync(path, "utf8") : "";
  return {
    path: relative(buildRoot, path).replace(/\\/g, "/"),
    bytes,
    extension,
    sha256: sha256(path),
    svgElements: extension === ".svg" ? svgElements(text) : 0,
    externalReferences: text ? externalReferences(path, text) : 0,
  };
});
function sum(extension) {
  return rows.filter((row) => row.extension === extension).reduce((total, row) => total + row.bytes, 0);
}
function largest(extension) {
  return rows.filter((row) => row.extension === extension).sort((a, b) => b.bytes - a.bytes)[0] ?? null;
}

const summary = {
  files: rows.length,
  totalBytes: rows.reduce((total, row) => total + row.bytes, 0),
  javascriptBytes: sum(".js"),
  largestJavaScript: largest(".js"),
  cssBytes: sum(".css"),
  svgBytes: sum(".svg"),
  largestSvg: largest(".svg"),
  maximumSvgElements: Math.max(0, ...rows.map((row) => row.svgElements)),
  fontBytes: rows.filter((row) => [".woff", ".woff2", ".ttf", ".otf"].includes(row.extension)).reduce((total, row) => total + row.bytes, 0),
  externalReferences: rows.reduce((total, row) => total + row.externalReferences, 0),
};
const failures = [];
function limit(label, actual, maximum) {
  if (actual > maximum) failures.push({ label, actual, maximum });
}
limit("files", summary.files, budgets.maximumFiles);
limit("totalBytes", summary.totalBytes, budgets.maximumTotalBytes);
limit("javascriptBytes", summary.javascriptBytes, budgets.maximumJavaScriptBytes);
limit("largestJavaScriptBytes", summary.largestJavaScript?.bytes ?? 0, budgets.maximumLargestJavaScriptBytes);
limit("cssBytes", summary.cssBytes, budgets.maximumCssBytes);
limit("svgBytes", summary.svgBytes, budgets.maximumSvgBytes);
limit("largestSvgBytes", summary.largestSvg?.bytes ?? 0, budgets.maximumLargestSvgBytes);
limit("maximumSvgElements", summary.maximumSvgElements, budgets.maximumSvgElementsPerFile);
limit("fontBytes", summary.fontBytes, budgets.maximumFontBytes);
limit("externalReferences", summary.externalReferences, budgets.maximumExternalReferences);

const receipt = {
  format: "rodoh-static-performance-receipt/1",
  buildRoot,
  budgets: budgetsPath,
  summary,
  failures,
  files: rows,
  status: failures.length === 0 ? "pass" : "fail",
};
const output = `${JSON.stringify(receipt, null, 2)}\n`;
if (outputPath) writeFileSync(outputPath, output);
console.log(output.trimEnd());
if (failures.length) process.exit(1);
