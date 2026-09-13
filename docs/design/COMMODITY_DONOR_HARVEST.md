# Commodity donor harvest — lane F

Audited 2026-09-13 from local git objects in `docs/donor-harvest-adapters`.
Starting HEAD, local `main`, and cached `origin/main` were all
`2bb5bee05a791fa464eddcb9cf97d62065f8cc3d`. No fetch, donor checkout, merge,
host execution, or donor deletion was performed. Remote-tracking names below
are observed local references, not a claim about the current server.

This is the detailed harvest for [the capability ledger](COMMODITY_CAPABILITY_LEDGER.md).
Product sequencing and authority remain those in `VISION.md`, `CLAUDE.md`,
ADR 0002, and `WORLDS_ROADMAP.md`. These donors do not reopen the First Charter
or add prerequisites to its cold-start, complete-campaign player loop.

## Exact source register

Every path in the matrix is relative to the repository at the indicated donor
head, **not** a file to restore into main. Full commit identities make this
register independent of later branch movement.

| ID / lane | Observed branch (`refs/remotes/origin/` prefix) | Exact head |
| --- | --- | --- |
| L — local representation authoring | `feature/underdrain-local-representation-authoring-v1` | `cd6f6ed5d4ce753b8a3d03e42d8c1fdee14c5321` |
| M — Unity materializer | `feature/underdrain-production-representation-materializer-v1` | `3c0d23c3fb20bca3f2932a442bdb1a0ad09da66e` |
| T — Unity target-host train | `feature/underdrain-unity6000-player-train-v1` | `7130afd86dc8bf0796db529e43ad4707c76f8627` |
| S — Shape Field shadow | `feature/underdrain-shape-field-shadow-v1` | `1c661e7b3c8d8213cbd044fb584be40bf1aeb8a4` |
| H — Stardew/MotionDeck host seam | `agent/stardew-host-seam-commodity-v1` | `8e6a7ed7b843c2eb072835f00b871583da9a5e57` |
| Q — QuestStage appliance floor | `agent/queststage-appliance-floor-v0.1.0-build` | `ed3fb81384f73f5d23b1a22b08e245e62f30fe61` |

Reproduce with `git show <full-head>:<path>`, `git log <head> -- <path>`,
`git ls-tree -r --name-only <head>`, and
`git for-each-ref --points-at=<head> --format='%(refname)'`.
The audit read implementation, guards, and retained receipts, not just summaries.
Donor tests were inspected as historical evidence; they were not executed on a
reconstructed donor installation.

## Harvest matrix

Target pillars below name responsibilities in the mature system. Existing
interfaces are named explicitly; proposed adapters are not claimed to ship.
All retirement conditions also require the common custody condition below.

