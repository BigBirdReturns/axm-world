# Program of Record blind-operator handoff

This disconnected branch is a transport surface, not an AXM World product change or pull request.
It contains an authenticated encrypted packet, not Program of Record source or a publicly playable
build. The decryption key is intentionally absent from GitHub.

## Signatures

- Ciphertext: `por-cold-independent-005.zip.aes256`
- Ciphertext SHA-256: `1f43e54cc1e03a505df4c3fc80fe5faa5c316062b64be52bf213970ef6abfadf`
- Encryption: AES-256-GCM (`PORBLIND1` envelope)
- Decrypted archive SHA-256: `a6c8a705ecce196ab1a88dba1e703a9d1964276c5ff2199f0ca2441740ad4b38`
- Signed game-artifact SHA-256: `5e9421f1b88ab6a10c6436f54628f7f0ca37ebdc5624738f4e52187ded1303c0`
- Evidence status: `READY FOR BLIND OPERATOR` — no semantic pass has been claimed.

## Coordinator instructions

The current build-side Codex is not the blind operator and must not adjudicate the result. Obtain the
64-character transport key directly from the user; it is not stored in this branch.

1. Set `POR_PACKET_KEY` to the authorized key and run `node DECRYPT.mjs`. Alternatively, run
   `node DECRYPT.mjs --key=KEY` if shell history exposure is acceptable.
2. Extract `por-cold-independent-005.zip` into a new directory.
3. Inside the extracted directory, run `node VERIFY_AND_LAUNCH.mjs --verify-only`.
4. Give only the extracted packet to a fresh, zero-context operator. Do not provide this branch,
   either AXM repository, Program of Record source or documents, prior chat, expected answers, or an
   authored action path.
5. On Windows, launch with `LAUNCH_BLIND_SESSION.cmd`. In a managed Linux/macOS browser environment,
   run `node VERIFY_AND_LAUNCH.mjs --no-open` and open only the printed local URL using ordinary
   browser interaction.
6. After the operator completes `session.json` and `evidence/`, give only those results and
   `ADJUDICATOR_BRIEF.md` to a different fresh adjudicator.

The packet validator can establish admissibility and readiness for adjudication. It cannot manufacture
a semantic pass.
