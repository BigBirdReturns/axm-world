import { EvidenceLedger } from './evidence.mjs';
import { FixtureAdapter } from './adapters/fixture.mjs';
import { WindowsAdapter } from './adapters/windows.mjs';
import { CabinetRuntime } from './runtime.mjs';

export async function createRuntime({ packageRoot, config, token }) {
  const ledger = await new EvidenceLedger({
    root: config.evidence.root,
    maximumLedgerBytes: config.evidence.maximumLedgerBytes,
    maximumLedgerEntries: config.evidence.maximumLedgerEntries,
  }).open();
  const adapter = config.adapter === 'fixture'
    ? new FixtureAdapter({
        evidenceRoot: config.evidence.root,
        frameWidth: config.fixture.frameWidth,
        frameHeight: config.fixture.frameHeight,
      })
    : new WindowsAdapter({ packageRoot, evidenceRoot: config.evidence.root, config: config.windows });
  return new CabinetRuntime({ adapter, ledger, token });
}
