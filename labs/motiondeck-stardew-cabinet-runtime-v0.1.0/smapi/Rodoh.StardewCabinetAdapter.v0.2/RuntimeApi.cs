namespace BigBirdReturns.Rodoh.StardewCabinetAdapter;

/// <summary>
/// Consumer-side shape of the MotionDeck provider API. A single JSON method avoids provider-owned
/// record types crossing the SMAPI assembly boundary.
/// </summary>
public interface IMotionDeckCabinetRuntimeApi
{
    string Invoke(string requestJson);
}
