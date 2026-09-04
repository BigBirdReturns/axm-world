import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createServer } from "node:http";

const root = resolve(process.env.SHOWCASE_ROOT ?? process.cwd());
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "127.0.0.1";
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webm", "video/webm"],
  [".woff2", "font/woff2"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);
const contentSecurityPolicy = [
  "default-src 'self' data: blob:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function sendText(response, status, text, extra = {}) {
  const body = Buffer.from(text, "utf8");
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": body.byteLength,
    "Cache-Control": "no-store",
    ...extra,
  });
  response.end(body);
}

function cacheControl(relativePath) {
  if (/\.(?:html|json|webmanifest)$/iu.test(relativePath)) return "no-store";
  if (/^assets\/.*-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/u.test(relativePath)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
  if (!match) return null;
  const startText = match[1];
  const endText = match[2];
  let start;
  let end;
  if (startText === "" && endText !== "") {
    const suffix = Number(endText);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText === "" ? size - 1 : Number(endText);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

createServer(async (request, response) => {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname,
    );
  } catch {
    sendText(response, 400, "Malformed request path");
    return;
  }
  if (pathname.includes("\0")) {
    sendText(response, 400, "Malformed request path");
    return;
  }

  const relativePath = pathname === "/"
    ? "studio.html"
    : pathname.replace(/^\/+/, "");
  const path = resolve(root, relativePath);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(path);
  } catch {
    sendText(response, 404, "Not found");
    return;
  }
  if (!fileStat.isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  const extension = extname(path).toLowerCase();
  const headers = {
    "Content-Type": mime.get(extension) || "application/octet-stream",
    "Cache-Control": cacheControl(relativePath),
    "Accept-Ranges": "bytes",
  };
  const rangeHeader = request.headers.range;
  if (rangeHeader) {
    const range = parseRange(rangeHeader, fileStat.size);
    if (!range) {
      response.writeHead(416, {
        ...headers,
        "Content-Range": `bytes */${fileStat.size}`,
        "Content-Length": 0,
      });
      response.end();
      return;
    }
    const length = range.end - range.start + 1;
    response.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}`,
      "Content-Length": length,
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(path, { start: range.start, end: range.end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...headers,
    "Content-Length": fileStat.size,
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(path).pipe(response);
}).listen(port, host, () => {
  console.log(`AXM Demonstration Foundry: http://${host}:${port}/studio.html`);
  console.log(`AXM Infinite Fabric Showcase: http://${host}:${port}/showcase.html`);
});
