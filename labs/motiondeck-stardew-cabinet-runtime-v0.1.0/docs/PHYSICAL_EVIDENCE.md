# Physical evidence

## Why signatures are required

The runtime can automatically observe software and configuration. It cannot infer that a human actually played comfortably with an unworn Quest, that the television showed the intended camera, or that fallback worked under failure.

Physical records therefore come from a separate acceptance transaction and are signed by a trusted key.

## Document shape

See `protocol/physical-evidence.schema.json`.

Each record binds one required capability to a concrete evidence digest. Typical underlying artifacts are:

```text
OpenXR runtime receipt
unworn-HMD tracking trace
television frame and display identity
tracked-input semantic round trip
controller fallback trace
native-2D fallback trace
recenter before/after pose receipt
```

## Machine fingerprint

The default fingerprint includes:

```text
operating system
architecture
hostname
active OpenXR runtime manifest
runtime name
selected television display ID
```

Changing those inputs invalidates the attestation and forces recommissioning.

## Expiry

Physical evidence has an explicit expiry. This prevents an old acceptance result from silently transporting across renderer, runtime, display, room, or device changes.

## Authority boundary

A valid signature admits the **local operational lease gate**. It does not prove the farm save round trip, multiplayer compatibility, complete mod graph, or household player acceptance required by the parent Stardew scene floor.
