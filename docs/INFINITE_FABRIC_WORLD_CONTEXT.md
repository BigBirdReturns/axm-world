# Infinite Fabric world-context projection

The generation context is a bounded projection, not a dump of the full world or memory ledger.

## Required context

```text
world id
parent revision
law authority reference and digest
current player cell
neighboring cells within the requested generation radius
stable nearby entity identities and schema-owned state
available behavior schemas
available reusable assets
semantic controls
relevant unresolved quests and obligations
relevant relationship and world-reaction ledger events
resource, spatial, and content-policy budgets
```

## Excluded context

```text
unrelated player history
raw private conversation history
host filesystem paths outside the package
provider credentials
device identities not required by the request
rejected branch content unless explicitly selected for comparison
arbitrary executable source from other cartridges
```

## Context receipt

Every generation run records:

```text
projection format
world and parent revision
selected cell ids
selected entity ids
selected ledger event ids
schema-registry digest
asset-registry digest
policy-profile digest
prompt digest
provider, model, and run id
```

A later replay can therefore distinguish a provider difference from a changed world context. The provider may use the context to propose continuity, but accepted world facts remain those admitted by the host through a structured patch and recorded in the append-only ledger.
