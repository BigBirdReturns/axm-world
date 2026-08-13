# UNDERDRAIN cold-seat software-comprehension transaction

This document supersedes the human-staffing language in sections 8 and 9 of the existing Unity 6000 machine runbook for **Windows software-product acceptance**. It does not remove human playtesting, household use, accessibility observation, mounted-Quest evaluation, or physical-installation acceptance. Those remain a separately typed physical evidence lane.

The software product must not wait for the operator to locate several outside people. Independence is established through role separation, source isolation, immutable packets, distinct model lineages, distinct context digests, and a final acceptance seat that cannot modify the artifact under review.

## Authority boundary

ARC remains the sole action and consequence authority. The Unity runtime may emit a provisional candidate whose authority is `Arc replay required`. The runtime, candidate author, cold player, observer, and adjudicator may not issue product acceptance. The final acceptance seat may consume receipts but may not modify the build, scene, source, presentation closure, input trace, or accepted ARC record.

A passing cold-seat receipt proves bounded software comprehension. It does not claim that a human played the product, that the product is accessible to a particular person, that a household installation is safe, or that Quest operation passed.

## Required seats

The transaction uses four functions:

1. **Cold player seat.** Receives only the exact built product, ordinary player instructions, the permitted input surface, and no source, rubric, answer key, or walkthrough.
2. **Cold observer seat.** Receives the session evidence and player transcript, records what happened, and receives no source, rubric, or answer key.
3. **Cold adjudicator seat.** Receives the immutable observer packet and the comprehension contract. It cannot inspect or modify the product.
4. **Software-product acceptor seat.** Consumes the complete accepted evidence packet after the artifact is frozen. Its seat, lineage, and context must differ from the three comprehension seats and from the presentation-approval seat.

The same operator may invoke these functions sequentially when the packet proves that the contexts and lineages were isolated. A seat name is a stable responsibility, not a requirement to recruit a particular person.

## Packet chain

The final recorder consumes three ordinary JSON packets. Every packet binds the same product, World commit, ARC commit, Windows product digest, and player-session receipt digest.

### Cold player packet

```json
{
  "format": "rodoh-underdrain-cold-player-seat/1",
  "productId": "underdrain-bloom-below-unity6000-v1",
  "worldCommit": "<40 hex>",
  "arcCommit": "aaa5685903a348b3c1ba875622fbe99d90c1da35",
  "windowsProductSha256": "<64 hex>",
  "playerSessionReceiptSha256": "<64 hex>",
  "seat": {
    "seatId": "underdrain-cold-player",
    "lineageId": "<model or runner lineage>",
    "contextDigest": "sha256:<64 hex>"
  },
  "sourceIsolation": {
    "sourceAccess": "none",
    "rubricAccess": "none",
    "answerKeyAccess": "none",
    "receivedWalkthrough": false,
    "authoredCandidate": false,
    "assistanceEvents": 0
  },
  "artifactMutationCapability": false,
  "completedSession": true,
  "voluntarilyContinuedAfterConsequence": true,
  "transcript": {
    "path": "cold-player-transcript.json",
    "sha256": "<64 hex>"
  },
  "attestation": "<seat assertion>"
}
```

### Cold observer packet

```json
{
  "format": "rodoh-underdrain-cold-observer-seat/1",
  "productId": "underdrain-bloom-below-unity6000-v1",
  "worldCommit": "<40 hex>",
  "arcCommit": "aaa5685903a348b3c1ba875622fbe99d90c1da35",
  "windowsProductSha256": "<64 hex>",
  "playerSessionReceiptSha256": "<64 hex>",
  "playerPacketSha256": "<64 hex>",
  "seat": {
    "seatId": "underdrain-cold-observer",
    "lineageId": "<different lineage>",
    "contextDigest": "sha256:<different 64 hex>"
  },
  "sourceIsolation": {
    "sourceAccess": "none",
    "rubricAccess": "none",
    "answerKeyAccess": "none",
    "receivedWalkthrough": false,
    "authoredCandidate": false,
    "assistanceEvents": 0
  },
  "artifactMutationCapability": false,
  "run": {
    "startedAt": "<ISO-8601>",
    "completedAt": "<ISO-8601>",
    "device": "keyboard-mouse",
    "viewport": "1600x900"
  },
  "timing": {
    "firstAuthoredDecisionMs": 0,
    "firstAcceptedConsequenceMs": 0
  },
  "observations": {
    "chosenStrategyId": "emergency-plan",
    "playerRoleId": "rhea-venn",
    "immediateConflictId": "conflict-keep-water-running-without-flooding-hidden-nursery",
    "authoredChoiceId": "emergency-plan",
    "acceptedConsequenceId": "fact-pump-seven-balanced",
    "nextPlayableActionId": "root-gate-parley"
  },
  "behavior": {
    "wrongTurns": 0,
    "knockdowns": 0,
    "retries": 0,
    "abandonedBeforeConsequence": false,
    "voluntarilyContinuedAfterConsequence": true
  },
  "notes": {
    "path": "cold-observer-notes.json",
    "sha256": "<64 hex>"
  },
  "attestation": "<seat assertion>"
}
```

