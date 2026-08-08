# Community commodity map

The Stardew scene is not one repository. It is an operational stack with mature seams at every layer. Our product should consume those seams rather than flattening them into “mods supported: yes/no.”

The machine-readable map is [`config/ecosystem-map.json`](../config/ecosystem-map.json).

## What becomes commodity

| Community authority | We consume | We add |
|---|---|---|
| SMAPI | loader, manifests, events, compatibility work, logs, backups | exact-install discovery, profile custody, receipts |
| Content Patcher | live resolved assets, conditions, tokens, data and map changes | qualification against presentation adapters |
| Framework mods | selected graph-specific capabilities | dependency admission and version pinning |
| GMCM | ordinary mod and renderer settings | machine/profile settings only |
| Stardrop/Vortex/ModDrop | acquisition and human composition | independent local graph identity and rollback |
| Stardew3DVR | procedural 3D/VR presentation and motion semantics | bridge, evidence, cabinet-TV adapter boundary |
| Expansion scene | authored world and compatibility stress | repeatable corpus and bounded claims |
| SMAPI logs/tools | support language and diagnostics | attach to cross-project execution receipts |

## What remains adaptive

The framework ecology changes. Stardew 1.6 moved many formerly custom item, location, machine, and query capabilities into native data, so a static “install every famous framework” bundle would fossilize yesterday's scene.

The durable rule is therefore:

```text
scan the selected manifest graph
resolve exactly what that graph requires
retain opaque framework content
qualify the actual combination
consume new native or community standards as they become authoritative
```

The Host Seam knows a few policy-critical IDs, such as the current renderer and a known collision. Everything else remains data discovered through manifests, dependencies, content-pack hosts, and runtime evidence.

## Why this is more than a mod manager

A manager can help a person install and select files. Our floor starts after selection:

```text
selected files
  -> active-versus-disabled graph
  -> dependency and version proof
  -> conflict refusal
  -> copied profile
  -> save snapshot
  -> exact launch
  -> host lifecycle receipt
  -> embodied mode and device custody
  -> rollback and repair
```

That sequence is reusable across games. Stardew supplies the first complete, mature host-native instance.
