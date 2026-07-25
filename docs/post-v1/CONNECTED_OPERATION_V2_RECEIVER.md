# Connected-operation v2 receiver

## Authority

Arc and the future decision kernel own:

- operation identity;
- participant and parent-run validation;
- preparation and acceptance feasibility;
- phase transition legality;
- intended and applied state effects;
- commit, return, compensation, abort, and reconciliation facts;
- canonical receipts and digests.

World owns:

- file import and export;
- holder-visible preflight;
- local authorization controls;
- exact transactional writes and rollback;
- phase, participant, receipt, conflict, and refusal presentation;
- accessibility, localization, offline operation, and recovery.

World may not derive an operation identity, decide a stale parent is close enough, invent a compensating effect, collapse partial commitment into success, or select a winning fork by arrival order.

## Holder surface

A v2 file enters through ordinary holder custody and is classified by phase and relation to local runs.

The preflight displays:

- exact operation identity;
- format and protocol version;
- source and destination cartridge identities;
- source and destination parent run digests;
- local participant presence and current run digests;
- causal parents and fork status;
- phase receipts already present;
- intended transfers, effects, obligations, risks, dissent, uncertainty, and unknown memory;
- exact actions the holder may authorize;
- all refusal reasons before the first write.

## Import classes

### New prepared operation

Both local parent states match. The holder may preserve the proposal, inspect it, and authorize acceptance or later commit through Arc-owned law.

### Repeated delivery

The operation identity and phase receipt already exist. World returns the existing local receipt and performs no write other than optional transport metadata that does not affect causal identity.

### Causally stale

At least one local run has advanced beyond the named parent and the operation is not already applied. World refuses application and presents both expected and current parent identities. It may export the refused operation and current runs for an explicit reconciliation venue.

### Partial commit

One participant commit receipt exists without the other. World preserves that fact and offers only actions legal under the Arc protocol: complete the remaining commit from the exact parent, carry the partial operation elsewhere, compensate, or wait. It never labels the operation complete.

### Fork

Another operation already descends from the same parent. World displays both heads and requires a separate reconciliation operation. Arrival time, local preference, and first open file do not create causal priority.

### Unknown version

World preserves the exact file for holder export where safe, but refuses phase interpretation or mutation.

## Transactional local writes

A commit can touch:

- source run;
- destination run;
- connected-operation ledger;
- holder-estate index;
- presentation checkpoint;
- local receipts.

World performs a complete validation and preflight before the first write. It snapshots every touched key, writes in a declared order, reads back exact values, and rolls back in reverse order after any failure.

A rollback failure is explicit and produces a recovery artifact containing the intended transaction, prior snapshots, successful writes, failed write, and all exact portable inputs. It is never reduced to a warning.

## Phase presentation

Every phase has text and programmatic state independent of color, animation, or diagram:

```text
prepared
accepted
source committed
destination committed
fully committed
returned
compensated
aborted
partial commit
causally stale
forked
unknown version
```

Participant cards show exact parent and resulting run digests, authority, applied effects, obligations, and unresolved uncertainty. A phase diagram may supplement this information but cannot be its sole carrier.

## Accessibility

Desktop, mobile, keyboard, forced-colors, reduced-motion, and NVDA/Edge acceptance must cover:

- preflight reading order;
- participant and parent identity;
- repeated-delivery no-op;
- stale-parent refusal;
- partial-commit status;
- compensation residual cost;
- fork heads and reconciliation requirement;
- unknown memory preservation;
- export and fresh-context restore.

## Offline custody

A v2 operation can be opened, inspected, preserved, applied when lawful, exported, and carried to another holder without a network. Signatures and attestations may increase confidence in provenance but cannot become prerequisites for reading or preserving a held operation.

## Cross-client equivalence

For identical operation inputs and exact Arc/kernel versions, Arc and World must agree byte-for-byte on:

- prepared operation identity;
- parent match or refusal;
- legal next phases;
- intended and applied effect facts;
- participant commit receipts;
- aggregate phase summary;
- return and compensation facts;
- reconciliation receipt digest.

Presentation and local transport metadata may differ.

## Activation boundary

This receiver is staged after RODOH v1 and after Arc publishes the v2 types and causal conformance vectors. World contains no v2 runtime branch before that source authority exists.
