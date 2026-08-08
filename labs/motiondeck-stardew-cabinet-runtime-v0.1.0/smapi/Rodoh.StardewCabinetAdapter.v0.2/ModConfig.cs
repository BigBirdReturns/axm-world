namespace BigBirdReturns.Rodoh.StardewCabinetAdapter;

public sealed class ModConfig
{
    public bool Enabled { get; set; } = true;

    public string RuntimeProviderModId { get; set; } = "BigBirdReturns.MotionDeckCabinetRuntime";

    public string RendererModId { get; set; } = "GingasVR.Stardew3D";

    public string AuthorityMode { get; set; } = "commissioning";

    public int LeaseTtlMs { get; set; } = 5000;

    public int HeartbeatTicks { get; set; } = 30;

    public bool AutoArmOnSaveLoaded { get; set; } = false;

    public bool DisarmOnReturnToTitle { get; set; } = true;
}
