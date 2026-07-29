# Theme-owned presentation manifest

## Problem

The v1 player correctly treats cartridge and run law as opaque to presentation. Imported vocabulary degrades to a neutral fallback and remains playable. The shared visual layer nevertheless still contains historical first-party heuristics that infer icon meaning from strings such as `vanguard`, `mender`, `tank`, `healer`, `melee`, `ranged`, `blade`, `charm`, and `satchel`.

Those heuristics are presentation debt. They do not alter engine resolution, but they teach shared runtime code that particular words imply anatomy, class, capability, or equipment meaning. That becomes structurally wrong when the same runtime presents arbitrary creator roles, nonhuman bodies, enterprise decisions, and Book IV continuity claims.

## Candidate format

The post-v1 candidate is:

```text
rodoh-presentation-manifest/v1
```

The manifest is custody and presentation metadata. It does not enter `cart1_` authored identity unless a creator deliberately embeds it as authored cartridge content under a namespaced extension. A separately installed theme can bind to one or more exact cartridge digests without modifying those cartridges.

## Keys

Every presentation record is keyed by opaque authored or engine identifiers:

```text
roleId
attributeId
itemId
profileId
stateId
challengeId
motifId
representationId
```

Shared runtime code may compare IDs for equality. It may not infer semantics from their spelling.

## Manifest planes

### Identity

- manifest format and version;
- theme ID and version;
- author and license metadata;
- exact compatible cartridge digests or a neutral wildcard declaration;
- provenance and source asset references;
- optional signature and attestation outside cartridge identity.

### Semantic labels

For every opaque ID the manifest may supply:

- display label override when the cartridge delegates it;
- short label;
- plain-language meaning;
- screen-reader description;
- long structured description for diagrams or complex bodies;
- localization catalog keys owned by the theme rather than the cartridge.

Authored cartridge labels remain the fallback. A theme may not silently rename executable law when the cartridge does not delegate that surface.

### Visual tokens

- palette tokens and contrast pairs;
- icon references;
- portrait and body references;
- neutral base doll, slots, clothes, equipment, and material layers;
- state-driven expression mappings;
- motif and emblem references;
- environment, foreground, cross-section, and atlas references;
- responsive crop and anchor metadata;
- forced-colors substitution rules.

### Motion and sound

- named motion clips or procedural parameters;
- reduced-motion replacement;
- optional procedural sound roots;
- semantic redundancy declaration proving sound and motion are never the only carrier of state.

### Representation binding

The manifest may bind assets to Board, Map, Hall, Encounter, Aperture, Globe, Underworld, Common Ship, or later registered representations. A missing binding uses the neutral runtime. It never creates or removes a representation.

## Neutral fallback

The runtime always retains one complete neutral presentation:

- authored labels flow verbatim;
- unknown roles and attributes receive a neutral icon;
- every person receives a neutral body or portrait;
- every state remains textually inspectable;
- no first-party palette, emblem, portrait, or fiction is borrowed;
- missing or malformed art does not block validation, founding, action, export, or resume;
- forced colors can suppress decorative assets without suppressing information.

The neutral fallback is product law, not an asset loading error screen.

## Validation

A valid manifest must:

- use only local, content-addressed asset references;
- declare asset byte size, digest, MIME type, semantic role, and view box or pixel grid;
- reject remote URLs, embedded scripts, event handlers, foreign objects, and executable SVG content;
- reject duplicate opaque keys within one plane;
- reject bindings to unknown representation IDs unless explicitly namespaced for a future receiver;
- provide screen-reader text for nondecorative diagrams;
- state whether a label override is authored, delegated, localized chrome, or purely decorative;
- preserve deterministic asset ordering.

## Runtime seam

The shared runtime exposes pure lookups:

```text
presentation.role(roleId)
presentation.attribute(attributeId)
presentation.item(itemId)
presentation.person(personId, profileId)
presentation.state(stateId, value)
presentation.challenge(challengeId)
presentation.representation(representationId)
```

Each result carries semantic text and optional visual/sensory assets. The runtime does not own lookup tables containing cartridge role words.

## Migration

The first migration moves existing first-party heuristics into the five accepted theme packs without changing rendered output.

1. Generate manifests for First Charter, Waking Tower, Ilyon, Lamp District, and Relief Circuit from current theme data.
2. Add exact screenshot and semantic-text equivalence receipts.
3. Route shared icon, portrait, body, item, and motif selection through manifest lookup.
4. Add a source guard that rejects role, attribute, and item substring matching outside theme-owned modules and fixtures.
5. Delete the shared heuristics only after all five first-party and Orchard neutral journeys remain green.

## Acceptance

A synthetic cartridge with arbitrary identifiers such as `role:glass-tender`, `attribute:tidal-memory`, and `item:borrowed-noon` must render correctly without those strings appearing in shared runtime source.

Removing its theme manifest must leave a complete neutral product. Adding the manifest must change presentation and accessibility text only within the declared authority. Neither path may change cartridge digest, engine facts, run integrity, feasibility, consequence, or trust level.

## Activation boundary

This specification is post-v1 staging. The v1 player retains its accepted presentation packs and neutral fallback. No manifest format, theme migration, or heuristic deletion enters the v1 release critical path.
