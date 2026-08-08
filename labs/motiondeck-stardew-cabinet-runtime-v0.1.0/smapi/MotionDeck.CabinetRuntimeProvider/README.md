# MotionDeck Cabinet Runtime SMAPI provider

This is a narrow SMAPI-to-local-runtime bridge. Its public API is exactly:

```csharp
string Invoke(string requestJson)
```

It deliberately exposes no provider-owned records or device objects across the SMAPI assembly boundary. It authenticates to the local named-pipe host, translates the bounded mod request envelope into the host IPC envelope, and returns the host's JSON response unchanged.

It does not implement or claim OpenXR, display, controller, camera, save, or player authority.
