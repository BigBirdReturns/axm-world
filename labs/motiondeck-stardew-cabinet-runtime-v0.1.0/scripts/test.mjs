#!/usr/bin/env node
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'test');
const files = (await fsp.readdir(testRoot))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort((a, b) => a.localeCompare(b, 'en-US'))
  .map((name) => path.join('test', name));
if (files.length === 0) throw new Error('No test files found.');
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
