# Rodoh Holder Estate v1

## Purpose

A cartridge is creator-owned authored law. A portable run is one holder-owned changed record bound to one exact cartridge. A Rodoh holder estate is the holder's complete World-owned browser state carried as one content-bound object.

```text
rodoh-holder-estate/v1
```

It exists so the player can leave a browser profile, machine, or Rodoh installation without selecting and exporting every cartridge revision, save slot, checkpoint, and preference separately.

## Boundary

The holder estate includes exact string values stored under Rodoh-owned namespaces:

- every held cartridge revision and cartridge-bay record;
- every digest-keyed run slot;
- every guided-experience checkpoint;
- every digest-keyed representation preference;
- sensory and locale preferences;
- unknown present or future `axm-world:` and `rodoh:` namespaces.

It excludes:

- unrelated browser storage;
- the Arc and World source repositories;
- npm or browser caches;
- the Codex publication;
- cloud identity or account data;
- any claim that an imported cartridge is signed or trusted.

The local replication snapshot may carry both the software estate and a holder estate. They remain different custody objects.

## File contract

The root contains:

```text
format       rodoh-holder-estate/v1
createdAt    export time
producer     runtime and schema version
records      sorted exact storage-key/value records
summary      deterministic counts and byte totals
integrity    estate1_ SHA-256 over the canonical root without integrity
```

Each record contains its exact key and value together with a semantic class, UTF-8 byte length, and value SHA-256. Record order is lexical and duplicate keys are refused.

Unknown World namespaces are retained as `opaque-world`. The runtime neither parses nor repairs them. It only proves their bytes and carries them through the estate.

## Import phases

### 1. Parse and authenticate

Before the first write, Rodoh verifies:

- the root and nested field sets;
- format and producer version;
- total file, record-count, and per-record size limits;
- key namespace and ordering;
- value byte length and SHA-256;
- deterministic summary;
- root `estate1_` integrity;
- every known storage record's identity-bearing structure.

A malformed known run, checkpoint, preference, or cartridge-bay record fails closed. An unknown namespaced record remains opaque.

### 2. Preflight

The preflight reports four disjoint key sets:

```text
add
change
unchanged
remove
```

`merge` never removes existing World-owned keys. `replace` identifies keys that must be removed to recreate the exported holder state exactly. Unrelated browser keys are never included in `remove`.

### 3. Transaction

Rodoh snapshots every key that can change, writes incoming values in deterministic key order, removes exact-replacement keys, and reads every imported value back. Any thrown write, removal, or read-back mismatch initiates reverse-order rollback.

A failed transaction returns both the initiating error and any rollback failures. It never reports success from a partially installed estate.

### 4. Re-entry

After successful browser import, the player reloads Rodoh so locale, sensory state, shelf contents, save summaries, and selected representation all derive from the newly committed holder estate.

## Modes

### Merge

Use merge when combining a transferred estate with records already held on the receiving installation. Matching values are idempotent. Incoming keys replace different values at the same exact key, but keys absent from the incoming estate remain.

### Replace

Use replace when restoring the exported holder environment exactly. Every current World-owned key absent from the incoming estate is removed transactionally. Unrelated application storage remains untouched.

The browser UI must show the preflight before applying replace mode.

## Limits

Version 1 sets these hard transport limits:

| Limit | Value |
|---|---:|
| Total serialized estate | 32 MiB |
| Storage records | 4,096 |
| One record value | 8 MiB |
| Storage key | 512 characters |

These limits constrain browser resource use. They do not redefine Arc schema limits or portable-run limits.

## Identity and trust

The holder-estate digest proves that the exported root has not changed. It does not prove the human identity of the exporter, publisher identity, or cartridge authorship.

Every included cartridge and run retains its own content and integrity identity. Restoring a holder estate does not promote an unsigned import to bundled or verified trust.

## Compatibility

A v1 runtime may carry opaque future namespaces it cannot interpret. It must reject an incompatible root format, malformed known record, invalid checksum, duplicate key, or unsupported producer version.

A future incompatible estate must use a new root format and an explicit migration event. It may not silently reinterpret `rodoh-holder-estate/v1`.

## Acceptance

The permanent contract requires:

1. Exact export of multiple cartridge revisions, run slots, checkpoints, preferences, and an unknown namespace.
2. Exclusion of unrelated browser storage.
3. Deterministic record ordering, summary, and root integrity.
4. Tamper refusal before write.
5. Merge preflight and idempotent replay.
6. Replace preflight and exact removal of absent World-owned records.
7. Forced late-write failure with byte-exact rollback.
8. Refusal of malformed known records while preserving opaque future namespaces.
9. Desktop and mobile browser export, context clearing, restore, reload, and resume.

The control question is: can the holder leave this browser with every Rodoh-owned fact, install those facts elsewhere, and know that either the complete declared transition happened or none of it did?