| Source ID / exact paths at registered head | Invariant learned | Code or mechanism worth extracting | Literals and product state that must not migrate | Target mature pillar / interface | Donor retirement condition |
| --- | --- | --- | --- | --- | --- |
| **L**: `scripts/author-underdrain-production-representation.mjs` (`requireWithinRoot`, `loadExtraction`, `serveReview`); `scripts/stage-underdrain-production-representation.ps1`; `tests/world/underdrain-representation-authoring.test.ts` | A browser selection is a proposal. Independently verify inventory identity, source hash/dimensions, crop bounds, coverage and returned bytes before staging. Source-sheet reuse is legitimate; distinct source keys do not prove distinct output. Staging leaves visual review open. | Loopback token/CSP boundary; one server-side validator for interactive and fixture submission; temporary output then rename; exact-byte file receipt verification. **Extracted only the file boundary**, used by the existing pack auditor. Crop selection and local UI remain future provider adapters. | Seven-role set, Rhea Venn/Pump Seven/enemy kits, Shine `ASSET_DATA` source filename/hash, `underdrain-*` formats, Unity `6000.0.66f2`, machine roots/locks, historical staging `pass`. Do not impose globally distinct bytes: generic slots may legitimately reuse an asset. | **Creator production and provenance**: `WorldForgeJob` → `WorldExpressionAssetReceipt` → local audit. New build-time `ReceiptFile` boundary, with no new cartridge/run format. | Retain source/refusal lessons; replace the console only after a neutral slot-driven producer proves source/crop refusal, valid source reuse, appropriate output-distinctness policy, no partial publication and overwrite refusal. If the producer is abandoned, record that decision and retain the historical evidence without maintaining its UI. |
| **M**: `scripts/resolve-underdrain-shine-representation.mjs`; `scripts/materialize-underdrain-production-representation.ps1`; `unity/Packages/com.axm.rodoh-action/Editor/ActionUnderdrainRepresentationMaterializerBatch.cs` (`ValidateInputs`, `IsPathWithinRoot`, `RefuseApprovedPrefab`); `tests/world/underdrain-representation-materializer.test.ts` | Host import rechecks source bytes and containment independently of producer validation. Generated representation cannot acquire adjudication or active physics authority. Materialization cannot overwrite a named-approved prefab or issue approval itself. | Revalidate exact inputs; generate host-native prefabs/materials/clips/audio/review scene; binding-closure digest, GUID custody, approved-output refusal and post-import preflight. File verification shared with L is extracted; Unity generation remains documented. | Product/theme IDs, seven assets, 27 bindings/23 files, animator parameters and enemy animation recipes, `Assets/AXM/Underdrain/Production`, fixed arena camera collider, source hash, approval markers and historical acceptance. Stable GUID custody does not make these GUIDs universal. | **Replaceable host materialization** downstream of a completely audited `WorldExpressionPack`; proposed host adapter receives accepted slot bytes and produces a host-output closure for separate review. | Replacement proves source/hash/path refusal in both intake and host, approved-output preservation, complete binding closure, presentation-only behavior, and source/run identity parity on a neutral cartridge. Or explicitly discontinue Unity support and preserve the reviewed evidence/source archive. |
| **T**: `scripts/start-underdrain-target-host.ps1`; `scripts/get-underdrain-commissioning-state.ps1`; `scripts/lib/underdrain-commissioning-controller-v1.ps1`; `scripts/lib/underdrain-commissioning-review-gates-v1.ps1`; `scripts/test-underdrain-commissioning-state.ps1`; `tests/world/underdrain-commissioning-state.test.ts`; `docs/UNDERDRAIN_TARGET_HOST_STARTER.md` | Missing is open; malformed/failed/stale/divergent is held. Later evidence cannot backfill an earlier gate. Bind each attempt to exact source and JobId; preserve failed attempts. Discovery, staging, software review and physical acceptance have different authority. | Ordered gate evaluator, first divergence, inspect/advance separation, at-most-one-gate progression, hash-bound before/after receipts, separate review functions, diagnostic evidence bundle excluding product/source assets. **Documentation-only**: main has no equivalent host commissioning consumer. | Ten named product gates, fixed World/Arc commits, Unity version, job directory layouts, historical review seats/attestations, product and device acceptance formats; `pass` from an older artifact; old erroneous `output/player-train/sessions` paths. | **Target-host commissioning and evidence**: proposed adapter-owned attempt identity + ordered gate receipts. Estate resolves host identity; commissioning never becomes engine law or universal permission gating. | Retire after an adapter proves open/held/out-of-order/stale/complete cases, no failed-attempt overwrite, correct emitted/consumed receipt paths and scoped review separation; or close the host support obligation explicitly. Preserve diagnostics before removing scripts/workflows. |
| **S**: `docs/UNDERDRAIN_SHAPE_FIELD_SHADOW_TRIAL.md`; `unity/Fixtures/underdrain.shape-field-shadow.template.json`; `unity/Schemas/candidate/rodoh-underdrain-shape-field-shadow-v0.schema.json`; `tests/world/underdrain-shape-field-shadow-contract.test.ts` | A codec experiment stays outside an accepted closed manifest and acceptance denominator. Different presentation must retain semantic actions, interaction geometry/registration and byte-identical accepted engine receipts. Fallback resource cost counts. | Separate candidate sidecar and baseline identity; raster/pure/hybrid comparison; receiver/resource/visual rejection returning to baseline without reopening it. **Documentation-only**: contract-only evidence is not a working receiver. | Pump Seven surface, Shape Field `0.1.1`, old artifact identity, candidate `rodoh-underdrain-*` schema, baseline approvals and assumed Quest shader/performance acceptance. No widening of the shipped expression media enum merely to accommodate this donor. | **Optional representation and conformance**: proposed independently admitted codec adapter beside existing expression-pack/neutral fallback paths. | The trial may die after its parity/refusal criteria and baseline evidence are retained and the experiment is explicitly closed. Admission instead requires measured receiver, fallback and device receipts for each claimed target; a contract test cannot satisfy this condition. |
| **H**: `labs/stardew-host-seam-v1/src/seam.mjs`; under `labs/motiondeck-stardew-cabinet-runtime-v0.1.0/`: `src/server.mjs`, `src/runtime.mjs`, `src/attestation.mjs`, `test/runtime.test.mjs`, `qualification/qualification-receipt.json`, `docs/GAPS_AND_NEXT_TRANSACTIONS.md` | External host retains simulation and saves. Discovery is not a semantic input round trip. Synthetic/probed/physical evidence remain distinct. A renewable exclusive lease must disarm on expiry; signed evidence is machine-bound and expiring, not automatic proof of comfortable or correct play. | Bounded authenticated local IPC, request-id collision refusal/idempotence, watchdog/disarm, exact-version renderer hooks, native fallback, trusted-key evidence verification, profile-copy/save-snapshot custody. **Documentation-only**: no device lease or external game integration belongs in the offline browser runtime. | Stardew/SMAPI mod IDs and conflict map, farm/save layout, hotkeys, OpenXR pins, camera/display IDs, named pipes/token configuration, trusted keys/fingerprints, household or hardware claims, product-specific formats and source carriers. | **External-host adapter and device lifecycle**: proposed semantic intent/host observation boundary, adapter-owned lease and evidence. External game's authority is preserved, not reimplemented in Arc. | Equivalent adapter must prove expiry/failure disarm, auth/refusal/idempotence, renderer removal and native fallback, host-owned save/reload continuity, and real device/display evidence for operational claims. Alternatively end this external-host experiment with leases/installations handled by their owner and evidence retained. |
| **Q**: `.github/workflows/queststage-appliance-floor-build.yml`; `carriers/queststage-appliance-floor-v0.1.0-tgz/SHA256SUMS`; `build-receipts/queststage-appliance-floor-0.1.0/latest/WORKFLOW_STATE.json`; `build-receipts/queststage-appliance-floor-0.1.0/latest/ARTIFACT_INDEX.json` | A reconstructed carrier, attempted build, produced APK and physical acceptance are different facts. Toolchain/environment and failures must be attributable to the exact source/run/attempt. A raw artifact URL is not evidence that the artifact exists. | Verify carrier segments then whole archive; record source, policy and output digests; build/lint and inspect APK permissions; always emit failure state. **Documentation-only**: failed hosted floor and no Android host consumer on main justify no new receipt schema or workflow. | Application ID `com.bigbirdreturns.queststage.appliance`, product/version/archive hash, Java/Gradle/SDK pins, isolated branch triggers, runner/run IDs, debug APK filename, self-push workflow and mutable `latest` URLs. No Android or household acceptance state migrates. | **Build/appliance custody**: proposed immutable build-attempt receipt with separate source/build/permission/hardware results, owned by a target-host adapter. Not World Forge generation. | Archive source carrier and failed attempts with verified content before removing build carriers/workflows. A replacement floor needs an actual hash-bound APK/build receipt and permission inspection; hardware/household qualification stays separately open. Explicitly abandoning this floor is also valid after preserving its lessons and failure evidence. |

