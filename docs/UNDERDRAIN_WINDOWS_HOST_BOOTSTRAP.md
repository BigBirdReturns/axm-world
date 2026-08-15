# UNDERDRAIN Windows host bootstrap

The Windows host bootstrap is the read-only admission layer in front of the existing ten-gate UNDERDRAIN commissioning state. Its object is one local machine transaction. It discovers or verifies the exact World checkout, ARC checkout, `Embodied-AR-Lab` Unity project, Unity 6000.0.66f2 editor, exact Shine standalone, and resolved seven-role source pack. It then invokes the existing commissioning-state inspector only when the three source roots are exact and clean.

The bootstrap does not install software, clone or repair repositories, run `git pull`, change branches, reset a worktree, invoke Unity, materialize assets, approve a representation, launch a player, issue review, accept a product, or claim human, household, Quest, accessibility, or physical evidence.

## Authority

A source-qualified bootstrap kit binds:

```text
World commit and tree
ARC commit and tree
Unity 6000.0.66f2
underdrain-bloom-below-unity6000-v1
UNDERDRAIN_The_Bloom_Below_Shine_v0.4.html
bytes   828259
sha256  ab9e1a542f89d66733d0b9946fd9f2b724e5e09395a74611fa760d336c209311
```

The portable kit records those values in:

```text
HOST_BOOTSTRAP_LOCK.json
```

The script refuses a conflicting ARC authority, Unity version, or Shine identity. When the lock is absent, the caller must supply the exact World commit and tree. This supports synthetic qualification without allowing an unbound production run.

## Receipt

The bootstrap writes:

```text
rodoh-underdrain-windows-host-bootstrap/1
```

The default project-relative location is:

```text
local\scene-jobs\<JobId>\output\host-bootstrap\
  underdrain-windows-host-bootstrap.json
  underdrain-windows-host-bootstrap.json.sha256
  underdrain-windows-host-bootstrap.txt
```

When the Unity project has not been found, it writes the same receipt under the caller's current directory unless `-OutputRoot` is supplied.

The receipt contains the expected authorities, bounded search roots, every inspected candidate, exact selected roots, the current commissioning receipt and digest, the first divergence, the next command, and explicit non-claims. It also records that repositories were not changed, Unity was not invoked, and no representation, approval, review, product, Quest, or physical acceptance was issued.

## Status semantics

```text
pass
  The exact target roots are admitted and the inputs required by the
  current first divergence are available. The emitted next command is
  eligible to run.

open
  No contradiction was found, but one or more required roots or current
  gate inputs are absent. The receipt names the missing object.

held
  A supplied or discovered object is contradictory, stale, dirty,
  ambiguous, malformed, or outside its declared root. Exit code 2 is
  returned unless -NoFail is supplied.
```

A successful discovery is not a product acceptance. A `pass` bootstrap receipt authorizes only the next bounded commissioning action shown in the receipt.

## Bounded discovery

The bootstrap first checks conventional estate paths under each search root:

```text
Organs\AXM\axm-world\main
Organs\AXM\axm-arc\main
Embodied-AR-Lab
Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe
Evidence\underdrain\resolved-role-assets
```

It also checks the search root itself so a caller may point directly at a checkout or Unity project. Default search roots include existing `D:\Projects`, `C:\Projects`, the user's `Projects` directory, the current directory, and the optional environment variables:

```text
AXM_ESTATE_ROOT
AXM_PROJECTS_ROOT
AXM_PROJECT_ROOT
```

`-DeepSearch` enables a breadth-first, depth-limited directory search. It skips repository internals, Unity `Library`, dependency trees, build outputs, caches, virtual environments, recycle bins, and system-volume metadata. It never performs an unbounded whole-drive crawl.

An exact candidate is selected only when its identity is unique. Two clean checkouts at the same expected World commit and tree are an ambiguity and therefore a hold. The operator must supply the intended root explicitly rather than allowing arbitrary selection.

## Source and project controls

The World checkout must have the exact expected commit and tree and a clean `git status`. The ARC checkout is governed by the same conditions. The Unity project must contain `Assets`, `Packages`, and `ProjectSettings`, and `ProjectVersion.txt` must declare Unity 6000.0.66f2.

The Unity editor is admitted only when its path is under a version directory named `6000.0.66f2`. The bootstrap does not execute the editor to discover its version.

The resolved seven-role source must be:

```text
rodoh-underdrain-resolved-representation-source/1
```

It must bind the exact product, Unity version, and Shine digest; contain all seven semantic roles; use seven distinct prepared byte digests; keep every asset under the declared source root; reproduce every declared SHA-256; remain concrete rather than template-only; require review; and issue no approval or product acceptance.

The seven roles are:

```text
player:rhea-venn
enemy:skirmisher
enemy:duelist
enemy:swarm
enemy:hexer
enemy:breaker
arena:pump-seven
```

The exact Shine standalone is an acquisition input, not a resolved production-role pack. Finding it does not make representation materialization ready. When the standalone is exact but the resolved pack is absent, the bootstrap directs the operator through extraction, role mapping, and resolution before another inspection.

## First use from a fresh shell

Extract the source-qualified bootstrap kit, then run:

```powershell
Set-Location D:\Commissioning\underdrain-windows-host-bootstrap-kit

.\RUN_HOST_BOOTSTRAP.ps1 `
  -SearchRoots D:\Projects `
  -DeepSearch
```

For the known estate layout, an explicit invocation is narrower:

```powershell
.\RUN_HOST_BOOTSTRAP.ps1 `
  -WorldRoot D:\Projects\Organs\AXM\axm-world\main `
  -ArcRoot D:\Projects\Organs\AXM\axm-arc\main `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab
```

When the resolved seven-role source already exists:

```powershell
.\RUN_HOST_BOOTSTRAP.ps1 `
  -WorldRoot D:\Projects\Organs\AXM\axm-world\main `
  -ArcRoot D:\Projects\Organs\AXM\axm-arc\main `
  -EmbodiedArLabRoot D:\Projects\Embodied-AR-Lab `
  -UnityEditor "C:\Program Files\Unity\Hub\Editor\6000.0.66f2\Editor\Unity.exe" `
  -ResolvedSourceManifest D:\Evidence\underdrain\resolved-role-assets\resolved-representation-source.json `
  -ResolvedSourceRoot D:\Evidence\underdrain\resolved-role-assets
```

The first run should normally report:

```text
commissioning first divergence
representation-materialization
```

If the exact resolved source and Unity editor are present, the bootstrap emits the complete representation-materialization command with no placeholders. If the first divergence is later, the resolved source and Shine acquisition checks become informational unless the caller supplied a contradictory explicit object.

## Failure handling

Do not delete a held bootstrap receipt. Correct the first held object, rerun into the same output root, and preserve both timestamps. Do not choose between ambiguous exact repositories by directory order. Supply the intended path explicitly.

A missing object is open. A wrong object is held. A later success supersedes the earlier attempt by exact identity and evidence, but it does not erase the earlier diagnosis.
