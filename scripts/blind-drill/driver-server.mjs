#!/usr/bin/env node
// Blind-operator drill driver — CDP-only browser control, no OS input injection.
//
// Runs its own isolated Chromium process (fresh profile, headless) and exposes
// a tiny localhost HTTP API so a blind operator can look (screenshot/snapshot)
// and act (click/type/key/goto/reload) without ever touching window focus,
// OS-level mouse/keyboard, or anything else on the host desktop. This exists
// because the prior blind-operator attempts failed on desktop contention
// (physical Escape key, window-handle mismatches, hung browser launches, a
// sandbox reviewer blocking OS clicks) — not on the app itself. Isolating the
// browser inside its own headless process removes all of those failure modes.
//
// Usage: node driver-server.mjs [port] [shotDir]
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.argv[2] ?? 8901);
const SHOT_DIR = process.argv[3] ?? "/tmp/blind-drill-shots";
const CHROMIUM_PATH =
  process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

mkdirSync(SHOT_DIR, { recursive: true });

let shotSeq = 0;
let browser;
let context;
let page;

async function ensurePage() {
  if (page) return page;
  browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  return page;
}

// A simplified accessibility-ish snapshot: visible interactive elements plus
// visible text blocks. This is the "visible controls only" surface — no DOM
// internals, no test ids, no source.
async function snapshot(p) {
  return p.evaluate(() => {
    function isVisible(el) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
      return true;
    }
    const interactiveSelector =
      'button, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"], input, select, textarea, [tabindex]';
    const interactive = Array.from(document.querySelectorAll(interactiveSelector))
      .filter(isVisible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") || undefined,
        text: (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 160),
      }))
      .filter((el) => el.text.length > 0);

    const bodyText = document.body.innerText.trim();
    return {
      url: location.href,
      title: document.title,
      visibleText: bodyText.slice(0, 6000),
      interactive,
    };
  });
}

async function screenshotFile(p) {
  shotSeq += 1;
  const file = path.join(SHOT_DIR, `shot-${String(shotSeq).padStart(3, "0")}.png`);
  await p.screenshot({ path: file, fullPage: false });
  return file;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const p = await ensurePage();
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/goto" && req.method === "POST") {
      const { url: target } = await readBody(req);
      await p.goto(target, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(300);
      return send(res, 200, { ok: true, snapshot: await snapshot(p), screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/snapshot" && req.method === "GET") {
      return send(res, 200, { ok: true, snapshot: await snapshot(p) });
    }

    if (url.pathname === "/screenshot" && req.method === "GET") {
      return send(res, 200, { ok: true, screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/click" && req.method === "POST") {
      const { text, exact = false, nth = 0 } = await readBody(req);
      try {
        const locator = p.getByText(text, { exact }).nth(nth);
        await locator.waitFor({ state: "visible", timeout: 5000 });
        await locator.click({ timeout: 5000 });
      } catch (err) {
        return send(res, 200, { ok: false, error: `click failed: ${err.message}`, snapshot: await snapshot(p) });
      }
      await p.waitForTimeout(300);
      return send(res, 200, { ok: true, snapshot: await snapshot(p), screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/type" && req.method === "POST") {
      const { text } = await readBody(req);
      await p.keyboard.type(text, { delay: 10 });
      return send(res, 200, { ok: true, snapshot: await snapshot(p), screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/key" && req.method === "POST") {
      const { key } = await readBody(req);
      await p.keyboard.press(key);
      await p.waitForTimeout(200);
      return send(res, 200, { ok: true, snapshot: await snapshot(p), screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/reload" && req.method === "POST") {
      await p.reload({ waitUntil: "domcontentloaded" });
      await p.waitForTimeout(300);
      return send(res, 200, { ok: true, snapshot: await snapshot(p), screenshot: await screenshotFile(p) });
    }

    if (url.pathname === "/clear-storage" && req.method === "POST") {
      await p.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/health" && req.method === "GET") {
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/shutdown" && req.method === "POST") {
      send(res, 200, { ok: true });
      await browser?.close();
      server.close(() => process.exit(0));
      return;
    }

    send(res, 404, { ok: false, error: "unknown route" });
  } catch (err) {
    send(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`blind-drill driver listening on http://127.0.0.1:${PORT}, shots in ${SHOT_DIR}`);
});

process.on("SIGTERM", async () => {
  await browser?.close();
  process.exit(0);
});