### Cold adjudicator packet

```json
{
  "format": "rodoh-underdrain-cold-adjudicator-seat/1",
  "productId": "underdrain-bloom-below-unity6000-v1",
  "worldCommit": "<40 hex>",
  "arcCommit": "aaa5685903a348b3c1ba875622fbe99d90c1da35",
  "windowsProductSha256": "<64 hex>",
  "playerSessionReceiptSha256": "<64 hex>",
  "observerPacketSha256": "<64 hex>",
  "contractSha256": "<64 hex>",
  "seat": {
    "seatId": "underdrain-cold-adjudicator",
    "lineageId": "<third lineage>",
    "contextDigest": "sha256:<third 64 hex>"
  },
  "sourceScope": "contract-and-observation-only",
  "artifactMutationCapability": false,
  "authoredCandidate": false,
  "verdict": "pass",
  "answers": {
    "playerRoleId": "rhea-venn",
    "immediateConflictId": "conflict-keep-water-running-without-flooding-hidden-nursery",
    "authoredChoiceId": "emergency-plan",
    "acceptedConsequenceId": "fact-pump-seven-balanced",
    "nextPlayableActionId": "root-gate-parley"
  },
  "adjudication": {
    "path": "cold-adjudication.json",
    "sha256": "<64 hex>"
  },
  "attestation": "<seat assertion>"
}
```

## Record software comprehension

The recorder validates the complete packet hash chain, the exact Windows session, the accepted ARC receipt, teach-practice-master objective completion, seat separation, lineage separation, context separation, source isolation, absence of mutation capability, observed answers, adjudicated answers, and voluntary continuation.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\record-underdrain-independent-comprehension.ps1" `
  -PlayerProductTrainReceipt "<product-train-receipt>" `
  -PlayerSessionReceipt "<accepted-device-session-receipt>" `
  -PlayerSeatPacket "<cold-player-packet>" `
  -ObserverSeatPacket "<cold-observer-packet>" `
  -AdjudicatorSeatPacket "<cold-adjudicator-packet>"
```

The historical script name remains for source compatibility. Its emitted object is now:

```text
rodoh-underdrain-cold-seat-comprehension/1
```

The receipt explicitly records:

```text
runtimeIssued = false
candidateAuthorIssued = false
humanEvidenceClaimed = false
physicalHumanEvidence = not-required-for-windows-software-acceptance
physicalInstallationEvidence = separate-open
productAcceptance = not-issued
```

## Issue Windows software-product acceptance

The final acceptance seat must be distinct from the presentation-approval seat and all three cold seats. Its lineage and context must also be distinct from the cold seats. The seat cannot retain artifact-mutation capability, and no artifact may have changed after the evidence packet was produced.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$World\scripts\accept-underdrain-player-product.ps1" `
  -PlayerProductTrainReceipt "<product-train-receipt>" `
  -KeyboardMouseSessionReceipt "<keyboard-session-receipt>" `
  -GamepadSessionReceipt "<gamepad-session-receipt>" `
  -ColdSeatComprehensionReceipt "<cold-seat-comprehension-receipt>" `
  -AcceptorSeatId "underdrain-software-product-acceptor" `
  -AcceptorLineageId "<fourth lineage>" `
  -AcceptorContextDigest "sha256:<fourth 64 hex>" `
  -AcceptanceName "UNDERDRAIN Windows software player product" `
  -AcceptorAttestation "I accept this exact Windows software product on the cited source, representation, device, performance, ARC-replay, and role-separated cold-seat evidence."
```

Do not supply `-AcceptorCanModifyArtifact` or `-ArtifactMutatedAfterEvidence`. Either switch is a refusal.

## Physical evidence remains separate

Human playtesting, accessibility studies, child or household use, controller ergonomics, television latency, mounted Quest behavior, guardian interaction, room safety, and physical comprehension remain valuable. They are recorded under the relevant physical installation or device qualification. Their absence does not become a Windows software-comprehension failure, and a cold-seat pass may never be described as human acceptance.
