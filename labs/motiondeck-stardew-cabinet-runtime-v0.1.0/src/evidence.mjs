import fsp from 'node:fs/promises';
import path from 'node:path';
import { digestObject, isPlainObject, parseBoundedJson, redactObject, writeJsonAtomic } from './core.mjs';

export const EVIDENCE_FORMAT = 'motiondeck-cabinet-evidence-event/1';
export const LEDGER_STATE_FORMAT = 'motiondeck-cabinet-evidence-ledger/1';

function bodyForDigest(event) {
  const { eventDigest: _eventDigest, ...body } = event;
  return body;
}

export class EvidenceLedger {
  constructor({ root, maximumLedgerBytes = 32 * 1024 * 1024, maximumLedgerEntries = 100_000 }) {
    this.root = path.resolve(root);
    this.ledgerPath = path.join(this.root, 'events.jsonl');
    this.statePath = path.join(this.root, 'ledger-state.json');
    this.maximumLedgerBytes = maximumLedgerBytes;
    this.maximumLedgerEntries = maximumLedgerEntries;
    this.sequence = 0;
    this.previousDigest = null;
    this.events = [];
    this.writeChain = Promise.resolve();
  }

  async open() {
    await fsp.mkdir(this.root, { recursive: true, mode: 0o700 });
    let text = '';
    try {
      const stat = await fsp.stat(this.ledgerPath);
      if (!stat.isFile()) throw new Error(`Evidence ledger is not a regular file: ${this.ledgerPath}`);
      if (stat.size > this.maximumLedgerBytes) throw new Error(`Evidence ledger exceeds ${this.maximumLedgerBytes} bytes.`);
      text = await fsp.readFile(this.ledgerPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length > this.maximumLedgerEntries) throw new Error(`Evidence ledger exceeds ${this.maximumLedgerEntries} entries.`);
    let previous = null;
    let expectedSequence = 1;
    for (const [index, line] of lines.entries()) {
      const event = parseBoundedJson(line, `evidence ledger line ${index + 1}`);
      if (!isPlainObject(event) || event.format !== EVIDENCE_FORMAT) throw new Error(`Malformed evidence event at line ${index + 1}.`);
      if (event.sequence !== expectedSequence) throw new Error(`Evidence sequence mismatch at line ${index + 1}.`);
      if ((event.previousDigest ?? null) !== previous) throw new Error(`Evidence chain mismatch at line ${index + 1}.`);
      const actual = digestObject(bodyForDigest(event), 'cabinetevidence1');
      if (actual !== event.eventDigest) throw new Error(`Evidence digest mismatch at line ${index + 1}.`);
      this.events.push(event);
      previous = event.eventDigest;
      expectedSequence += 1;
    }
    this.sequence = lines.length;
    this.previousDigest = previous;
    await this.#writeState();
    return this;
  }

  async #writeState() {
    await writeJsonAtomic(this.statePath, {
      format: LEDGER_STATE_FORMAT,
      entries: this.sequence,
      headDigest: this.previousDigest,
      ledgerPath: this.ledgerPath,
    });
  }

  async append(kind, status, payload = {}, options = {}) {
    const perform = async () => {
      const event = {
        format: EVIDENCE_FORMAT,
        sequence: this.sequence + 1,
        previousDigest: this.previousDigest,
        observedAt: options.observedAt ?? new Date().toISOString(),
        kind: String(kind).slice(0, 128),
        status: String(status).slice(0, 64),
        evidenceTier: options.evidenceTier ?? 'declared',
        transactionId: options.transactionId ?? null,
        payload: redactObject(payload),
      };
      event.eventDigest = digestObject(event, 'cabinetevidence1');
      const line = `${JSON.stringify(event)}\n`;
      const currentBytes = await fsp.stat(this.ledgerPath).then((stat) => stat.size).catch((error) => {
        if (error.code === 'ENOENT') return 0;
        throw error;
      });
      if (currentBytes + Buffer.byteLength(line, 'utf8') > this.maximumLedgerBytes) throw new Error('Evidence ledger byte ceiling would be exceeded.');
      if (event.sequence > this.maximumLedgerEntries) throw new Error('Evidence ledger entry ceiling would be exceeded.');
      await fsp.appendFile(this.ledgerPath, line, { encoding: 'utf8', mode: 0o600 });
      this.sequence = event.sequence;
      this.previousDigest = event.eventDigest;
      this.events.push(event);
      await this.#writeState();
      return event;
    };
    const result = this.writeChain.then(perform, perform);
    this.writeChain = result.then(() => undefined, () => undefined);
    return result;
  }

  tail(limit = 50) {
    const count = Math.max(0, Math.min(Number(limit) || 0, 500));
    return this.events.slice(-count);
  }

  summary() {
    return {
      format: LEDGER_STATE_FORMAT,
      entries: this.sequence,
      headDigest: this.previousDigest,
      ledgerPath: this.ledgerPath,
    };
  }
}
