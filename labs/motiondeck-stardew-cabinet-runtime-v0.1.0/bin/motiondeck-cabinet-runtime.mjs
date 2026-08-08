#!/usr/bin/env node
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadConfig, defaultConfig } from '../src/config.mjs';
import { ensureTokenFile, CabinetServer } from '../src/server.mjs';
import { createRuntime } from '../src/factory.mjs';
import { readToken, sendRequest } from '../src/client.mjs';
import { parseBoundedJson } from '../src/core.mjs';
import { runSelftest } from '../src/selftest.mjs';
import { generateEvidenceKeyPair, signEvidenceFile, verifyEvidenceFile } from '../src/physical-tools.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMANDS = new Set(['serve', 'request', 'hello', 'probe', 'arm', 'heartbeat', 'disarm', 'recenter', 'fallback', 'capture-frame', 'renderer-mode', 'events', 'shutdown', 'selftest', 'default-config', 'keygen', 'sign-evidence', 'verify-evidence', 'help']);

function usage() {
  return `MotionDeck Stardew Cabinet Runtime v0.1.0

Usage:
  motiondeck-cabinet-runtime serve [--config FILE] [--fixture] [--socket PATH] [--token-file FILE] [--evidence-root DIR]
  motiondeck-cabinet-runtime request OPERATION [--payload JSON | --payload-file FILE] [--transaction ID] [--config FILE]
  motiondeck-cabinet-runtime probe [--config FILE]
  motiondeck-cabinet-runtime arm --authority-mode MODE [--lease-ttl-ms N] [--transaction ID] [--config FILE]
  motiondeck-cabinet-runtime heartbeat --transaction ID [--config FILE]
  motiondeck-cabinet-runtime disarm [--transaction ID] [--reason TEXT] [--config FILE]
  motiondeck-cabinet-runtime recenter --transaction ID [--config FILE]
  motiondeck-cabinet-runtime fallback --transaction ID --fallback controller|native-2d [--config FILE]
  motiondeck-cabinet-runtime capture-frame --transaction ID [--name NAME] [--config FILE]
  motiondeck-cabinet-runtime renderer-mode --mode native-2d|desktop-3d|hmd-vr|cabinet-tv [--transaction ID] [--config FILE]
  motiondeck-cabinet-runtime events [--limit N] [--config FILE]
  motiondeck-cabinet-runtime shutdown [--config FILE]
  motiondeck-cabinet-runtime selftest
  motiondeck-cabinet-runtime default-config
  motiondeck-cabinet-runtime keygen --private-key FILE --public-key FILE
  motiondeck-cabinet-runtime sign-evidence --input FILE --private-key FILE --out FILE
  motiondeck-cabinet-runtime verify-evidence --input FILE --public-key FILE --machine-fingerprint ID

Authority modes:
  synthetic      bounded fixture only; authority remains none
  commissioning  live hooks and probed evidence; authority remains none
  operational    signed physical evidence for every capability; local device/display lease only

Exit codes:
  0 request completed successfully
  2 request was valid but refused
  64 invalid command line
`;
}

function parseArgs(argv) {
  const [command = 'help', ...rest] = argv;
  if (!COMMANDS.has(command)) throw Object.assign(new Error(`Unknown command: ${command}`), { exitCode: 64 });
  const options = { _: [] };
  const flags = new Set(['fixture']);
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const name = token.slice(2);
    if (flags.has(name)) {
      options[name] = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) throw Object.assign(new Error(`Option --${name} requires a value.`), { exitCode: 64 });
    options[name] = value;
    index += 1;
  }
  return { command, options };
}

function required(options, name) {
  if (!options[name]) throw Object.assign(new Error(`Missing required option --${name}.`), { exitCode: 64 });
  return options[name];
}

function integerOption(options, name, fallback = undefined) {
  if (options[name] === undefined) return fallback;
  const value = Number(options[name]);
  if (!Number.isInteger(value)) throw Object.assign(new Error(`Option --${name} must be an integer.`), { exitCode: 64 });
  return value;
}

async function resolveConfig(options, { server = false } = {}) {
  const overrides = {};
  if (options.fixture) overrides.adapter = 'fixture';
  if (options.socket || options['token-file']) overrides.ipc = {
    ...(options.socket ? { socketPath: options.socket } : {}),
    ...(options['token-file'] ? { tokenFile: options['token-file'] } : {}),
  };
  if (options['evidence-root']) overrides.evidence = { root: options['evidence-root'] };
  const config = await loadConfig({ packageRoot, configPath: options.config ?? null, overrides });
  if (!server && options.fixture) throw Object.assign(new Error('--fixture applies only to serve; clients use the server config.'), { exitCode: 64 });
  return config;
}

async function payloadFromOptions(options) {
  if (options.payload && options['payload-file']) throw Object.assign(new Error('Use only one of --payload or --payload-file.'), { exitCode: 64 });
  if (options['payload-file']) return parseBoundedJson(await fsp.readFile(options['payload-file'], 'utf8'), options['payload-file']);
  if (options.payload) return parseBoundedJson(options.payload, '--payload');
  return {};
}

