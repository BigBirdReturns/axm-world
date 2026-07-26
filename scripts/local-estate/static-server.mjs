#!/usr/bin/env node

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const root = resolve(option("--root") ?? ".");
const port = Number(option("--port") ?? "5173");
const host = option("--host", "127.0.0.1");
let base = option("--base", "/");
if (!base.startsWith("/")) base = `/${base}`;
if (!base.endsWith("/")) base = `${base}/`;

if (!existsSync(join(root, "index.html"))) {
  console.error(`Static build has no index.html: ${root}`);
  process.exit(2);
}
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${String(port)}`);
  process.exit(2);
}

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  if (!decoded.startsWith(base)) return null;
  let relative = decoded.slice(base.length);
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const normalized = normalize(relative).split(sep).join("/");
  if (normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) return null;
  const absolute = resolve(root, normalized);
  if (!absolute.startsWith(`${root}${sep}`) && absolute !== root) return null;
  return absolute;
}

function sendFile(path, response) {
  const stats = statSync(path);
  response.statusCode = 200;
  response.setHeader("Content-Type", MIME[extname(path).toLowerCase()] ?? "application/octet-stream");
  response.setHeader("Content-Length", stats.size);
  response.setHeader("Cache-Control", extname(path) === ".html" ? "no-cache" : "public, max-age=31536000, immutable");
  createReadStream(path).pipe(response);
}

const server = createServer((request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.statusCode = 405;
      response.end("Method not allowed");
      return;
    }
    const requested = safePath(request.url ?? "/");
    if (requested && existsSync(requested) && statSync(requested).isFile()) {
      if (request.method === "HEAD") {
        const stats = statSync(requested);
        response.statusCode = 200;
        response.setHeader("Content-Type", MIME[extname(requested).toLowerCase()] ?? "application/octet-stream");
        response.setHeader("Content-Length", stats.size);
        response.end();
      } else {
        sendFile(requested, response);
      }
      return;
    }
    const acceptsHtml = String(request.headers.accept ?? "").includes("text/html");
    if (requested && acceptsHtml) {
      sendFile(join(root, "index.html"), response);
      return;
    }
    response.statusCode = 404;
    response.end("Not found");
  } catch (error) {
    response.statusCode = 500;
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ format: "rodoh-static-server/1", root, host, port, base, url: `http://${host}:${port}${base}` }));
});

function stop() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
