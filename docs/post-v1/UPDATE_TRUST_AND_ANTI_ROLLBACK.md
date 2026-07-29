# Update trust and anti-rollback law

## Current boundary

RODOH v1 has no automatic updater. Git synchronization is a development and local-estate reconstruction mechanism. It is not an end-user update protocol.

A holder can continue opening, playing, exporting, and preserving a cartridge and run when every update service is unavailable. This remains constitutional after an updater exists.

## Threats

A post-v1 updater must address:

- rollback to a previously vulnerable but correctly signed release;
- freeze on expired metadata while presenting the installation as current;
- mix-and-match of files or metadata from different releases;
- compromise of one online signing key;
- replacement of a release artifact after review;
- installation of an artifact for the wrong platform, architecture, or compatibility floor;
- partial activation that leaves source, build, receipt, or holder state on incompatible versions;
- forced migration without an inspectable exit path;
- loss of the last known-good offline build;
- update-service unavailability becoming a play gate.

## Candidate metadata model

The post-v1 candidate follows the role separation used by The Update Framework:

```text
root
targets
snapshot
timestamp
```

The implementation may use compatible tooling rather than inventing cryptography, but RODOH's local-first custody rules remain binding.

### Root

Root metadata declares trusted keys, thresholds, role delegations, metadata versions, and expiry. Root rotation requires threshold-authorized continuity from the currently trusted root or an explicit offline recovery ceremony.

The client persists the highest accepted root version and refuses rollback.

### Targets

Targets metadata binds exact release files to:

- SHA-256 and byte length;
- Arc and World commit identities;
- semantic versions;
- operating system and architecture;
- engine, save, run, source-plane, holder-estate, and connected-operation compatibility;
- required migrations;
- release attestations, SBOMs, and publication artifacts;
- optional delegated channels such as stable, preview, or development.

No target may be selected solely by a mutable filename.

### Snapshot

Snapshot metadata binds the exact versions and hashes of the current targets and delegated metadata. It prevents a client from accepting individually valid records assembled from incompatible repository states.

### Timestamp

Timestamp metadata supplies a short-lived view of the current snapshot when connected. It limits freeze attacks. Expiry prevents the updater from claiming freshness. Expiry does not prevent the holder from using the already accepted local installation.

## Local anti-rollback state

The updater preserves, outside the downloadable metadata:

```text
highest accepted root version
highest accepted snapshot version per channel
highest accepted release version per product
current exact Arc and World pair
last known-good pair
pending staged pair
migration receipts
failed activation receipts
```

This state is included in `rodoh-holder-estate/v1` or a related system-estate export only when doing so cannot let an imported holder archive weaken the machine's anti-rollback floor. Holder state and machine trust state therefore remain separately classified.

Importing an older holder estate may restore old runs. It may not authorize installation of old software.

## Staged update transaction

An update follows this sequence:

1. Fetch or open a complete metadata bundle.
2. Verify root continuity, expiry, thresholds, snapshot consistency, and target hashes.
3. Verify release attestations and SBOM evidence under the accepted release policy.
4. Check operating system, architecture, protocol, and migration compatibility.
5. Download or open all targets into a new staging directory.
6. Verify every staged byte and build manifest.
7. Export or checkpoint the current holder estate and machine update state.
8. Run static health, schema, migration dry-run, and bounded browser smoke against the staged build.
9. Present incompatible migrations and required consent.
10. Atomically switch the local launcher pointer to the staged build.
11. Boot and verify the new build before marking it accepted.
12. Preserve the prior build until the new build has a successful local receipt.
13. On failure, restore the prior launcher pointer and record the failed activation without deleting evidence.

The updater never mutates an accepted build in place.

## Offline bundles

An offline update bundle contains:

```text
trusted root chain or required root transition
current timestamp and snapshot metadata
targets and delegated metadata
all target files
release attestations and trusted verification material
SBOMs and file checksums
migration descriptions and dry-run tooling
human release notes
```

Offline verification is complete before activation. A bundle may be transported by any medium. Network access cannot become a hidden prerequisite during install.

## Consent and migrations

Additive compatible changes may stage and activate under the configured channel policy. Incompatible changes require an explicit migration event that states:

- affected protocols and records;
- source and target versions;
- exact transformations;
- irreversible effects;
- rollback limitations;
- holder-estate export path;
- refusal and defer options;
- responsible authority.

A migration refusal leaves the old build and holder estate usable. The system may warn that newer cartridges require a newer runtime. It may not destroy the older custody surface to compel adoption.

## Key compromise

The role separation assumes keys can fail.

- Online timestamp and snapshot keys use narrow authority and short expiry.
- Targets can be delegated by channel or product.
- Root authority uses a higher threshold and should include offline keys.
- Emergency root rotation is a documented ceremony with independent verification.
- Revocation affects future update acceptance. It does not rewrite historical release receipts.

## Relationship to release attestation

Update metadata answers which target a client may install. A release attestation answers where a target was built. An SBOM describes its dependency contents. A checksum proves exact bytes. None substitutes for the others.

The updater verifies the conjunction required by release policy.

## Acceptance

The post-v1 implementation must prove:

1. current update accepted;
2. older correctly signed release refused as rollback;
3. expired timestamp reported without blocking current local play;
4. mixed snapshot and targets refused;
5. altered target refused;
6. wrong platform refused;
7. staged health failure restores the prior build;
8. incompatible migration can be declined without custody loss;
9. offline bundle verifies and activates with network disabled;
10. root rotation succeeds only through the threshold-authorized chain;
11. imported holder estate cannot lower machine anti-rollback state;
12. last known-good and failed activation receipts survive recovery export.

## Activation boundary

This is post-v1 design authority. RODOH v1 ships immutable release archives, attestations, checksums, offline reconstruction, and explicit local operator acceptance. It does not ship an automatic updater or create root, targets, snapshot, or timestamp metadata as runtime authority.
