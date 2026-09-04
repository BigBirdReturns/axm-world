# AXM Infinite Fabric public demonstration

The first demonstration must show the platform transaction rather than a montage of disconnected capabilities.

## Runtime

Open The First Charter Tiny World in Rodoh. Begin in Board, move to Planet, then enter Play without loading a different cartridge or resetting world state.

## Prompt one

```text
Add a small village on the north side with a bridge and a shy shopkeeper.
```

Show the resulting structured patch summary:

```text
one new sphere-patch cell
one reciprocal cell link
one village asset set
one NPC entity using the versioned NPC schema
one quest entity using the versioned quest schema
law changes: none
ledger writes by provider: none
arbitrary runtime code: none
```

Show a ghost preview. Accept it. Walk to the village in the running world. Speak to the shopkeeper and accept the quest.

## Consequence

Resolve the quest. Show a visible world reaction, relationship change, and append-only memory-ledger entry. Return to Board and show the same change there.

## Prompt two

```text
Make heavy rain wash out the bridge unless the player repairs it.
```

Show the proposed weather, hazard, interactable, and quest-state changes. Accept them as a new branch revision. Trigger rain, repair the bridge, and show that the consequence is recorded.

## Custody proof

Export the world package. Close the generation provider. Disable the network. Reopen or import the package into a clean browser profile. Continue from the same branch, world state, relationship state, and ledger.

## Provider substitution

Use a second provider to propose one bounded change through the same patch contract. The demonstration should make provider substitution visible without changing the world format or runtime.

## Capture order

A 60-to-90-second public capture should include:

```text
0–08s    Board → Planet → Play continuity
08–18s   first prompt
18–28s   structured patch and ghost preview
28–38s   accepted village appears in the running world
38–50s   functional NPC and quest
50–60s   consequence, world reaction, and memory ledger
60–72s   second revision and retained branch
72–90s   provider closed, network disabled, offline reopen
```

The capture is held if it hides the patch, restarts into a separate demo, uses provider-dependent runtime behavior, or omits the memory and offline-custody proof.
