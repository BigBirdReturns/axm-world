# Burn Protocol holder-controlled external asset receiver

## Classification

This transaction adds a World-side browser for external Burn corpus evidence. It does not bundle the v0.58.0 estate, add panel bytes to the Arc, write selected assets to localStorage, include them in portable runs, cache them through the service worker, or grant generated Rodoh runs canonical standing.

The receiver is available from the normal World build at:

```text
?surface=burn-assets
```

Its authored publication binding is fixed to:

```text
cartridge id    burn-protocol-disclosure-probe
Arc digest      cart1_870f3dfcab909fc9aace115e2c46cd30268339f80bc87a14f0eebcc4e2c28c3e
Arc authority   4b076089f9b7ae1949ba8fac45f2373aeeb5b344
sealed parent   b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df
```

## Actors and authority

Arc remains authoritative for authored law, source recovery, cartridge identity, and the read-only and counterfactual canon boundary. The activation overlay and receipt remain authoritative for the relationship between the Arc publication and verified external custody. The manifest-derived asset index identifies eligible external bytes. The holder chooses which local files enter a browser session. World verifies and projects those bytes but does not acquire ownership, persistence authority, or permission to rewrite the index.

## Intake sequence

The browser accepts three JSON records together:

```text
burn-protocol-handoff-publication-overlay/1
burn-protocol-handoff-publication-activation-receipt/1
burn-protocol-corpus-asset-index/1
```

It refuses duplicate JSON keys, oversized or deeply nested records, changed overlay bytes, changed index bytes, a different cartridge digest, a different publication authority, a changed canon boundary, runtime bundling, unsafe asset paths, duplicated index paths, inconsistent classification counts, and a production label whose handoff or nested parent differs from the exact A13C1 contract.

A mechanism fixture may exercise the receiver, but it remains visibly classified as a fixture. Production standing requires all of the following external custody values:

```text
handoff sha256   e96874ca4c753f49eed1c6ecf5db7f924ad4bfa006e242bf426319345dfaedde
handoff bytes    363,384,929
handoff entries  24
parent sha256    b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df
parent bytes     353,717,668
parent entries   1,986
manifest files   1,985
manifest bytes   383,401,783
```

## Holder-selected bytes

After custody preflight, the holder may select individual files or a directory. World resolves each file to one safe relative index path. A basename is accepted only when it identifies exactly one indexed asset. Ambiguous names require a directory-relative path.

Every matched file is checked in this order:

```text
index membership
safe relative path
per-file size ceiling
batch memory ceiling
exact byte length
SHA-256 over selected bytes
renderable raster allowlist
```

A batch containing any size or hash failure is refused atomically. Files outside the index are ignored and reported. A partial indexed selection is permitted and remains visibly partial.

Only exact PNG, JPEG, and WebP files receive object URLs. SVG is not rendered because a presentation surface must not create an external-reference or active-content channel merely because a manifest classified a file as visual evidence.

## Session law

Verified files remain in a process-local session map. Object URLs are revoked when the holder releases the session, replaces it, reloads the page, or leaves the process. No selected `File`, `Blob`, object URL, image byte, or asset index is written to:

```text
localStorage
holder estate exports
portable run envelopes
cartridge source or Arc
service worker cache
repository content
production build output
```

The browser can therefore project a verified corpus asset without converting presentation into custody.

## Qualification

The dedicated workflow rebuilds the calibrated Burn publication from the exact Arc activation head, generates a decodable one-pixel fixture raster and content-bound custody records, verifies the fixture ledger, runs strict TypeScript and focused unit contracts, builds the ordinary World product, confirms that the fixture bytes do not appear in the production build, and drives the browser on desktop and mobile.

The browser journey requires:

```text
fixture custody preflight remains non-production
exact raster verifies and decodes
verified session reports 1 / 1 complete
object URL is explicitly released
changed raster bytes are refused by SHA-256
reload contains no custody preflight or asset session
no external HTTP or HTTPS request occurs
```

## Evidence ledger

The evidence tier is mechanism qualification; the venue is the stacked World receiver branch; the target is an exact-production overlay and corpus index generated from the private A13C1 handoff; the upside is individual verified visual projection without bundling or authored-identity drift; the downside is that the holder must reselect bytes after reload; the failure mode is any receiver path that persists payloads, accepts unindexed bytes, weakens per-file hashes, promotes fixture evidence, or lets presentation rewrite custody.

The next production transaction begins only when the exact handoff has passed Arc intake and activation, producing production-grade overlay, activation receipt, and asset index records for this receiver.
