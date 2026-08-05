# Windows Troubleshooting

## `RODOH.cmd` cannot find PowerShell

Windows 11 normally includes Windows PowerShell 5.1. The launcher prefers `pwsh.exe` and falls back to `powershell.exe`.

Run:

```bat
where pwsh
where powershell
```

When neither command resolves, install PowerShell through the Microsoft Store or:

```bat
winget install --id Microsoft.PowerShell -e
```

## Git or Node was installed but the current terminal still cannot see it

Close and reopen the terminal, then run:

```bat
RODOH.cmd doctor
```

The script refreshes its process PATH after a `winget` installation, but some installer changes are not visible to already-running parent terminals.

## Node version is rejected

The local estate accepts Node 22, 23, or 24. CI uses Node 22. Remove or move an unsupported Node executable earlier on PATH, then install Node LTS:

```bat
winget install --id OpenJS.NodeJS.LTS -e
node --version
```

## `npm ci --offline` fails

The cache is incomplete. Run one connected hydration first:

```bat
RODOH.cmd hydrate
```

Preserve the entire `.rodoh-estate\cache\npm` directory. Copying only `node_modules` is not an offline dependency archive because it cannot reconstruct both projects from their lockfiles.

## Playwright cannot find Chromium

Run:

```bat
RODOH.cmd hydrate
```

The browser cache belongs under:

```text
.rodoh-estate\cache\ms-playwright
```

Do not rely on a browser installed into another Windows profile. The workflows and scripts set `PLAYWRIGHT_BROWSERS_PATH` to the estate cache.

## A repository is dirty

The orchestrator refuses to continue and prints `git status --porcelain`. Inspect the repository:

```bat
git -C axm-world status
git -C axm-arc status
```

Commit, stash, or relocate the changes. The estate script intentionally has no force-reset path for human work.

`-Force` does not authorize destructive cleanup. It is reserved for future bounded operations and does not bypass the clean-tree law.

## A branch cannot fast-forward

Your local branch and the remote branch have diverged. Preserve your branch before resolving:

```bat
git -C axm-world branch local/preserved-before-sync
git -C axm-world status
git -C axm-world log --oneline --decorate --graph --all -30
```

Do not reset until you understand which commits exist only locally. The local estate's Git bundle snapshot is also a recovery source.

## Vendored-plane verification fails

Run:

```bat
RODOH.cmd verify
```

The failure names the first mismatching shared paths. World must not repair these bytes manually. Reconcile through the accepted Arc source and the repository sync process.

## Reproducible builds have different hashes

Check:

```bat
git -C axm-arc status
git -C axm-world status
node --version
npm --version
```

The build gate supplies `SOURCE_DATE_EPOCH=0`. A difference usually indicates a new wall-clock value, random identifier, machine path, unordered directory traversal, or environment-dependent build transform. Preserve both scratch outputs before changing the build law if deeper comparison is needed.

## Port 5173 or 5174 is occupied

First stop the estate servers:

```bat
RODOH.cmd stop
```

Then identify the owner:

```bat
netstat -ano | findstr :5173
netstat -ano | findstr :5174
```

Use Task Manager or `taskkill /PID <pid> /T /F` only after confirming the process is safe to stop.

## The local page returns 404

Use the complete base paths:

```text
http://127.0.0.1:5173/axm-world/game/
http://127.0.0.1:5174/axm-arc/game/
```

The static server deliberately mirrors the deployed base paths. Opening only `http://127.0.0.1:5173/` is not the Rodoh route.

## The publication bundle is missing

Place this exact file under `.rodoh-estate\library\publication` or pass it explicitly:

```text
The_Godscar_Codex_Professional_Reviewed_Four_Books_and_Addenda.zip
```

```bat
RODOH.cmd snapshot -PublicationBundle D:\Path\To\The_Godscar_Codex_Professional_Reviewed_Four_Books_and_Addenda.zip
```

The required SHA-256 is recorded in `estate\publication\PUBLICATION_MANIFEST.json`. A different file is refused even when the filename matches.

## `accept` says an automated receipt is missing

Run the full automated lane:

```bat
RODOH.cmd full
```

The human gate requires the full browser receipt and a verified preliminary snapshot. Focused tests do not satisfy this requirement.

## A snapshot checksum fails

Treat the snapshot as damaged or modified. Recover from another verified copy or rebuild it:

```bat
RODOH.cmd verify
RODOH.cmd snapshot
```

Never edit files inside a snapshot and retain the old manifest. A modified library needs a new manifest and checksum ledger.

## Recovery without GitHub

From a verified snapshot:

```bat
git clone axm-world.bundle axm-world
git clone axm-arc.bundle axm-arc
```

Copy the npm and Playwright caches beside those repositories, then run:

```bat
RODOH.cmd hydrate -Offline
RODOH.cmd verify
RODOH.cmd build
RODOH.cmd play
```
