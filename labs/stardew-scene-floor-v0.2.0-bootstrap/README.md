# Stardew Scene Floor v0.2.0 bootstrap

This directory is the content-addressed transport and reconstruction boundary for the reviewable source package:

```text
labs/stardew-scene-floor-v0.2.0
```

The ordinary source tree is carried as eight Base64 parts, reconstructed only after the compressed archive matches its pinned SHA-256, and then verified against the source package's internal `SOURCE_SHA256SUMS` ledger.

## Pinned identities

```text
source archive SHA-256
5bb558a7b0cc437a075bbe9ed004eac7aaf9412e6ab6ff6f41fa1ecb0a2593a3

source ledger SHA-256
d2c5214d07161dd27b1eb8ac9b90d72fb867b9787585fce29b1967ee4c90e629

selftest receipt
stardewscenereceipt1_ed5154e9c2157f0291612e5c9dcd66e7a002671ed9eb68f9f32e6da210872b98

qualification digest
stardewscenequalification1_26a7e698d307c2894aeb99b86e0f2c4a918b942708b43f7613a2e1e80dc03d26
```

## Reconstruction

```text
node ./labs/stardew-scene-floor-v0.2.0-bootstrap/materialize.mjs
```

The materializer refuses:

- a carrier hash mismatch;
- an unsafe archive member;
- a symbolic link in the payload;
- a source-ledger mismatch;
- replacement of divergent reviewable source already present in the checkout.

## Continuous qualification

`.github/workflows/materialize-stardew-scene-floor.yml` reconstructs the ordinary source independently on:

```text
Ubuntu / Node 20
Ubuntu / Node 22
Windows / Node 20
Windows / Node 22
```

Each matrix job must pass:

```text
source custody verification
35 JavaScript syntax checks
50 admission and refusal contracts
bounded selftest
ordinary-source artifact publication
```

Each successful job publishes the materialized source package and its root qualification workflow as a GitHub Actions artifact. The branch therefore retains a compact content-addressed transport, while every supported qualification environment produces an ordinary reviewable tree from those exact bytes.

## Authority

```text
static authority: none
player-product authority: none
production authority: none
```

The package does not claim a real Stardew installation, community-mod runtime, save round trip, multiplayer session, OpenXR path, Quest, television, controller, hand tracker, or compiled SMAPI bridge. Cabinet mode remains blocked until the exact `BigBirdReturns.MotionDeckCabinetRuntime` exists and passes live and physical acceptance.
