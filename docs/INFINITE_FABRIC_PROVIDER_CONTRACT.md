# Infinite Fabric provider contract

A generation provider receives a bounded world-context projection and returns candidate artifacts. It never receives canonical mutation authority.

## Provider input

```text
world id and parent revision
law mode and immutable authority reference
bounded nearby cells and entities
available behavior-schema registry
asset budget and supported asset kinds
semantic controls
relevant memory-ledger projection
player prompt
content and household policy profile
```

The provider does not receive unrelated private world history, host filesystem access, device credentials, or permission to alter existing package bytes.

## Provider output

```text
axm-infinite-fabric-patch/0
optional content-addressed asset candidates
human-readable patch summary
preview hints
provider, model, and run identity
```

The returned patch must state:

```text
proposalOnly                 true
requiresHostAcceptance       true
changesLaw                   false
modifiesLedgerDirectly       false
arbitraryRuntimeCode         false
networkRequiredDuringPlay    false
```

## Host transaction

```text
provider candidate
→ schema validation
→ semantic reference validation
→ path and capability validation
→ spatial and resource-budget validation
→ mechanical preview build
→ optional playability probe
→ player preview
→ accept or refuse
→ immutable branch revision
→ host-authored patch-acceptance ledger event
```

The host never executes a command string returned by the provider. A request for a new behavior class is routed to a separate quarantined schema-authoring transaction and cannot enter the world as ordinary patch data.

## Provider substitution

A world package may record every provider that contributed accepted artifacts. It may not require those providers during play. A second provider must be able to consume the same bounded context and propose a patch through the same contract without translating the world into a provider-specific project.

## Initial provider seats

```text
structured patch compiler
  one configured cloud coding model

independent substitution seat
  one different cloud or local coding model

asset provider
  procedural assets first, then one voxel or mesh provider
```

Muse, OpenAI, Anthropic, Gemini, local models, World Labs, voxel generators, image models, and audio models are examples of provider classes. None is part of the canonical world identity except through the content and provenance it contributed.
