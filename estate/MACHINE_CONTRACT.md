# Machine Contract

## Authority order

Machine consumers resolve the estate in this order:

1. `estate.lock.json` fixes repositories, ancestry, protocol versions, cartridge identities, toolchain range, paths, ports, publication digest, and the required receipt format.
2. `estate.schema.json` describes the lock's structural contract.
3. `acceptance-matrix.json` fixes the automated and human evidence lanes.
4. Repository Git objects fix source history.
5. `src/engine/VENDORED_FROM` fixes the Arc plane World must carry byte-for-byte.
6. Cartridge `cart1_` identities fix authored law.
7. Portable-run `run3_` integrity fixes changed holder state.
8. Snapshot `estate.manifest.json` and `SHA256SUMS` fix the offline library.
9. `local-operator-acceptance.json` fixes the human local gate.

No later item may silently rewrite an earlier one. A receipt can report a digest; it cannot replace the content that produces that digest.

## Repository lock semantics

AXM Arc uses an exact local-estate commit because its branch contains the deterministic production-build correction outside the vendored engine plane. AXM World uses a required ancestor plus a named branch because the local-estate scripts, documentation, workflows, and receipts are themselves developed after the accepted product baseline.

The terminal human receipt records the exact World head actually tested. The eventual release manifest must freeze that exact pair rather than resolving a moving branch name.

## Clean-tree law

Every operation that can alter generated files checks repository cleanliness first. The orchestrator may restore only `docs/game` after it has established that the path was clean before a build. It does not reset other paths, delete untracked work, or resolve a merge conflict on the user's behalf.

A dirty repository is a bounded refusal. The operator must commit, stash, relocate, or discard that work deliberately.

## Dependency law

`package-lock.json` and `npm ci` own JavaScript dependency resolution. The estate records both lockfile hashes and maintains local npm and Playwright caches. A global package installation can satisfy the initial command lookup, but it cannot substitute for the lockfile-installed project dependencies.

The offline proof uses `npm ci --offline` against the estate cache. A network fallback invalidates that offline receipt.

## Build law

The production build gate runs each repository twice from one clean head. Both file trees must have identical ordered path, byte-length, and SHA-256 records.

Build outputs are copied into holder custody and removed from the working tree through `git restore` only after the pre-build path was proven clean.

`SOURCE_DATE_EPOCH=0` is supplied for local qualification. AXM Arc also uses the exact Git identity rather than `Date.now()` in its service-worker cache name. The resulting tree digest is a receipt of the built product, not a replacement for the source commit.

## Vendored-plane law

World's `src/engine/VENDORED_FROM` declares every shared path. `estate-tools.mjs compare-vendored` expands those paths in both repositories, excludes only World-owned `VENDORED_FROM`, and compares every file by byte length and SHA-256 in both directions.

A file missing on either side, an extra file under a declared path, or any byte difference fails verification.

## Cartridge and run law

Current v1.0 product identities are fixed in the lock. Historical identities remain evidence locators and never alias current authored law.

The clean-room cartridge remains:

- unbundled;
- outside the Program-of-Record registry;
- imported through the ordinary file input;
- rendered with neutral presentation;
- capable of complete deterministic play;
- portable through `axm-cartridge-run/v3`;
- able to preserve unknown namespaced memory.

The malformed Orchard companion must fail ordinary validation without installing any partial cartridge or receiver-authored repair.

## Publication law

The reviewed Codex ZIP is a publication artifact with its own SHA-256 and internal checksum ledger. It travels in the estate library but is not parsed as runtime source authority.

Books I through III and the Second Recension Addenda align with implemented v1.0 canon. Book IV is reviewed canon with staged post-1.0 implementation contracts. A local operator may read Book IV without causing a Book IV source plane, receiver, or Program number to exist.

## Snapshot law

A valid snapshot contains complete Git bundles, source archives, static builds, human documentation, cartridges, publication, receipts, and file manifests. The manifest excludes itself and its checksum list from the covered set to avoid circular hashing.

`verify-manifest` checks every recorded file. A snapshot whose manifest no longer verifies is damaged or modified and cannot be used as release evidence.

## Human receipt law

`rodoh-local-operator-acceptance/1` can be generated only after the automated receipts exist and both local servers respond. It records:

- UTC acceptance time;
- exact Arc and World heads and branches;
- snapshot and publication hashes;
- a hashed machine fingerprint;
- explicit pass values for each operator check;
- the bounded acceptance statement.

The receipt does not prove that every future machine will behave identically. It proves that one exact estate pair was replicated and played locally on the recorded machine. Every release machine must produce its own receipt.

## v1.0 release rule

The following condition is conjunctive:

```text
hosted exact-head gates
AND Windows local automated gates
AND verified local snapshot
AND human local operator receipt
AND exact release commit pair
```

A missing term blocks `v1.0.0`. CI success alone is insufficient. A human statement without machine receipts is also insufficient.
