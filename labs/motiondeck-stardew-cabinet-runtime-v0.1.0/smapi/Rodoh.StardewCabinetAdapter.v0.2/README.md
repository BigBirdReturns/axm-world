# RODOH Stardew Cabinet Adapter v0.2.0

The v0.1 prototype passed provider-owned records across a SMAPI mod API boundary. v0.2 replaces that brittle shape with one versioned JSON method:

```csharp
public interface IMotionDeckCabinetRuntimeApi
{
    string Invoke(string requestJson);
}
```

The adapter verifies the exact renderer and provider IDs, delegates every device/display operation, renews a bounded lease, disarms on return to title, and writes content-addressed receipts. It cannot create OpenXR tracking or television output and cannot promote a probe into physical authority.
