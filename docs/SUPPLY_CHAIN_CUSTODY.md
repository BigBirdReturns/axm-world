# RODOH supply-chain custody

RODOH separates three claims that are often collapsed into one:

1. `cart1_…` identifies exact authored cartridge law. It detects content change and does not prove authorship.
2. Git history identifies reviewed source changes. A Git commit does not prove which workflow built a distributed archive.
3. A release attestation binds a distributed archive to the repository, commit, workflow, and build event that produced it. It does not prove that the software is safe or that a cartridge publisher is legitimate.

This document governs the third claim. It does not introduce cartridge publisher signing, a marketplace trust system, or a remote service requirement for opening a held cartridge.

## Distributed evidence set

Every coordinated release candidate produces:

```text
evidence/
  artifacts/
    axm-arc-game.tar.gz
    rodoh-world-game.tar.gz
  sbom/
    axm-arc.cdx.json
    axm-world.cdx.json
  provenance.intoto.json
  SHA256SUMS
  attestations/
    rodoh-world-build-provenance.jsonl
    rodoh-world-sbom.jsonl
    trusted_root.jsonl
```

The two static product archives are deterministic tar streams: path order, ownership, permissions metadata, modification time, and gzip timestamp are normalized. The Arc archive is assembled from the exact Arc commit pinned in `estate/estate.lock.json`. The World archive is assembled from the exact candidate head.

The SBOMs use CycloneDX 1.7 and are generated directly from each committed `package-lock.json`. They record the application, exact source commit, package-lock digest, component paths, npm package URLs, integrity hashes when available, licenses when declared, and the resolved dependency graph.

`provenance.intoto.json` is a deterministic in-toto Statement v1 with a SLSA provenance v1 predicate. It records both subject hashes, the exact Arc and World commits, workflow identity, Node and npm versions, lockfile digests, and `SOURCE_DATE_EPOCH`.

`SHA256SUMS` is the transport checksum ledger. It is verified before any attestation is considered.

## Signed GitHub attestations

Pull-request qualification generates and verifies the unsigned deterministic evidence set without publishing an attestation. A main or explicitly dispatched workflow uses `actions/attest@v4` to create:

- build provenance for the Rodoh static archive;
- a CycloneDX SBOM attestation for the same archive.

The action's bundles are copied into the evidence set rather than left only in workflow storage. The workflow also captures a current Sigstore/GitHub trusted root through `gh attestation trusted-root`.

Arc must produce its own signed release attestation from the Arc repository. World may assemble and checksum an Arc build for coordinated reproducibility, but a World signature must never be represented as Arc repository provenance.

The coordinated estate checks out Arc release-evidence head `eb3fd7f53fd72641814cb3939648790e64e9adcf`. The byte-identical product, engine, and creator source plane remain governed by product-authority commit `4b07539a06d40b131591f1e9c7d5b90a96ceec31`.

## Online verification

A connected verifier may use:

```bash
gh attestation verify evidence/artifacts/rodoh-world-game.tar.gz \
  --repo BigBirdReturns/axm-world
```

SBOM verification additionally names the CycloneDX predicate type used by the attestation.

## Offline verification

Move the archive, its attestation bundle, and the captured trusted root into the offline estate. Then run:

```bash
gh attestation verify evidence/artifacts/rodoh-world-game.tar.gz \
  --repo BigBirdReturns/axm-world \
  --bundle evidence/attestations/rodoh-world-build-provenance.jsonl \
  --custom-trusted-root evidence/attestations/trusted_root.jsonl
```

The repository also provides:

```bash
node scripts/supply-chain/verify-offline-evidence.mjs --root evidence
```

That command checks the transport ledger, every provenance subject, CycloneDX structure, and optionally invokes `gh attestation verify` with a supplied bundle and trusted root. It fails closed on missing, altered, escaping, or unsupported records.

A trusted root is a custody artifact with a collection date. It should be refreshed whenever newly signed material is imported into an online staging environment. An old root can continue to verify older signatures but cannot report later revocations or key rotations.

## Threat model

This lane addresses:

- a release archive being replaced after review;
- an archive being attributed to the wrong source commit or workflow;
- lockfile dependency contents becoming opaque to the holder;
- an offline estate retaining binaries while losing the evidence needed to verify them;
- World accidentally claiming Arc repository provenance.

It does not establish that dependencies are vulnerability-free, that the build runner was free of every possible compromise, or that a cartridge publisher's identity is legitimate. Those claims require separate policy and evidence.

## Release gate

The final `v1.0.0` compatibility manifest must name:

- exact Arc and World commits;
- static archive SHA-256 values;
- SBOM SHA-256 values;
- provenance predicate and workflow identity;
- attestation bundle SHA-256 values;
- trusted-root SHA-256 and capture time;
- the local operator acceptance receipt and recovery snapshot.

No release tag is valid when the archive, checksum ledger, SBOM, provenance, attestation, and local operator receipt refer to different candidate heads.
