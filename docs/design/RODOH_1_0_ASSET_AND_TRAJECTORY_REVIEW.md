# RODOH 1.0 asset and trajectory review

**Review date:** 2026-07-24  
**Repository baseline inspected:** World main `a0dbdcbc98d6ad24ffde5ce24295866184d3dc8e`; Arc main `e4e41c7faec9755429c4f6b6f5ab715c5c3d17e5`  
**Scope:** player shell, all five first-party programs, neutral imported cartridges, source and runtime custody, release operations, and the staged post-1.0 Book IV program.

## Executive finding

RODOH has completed its foundational architecture and the five first-party product lines required by the 1.0 contract. The remaining 1.0 work is concentrated in generalization, reconciliation, and release custody rather than invention of another game.

The asset library meets the declared first-party production dignity floor. Each accepted program has cartridge-owned identity, role or cast appearances, motifs, a hero environment, a lead portrait, a framing or structural layer, local provenance, responsive treatment, and accessibility acceptance. The system shell has a constitutional root mark and a distinct local-first cartridge bay.

Three release-critical gaps remain:

1. World has not yet accepted the Arc Books I–III Second Recension baseline.
2. Gate 7 has not proved an unaffiliated cartridge through neutral authoring, play, custody, and presentation.
3. Gate 8 has not frozen versions, exact heads, compatibility manifests, checksums, and release artifacts.

The visible asset gaps are narrower. Provenance metadata is inconsistent or stale across several packs, the release lacks one consolidated asset inventory and checksum manifest, dense diagrams need an explicit long-description audit, and Lamp District and Relief Circuit still use the neutral procedural sound root. These are closure and polish tasks, not evidence that the five first-party games lack visual identity.

## Evidence boundary

This review distinguishes merged repository evidence from intent. Arc Second Recension is merged on Arc main. World main remains at the Gate 6 baseline and still identifies the earlier Arc Gate 5 source plane. A prior comment referenced a nonexistent World PR #135; corrective comments now record the actual state. Book IV is canonically complete as a professionally reviewed book, but only documentation staging exists in the repositories. No Book IV runtime capability is counted toward 1.0 readiness.

## System asset review

### Constitutional Rodoh mark

The runtime mark is in strong condition. Its custody manifest identifies the exact 16×16 coordinate source, locked palette, upstream evidence, allowed transformations, and prohibited derivative practices. Tests enforce the root map, palette, integer scaling, and absence of smoothing, shadows, recentering, or derivative colors.

**Release need:** include the exact coordinate and palette manifest in the 1.0 artifact set and produce favicon/application derivatives through the allowed-transform law rather than manual copies.

### Cartridge bay

The bay has a dedicated environment and foreground layer, responsive shelf behavior, keyboard focus elevation, touch-target acceptance, forced-colors fallback, and a clear statement that entered worlds retain their own identity.

**Release need:** capture the Gate 7 neutral cartridge in the bay and inside its world, proving that the system frame never becomes cartridge authorship.

### Shared pixel and vector standard

The repository enforces grid integrity, provenance headers for pixel source modules, citation integrity, controlled locations for pixel literals, and a ban on pictographic glyph substitution outside icon systems.

**Gap:** vector provenance JSON is not yet governed by one schema or one repository-wide validator. Current packs use at least `axm-runtime-asset-provenance/1`, `rodoh-original-asset-provenance/1`, and the separate identity-custody format. Identity custody should remain distinct, but runtime asset packs should converge on one versioned manifest or a documented compatibility union.

**Gap:** the release does not yet have one generated inventory naming every runtime-loaded asset, source manifest, content digest, byte size, view box, semantic role, first-party owner, and accepted browser receipt.

## Program 001: The First Charter

The First Charter owns role appearances, motifs, emblem, Board, Map, Hall, Encounter, Aperture, Globe palette, Hall environment, Maren Vos portrait, and architectural foreground.

**Strength:** it establishes the civic-ledger visual grammar against which later programs can be compared.

**Gap:** `src/assets/first-charter/hall/provenance.json` still calls the pack a `production-vertical-slice` and says the release boundary is Hall only, while the accepted program and asset bible describe a complete local pixel/vector identity. The manifest is historically accurate for its originating PR but stale as current release metadata.

**Adjustment:** retain the original slice manifest for provenance, then add a program-level rollup manifest that names the complete accepted asset set and its final release boundary. Do not rewrite history by pretending the Hall slice originally contained the later role and motif work.

## Program 002: The Waking Tower

The Waking Tower has five role appearances, encounter motifs, emblem, full shared-surface treatment, violet-night Hall environment, Seren Vale portrait, and architectural foreground.

**Strength:** its technical `karazhan` compatibility id is correctly separated from player-facing identity.

**Gap:** the visual pack is split between historical pixel/theme assets and the later Hall production pack without one rollup manifest. The legacy filename remains appropriate as a compatibility locator, but the release manifest must name The Waking Tower as the product identity.

**Adjustment:** create a program-level rollup and checksum record. Preserve the internal id and historical filenames as custody facts, not as release-facing fiction.

## Program 003: The Kind Gods of Ilyon

