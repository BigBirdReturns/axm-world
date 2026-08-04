using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using StardewModdingAPI;
using StardewModdingAPI.Events;

namespace BigBirdReturns.Rodoh.StardewCabinetAdapter;

/// <summary>
/// Stardew-side cabinet control plane. It never implements OpenXR or display custody itself and
/// never treats a provider object, runtime discovery, or a configured hotkey as physical authority.
/// </summary>
public sealed class ModEntry : Mod
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private ModConfig Config { get; set; } = new();
    private IMotionDeckCabinetRuntimeApi? Runtime { get; set; }
    private bool RendererLoaded { get; set; }
    private string? TransactionId { get; set; }
    private bool Armed { get; set; }
    private int TickCounter { get; set; }

    public override void Entry(IModHelper helper)
    {
        this.Config = helper.ReadConfig<ModConfig>();
        helper.Events.GameLoop.GameLaunched += this.OnGameLaunched;
        helper.Events.GameLoop.SaveLoaded += this.OnSaveLoaded;
        helper.Events.GameLoop.UpdateTicked += this.OnUpdateTicked;
        helper.Events.GameLoop.ReturnedToTitle += this.OnReturnedToTitle;
        helper.ConsoleCommands.Add("rodoh_cabinet_status", "Print the exact cabinet adapter state.", this.StatusCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_probe", "Probe the external MotionDeck runtime without arming.", this.ProbeCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_arm", "Arm cabinet mode through the evidence-gated external runtime.", this.ArmCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_disarm", "Disarm cabinet mode and return to native presentation.", this.DisarmCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_recenter", "Request a bounded tracking recenter.", this.RecenterCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_fallback", "Select controller or native-2d fallback.", this.FallbackCommand);
        helper.ConsoleCommands.Add("rodoh_cabinet_frame", "Capture one evidence frame.", this.FrameCommand);
    }

    private void OnGameLaunched(object? sender, GameLaunchedEventArgs e)
    {
        if (!this.Config.Enabled)
        {
            this.Monitor.Log("RODOH cabinet adapter is disabled.", LogLevel.Info);
            return;
        }
        this.RendererLoaded = this.Helper.ModRegistry.IsLoaded(this.Config.RendererModId);
        this.Runtime = this.Helper.ModRegistry.GetApi<IMotionDeckCabinetRuntimeApi>(this.Config.RuntimeProviderModId);
        if (!this.RendererLoaded)
            this.Monitor.Log($"Required renderer {this.Config.RendererModId} is not loaded. Cabinet authority remains refused.", LogLevel.Error);
        if (this.Runtime is null)
            this.Monitor.Log($"Required runtime provider {this.Config.RuntimeProviderModId} exposes no compatible JSON API. Cabinet authority remains refused.", LogLevel.Error);
        this.Record("adapter-launched", new { rendererLoaded = this.RendererLoaded, runtimeApiAvailable = this.Runtime is not null, productAuthority = "none" });
    }

    private void OnSaveLoaded(object? sender, SaveLoadedEventArgs e)
    {
        if (this.Config.AutoArmOnSaveLoaded) this.TryArm();
    }

    private void OnUpdateTicked(object? sender, UpdateTickedEventArgs e)
    {
        if (!this.Armed || this.TransactionId is null || this.Runtime is null) return;
        this.TickCounter += 1;
        if (this.TickCounter < Math.Max(1, this.Config.HeartbeatTicks)) return;
        this.TickCounter = 0;
        JsonDocument response = this.Invoke("heartbeat", new { }, this.TransactionId);
        if (!Succeeded(response))
        {
            this.Armed = false;
            this.Record("heartbeat-refused", JsonSerializer.Deserialize<object>(response.RootElement.GetRawText())!);
            this.Monitor.Log("Cabinet heartbeat was refused; adapter relinquished its local armed state.", LogLevel.Error);
        }
    }

    private void OnReturnedToTitle(object? sender, ReturnedToTitleEventArgs e)
    {
        if (this.Config.DisarmOnReturnToTitle && this.Armed) this.TryDisarm("returned-to-title");
    }

    private JsonDocument Invoke(string operation, object payload, string? transactionId = null)
    {
        if (this.Runtime is null)
            return JsonDocument.Parse(JsonSerializer.Serialize(new { format = "motiondeck-cabinet-adapter-error/1", success = false, code = "adapter.runtime-missing", message = "Runtime provider API is unavailable." }));
        string request = JsonSerializer.Serialize(new
        {
            format = "motiondeck-cabinet-mod-api-request/1",
            operation,
            transactionId,
            payload
        }, JsonOptions);
        string response = this.Runtime.Invoke(request);
        if (response.Length > 262144) throw new InvalidOperationException("Runtime response exceeded the adapter ceiling.");
        JsonDocument parsed = JsonDocument.Parse(response, new JsonDocumentOptions { MaxDepth = 64 });
        this.Record($"runtime-{operation}", JsonSerializer.Deserialize<object>(parsed.RootElement.GetRawText())!);
        return parsed;
    }

    private static bool Succeeded(JsonDocument response)
    {
        return response.RootElement.TryGetProperty("success", out JsonElement success) && success.ValueKind == JsonValueKind.True;
    }

    private void TryArm()
    {
        if (!this.RendererLoaded || this.Runtime is null)
        {
            this.Monitor.Log("Cabinet arm refused because the exact renderer or runtime provider is absent.", LogLevel.Error);
            return;
        }
        if (this.Armed) return;
        this.TransactionId = $"stardew_{Guid.NewGuid():N}";
        JsonDocument response = this.Invoke("arm", new
        {
            authorityMode = this.Config.AuthorityMode,
            leaseTtlMs = this.Config.LeaseTtlMs,
            gameUniqueId = "StardewValley",
            rendererUniqueId = this.Config.RendererModId,
            displayRole = "television-primary-monoscopic",
            trackingRole = "openxr-unworn-hmd",
            requireControllerFallback = true,
            requireNative2dFallback = true
        }, this.TransactionId);
        this.Armed = Succeeded(response);
        if (!this.Armed)
        {
            this.TransactionId = null;
            this.Monitor.Log("Cabinet arm was refused by the external evidence gate.", LogLevel.Error);
        }
    }

    private void TryDisarm(string reason)
    {
        if (this.Runtime is null) return;
        JsonDocument response = this.Invoke("disarm", new { reason }, this.TransactionId);
        if (Succeeded(response))
        {
            this.Armed = false;
            this.TransactionId = null;
        }
    }

    private void StatusCommand(string command, string[] args)
    {
        this.Monitor.Log(JsonSerializer.Serialize(new
        {
            enabled = this.Config.Enabled,
            rendererLoaded = this.RendererLoaded,
            runtimeApiAvailable = this.Runtime is not null,
            armed = this.Armed,
            transactionId = this.TransactionId,
            authorityMode = this.Config.AuthorityMode,
            productAuthority = "none"
        }, new JsonSerializerOptions { WriteIndented = true }), LogLevel.Info);
    }

    private void ProbeCommand(string command, string[] args) => this.Invoke("probe", new { }).Dispose();
    private void ArmCommand(string command, string[] args) => this.TryArm();
    private void DisarmCommand(string command, string[] args) => this.TryDisarm(args.FirstOrDefault() ?? "console-command");
    private void RecenterCommand(string command, string[] args) => this.Invoke("recenter", new { }, this.TransactionId).Dispose();
    private void FallbackCommand(string command, string[] args) => this.Invoke("select-fallback", new { fallback = args.FirstOrDefault() ?? "controller" }, this.TransactionId).Dispose();
    private void FrameCommand(string command, string[] args) => this.Invoke("capture-frame", new { name = args.FirstOrDefault() ?? "stardew-frame" }, this.TransactionId).Dispose();

    private void Record(string kind, object payload)
    {
        try
        {
            string receipts = Path.Combine(this.Helper.DirectoryPath, "receipts");
            Directory.CreateDirectory(receipts);
            object body = new { format = "rodoh-stardew-cabinet-adapter-receipt/1", kind, observedAt = DateTimeOffset.UtcNow.ToString("O"), payload };
            byte[] bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(body, JsonOptions));
            string digest = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
            string path = Path.Combine(receipts, $"adapterreceipt1_{digest}.json");
            if (!File.Exists(path)) File.WriteAllText(path, JsonSerializer.Serialize(new { receiptId = $"adapterreceipt1_{digest}", body }, new JsonSerializerOptions { WriteIndented = true }), Encoding.UTF8);
            this.Monitor.Log($"RODOH_CABINET_EVENT {kind} adapterreceipt1_{digest}", LogLevel.Trace);
        }
        catch (Exception error)
        {
            this.Monitor.Log($"Unable to write cabinet adapter receipt: {error.Message}", LogLevel.Warn);
        }
    }
}
