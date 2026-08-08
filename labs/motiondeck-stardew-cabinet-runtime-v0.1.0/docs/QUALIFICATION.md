# Qualification

## Contract suite

The Node suite proves:

- stable content digests;
- bounded JSON and scalar validation;
- recursive credential redaction;
- hash-chain ledger persistence and tamper refusal;
- exact argv hook execution without a shell;
- hook timeout termination;
- non-empty diagnostic PNG generation;
- token authentication and replay-window checks;
- exact provider identity and capability closure;
- synthetic-only fixture admission;
- operational refusal without physical evidence;
- signed physical-evidence verification and tamper refusal;
- operational local lease only after complete signed evidence;
- idempotent retries and request-ID collision refusal;
- watchdog disarm after lease expiry;
- operator fail-safe disarm;
- local IPC round trip;
- private POSIX token permissions;
- assembly-safe one-string SMAPI API;
- exact OpenXR SDK source pin;
- explicit native-probe non-authority;
- parseable protocol and config JSON.

## Native workflow

Windows CI builds the C++ probe against exact OpenXR SDK commit:

```text
57af7fc61f9f2d492580cb28aab6d0ea59d8d417
```

CI runs `--selftest`, not `--probe`. A hosted runner has no authority to represent the household OpenXR topology.

## Source-only SMAPI boundary

The C# projects are source-complete but deliberately not claimed compiled in generic CI. `Pathoschild.Stardew.ModBuildConfig` resolves against an owned Stardew installation; producing a fake game path would prove less than a source contract.

## Current authority

```text
synthetic contract authority: admitted when tests pass
native source/build authority: admitted when Windows build passes
real Stardew runtime authority: none
physical cabinet authority: none
player-product authority: none
production authority: none
```
