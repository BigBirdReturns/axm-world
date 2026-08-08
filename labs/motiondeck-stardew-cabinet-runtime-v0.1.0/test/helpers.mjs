import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EvidenceLedger } from '../src/evidence.mjs';
import { FixtureAdapter } from '../src/adapters/fixture.mjs';
import { CabinetRuntime } from '../src/runtime.mjs';

export async function temporaryRoot(prefix = 'cabinet-test-') {
  return await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function fixtureRuntime(root, token = crypto.randomBytes(32).toString('base64url')) {
  const evidenceRoot = path.join(root, 'evidence');
  const ledger = await new EvidenceLedger({ root: evidenceRoot, maximumLedgerBytes: 4 * 1024 * 1024, maximumLedgerEntries: 10_000 }).open();
  const adapter = new FixtureAdapter({ evidenceRoot, frameWidth: 160, frameHeight: 90 });
  const runtime = new CabinetRuntime({ adapter, ledger, token });
  return { runtime, adapter, ledger, token, evidenceRoot };
}
