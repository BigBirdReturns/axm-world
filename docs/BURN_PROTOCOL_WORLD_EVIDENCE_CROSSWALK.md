# Burn Protocol explicit evidence-to-world crosswalk

## Classification

This stacked transaction adds a process-local, read-only cross-reference between the manifest-derived Burn corpus atlas and identifiers already authored in the calibrated Arc. It does not infer narrative relationships, change Arc law, modify organization state, influence a challenge result, add evidence to a save, alter a portable run, persist a crosswalk, bundle a fixture, or grant a cross-reference canonical standing.

The base is the qualified corpus atlas:

```text
probe/burn-protocol-corpus-atlas-v1
c22d5ae4fc2d2f4c0b7e802fb477b2f79d52b7d4
```

The authored identity remains:

```text
burn-protocol-disclosure-probe
cart1_870f3dfcab909fc9aace115e2c46cd30268339f80bc87a14f0eebcc4e2c28c3e
```

## Actors and authority

Arc remains the authority for world identifiers, labels, descriptions, challenge law, state definitions, and the canon boundary. The activation overlay and manifest-derived index remain the authority for external custody standing and asset metadata. The holder supplies the selected bytes and the separate crosswalk file. World validates and displays the explicit relationship but cannot convert it into authored law.

While the exact Burn cartridge is mounted, `WorldEvidenceTargetCatalogCapture` derives a process-local target registry directly from its Arc:

```text
watch      Arc challenge ids
actor      Common Ship cast ids
faction    Common Ship faction receipt ids
state      Engine 1.3 state-definition ids
pressure   Common Ship pressure ids
```

The registry contains no organization state, report, save, interaction callback, or outcome authority. It is content-addressed from deterministic Unicode-codepoint-ordered JSON and disappears when the cartridge unmounts.

## Crosswalk contract

A crosswalk has format:

```text
burn-protocol-world-evidence-crosswalk/1
```

It must bind the exact authored Arc digest, custody overlay SHA-256, corpus index SHA-256, target-catalog SHA-256, and evidence tier. Its fixed authority declaration is:

```text
relationship   explicit-read-only-cross-reference
worldChanges   none
canonChanges   none
persistence    process-local
inference      forbidden
```

Each link must explicitly name:

```text
one safe asset path already present in the admitted corpus index
one exact authored target kind and id
one bounded relationship verb
one nonempty statement
an optional source locator
```

The accepted relationship vocabulary is:

```text
depicts
documents
contextualizes
contradicts
receipts
precedes
follows
conditions
repairs
```

A canonical `crosswalk1_` integrity digest binds every field and every link. Internally consistent files are still refused when they name an unknown target, an asset outside the corpus, another overlay, another index, another target catalog, another Arc, or another evidence tier. Derived crosswalks must also name the SHA-256 of their production-contract or script source. A holder-authored crosswalk may instead identify itself explicitly as holder-authored.

## Presentation behavior

The evidence drawer adds a **World crosswalk** view beside **Selected evidence** and **Corpus atlas**. The crosswalk groups links by exact authored target and shows the relation, statement, source locator, manifest path, byte count, and verified-versus-manifest-only standing.

A link can expose an image preview only when the external receiver has already verified that asset's exact bytes and created a process-local raster object URL. A manifest-only link remains visible as metadata and cannot be opened. Loading, filtering, opening, closing, or releasing the crosswalk changes presentation memory only.

## Qualification fixture

The dedicated workflow rebuilds the calibrated Arc publication from activation authority:

```text
9bcf2a1c65e75b7c414c0a74f73888cf2699be14
```

It then rebuilds the six-record atlas fixture and creates a seven-link crosswalk spanning:

```text
2 watch links
1 actor link
1 faction link
1 state link
2 pressure links
```

Only `assets/E12-C3-P01.png` is selected and byte-verified, so its watch and actor links may preview. The other five links remain manifest-only.

Focused and browser qualification require:

```text
exact Arc target catalog derived and content-addressed
valid explicit crosswalk accepted
invented target refused after valid internal integrity
asset outside admitted corpus refused
changed crosswalk content refused by integrity
crosswalk bound to another index refused
only verified linked byte may preview
manifest-only links remain disabled
durable run state before and after remains equal
portable export contains no crosswalk, link, object URL, or statement
cold reload forgets corpus and crosswalk custody
no fixture text or path enters the production build
no external HTTP or HTTPS request
no horizontal overflow on desktop or mobile
```

## Evidence boundary

The evidence tier is mechanism qualification. The venue is this stacked World draft. The target is a production crosswalk derived from the exact A13C1 contract or canonical scripts after exact private-handoff intake. The upside is that a live World can expose where verified corpus evidence has been explicitly related to its actors, factions, pressures, state, and governance watches. The downside is that every relationship still depends on a separately supplied source and must be reselected after a cold process boundary. The failure mode is inferred linkage, unknown target admission, unverified preview, persistence, export leakage, or cross-reference metadata acquiring authority over either the corpus or the world.

The control question is whether explicit evidence relationships can improve the holder's judgment while remaining unable to rewrite the world or the record they connect.
