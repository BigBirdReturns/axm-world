# MotionDeck Stardew Cabinet Runtime v0.1.0 bootstrap

This directory is the content-addressed binary transport and reconstruction boundary for:

```text
labs/motiondeck-stardew-cabinet-runtime-v0.1.0
```

```text
source archive SHA-256
59fe7730b13e612478522f1e41c5753afcf2707816f52964b9fef7a84f3d4f6d

source ledger SHA-256
636b0d1e86e95542558e08ace7f67cea1538b7fa5776868448af1cf1a96743fd

source files governed
73

local contract tests
26 / 26

local selftest receipt
cabinetselftest1_1754f648e9f5faef06d3f8efd4842c500565f71ffc5a253b8e1f15e200675788

qualification digest
cabinetqualification1_37c47d3df3415b7e83079c5aebd29afeabbf4167c354faf70530e82039856973
```

Materialize and verify:

```text
node ./labs/motiondeck-stardew-cabinet-runtime-v0.1.0-bootstrap/materialize.mjs
```

The compressed archive is split into four ordered binary files under `carrier/`; each is stored as an ordinary Git blob and reassembled before verification. The materializer refuses a carrier mismatch, unsafe archive path, unexpected root, symbolic link, source-ledger mismatch, or replacement of divergent reviewable source.

The package implements the source and synthetic contract for `BigBirdReturns.MotionDeckCabinetRuntime`. It does not claim a live Stardew launch, compiled SMAPI mods, Quest tracking, television presentation, physical input, save continuity, player acceptance, or production authority.