## Findings that limit the ledger claims

- **L/M:** history attributes local authoring to `cc0081d` and materializer
  refusal hardening to `3734831` (duplicate bytes and sibling source paths);
  `44890df` documents independent resolver/Unity refusal layers. Historical
  tests use one-pixel PNGs with appended labels to create byte-distinct files.
  That exercises byte identity, not distinct visual design or complete PNG
  decoding. Do not turn a passing byte check into visual approval. The donor
  path guards are lexical; the new helper additionally resolves filesystem links.
- **T:** `ae2550a` closes commissioning state, `3a489da` adds bootstrap, and
  `7130afd` composes the starter. The state doc pins an earlier World source
  floor, and tests explicitly correct the session receipt paths to
  `build/receipts/player-session-<device>/session-run.json`. A source train
  proves available machinery, not execution on this seat or any current host.
- **S:** `1c661e7` is a shadow change directly atop `7130afd`. Its template says
  `state: contract-only`, `selectedAsset: null`, and acceptance not issued.
  It retains qualification of older artifact
  `786fb453a7b1f524bca88dbf4d7df2d73cab9a3a`, not of the new head. The ledger's
  parity/fallback statement describes a contract and proposed trial.
- **H:** `ba6a336` implements the seam and `99e8ba3` materializes its source.
  The retained qualification reports 26 passing Linux synthetic tests but
  expressly excludes real game launch, Windows native/SMAPI compilation in
  that environment, unworn tracking, television correctness, physical input,
  save continuity and player acceptance. The gaps document preserves those
  open transactions. Signed-evidence code is not a physical receipt.
