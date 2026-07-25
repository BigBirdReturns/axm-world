# RODOH Local Estate: Start Here

RODOH v1.0.0 is gated on a stronger fact than a green hosted workflow: the exact estate must install, build, run, travel, and resume on the operator's own Windows machine. This directory is the human-readable front door to that gate. The adjacent JSON files and scripts are the machine-readable authority.

## What this estate contains

The estate has two repositories with separate authority:

- **AXM Arc** owns the deterministic engine, source planes, authoring, reference campaigns, exact portable runs, and the text-oriented player.
- **AXM World / Rodoh** owns the spatial player, local estate orchestration, neutral cartridge reception, offline builds, and the release receiver.

The reviewed Codex publication is a third custody object. Books I through III and the Second Recension Addenda describe implemented v1.0 canon. Book IV is publication canon and a staged post-1.0 implementation program. The binary publication bundle does not become runtime source authority merely because it travels with the estate.

## Fast path on Windows 11

Unzip the local estate starter in a durable location such as:

```text
D:\Projects\RODOH-Local-Estate
```

Open **Command Prompt** or **PowerShell** in that directory and run:

```bat
RODOH.cmd full -InstallMissing
```

That command performs the complete automated lane:

1. Checks or installs Git, Node LTS, npm, and PowerShell through `winget`.
2. Clones or fast-forwards the exact Arc and World local-estate branches.
3. Refuses to reset a dirty checkout.
4. Hydrates a local npm cache and Playwright Chromium cache.
5. Verifies Git ancestry, exact Arc identity, the estate lock, and every vendored Arc byte in World.
6. Builds Arc and World twice and requires identical file-tree digests.
7. Runs the complete Arc suite and deterministic reference rebuilds.
8. Runs the complete World suite, Gate 6, Gate 7, and the full desktop/mobile browser suite.
9. Produces a checksummed recovery snapshot containing both Git bundles, source archives, static builds, cartridges, documentation, receipts, and the reviewed publication.
10. Opens the locally built Arc and Rodoh products from dependency-free static servers.

After using both products, run:

```bat
RODOH.cmd accept
RODOH.cmd snapshot
```

The first command records the required human local acceptance. The second rebuilds the durable snapshot so that receipt is included in the archive. No `v1.0.0` tag or release is valid without that receipt.

## Common commands

```bat
RODOH.cmd status
RODOH.cmd doctor
RODOH.cmd sync
RODOH.cmd hydrate
RODOH.cmd verify
RODOH.cmd build
RODOH.cmd test -Scope Arc
RODOH.cmd test -Scope World
RODOH.cmd test -Scope World -FullBrowser
RODOH.cmd play
RODOH.cmd play -Source
RODOH.cmd stop
RODOH.cmd snapshot
RODOH.cmd accept
```

`play` serves the two captured production builds. `play -Source` starts the Vite development servers from the exact checkouts. Both modes bind only to `127.0.0.1`.

## Offline use

The first hydration requires network access unless the starter already contains the dependency caches. After hydration:

```bat
RODOH.cmd hydrate -Offline
RODOH.cmd verify
RODOH.cmd play
```

The local snapshot contains source and builds. The `.rodoh-estate/cache` directory contains npm packages and the tested Chromium binary. Preserve both the snapshot ZIP and the cache directory when moving the estate to a machine that will have no network access.

## Where the durable library lives

All generated state remains outside both Git repositories:

```text
<estate-root>\
  axm-arc\
  axm-world\
  .rodoh-estate\
    cache\
      npm\
      ms-playwright\
    library\
      builds\
      publication\
      snapshots\
    receipts\
    logs\
```

This is deliberate. Git checkouts stay inspectable and clean. Machine caches, local receipts, publication binaries, and snapshots remain local holder custody.

## Human-readable authority

Read these files in order:

1. `START_HERE.md`
2. `LOCAL_REPLICATION.md`
3. `MACHINE_CONTRACT.md`
4. `TROUBLESHOOTING_WINDOWS.md`
5. The repository `README.md`, `VISION.md`, `RECONCILIATION.md`, and accepted design documents copied into each snapshot.
6. The reviewed Codex and professional revision ledger in the publication bundle.

## Machine-readable authority

Programs should begin with:

1. `estate.lock.json`
2. `estate.schema.json`
3. `acceptance-matrix.json`
4. `publication/PUBLICATION_MANIFEST.json`
5. `publication/SHA256SUMS`
6. Generated `estate.manifest.json` and `SHA256SUMS` in each snapshot.
7. Generated receipts under `.rodoh-estate/receipts`.

The machine records never infer acceptance from filenames, branch names, or prose. They bind exact commits, content digests, protocol versions, file hashes, test lanes, builds, and the local operator receipt.
