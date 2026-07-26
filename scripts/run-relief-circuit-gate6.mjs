import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = new URL("../", import.meta.url);
const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";

function npmInvocation(args) {
  // npm run exposes the exact npm CLI path. Invoking that JavaScript through the
  // current Node executable avoids Node 22's Windows EINVAL boundary for direct
  // .cmd spawning while retaining a shell-backed fallback for standalone use.
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return { command: process.execPath, args: [npmExecPath, ...args], shell: false };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args,
    shell: process.platform === "win32",
  };
}

const invocation = npmInvocation(["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort"]);
const server = spawn(invocation.command, invocation.args, {
  cwd: ROOT,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  detached: process.platform !== "win32",
  shell: invocation.shell,
  windowsHide: true,
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
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Gate 6 ${mode} verification failed (${signal ?? code}).`));
    });
  });
}

function waitForServerClose(timeoutMs) {
  if (server.exitCode !== null || server.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (closed) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.off("close", onClose);
      resolve(closed);
    };
    const onClose = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    server.once("close", onClose);
  });
}

function killWindowsServerTree() {
  if (!server.pid) return false;
  const result = spawnSync("taskkill.exe", ["/PID", String(server.pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
  // A non-zero status is harmless when the process already exited between the
  // state check and taskkill. Only an inability to invoke taskkill needs fallback.
  return !result.error;
}

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;

  if (process.platform === "win32") {
    if (!killWindowsServerTree()) server.kill();
  } else {
    try { process.kill(-server.pid, "SIGTERM"); } catch { server.kill("SIGTERM"); }
  }

  if (await waitForServerClose(10_000)) return;

  if (process.platform === "win32") {
    if (!killWindowsServerTree()) server.kill();
  } else {
    try { process.kill(-server.pid, "SIGKILL"); } catch { server.kill("SIGKILL"); }
  }

  if (!(await waitForServerClose(5_000))) {
    throw new Error(`Gate 6 Vite process tree did not terminate.\n${serverLog}`);
  }
}

try {
  await ready();
  await run("desktop");
  await run("mobile");
} finally {
  await stopServer();
}