Ilyon has the richest semantic motif library in the current product: role bodies and portraits, six beat motifs, faction marks, evidence marks, consequence marks, Board/Hall/Encounter/Aperture treatment, observatory environment, Aster Neral portrait, and foreground.

**Strength:** the asset bible clearly separates the real public good of the Benefactor system from constitutional closure, avoiding a generic evil-empire skin.

**Gap:** the Second Recension changes Ilyon's authored identity and current cartridge digest. World must reconcile the reviewed Arc source before any final asset receipt can identify the 1.0 cartridge bytes.

**Gap:** several dense marks and the observatory surface depend on adjacent text for meaning. The release audit should verify that no evidence tier, faction standing, or consequence is available only through motif recognition.

**Adjustment:** after World reconciliation, regenerate the program rollup against the reviewed cartridge digest and capture one Traditional Chinese chrome journey to demonstrate that authored content remains source-owned while runtime controls translate.

## Program 004: The Lamp District

The Lamp District has seven role appearances, eight movement motifs, a maintained-infrastructure material grammar, Underworld environment, Anja Vei portrait, and seven-layer cross-section.

**Strength:** the visual system communicates ordinary civic life and defensive absence simultaneously. Its cross-section is mechanically useful rather than decorative dungeon art.

**Gap:** its provenance manifest uses `rodoh-original-asset-provenance/1`, while later packs use `axm-runtime-asset-provenance/1`. The manifest is also much less descriptive about view boxes, responsive intent, validation, and release boundary.

**Gap:** the seven-layer cross-section and internal labels require an explicit long description or adjacent structured equivalent for nonvisual access and for locales where embedded English labels are not translated.

**Adjustment:** preserve the original manifest, add a normalized program rollup, and add a structured cross-section description that names all seven layers, their current use, inherited purpose, and classification without requiring the SVG image.

## Program 005: The Relief Circuit

The Relief Circuit has the most complete embodied asset pack: vessel environment, six founding-cast portraits, seven-system cross-section, and twenty-one-symbol atlas for the six Common Watch tests, seven systems, and eight state tracks.

**Strength:** the portraits represent each person's actual embodiment claim. They do not reduce aquatic, large, distributed, short-lived, or machine-fork persons to human-normal costumes.

**Gap:** the provenance manifest still reports `production-asset-pack-prepared` and states that Gate 6 is not executable or bound. That boundary is obsolete because Gate 6 is merged and accepted.

**Gap:** the cross-section and symbol atlas are dense authored diagrams. Their SVG titles and descriptions are necessary but insufficient as the sole nonvisual explanation.

**Gap:** the procedural sensory system has no dedicated Relief Circuit root, so its finished visual identity still sounds neutral.

**Adjustment:** add a current program rollup rather than mutating the historical preparation manifest; add structured long descriptions for the vessel and atlas; assign a distinct procedural sound root and test that sound remains optional and semantically redundant.

## Neutral imported cartridge

The neutral receiver is architecturally sound and already proves that first-party Common Ship art does not leak into an imported vessel. It also preserves multiple people sharing one embodiment profile.

**Release-critical gap:** no clean-room cartridge has yet exercised the complete neutral set through ordinary file import, unfamiliar role and resource names, campaign completion, malformed-artifact refusal, unknown namespaced memory, export, fresh-context import, and exact resume.

**Asset requirement:** Gate 7 must use only neutral emblem, people fallback, Board, Map, Hall, Encounter, Result, Ledger, World, and Aperture treatment. Adding bespoke art to make the proof attractive would defeat the proof.

## Cross-cutting asset gaps

### 1. Program-level rollup manifests

Every first-party program should have one current manifest that references, rather than rewrites, its historical slice manifests. The rollup should contain:

- program id and player-facing name;
- current cartridge digest and historical locators;
- source asset manifests;
- every runtime-loaded asset path and content digest;
- semantic role and representation surface;
- view box or pixel grid;
- accessibility treatment;
- desktop/mobile receipt ids;
- release status and compatibility version.

### 2. One runtime asset inventory

Gate 8 should generate a deterministic inventory and checksum file for all release assets. It should fail on remote references, missing provenance, duplicate ids, unreachable assets, unexpected raster embedding, broken view boxes, or files not emitted by the production build.

### 3. Diagram accessibility

The release needs a focused audit of:

- Lamp District seven-layer cross-section;
- Relief Circuit vessel cross-section;
- Relief Circuit twenty-one-symbol atlas;
- Ilyon evidence and consequence diagrams;
- the Rodoh cartridge shelf as a meaningful ordered collection.

Each dense diagram needs a structured textual equivalent, not merely a generic alt string. The text should name relations, directions, state, and consequences.

### 4. Procedural sound identity

The sensory system currently gives dedicated frequency roots to First Charter, Waking Tower, and Ilyon. Lamp District and Relief Circuit use the neutral fallback.

This is a P2 release-polish gap. Add dedicated roots and a small cue review for both programs. Sound remains optional, procedural, local, and never the sole carrier of state.

### 5. Asset performance and complexity budget

The local vector strategy avoids external dependencies, but Gate 8 should record:

