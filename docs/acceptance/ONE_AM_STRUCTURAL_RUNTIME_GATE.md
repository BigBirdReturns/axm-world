# The one-a.m. structural runtime gate

This gate proves that the runtime fulfilled the authored episode. It does **not** prove that a player understood it.

The distinction is mandatory:

```text
rodoh-one-am-structural-evidence/1
  machine-owned proof of what the product displayed and enacted

rodoh-one-am-player-receipt/1
  independent observation of what the cold player understood and did
```

A runtime, candidate author, scripted persona, or model with access to expected answers may produce structural evidence. It may not issue the blind-player receipt.

## Structural proof

The exact candidate must record, in chronological order:

- player identity, immediate goal, stakes, and the first action prompt within 30 seconds;
- a meaningful authored success within 90 seconds;
- each objective's authored verb, performed mechanism, observable state change, and in-play interaction event;
- a non-combat mechanism for any objective whose authored verb is not combat;
- each critical reveal before the terminal result screen;
- route-choice deltas while the scene is still playable;
- the provisional terminal result;
- the exact Arc-owned accepted consequence;
- world and relationship changes only after acceptance;
- a concrete successor that becomes enterable;
- every ordinary failure and its governed recovery, including preserved objective progress and no repeated exposition.

The gate refuses unordered or duplicate events rather than sorting them into a plausible story.

## Authority

A successful action simulation is not enough. The evidence must identify an accepted authority result and show that campaign effect was committed. A World candidate carrying `campaignEffect: null` is correctly provisional and cannot pass the authored-episode structural gate.

## Player comprehension

The structural receipt contains no comprehension answers. Those belong only in `rodoh-one-am-player-receipt/1`, where the observer must be independent, unassisted, unfamiliar with source, and able to identify:

1. who they are;
2. the immediate conflict;
3. the authored choice;
4. the accepted consequence;
5. the next playable action.

Both receipts must bind the same repository commit, authored identity, and experience identity before the candidate may be called a playable authored episode.
