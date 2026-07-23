import { spawn } from "node:child_process";
import process from "node:process";

const ROOT = new URL("../", import.meta.url);
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(npmCommand, ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
  cwd: ROOT,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
});
let serverLog = "";
let serverError = null;
server.on("error", (error) => { serverError = error; });
server.stdout.on("data", (chunk) => { serverLog += chunk; process.stdout.write(chunk); });
server.stderr.on("data", (chunk) => { serverLog += chunk; process.stderr.write(chunk); });

async function ready() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverError) throw serverError;
    try {
      const response = await fetch(`${BASE_URL}/axm-world/game/`);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Gate 6 Vite server did not become ready.\n${serverLog}`);
}

function run(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/verify-relief-circuit-gate6.mjs", "all", mode], {
      cwd: ROOT,
      env: { ...process.env, PW_BASE_URL: BASE_URL },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Gate 6 ${mode} verification failed (${signal ?? code}).`));
    });
  });
}

function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") server.kill("SIGTERM");
  else {
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGTERM"); }
  }
}

try {
  await ready();
  await run("desktop");
  await run("mobile");
} finally {
  stopServer();
}
