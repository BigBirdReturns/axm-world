namespace BigBirdReturns.MotionDeck.CabinetRuntimeProvider;

/// <summary>
/// Public API exposed through SMAPI. The single string boundary is deliberate: consumers do not
/// reference provider-owned request or response record types, so assembly identity cannot corrupt
/// the cross-mod contract.
/// </summary>
public sealed class RuntimeApi
{
    private readonly NamedPipeRuntimeClient Client;

    internal RuntimeApi(NamedPipeRuntimeClient client)
    {
        this.Client = client;
    }

    /// <summary>Invoke one versioned JSON command and return one versioned JSON response.</summary>
    public string Invoke(string requestJson)
    {
        return this.Client.Invoke(requestJson);
    }
}
