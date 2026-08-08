import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { runHook } from '../src/hooks.mjs';
import { temporaryRoot } from './helpers.mjs';

test('hooks execute exact argv without a shell and receive bounded environment', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const script = path.join(root, 'hook.mjs');
  await fsp.writeFile(script, 'process.stdout.write(JSON.stringify({argv:process.argv.slice(2),value:process.env.TEST_VALUE}));\n');
  const result = await runHook({ executable: process.execPath, args: [script, 'a;echo injected'], timeoutMs: 2000 }, { name: 'test-hook', environment: { TEST_VALUE: 'ok' } });
  assert.equal(result.success, true);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.argv, ['a;echo injected']);
  assert.equal(output.value, 'ok');
});

test('hooks time out and are killed', async (t) => {
  const root = await temporaryRoot();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const script = path.join(root, 'slow.mjs');
  await fsp.writeFile(script, 'setTimeout(()=>{}, 10000);\n');
  const result = await runHook({ executable: process.execPath, args: [script], timeoutMs: 100 }, { name: 'slow-hook' });
  assert.equal(result.success, false);
  assert.equal(result.code, 'hook.timeout');
});
