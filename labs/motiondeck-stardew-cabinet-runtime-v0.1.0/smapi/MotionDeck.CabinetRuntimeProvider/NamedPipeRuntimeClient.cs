using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace BigBirdReturns.MotionDeck.CabinetRuntimeProvider;

internal sealed class NamedPipeRuntimeClient
{
    private static readonly HashSet<string> AllowedOperations = new(StringComparer.Ordinal)
    {
        "hello", "probe", "arm", "heartbeat", "disarm", "recenter",
        "select-fallback", "capture-frame", "renderer-mode", "drain-events"
    };

    private readonly ModConfig Config;

    public NamedPipeRuntimeClient(ModConfig config)
    {
        this.Config = config;
    }

    public string Invoke(string requestJson)
    {
        try
        {
            using JsonDocument document = JsonDocument.Parse(requestJson, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
                MaxDepth = 32
            });
            JsonElement root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                return Error("mod-api.not-object", "SMAPI provider request must be a JSON object.");
            if (!root.TryGetProperty("format", out JsonElement format) || format.GetString() != "motiondeck-cabinet-mod-api-request/1")
                return Error("mod-api.format", "SMAPI provider request format is unsupported.");
            if (!root.TryGetProperty("operation", out JsonElement operationElement))
                return Error("mod-api.operation", "SMAPI provider request has no operation.");
            string? operation = operationElement.GetString();
            if (operation is null || !AllowedOperations.Contains(operation))
                return Error("mod-api.operation-refused", "SMAPI provider operation is not allowed.");

            string token = File.ReadAllText(this.Config.TokenFile, Encoding.UTF8).Trim();
            if (token.Length < 32)
                return Error("provider.token-invalid", "The local runtime token is missing or invalid.");

            string? transactionId = root.TryGetProperty("transactionId", out JsonElement transactionElement) && transactionElement.ValueKind == JsonValueKind.String
                ? transactionElement.GetString()
                : null;
            JsonElement payload = root.TryGetProperty("payload", out JsonElement payloadElement) && payloadElement.ValueKind == JsonValueKind.Object
                ? payloadElement.Clone()
                : JsonDocument.Parse("{}").RootElement.Clone();

            object hostRequest = new
            {
                format = "motiondeck-cabinet-ipc-request/1",
                requestId = $"smapi_{Guid.NewGuid():N}",
                client = new { id = "BigBirdReturns.MotionDeckCabinetRuntime", role = "adapter", version = "0.1.0" },
                auth = new { token },
                operation,
                transactionId,
                sentAt = DateTimeOffset.UtcNow.ToString("O"),
                payload
            };
            string line = JsonSerializer.Serialize(hostRequest);
            return this.Send(line);
        }
        catch (Exception error)
        {
            return Error("provider.exception", error.Message);
        }
    }

    private string Send(string line)
    {
        using NamedPipeClientStream pipe = new(
            serverName: ".",
            pipeName: this.Config.PipeName,
            direction: PipeDirection.InOut,
            options: PipeOptions.None
        );
        pipe.Connect(this.Config.ConnectTimeoutMs);
        using StreamWriter writer = new(pipe, new UTF8Encoding(false), leaveOpen: true) { AutoFlush = true };
        using StreamReader reader = new(pipe, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, bufferSize: 4096, leaveOpen: true);
        writer.WriteLine(line);
        string? response = reader.ReadLine();
        if (response is null)
            return Error("provider.empty-response", "The local runtime closed without a response.");
        if (response.Length > this.Config.MaximumResponseCharacters)
            return Error("provider.response-oversized", "The local runtime response exceeded the configured ceiling.");
        using JsonDocument _ = JsonDocument.Parse(response);
        return response;
    }

    private static string Error(string code, string message)
    {
        return JsonSerializer.Serialize(new
        {
            format = "motiondeck-cabinet-provider-error/1",
            success = false,
            code,
            message,
            observedAt = DateTimeOffset.UtcNow.ToString("O"),
            productAuthority = "none"
        });
    }
}
