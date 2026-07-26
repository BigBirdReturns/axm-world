# Local Replication and Playbook

## Acceptance object

The acceptance object is the complete local estate, not one repository and not one browser build. A valid local reproduction contains:

- an exact AXM Arc checkout;
- an exact descendant of the accepted AXM World product baseline;
- matching vendored Arc bytes inside World;
- lockfile-installed dependencies or an offline cache capable of recreating them;
- reproducible Arc and World production builds;
- the five first-party cartridges;
- the unbundled Orchard clean-room proof and its malformed and changed-run fixtures;
- the reviewed four-book Codex and Addenda publication bundle;
- automated receipts;
- a human local operator receipt;
- Git bundles, source archives, static builds, manifests, and checksums sufficient for recovery without GitHub.

## Fresh Windows machine procedure

### 1. Place the starter

Use a short, durable path. The scripts support spaces, but a project root such as `D:\Projects\RODOH-Local-Estate` is easier to inspect and move.

The starter directory must contain:

```text
RODOH.cmd
scripts\local-estate\
estate\
publication\The_Godscar_Codex_Professional_Reviewed_Four_Books_and_Addenda.zip
```

### 2. Run the doctor

```bat
RODOH.cmd doctor -InstallMissing
```

The doctor accepts Node majors 22 through 24 and records the actual versions used. CI is pinned to Node 22. `npm ci` is mandatory. `npm install` does not constitute release evidence because it may rewrite dependency resolution.

The doctor also checks the estate path, free disk space, and whether ports 5173 and 5174 are already in use.

### 3. Sync exact source

```bat
RODOH.cmd sync
```

The sync operation follows four rules:

1. A missing repository is cloned from its locked branch.
2. An existing repository must be clean.
3. Updates are fast-forward only.
4. The resulting head must contain the recorded authority ancestor. AXM Arc additionally must equal its exact local-estate commit.

The operation never runs `git reset --hard`, never cleans untracked human files, and never silently changes a branch containing local work.

### 4. Hydrate dependencies

```bat
RODOH.cmd hydrate
```

This creates holder-owned caches under `.rodoh-estate/cache` and runs `npm ci` in both repositories. Playwright Chromium is installed into the estate cache rather than a transient user profile.

To prove the cache later:

```bat
RODOH.cmd hydrate -Offline
```

An offline failure is evidence that the cache is incomplete. It is not permission to fall back to an unrecorded global package store.

### 5. Verify source custody

```bat
RODOH.cmd verify
```

Verification checks:

- `estate.lock.json` has the expected format and required fields;
- both repositories are clean;
- branch and ancestry contracts hold;
- AXM Arc equals the exact local-estate commit;
- every path declared in World `src/engine/VENDORED_FROM` is byte-identical to Arc;
- the publication manifest is present;
- all resulting facts are recorded under `.rodoh-estate/receipts`.

### 6. Build reproducibly

```bat
RODOH.cmd build
```

Each repository is built twice from the same clean checkout with `SOURCE_DATE_EPOCH=0`. The generated `docs/game` tree is copied out, restored to Git, rebuilt, and hashed. Different tree hashes fail the build gate.

AXM Arc's service-worker cache identifier is derived from the exact Git commit rather than the wall clock. This removes the previous timestamp-only build drift.

The accepted static outputs are copied to:

```text
.rodoh-estate\library\builds\axm-arc-game
.rodoh-estate\library\builds\rodoh-world-game
```

### 7. Run automated qualification

```bat
RODOH.cmd test -Scope Arc
RODOH.cmd test -Scope World -FullBrowser
```

Arc qualification includes type checking, the complete test suite, deterministic rebuilding of every canonical reference artifact, and production build.

World qualification includes strict Arc drift, type checking, the complete test suite, production build, the Common Ship Gate 6 journey, the neutral clean-room Gate 7 journey, and the complete desktop/mobile Playwright suite when `-FullBrowser` is supplied.

The full release lane requires `tests-browser.json`, so a local `v1.0.0` acceptance cannot be assembled from focused tests alone.

### 8. Create a recovery snapshot

```bat
RODOH.cmd snapshot
```

The snapshot contains:

- `axm-arc.bundle` and `axm-world.bundle`, created with `git bundle --all`;
- exact `git archive` source ZIPs;
- both static builds;
- human-readable repository documentation and cartridge libraries;
- machine-readable estate files and all current receipts;
- the reviewed Codex publication bundle and its manifest;
- `estate.manifest.json` and `SHA256SUMS` covering every snapshot file;
- a compressed snapshot ZIP with its own SHA-256 receipt.

Recovery from the bundles does not require GitHub:

```bat
git clone axm-world.bundle axm-world
git clone axm-arc.bundle axm-arc
```

### 9. Play the captured builds

```bat
RODOH.cmd play
```

The default play command serves the captured production builds through a dependency-free Node static server:

```text
Rodoh:  http://127.0.0.1:5173/axm-world/game/
Arc:    http://127.0.0.1:5174/axm-arc/game/
```

Use `RODOH.cmd play -Source` to inspect the exact source trees through Vite instead. Server process IDs and logs are written under `.rodoh-estate`. Stop both with:

```bat
RODOH.cmd stop
```

### 10. Perform the human gate

Use the products before generating the receipt. At minimum:

- enter Arc and confirm a playable authored cartridge;
- enter Rodoh and inspect all five first-party entries;
- complete one visible first-party decision and resolution;
- import The Orchard at Low Tide and confirm holder-owned neutral presentation;
- export a run, clear local holder state, import the run, and resume it;
- open the reviewed Codex publication bundle;
- inspect the snapshot contents.

Then run:

```bat
RODOH.cmd accept
```

The script requires explicit `YES` answers and records exact repository heads, the snapshot, publication digest, and a privacy-preserving machine fingerprint hash. It does not record the machine name or Windows username.

Run `RODOH.cmd snapshot` again after acceptance so the final archive includes the terminal receipt.

## Moving between machines

Git remains the change synchronization layer. The snapshot is the disaster-recovery and offline layer.

On the sending machine:

```bat
RODOH.cmd stop
RODOH.cmd verify
RODOH.cmd snapshot
```

Move these items:

```text
latest rodoh-estate-*.zip
.rodoh-estate\cache\npm
.rodoh-estate\cache\ms-playwright
```

On the receiving machine, unpack the snapshot, clone the two bundles, place the caches under the new estate root, and run:

```bat
RODOH.cmd hydrate -Offline
RODOH.cmd verify
RODOH.cmd build
RODOH.cmd play
```

A receipt from one machine is historical evidence. A new machine must produce its own local operator receipt before it becomes the release machine.

## What local acceptance does not claim

Local acceptance proves exact source custody, deterministic engine execution, reproducible local builds, browser playability, portable-run custody, neutral generalization, and publication availability on the tested machine. It does not claim cloud services, multiplayer, marketplace custody, signed publisher identity, cinematic media, universal preference, or implementation of Book IV.
