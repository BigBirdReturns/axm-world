# RODOH continuous authority estate

**Status:** isolated post-v1 integration  
**Frozen v1 effect:** none  
**Physical completion:** `BigBirdReturns/axm-world#204`

## One working place

The action receiver, narrative succession system, and embodied evidence journal are no longer treated as adjacent projects with remembered handoffs. Their exact commits, formats, roles, and remaining machine evidence are pinned in:

```text
estate/post-v1/continuous-authority.lock.json
```

The lock describes one receipt chain:

```text
Narrative pressure, beliefs, goals, and obligations
  → Arc challenge and axm-action-profile/1
  → axm-action-spec/1
  → rodoh-unity-action-spec/1
  → rodoh-action-presentation-manifest/1
  → rodoh-action-scene-job/1
  → Unity or Quest provisional execution
  → rodoh-action-execution-candidate/1
  → axm-embodied-action-session/1
  → exact Arc replay
  → accepted axm-action-receipt/1
  → axm-action-narrative-binding/1
  → axm-action-narrative-ingestion/1
  → ordinary narrative selection and commit
  → axm-narrative-ledger/1
  → inherited pressure for the next situation
```

## Repository roles

### Arc

Arc owns both semantic source authorities while keeping them separate:

- action profile, action spec, simulation, replay, and accepted action receipt;
- narrative constitutions, actor methods, epistemic limits, causal rails, obligations, selection, and commit;
- the seam that converts an already accepted action receipt into an immutable narrative fact and an authored consequence candidate.

The action receipt is replayed before narrative ingestion. Narrative code cannot relabel `success`, `partial`, or `failure`. It may only apply an authored outcome mapping after acceptance.

### World and Unity

World owns orchestration, presentation, provisional execution, local build surfaces, and operator legibility. Unity collects input and produces a provisional candidate. Neither World nor Unity may emit an accepted action fact or write narrative consequence authority.

### axm-embodied

The embodied spoke owns strict physical evidence custody. It records safety and sensor observations, the provisional candidate, and the later accepted Arc receipt in a hash-chained session. A physical observation retains `campaignEffect: null`; evidence is not itself campaign law.

### Genesis

Genesis preserves the verified custody shard. It does not acquire action, narrative, or campaign authority.

## Exact pinned estate

```text
World receiver
52162c757f905aae5c2383f6896de3b258e7cf8f

Arc action authority
6eef311836ee7cb3a43a94ce51f448a2699c3b04

Arc narrative baseline
3c09166af33fb24dd185b0559b5a80183d514d3e

Arc continuous authority integration
e54a7799f780d69719512db1b119c565b49637e1

Embodied functional custody
69b7f9a7bad5b4a94210313ca267a9b479402f09

Embodied closure
a5bfe8be5340821bab7190d211856bd6a8367a80

Genesis kernel
9074e7fb2e9cedde692b248cdd0c6a805e77d8ac

Unity
6000.0.66f2
```

`node scripts/continuous-authority/verify-estate.mjs` validates the lock without dependencies. When supplied the three checkouts, it also requires:

- World to descend from the exact receiver;
- Arc to equal the continuous-authority commit and descend from both action and narrative authorities;
- embodied to equal its closure and contain the functional custody commit;
- every checkout to be clean;
- every required runner, receipt authority, seam, and custody module to exist.

## Current executable proof

Arc’s continuous authority candidate builds a real First Charter encounter, generates a deterministic trace, mints and verifies `axm-action-receipt/1`, ingests the accepted result as a narrative fact, maps the exact outcome through authored law, selects the consequence through the normal narrative sorter, and commits the beat through the normal narrative ledger.

The proof refuses:

- a provisional Unity candidate;
- receipt tampering;
- challenge mismatch;
- cycle mismatch;
- a party absent from narrative actor custody;
- duplicate facts that disagree with the accepted receipt;
- narrative consequences that violate ordinary constitution or rail law.

## Operator path

The existing physical acceptance path remains the controlling real-machine transaction:

```text
scripts/run-first-charter-action.ps1
  → scripts/run-unity-action-estate-v3.ps1
  → scripts/build-unity-action-player.ps1
  → scripts/build-unity-action-quest.ps1
  → real headset session and immutable spool
  → scripts/complete-embodied-action-session.ps1
  → exact Arc accepted receipt
```

The next operator revision will add the final narrative-ingestion phase after the accepted receipt has been attached and the embodied journal has verified. That phase must use the exact Arc continuous-authority checkout pinned by the lock, not the older action-only checkout used to mint the receipt.

## Deliberate boundaries

- Frozen Arc and World v1 lines remain unchanged.
- PR #169’s public narrative baseline remains separate from its unrecovered polish delivery.
- Book IV is not registered or activated.
- Decision-kernel and connected-operation-v2 work remain separate programs.
- Hosted qualification does not claim Unity import, Windows player, Quest installation, headset play, or physical-session evidence.
- Narrative continuity does not substitute for editorial or audience evidence about humor, dialogue, emotional force, pacing, or preference.

## Next bounded work

1. add the final accepted-receipt-to-narrative phase to the physical completion runner;
2. retain the resulting ingestion and narrative commit receipts in the embodied journal and Genesis shard;
3. put one real cartridge-owned action-narrative binding beside its action profile;
4. run the complete loop for The First Charter;
5. repeat it for one materially different cartridge;
6. expose the committed consequence to World as presentation-only data;
7. then add Forge and writer-room controls for authoring the binding.
