using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using Axm.Rodoh.Action;

internal static class SemanticParityProgram
{
    private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
    {
        IncludeFields = true,
        PropertyNameCaseInsensitive = false,
        WriteIndented = true
    };

    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("usage: SemanticParityProgram <vector.json> <receipt.json>");
            return 2;
        }
        var vectorPath = Path.GetFullPath(args[0]);
        var receiptPath = Path.GetFullPath(args[1]);
        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(vectorPath));
            var root = document.RootElement;
            if (root.GetProperty("format").GetString() != "axm-action-cross-language-vector/1")
                throw new InvalidOperationException("Unknown cross-language vector format.");
            var spec = ActionBridgeJson.ParseSpec(root.GetProperty("projection").GetRawText());
            if (spec.runtimeVersion != ActionContract.SemanticRuntimeVersion)
                throw new InvalidOperationException("Semantic parity requires action runtime 1.1.0.");
            var seed = root.GetProperty("seed").GetUInt32();
            var trace = JsonSerializer.Deserialize<ActionInputRun[]>(root.GetProperty("trace").GetRawText(), Options)
                ?? Array.Empty<ActionInputRun>();
            var expected = JsonNode.Parse(root.GetProperty("expected").GetRawText())
                ?? throw new InvalidOperationException("Expected Arc state is absent.");
            var state = ActionKernel.RunTrace(spec, seed, trace);
            var actual = Project(state);
            var parity = JsonNode.DeepEquals(expected, actual);

            var receipt = new JsonObject
            {
                ["format"] = "rodoh-unity-arc-semantic-state-parity/1",
                ["status"] = parity ? "pass" : "fail",
                ["generatedAt"] = DateTime.UtcNow.ToString("O"),
                ["arcActionAuthorityCommit"] = root.GetProperty("arcActionAuthorityCommit").GetString(),
                ["sourceSpecDigest"] = root.GetProperty("sourceSpecDigest").GetString(),
                ["sourceArcDigest"] = root.GetProperty("sourceArcDigest").GetString(),
                ["runtimeVersion"] = spec.runtimeVersion,
                ["seed"] = seed,
                ["traceRuns"] = trace.Length,
                ["traceTicks"] = ActionTraceRecorder.ExpandedTickCount(trace),
                ["parity"] = parity,
                ["authority"] = "Arc runtime-1.1 vector controls; C# mirror must match exactly",
                ["expected"] = expected.DeepClone(),
                ["actual"] = actual.DeepClone()
            };
            Directory.CreateDirectory(Path.GetDirectoryName(receiptPath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(receiptPath, receipt.ToJsonString(Options) + "\n");
            Console.WriteLine(receipt.ToJsonString(Options));
            return parity ? 0 : 1;
        }
        catch (Exception exception)
        {
            var receipt = new JsonObject
            {
                ["format"] = "rodoh-unity-arc-semantic-state-parity/1",
                ["status"] = "fail",
                ["generatedAt"] = DateTime.UtcNow.ToString("O"),
                ["parity"] = false,
                ["error"] = exception.ToString()
            };
            Directory.CreateDirectory(Path.GetDirectoryName(receiptPath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(receiptPath, receipt.ToJsonString(Options) + "\n");
            Console.Error.WriteLine(receipt.ToJsonString(Options));
            return 1;
        }
    }

    private static JsonObject Project(ActionSimulationState state)
    {
        var enemies = new List<ActionEnemyState>(state.enemies);
        enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
        var enemyNodes = new JsonArray();
        foreach (var enemy in enemies)
        {
            enemyNodes.Add(new JsonObject
            {
                ["id"] = enemy.id,
                ["objectiveId"] = enemy.objectiveId,
                ["kit"] = enemy.kit,
                ["x"] = enemy.x,
                ["y"] = enemy.y,
                ["health"] = enemy.health,
                ["mode"] = Mode(enemy.mode),
                ["modeTick"] = enemy.modeTick,
                ["attackResolved"] = enemy.attackResolved
            });
        }
        var completed = new List<string>(state.completedObjectiveIds);
        completed.Sort(StringComparer.Ordinal);
        var completedNodes = new JsonArray();
        foreach (var id in completed) completedNodes.Add(id);

        var progress = new JsonObject();
        var progressIds = new List<string>(state.objectiveProgress.Keys);
        progressIds.Sort(StringComparer.Ordinal);
        foreach (var id in progressIds) progress[id] = state.objectiveProgress[id];
        var targetIds = new List<string>(state.completedInteractionTargetIds);
        targetIds.Sort(StringComparer.Ordinal);
        var targetNodes = new JsonArray();
        foreach (var id in targetIds) targetNodes.Add(id);

        return new JsonObject
        {
            ["tick"] = state.tick,
            ["activeObjectiveIndex"] = state.activeObjectiveIndex,
            ["previousButtons"] = state.previousButtons,
            ["player"] = new JsonObject
            {
                ["x"] = state.player.x,
                ["y"] = state.player.y,
                ["facingX"] = state.player.facingX,
                ["facingY"] = state.player.facingY,
                ["health"] = state.player.health,
                ["mode"] = Mode(state.player.mode),
                ["modeTick"] = state.player.modeTick
            },
            ["enemies"] = enemyNodes,
            ["completedObjectiveIds"] = completedNodes,
            ["objectiveProgress"] = progress,
            ["completedInteractionTargetIds"] = targetNodes,
            ["stats"] = Stats(state.stats),
            ["result"] = state.result == null ? null : Result(state.result)
        };
    }

    private static JsonObject Result(ActionSimulationResult result)
    {
        var completed = (string[])result.completedObjectiveIds.Clone();
        Array.Sort(completed, StringComparer.Ordinal);
        var completedNodes = new JsonArray();
        foreach (var id in completed) completedNodes.Add(id);
        var objectives = new JsonArray();
        foreach (var objective in result.objectives)
        {
            var node = new JsonObject
            {
                ["id"] = objective.id,
                ["defeated"] = objective.defeated,
                ["target"] = objective.target,
                ["completed"] = objective.completed
            };
            if (!string.IsNullOrWhiteSpace(objective.kind)) node["kind"] = objective.kind;
            if (!string.IsNullOrWhiteSpace(objective.kind)) node["progress"] = objective.progress;
            objectives.Add(node);
        }
        return new JsonObject
        {
            ["outcome"] = result.outcome,
            ["completedObjectiveIds"] = completedNodes,
            ["objectives"] = objectives,
            ["playerHealth"] = result.playerHealth,
            ["playerDefeated"] = result.playerDefeated,
            ["totalTicks"] = result.totalTicks,
            ["stats"] = Stats(result.stats)
        };
    }

    private static JsonObject Stats(ActionStats value)
    {
        return new JsonObject
        {
            ["hitsLanded"] = value.hitsLanded,
            ["heavyHits"] = value.heavyHits,
            ["damageTaken"] = value.damageTaken,
            ["parries"] = value.parries,
            ["dodgedAttacks"] = value.dodgedAttacks,
            ["enemiesDefeated"] = value.enemiesDefeated,
            ["objectiveInteractions"] = value.objectiveInteractions,
            ["objectiveHoldTicks"] = value.objectiveHoldTicks
        };
    }

    private static string Mode(ActionPlayerMode mode)
    {
        return mode.ToString().Replace("_", "-").ToLowerInvariant();
    }

    private static string Mode(ActionEnemyMode mode)
    {
        return mode.ToString().Replace("_", "-").ToLowerInvariant();
    }
}