async function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function requestOperation(config, operation, payload, options) {
  const token = await readToken(config.ipc.tokenFile);
  return await sendRequest({
    socketPath: config.ipc.socketPath,
    token,
    operation,
    payload,
    transactionId: options.transaction ?? null,
    clientId: 'motiondeck-cabinet-cli',
    clientRole: 'operator',
    timeoutMs: integerOption(options, 'timeout-ms', config.ipc.idleTimeoutMs),
    maxMessageBytes: config.ipc.maxMessageBytes,
  });
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === 'help') {
    process.stdout.write(usage());
    return 0;
  }
  if (command === 'default-config') {
    await emit(defaultConfig(packageRoot));
    return 0;
  }
  if (command === 'selftest') {
    const receipt = await runSelftest(packageRoot);
    await emit(receipt);
    return receipt.status === 'passed' ? 0 : 2;
  }
  if (command === 'keygen') {
    const result = await generateEvidenceKeyPair({ privateKeyPath: path.resolve(required(options, 'private-key')), publicKeyPath: path.resolve(required(options, 'public-key')) });
    await emit({ format: 'motiondeck-cabinet-evidence-keypair/1', status: 'created', ...result, productAuthority: 'none' });
    return 0;
  }
  if (command === 'sign-evidence') {
    const result = await signEvidenceFile({ inputPath: path.resolve(required(options, 'input')), privateKeyPath: path.resolve(required(options, 'private-key')), outputPath: path.resolve(required(options, 'out')) });
    await emit({ format: 'motiondeck-cabinet-evidence-signature/1', status: 'created', ...result, productAuthority: 'none' });
    return 0;
  }
  if (command === 'verify-evidence') {
    const result = await verifyEvidenceFile({ inputPath: path.resolve(required(options, 'input')), publicKeyPath: path.resolve(required(options, 'public-key')), expectedMachineFingerprint: required(options, 'machine-fingerprint') });
    await emit({ format: 'motiondeck-cabinet-evidence-verification/1', ...result, productAuthority: 'none' });
    return result.status === 'admitted' ? 0 : 2;
  }
  if (command === 'serve') {
    const config = await resolveConfig(options, { server: true });
    const token = await ensureTokenFile(config.ipc.tokenFile);
    const runtime = await createRuntime({ packageRoot, config, token });
    const server = await new CabinetServer({
      socketPath: config.ipc.socketPath,
      runtime,
      maxConnections: config.ipc.maxConnections,
      idleTimeoutMs: config.ipc.idleTimeoutMs,
      maxMessageBytes: config.ipc.maxMessageBytes,
    }).start();
    await emit({
      format: 'motiondeck-cabinet-server-start/1',
      status: 'listening',
      socketPath: config.ipc.socketPath,
      tokenFile: config.ipc.tokenFile,
      evidenceRoot: config.evidence.root,
      adapter: config.adapter,
      productAuthority: 'none',
    });
    let stopping = false;
    const stop = async (signal) => {
      if (stopping) return;
      stopping = true;
      await runtime.close().catch(() => {});
      await server.close().catch(() => {});
      if (signal) process.stderr.write(`motiondeck-cabinet-runtime: stopped by ${signal}\n`);
    };
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));
    while (!server.closed && !runtime.closed) await new Promise((resolve) => setTimeout(resolve, 100));
    await stop(null);
    return 0;
  }

  const config = await resolveConfig(options);
  let operation = command;
  let payload = {};
  if (command === 'request') {
    operation = options._[0] ?? required(options, 'operation');
    payload = await payloadFromOptions(options);
  } else if (command === 'arm') {
    payload = {
      authorityMode: required(options, 'authority-mode'),
      leaseTtlMs: integerOption(options, 'lease-ttl-ms', 5000),
    };
  } else if (command === 'disarm') {
    payload = { reason: options.reason ?? 'requested-by-cli' };
  } else if (command === 'fallback') {
    operation = 'select-fallback';
    payload = { fallback: required(options, 'fallback') };
  } else if (command === 'capture-frame') {
    payload = { name: options.name ?? 'frame' };
  } else if (command === 'renderer-mode') {
    payload = { mode: required(options, 'mode') };
  } else if (command === 'events') {
    operation = 'drain-events';
    payload = { limit: integerOption(options, 'limit', 50) };
  }
  const response = await requestOperation(config, operation, payload, options);
  await emit(response);
  return response.success ? 0 : 2;
}

main()
  .then((exitCode) => { process.exitCode = exitCode; })
  .catch((error) => {
    process.stderr.write(`motiondeck-cabinet-runtime: ${error.message}\n`);
    if (process.env.MOTIONDECK_DEBUG === '1' && error.stack) process.stderr.write(`${error.stack}\n`);
    process.exitCode = error.exitCode ?? 1;
  });
