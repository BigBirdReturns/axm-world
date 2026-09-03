# AXM Infinite Fabric execution board

This board converts the product recovery into a bounded implementation queue. Work is ordered by the first player-visible proof, not by subsystem maturity.

## Program objective

Ship one Rodoh world in which The First Charter Tiny World can be played, changed by prompt through structured patches, made to react through its memory ledger, exported, and reopened offline without the originating model provider.

## Lane A: playable Tiny World

| Order | Work item | Owner surface | Exit receipt |
|---:|---|---|---|
| A1 | Procedural spherical or voxel planet with tangent movement and camera | AXM-WORLD Three.js | Player can circumnavigate the root cell |
| A2 | Semantic keyboard and Gamepad API actions | Rodoh input bus | Same trace works from keyboard and gamepad |
| A3 | Static, collectible, hazard, chaser, interactable, portal, NPC, and quest runtimes | Fabric schema runtime | One fixture for every schema passes |
| A4 | The First Charter root contract and encounter | AXM-ARC + Fabric projection | Play produces an accepted consequence |
| A5 | Board, Map, Planet, and Play continuity | Rodoh | Same world revision and ledger are visible in all views |
| A6 | Local save, destroy/recreate player, and offline reload | Rodoh library | State survives provider and network removal |

A1 through A6 are the first 24-hour denominator. No model integration blocks them.

## Lane B: structured generation

| Order | Work item | Owner surface | Exit receipt |
|---:|---|---|---|
| B1 | Prompt-to-patch provider interface | Builder sidecar | One provider emits schema-valid JSON |
| B2 | Patch semantic validator | Fabric host | Stale parent, unknown schema, unsafe path, law change, and direct ledger mutation are refused |
| B3 | Ghost preview and human accept/refuse | Rodoh MAKE | No canonical mutation occurs before acceptance |
| B4 | Transactional patch apply and immutable revision | Fabric host | Accepted patch creates one new branch revision |
| B5 | Village, shopkeeper, and quest prompt | End-to-end | New functional cell is playable without restart |
| B6 | Rain and bridge-repair revision | End-to-end | Existing world behavior changes while prior revision remains recoverable |

B1 through B6 are the 24-to-72-hour denominator.

## Lane C: commodity provider fan-out

| Order | Work item | Provider class | Exit receipt |
|---:|---|---|---|
| C1 | Second coding-model adapter | Muse, OpenAI, Anthropic, Gemini, or local | Same patch contract from a second provider |
| C2 | Voxel or mesh asset adapter | generated or procedural | Asset is content-addressed and provider-free at play time |
| C3 | World scene adapter | World Labs or local generator | Visual world plus collision proxy enter as separate assets |
| C4 | ScreenGhost observer | ScreenGhost | Regression trace and screenshots without control authority |
| C5 | MotionDeck input adapter | MotionDeck | One physical source emits the same semantic actions |

Lane C begins only after the first structured patch is accepted and replayed offline.

## Lane D: product proof

| Order | Work item | Exit receipt |
|---:|---|---|
| D1 | Live browser deployment | Public Tiny World URL |
| D2 | Downloadable world package | Clean-profile import and offline play |
| D3 | 60-to-90-second capture | Prompt, preview, accept, play, consequence, ledger, offline reopen |
| D4 | Architecture page | Dated prior design lineage plus current executable contracts |
| D5 | Provider substitution capture | Same world revised by two providers |

## Work held during the sprint

The following remain available but do not consume the first seven-day critical path:

```text
UNDERDRAIN product acceptance extension
Shape Field Quest qualification
marketplace and cloud identity
multiplayer implementation
new general engine work
new evidence ontology
high-fidelity character art
large schema inventory
```

## First three public canaries

```text
Canary 1
Add a village on the north side with a bridge and a shy shopkeeper.

Canary 2
Give the shopkeeper a quest that changes the village after completion.

Canary 3
Make heavy rain wash out the bridge unless the player repairs it.
```

All three must compile to existing structured schemas. The model may select parameters, topology, assets, dialogue, and quest content. It may not introduce arbitrary canonical runtime code.

## Daily acceptance

```text
Day 1
The First Charter Tiny World plays and remembers one consequence.

Day 3
A prompt adds a functional cell through preview and acceptance.

Day 7
The world branches, reacts, exports, imports, and plays offline with two providers demonstrated.

Day 14
A second world consumes the same Fabric contracts.

Day 30
Creator alpha admits an external cartridge and one alternate input or rendering adapter.
```

## Control question

Does each work item reduce the distance between a person’s intent and a portable world that can be played, changed, remembered, and continued after every originating provider is gone?