- total emitted asset bytes by program;
- largest individual SVGs;
- DOM/node complexity for dense vectors;
- production-build compression;
- first-entry and representation-switch timing on mobile;
- absence of hidden network requests.

The goal is a release receipt, not a generalized asset pipeline.

### 6. Authored labels inside images

Embedded SVG text can remain authored content, but no interaction or state may depend exclusively on it. Adjacent structured text must preserve the same facts under localization, forced colors, zoom, and nonvisual use.

## Repository and release gaps

### P0: World Second Recension reconciliation

Arc main contains the professionally reviewed Books I–III Second Recension. World main does not. The World provenance file still identifies the earlier Arc Gate 5 commit. This must be repaired before Gate 7 begins because the clean-room proof and release manifest must test the actual reviewed baseline.

Acceptance requires one clean, carrier-free World PR that:

- vendors exact Arc `e4e41c7faec9755429c4f6b6f5ab715c5c3d17e5`;
- updates current Ilyon, Lamp District, and Relief Circuit identities;
- preserves previous identities as historical locators rather than aliases;
- carries expanded connected-operation memory;
- passes strict drift, TypeScript, complete tests, production build, and all five desktop/mobile program journeys;
- contains no temporary publication workflows or scripts.

### P0: Gate 7 clean-room proof

Arc issue #150 and World issue #132 remain the decisive platform proof. The proof must be generic enough that passing it adds no new engine, source-plane, role, receiver, theme, or trust exception.

### P1: Gate 8 release engineering

The package versions remain pre-release until Gate 8. The release still needs:

- exact Arc and World heads;
- compatibility and source-plane manifest;
- current and historical cartridge identities;
- save, run, connected-operation, and migration versions;
- deterministic static build;
- first-party source and compiled artifacts;
- clean-room source, malformed fixture, compiled cartridge, and changed run;
- representative completed runs;
- checksums and asset inventory;
- release notes;
- coordinated tags and GitHub releases;
- a fresh offline installation receipt.

### P1: Persistence branch disposition

Arc PR #145 preserves older failed-save and ledger-custody work on a pre-Gate-3 base. Before 1.0, compare its intended behavior against current Arc and World persistence-failure handling. Forward-port only genuinely missing behavior through a current, bounded PR, or close the preservation PR as superseded with a receipt. Leaving it open creates uncertainty about whether Gate 8's persistence-recovery requirement is actually satisfied.

### P1: Documentation truth

Remove or correct any acceptance note that claims a nonexistent PR or an unmerged baseline. Every Gate 8 statement must name an inspectable commit, PR, run, or artifact. Review documents should distinguish current main, accepted candidate, historical branch, and staged post-1.0 work.

## Overall trajectory toward RODOH 1.0

RODOH has crossed the platform-construction threshold. Arc owns deterministic law, source planes, state, composition, save migration, portable runs, connected operations, authoring, and five complete reference campaigns. World owns a local-first player, five distinct first-party products, neutral fallback, production identity, accessibility, mobile and desktop journeys, and exact holder custody.

The remaining trajectory is sequential:

1. **Reconcile World to the reviewed Arc baseline.** This establishes the actual release candidate substrate.
2. **Complete Gate 7A.** Author and qualify the unaffiliated generic cartridge through existing public machinery.
3. **Complete Gate 7.** Prove neutral import, complete play, malformed refusal, unknown memory, export, fresh-context import, and resume on desktop and mobile.
4. **Close the asset ledger.** Add the neutral clean-room receipts and program-level release rollups.
5. **Run Gate 8 hardening.** Normalize manifests, settle persistence disposition, generate inventories and checksums, freeze versions and exact heads, and execute the coordinated supergate.
6. **Publish RODOH 1.0.** Tag Arc and World, attach artifacts, verify a fresh offline install, and freeze the compatibility record.
7. **Begin Book IV implementation after the tag.** Use the staged Arc and World contracts without reopening 1.0.

The risk is no longer that RODOH lacks a coherent product. The risk is release dilution: allowing Book IV, higher-resolution media, generalized asset tooling, cloud services, or unresolved historical branches to interrupt the clean-room and exact-release train.

## Recommended release order

| Order | Train | Exit condition |
|---:|---|---|
| 1 | World Second Recension | clean exact Arc vendoring and five-program regression |
| 2 | Arc Gate 7A | complete unbundled source, cartridge, malformed fixture, changed run, unknown memory, stable digest |
| 3 | World Gate 7 | neutral desktop/mobile completion, export/import/resume, no code exception |
| 4 | Asset closure | clean-room receipt, rollup manifests, long descriptions, deterministic asset inventory |
| 5 | Release hardening | persistence disposition, versions, compatibility manifest, checksums, release artifacts |
| 6 | Gate 8 supergate | one exact pair of heads passes every requirement |
| 7 | RODOH 1.0 publication | tags, releases, offline installation receipt, frozen record |
| 8 | Book IV implementation | post-1.0 source, campaign, receiver, assets, and connected play |

## Control question

Can the project freeze the five-program, three-grammar platform long enough to prove unaffiliated creation and publish one exact release, or will the richness of the next canon become another reason never to establish a stable public baseline?