- **Q:** the retained `WORKFLOW_STATE.json` says `job_status: failure`, source
  `703b2368b1fde65e07e38d003e669691420fea7e`, run `31238062976`, attempt `1`.
  The head's tree has no `HOSTED_BUILD_RECEIPT.json` or APK under `latest`.
  The workflow describes how success would be emitted; it is not evidence of
  success. The retained files do not establish the failing build step. Carrier
  archive content was not executed or reconstructed in this audit.

## Accepted extraction and deliberate deferrals

`scripts/world-forge/receipt-files.ts` exposes `ReceiptFile { path, sha256,
bytes }`, `readReceiptFile()` and `readContainedFile()`. The existing
`scripts/world-forge/audit-pack.ts` now uses it for assets and previews. It
rejects parent traversal, absolute/drive/stream/network paths, root/directory
targets and real-path escapes through links, then validates the actual asset
length and SHA-256. It accepts local nested paths in either separator convention.
The interface carries no producer, product, host, approval, simulation or save
authority. It adapts the L/M invariant rather than copying their product code.

Tests exercise exact returned bytes, tampering, malformed receipt fields,
missing files, cross-platform path spellings, directory refusal and a real
symlink/junction into a sibling root. The auditor retains its media and complete
pack checks. Preview containment is checked but preview hashes are not invented:
the existing pack format has no preview digest. Source-crop replay, full media
decoding, concurrent adversarial filesystem mutation and pack-format evolution
remain outside this helper's contract. Audit a stable asset tree.

Validation in this worktree:

- `npm.cmd run typecheck`: pass. `tsc -b` also passed before the build reached Vite.
- Final focused Forge suites: 21 tests pass (7 existing, 14 file-boundary tests).
  Standard Vitest config loading hit sandbox `spawn EPERM` in esbuild. The
  actual Vitest 2.1.9 suites ran through its programmatic `startVitest` API with
  `configFile: false`, `esbuild: false`, `resolve.preserveSymlinks: true`, a
  TypeScript `transpileModule` pre-transform and a single thread pool. This
  leaves assertions intact but is not a claim that the standard CI command passed.
- A broader exploratory run through that same adapter completed 165 suites:
  161 passed, four failed; 1,090 tests passed and 13 failed. Failures were in
  `asset-release-custody`, `browser-support-performance`, `local-estate-contract`
  and `supply-chain`, whose child-process outputs were unavailable. A direct
  Node `spawnSync(process.execPath, ['--version'])` probe returned status null
  with `EPERM`. This full run preceded consolidation of two path cases into
  the final 14 boundary tests; the final focused run passed afterward.
- Executed the real `audit-pack.ts` entry point through in-process ViteNode:
  a complete 19-slot PNG fixture passed. This is transport/audit evidence,
  not visual or product acceptance. No visual/runtime behavior changed.
- `npm.cmd run build`: blocked at Vite config loading (`spawn EPERM`).
- `npm.cmd run engine:check`: Bash absent from PATH; explicit installed Git
  Bash invocation also failed (`CreateFileMapping`, Win32 error 5). Upstream
  drift remains unverified. A git diff confirms all 14 vendored paths are
  unchanged from the starting head; no Arc edits were made.
- All 29 matrix paths verified with `git cat-file -e <head>:<path>`;
  `git diff --check` passes. Normal build/drift and subprocess-dependent tests
  still require a runner where these programs can execute.

The other mechanisms stay documentation-only for the reasons in the matrix.
Generic duplicate-byte refusal would overfit the donor; commissioning and lease
schemas without real consumers would freeze host policy prematurely; Shape
Field lacks an admitted receiver; QuestStage lacks a successful retained build.
No new runtime player, codec admission, network access, engine edit, product
content, or historical acceptance record is imported.

## Common retirement custody condition

This audit authorizes no deletion. A branch name is not an archive: before a
future owner deletes a donor ref, preserve these exact commits and required
source/receipt objects in a durable archive or retained ref, verify they remain
retrievable, and record the archive coordinate and integrity receipt here.
External artifacts needed to interpret a claim need durable copies and hashes;
expiring CI artifacts and mutable `latest` links are insufficient. Keep failure
evidence and scope labels alongside successes. If evidence cannot be preserved,
mark that claim unavailable and do not describe it as transferred acceptance.

After that custody condition and the row's replacement-or-abandonment condition
are met, remove obsolete implementations and workflows through a separately
authorized retirement change. No donor must stay alive merely because its
mechanism was once useful. No replacement inherits donor acceptance.
