# Protocol

## IPC formats

```text
request   motiondeck-cabinet-ipc-request/1
response  motiondeck-cabinet-ipc-response/1
probe     motiondeck-cabinet-probe/1
state     motiondeck-cabinet-state/1
```

Machine-readable schemas are under `protocol/`.

## Operations

### `hello`

Returns provider identity, adapter kind, and the explicit absence of player-product authority.

### `probe`

Rebuilds the current capability observation. A successful probe means all required capabilities are currently marked available at some tier. It does not itself authorize an arm mode.

### `arm`

Payload:

```json
{
  "authorityMode": "synthetic|commissioning|operational",
  "leaseTtlMs": 5000,
  "gameUniqueId": "StardewValley",
  "rendererUniqueId": "GingasVR.Stardew3D",
  "displayRole": "television-primary-monoscopic",
  "trackingRole": "openxr-unworn-hmd",
  "requireControllerFallback": true,
  "requireNative2dFallback": true
}
```

An arm first probes, applies the evidence gate, invokes the adapter, and only then creates a lease.

### `heartbeat`

Requires the owning transaction ID. Renews the existing TTL; it cannot change authority mode or capability evidence.

### `disarm`

The owner or an operator may disarm. The host invokes the adapter before clearing its lease. A failed disarm moves the host toward fail-safe error rather than claiming success.

### `recenter`

Requires a live owned transaction and an admitted recenter provider.

### `select-fallback`

Supported values:

```text
controller
native-2d
```

### `capture-frame`

Requests one PNG at an exact host-selected path. A successful hook which does not create the file is refused.

### `renderer-mode`

Supported values:

```text
native-2d
desktop-3d
hmd-vr
cabinet-tv
```

### `drain-events`

Returns bounded adapter events and evidence-ledger tail without exposing the token.

### `shutdown`

Restricted to operator or test clients. It must disarm first.

## SMAPI envelope

The adapter sends the provider:

```json
{
  "format": "motiondeck-cabinet-mod-api-request/1",
  "operation": "probe",
  "transactionId": null,
  "payload": {}
}
```

The provider injects its private token and client identity, sends the host request, and returns the host response unchanged.
