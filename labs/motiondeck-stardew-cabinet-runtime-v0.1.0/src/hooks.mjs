import { spawn } from 'node:child_process';
import path from 'node:path';
import { boundedInteger, boundedString, isPlainObject } from './core.mjs';

const MAX_OUTPUT_BYTES = 64 * 1024;

export function normalizeHook(raw, name = 'hook') {
  if (raw === null || raw === undefined) return null;
  if (!isPlainObject(raw)) throw new Error(`${name} must be an object.`);
  return {
    executable: boundedString(raw.executable, `${name}.executable`, 2048),
    args: Array.isArray(raw.args) ? raw.args.map((arg, index) => boundedString(String(arg), `${name}.args[${index}]`, 4096)) : [],
    cwd: raw.cwd ? path.resolve(boundedString(raw.cwd, `${name}.cwd`, 4096)) : undefined,
    timeoutMs: boundedInteger(raw.timeoutMs ?? 10_000, `${name}.timeoutMs`, 100, 120_000),
    env: isPlainObject(raw.env) ? Object.fromEntries(Object.entries(raw.env).map(([key, value]) => [String(key), String(value)])) : {},
  };
}

export async function runHook(raw, { name = 'hook', environment = {} } = {}) {
  const hook = normalizeHook(raw, name);
  if (!hook) return { success: false, code: 'hook.not-configured', message: `${name} is not configured.`, stdout: '', stderr: '', exitCode: null };
  return await new Promise((resolve) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    const child = spawn(hook.executable, hook.args, {
      cwd: hook.cwd,
      env: { ...process.env, ...hook.env, ...environment },
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
      });
    };
    const collect = (current, chunk) => {
      const combined = Buffer.concat([current, chunk]);
      return combined.length > MAX_OUTPUT_BYTES ? combined.subarray(combined.length - MAX_OUTPUT_BYTES) : combined;
    };
    child.stdout.on('data', (chunk) => { stdout = collect(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = collect(stderr, chunk); });
    child.on('error', (error) => finish({ success: false, code: 'hook.spawn-failed', message: error.message, exitCode: null }));
    child.on('close', (exitCode, signal) => finish({
      success: exitCode === 0,
      code: exitCode === 0 ? 'hook.passed' : 'hook.failed',
      message: exitCode === 0 ? `${name} completed.` : `${name} exited with ${exitCode ?? signal}.`,
      exitCode,
      signal,
    }));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ success: false, code: 'hook.timeout', message: `${name} exceeded ${hook.timeoutMs} ms.`, exitCode: null });
    }, hook.timeoutMs);
    timer.unref?.();
  });
}
