namespace BigBirdReturns.MotionDeck.CabinetRuntimeProvider;

public sealed class ModConfig
{
    public bool Enabled { get; set; } = true;

    public string PipeName { get; set; } = "BigBirdReturns.MotionDeckCabinetRuntime.v1";

    public string TokenFile { get; set; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "BigBirdReturns",
        "MotionDeckCabinetRuntime",
        "ipc-token.txt"
    );

    public int ConnectTimeoutMs { get; set; } = 2000;

    public int MaximumResponseCharacters { get; set; } = 262144;
}
