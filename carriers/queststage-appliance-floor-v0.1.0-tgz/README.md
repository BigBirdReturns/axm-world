# QuestStage Appliance Floor v0.1.0 build carrier

This directory is an isolated, content-addressed transport for the reviewed `MotionDeck-QuestStage-Appliance-Floor-0.1.0` source tree. It exists only because the connected repository interface cannot publish a local binary archive directly.

The workflow must verify every segment against `SHA256SUMS`, concatenate the segments in lexical order, decode the resulting base64 stream, and verify the reconstructed archive before extraction.

```text
archive
MotionDeck-QuestStage-Appliance-Floor-0.1.0-Source.tar.gz

sha256
3989ce8a665827c3625f505c199c4728b75b2c2eb2dec2263923e0e3526864ea
```

This carrier confers no World, Arc, campaign, release, or hardware authority. A passing hosted build proves only that the reviewed source reconstructed exactly and produced an APK under the pinned Android build floor. Quest hardware commissioning and household acceptance remain separate gates.

The hosted transaction is self-reporting: its pass or failure ledger is committed only to this isolated branch, outside the workflow trigger path.
