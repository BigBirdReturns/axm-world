# Architecture

## Why the runtime is external

SMAPI is the correct place to observe Stardew lifecycle and issue semantic presentation requests. It is not the correct owner for Windows display topology, OpenXR runtime custody, television capture, process supervision, or emergency recovery.

The external host therefore owns a lease, not the game simulation:

```text
SMAPI adapter               external cabinet host
-------------               ---------------------
SaveLoaded                   display selection
ReturnedToTitle              OpenXR observations
renderer identity            command execution
transaction heartbeats       watchdog timeout
semantic requests            frame evidence
adapter receipts             machine-bound physical evidence
```

Stardew retains save and simulation authority. Stardew3DVR retains its renderer implementation. MotionDeck owns the device/display transaction.

## Assembly-safe SMAPI API

The v0.1 adapter prototype used provider-owned C# records in an interface. That is fragile because the consumer and provider load different assemblies containing types with the same source names but different runtime identities.

v0.2 uses one primitive boundary:

```csharp
string Invoke(string requestJson)
```

The request and response formats are versioned, bounded, and independently validated. This is less convenient than passing live objects and far more durable.

## Local transport

Windows uses a named pipe. Other platforms use a mode-0600 Unix socket for contract qualification.

Each request contains:

```text
format
requestId
client identity, role, and version
authentication token
operation
transactionId
sentAt
payload
```

The host refuses:

- wrong format;
- unknown operation;
- unknown client role;
- invalid token;
- timestamps outside a ten-minute replay window;
- oversized messages;
- reused request IDs with different content.

## Lease ownership

Arming creates one exclusive transaction and a renewable TTL. Heartbeats renew the expiry. If they stop, the watchdog invokes the exact disarm path and drops local authority even if the adapter or game process is gone.

An operator may invoke fail-safe disarm without the original transaction ID. An ordinary adapter may not steal or terminate another adapter's live lease.

## Hook execution

Hooks are structured as executable plus argument vector. They never use a command shell.

```json
{
  "executable": "pwsh.exe",
  "args": ["-NoProfile", "-File", "C:\\...\\Arm.ps1"],
  "timeoutMs": 10000,
  "env": {}
}
```

The runtime supplies transaction, mode, display, tracking, fallback, and output-path values as environment variables. Output is bounded. Timeouts kill the child process.

## Evidence

Every accepted request and material transition enters an append-only JSONL ledger. Each event includes the previous event digest and its own content digest. Reopening the ledger verifies sequence, predecessor, and digest before accepting new entries.

Credential-like keys are redacted recursively before persistence.

## Physical admission

Operational mode does not trust a mutable JSON file by presence alone. A physical-evidence document must:

- match the exact machine fingerprint;
- be within its issue/expiry window;
- contain one passing record for every required capability;
- identify an explicitly trusted Ed25519 public key;
- match its content digest;
- pass signature verification.

This is still local acceptance, not global product authority. It prevents a runtime probe or configuration file from quietly labeling itself physical.
