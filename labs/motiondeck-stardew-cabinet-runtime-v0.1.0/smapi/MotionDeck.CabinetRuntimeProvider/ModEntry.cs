using StardewModdingAPI;

namespace BigBirdReturns.MotionDeck.CabinetRuntimeProvider;

/// <summary>
/// SMAPI registration layer for the external MotionDeck runtime. This mod does not implement
/// OpenXR, television rendering, tracked input, screenshots, or player-product authority.
/// </summary>
public sealed class ModEntry : Mod
{
    private RuntimeApi? Api;

    public override void Entry(IModHelper helper)
    {
        ModConfig config = helper.ReadConfig<ModConfig>();
        if (!config.Enabled)
        {
            this.Monitor.Log("MotionDeck cabinet runtime provider is disabled.", LogLevel.Info);
            return;
        }
        this.Api = new RuntimeApi(new NamedPipeRuntimeClient(config));
        this.Monitor.Log("MotionDeck cabinet runtime JSON provider registered. Device authority remains external.", LogLevel.Info);
    }

    public override object? GetApi()
    {
        return this.Api;
    }
}
