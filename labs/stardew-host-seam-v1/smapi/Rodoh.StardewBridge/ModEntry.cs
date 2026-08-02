using System.Text.Json;
using StardewModdingAPI;
using StardewModdingAPI.Events;
using StardewModdingAPI.Utilities;
using StardewValley;

namespace Rodoh.StardewBridge;

internal sealed class ModConfig
{
    public bool EnableReceipts { get; set; } = true;

    public string ExpectedMode { get; set; } = "desktop-3d";

    public string ReceiptDirectory { get; set; } = "receipts";

    public KeybindList ToggleDesktop3D { get; set; } = KeybindList.Parse("F5");

    public KeybindList ToggleVr { get; set; } = KeybindList.Parse("F8");

    public KeybindList Recenter { get; set; } = KeybindList.Parse("F9");

    public KeybindList ToggleWristHud { get; set; } = KeybindList.Parse("F10");
}

internal sealed class ModEntry : Mod
{
    private const string RendererId = "GingasVR.Stardew3D";
    private const string GmcmId = "spacechase0.GenericModConfigMenu";
    private const string ReceiptFormat = "rodoh-stardew-host-event/1";

    private readonly object ReceiptLock = new();
    private readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private ModConfig Config = new();
    private string ReceiptFilePath = string.Empty;
    private string SessionId = Guid.NewGuid().ToString("N");
    private long Sequence;

    public override void Entry(IModHelper helper)
    {
        this.Config = helper.ReadConfig<ModConfig>();
        this.ReceiptFilePath = Path.Combine(this.ResolveReceiptDirectory(), "session.jsonl");

        helper.Events.GameLoop.GameLaunched += this.OnGameLaunched;
        helper.Events.GameLoop.SaveLoaded += this.OnSaveLoaded;
        helper.Events.GameLoop.DayStarted += this.OnDayStarted;
        helper.Events.GameLoop.Saving += this.OnSaving;
        helper.Events.GameLoop.Saved += this.OnSaved;
        helper.Events.GameLoop.ReturnedToTitle += this.OnReturnedToTitle;
        helper.Events.Input.ButtonsChanged += this.OnButtonsChanged;
        helper.ConsoleCommands.Add(
            "rodoh_seam_status",
            "Print the current RODOH Stardew host-seam status without changing the game.",
            this.OnStatusCommand
        );
    }

    private string ResolveReceiptDirectory()
    {
        string configured = this.Config.ReceiptDirectory?.Trim() ?? "";
        bool unsafePath = string.IsNullOrWhiteSpace(configured)
            || Path.IsPathRooted(configured)
            || configured.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Contains("..");

        if (unsafePath)
        {
            this.Monitor.Log(
                "ReceiptDirectory must be a safe path relative to the mod directory. Falling back to 'receipts'.",
                LogLevel.Warn
            );
            configured = "receipts";
        }

        string directory = Path.GetFullPath(Path.Combine(this.Helper.DirectoryPath, configured));
        string modRoot = Path.GetFullPath(this.Helper.DirectoryPath) + Path.DirectorySeparatorChar;
        if (!directory.StartsWith(modRoot, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Receipt directory escaped the mod directory.");

        Directory.CreateDirectory(directory);
        return directory;
    }

    private void OnGameLaunched(object? sender, GameLaunchedEventArgs e)
    {
        var mods = this.Helper.ModRegistry.GetAll()
            .Select(mod => new
            {
                uniqueId = mod.Manifest.UniqueID,
                version = mod.Manifest.Version.ToString(),
            })
            .OrderBy(mod => mod.uniqueId, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        this.Emit("game-launched", new
        {
            gameVersion = Constants.GameVersion.ToString(),
            smapiVersion = Constants.ApiVersion.ToString(),
            rendererLoaded = this.Helper.ModRegistry.IsLoaded(RendererId),
            genericModConfigMenuLoaded = this.Helper.ModRegistry.IsLoaded(GmcmId),
            loadedMods = mods,
        });
    }

    private void OnSaveLoaded(object? sender, SaveLoadedEventArgs e)
    {
        this.Emit("save-loaded", new
        {
            location = this.CurrentLocation(),
        });
    }

    private void OnDayStarted(object? sender, DayStartedEventArgs e)
    {
        this.Emit("day-started", new
        {
            location = this.CurrentLocation(),
        });
    }

    private void OnSaving(object? sender, SavingEventArgs e)
    {
        this.Emit("saving", new
        {
            location = this.CurrentLocation(),
        });
    }

    private void OnSaved(object? sender, SavedEventArgs e)
    {
        this.Emit("saved", new
        {
            location = this.CurrentLocation(),
        });
    }

    private void OnReturnedToTitle(object? sender, ReturnedToTitleEventArgs e)
    {
        this.Emit("returned-to-title", new { });
    }

    private void OnButtonsChanged(object? sender, ButtonsChangedEventArgs e)
    {
        if (this.Config.ToggleDesktop3D.JustPressed())
            this.EmitSemanticAction("presentation.toggle.desktop-3d");

        if (this.Config.ToggleVr.JustPressed())
            this.EmitSemanticAction("presentation.toggle.vr");

        if (this.Config.Recenter.JustPressed())
            this.EmitSemanticAction("presentation.recenter");

        if (this.Config.ToggleWristHud.JustPressed())
            this.EmitSemanticAction("presentation.toggle.wrist-hud");
    }

    private void EmitSemanticAction(string action)
    {
        this.Emit("semantic-action", new
        {
            action,
            source = "configured-keybind-observation",
        });
    }

    private string? CurrentLocation()
    {
        return Context.IsWorldReady ? Game1.currentLocation?.Name : null;
    }

    private object BuildStatus()
    {
        return new
        {
            format = "rodoh-stardew-host-status/1",
            sessionId = this.SessionId,
            expectedMode = this.Config.ExpectedMode,
            receiptsEnabled = this.Config.EnableReceipts,
            receiptFile = this.Config.EnableReceipts ? this.ReceiptFilePath : null,
            worldReady = Context.IsWorldReady,
            location = this.CurrentLocation(),
            renderer = new
            {
                uniqueId = RendererId,
                loaded = this.Helper.ModRegistry.IsLoaded(RendererId),
                version = this.Helper.ModRegistry.Get(RendererId)?.Manifest.Version.ToString(),
            },
            genericModConfigMenuLoaded = this.Helper.ModRegistry.IsLoaded(GmcmId),
        };
    }

    private void OnStatusCommand(string command, string[] args)
    {
        string json = JsonSerializer.Serialize(this.BuildStatus(), this.JsonOptions);
        this.Monitor.Log(json, LogLevel.Info);
    }

    private void Emit(string eventType, object data)
    {
        if (!this.Config.EnableReceipts)
            return;

        var record = new
        {
            format = ReceiptFormat,
            sessionId = this.SessionId,
            sequence = Interlocked.Increment(ref this.Sequence),
            at = DateTimeOffset.UtcNow,
            eventType,
            expectedMode = this.Config.ExpectedMode,
            worldReady = Context.IsWorldReady,
            data,
        };

        string json = JsonSerializer.Serialize(record, this.JsonOptions);
        try
        {
            lock (this.ReceiptLock)
            {
                using FileStream stream = new(
                    this.ReceiptFilePath,
                    FileMode.Append,
                    FileAccess.Write,
                    FileShare.Read
                );
                using StreamWriter writer = new(stream);
                writer.WriteLine(json);
            }
        }
        catch (Exception ex)
        {
            this.Monitor.LogOnce(
                $"Unable to write RODOH host receipt: {ex.Message}",
                LogLevel.Error
            );
        }
    }
}
