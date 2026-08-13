using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using Axm.Rodoh.Action;

internal static class ArcParityProgram
{
    private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
    {
        IncludeFields = true,
        PropertyNameCaseInsensitive = false,
        WriteIndented = true
    };

    private sealed class Snapshot
    {
        public int tick;
        public int activeObjectiveIndex;
        public int previousButtons;
        public PlayerSnapshot player;
        public EnemySnapshot[] enemies;
        public string[] completedObjectiveIds;
        public StatsSnapshot stats;
        public ResultSnapshot result;
    }

    private sealed class PlayerSnapshot
    {
        public int x;
        public int y;
        public int facingX;
        public int facingY;
        public int health;
        public string mode;
        public int modeTick;
    }

    private sealed class EnemySnapshot
    {
        public string id;
        public string objectiveId;
        public string kit;
        public int x;
        public int y;
        public int health;
        public string mode;
        public int modeTick;
        public bool attackResolved;
    }

    private sealed class StatsSnapshot
    {
        public int hitsLanded;
        public int heavyHits;
        public int damageTaken;
        public int parries;
        public int dodgedAttacks;
        public int enemiesDefeated;
    }

    private sealed class ResultSnapshot
    {
        public string outcome;
        public string[] completedObjectiveIds;
        public ObjectiveSnapshot[] objectives;
        public int playerHealth;
        public bool playerDefeated;
        public int totalTicks;
        public StatsSnapshot stats;
    }

    private sealed class ObjectiveSnapshot
    {
        public string id;
        public int defeated;
        public int target;
        public bool completed;
    }

    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("usage: ArcParityProgram <vector.json> <receipt.json>");
            return 2;
        }
        var vectorPath = Path.GetFullPath(args[0]);
        var receiptPath = Path.GetFullPath(args[1]);
        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(vectorPath));
            var root = document.RootElement;
            if (root.GetProperty("format").GetString() != "axm-action-cross-language-vector/1") throw new InvalidOperationException("Unknown cross-language vector format.");
            var projectionJson = root.GetProperty("projection").GetRawText();
            var spec = ActionBridgeJson.ParseSpec(projectionJson);
            var seed = root.GetProperty("seed").GetUInt32();
            var trace = JsonSerializer.Deserialize<ActionInputRun[]>(root.GetProperty("trace").GetRawText(), Options) ?? Array.Empty<ActionInputRun>();
            var expectedNode = JsonNode.Parse(root.GetProperty("expected").GetRawText()) ?? throw new InvalidOperationException("Expected Arc state is absent.");
            var state = ActionKernel.RunTrace(spec, seed, trace);
            var actual = Project(state);
            var actualNode = JsonSerializer.SerializeToNode(actual, Options) ?? throw new InvalidOperationException("C# state could not be serialized.");
            var parity = JsonNode.DeepEquals(expectedNode, actualNode);

            var receipt = new JsonObject
            {
                ["format"] = "rodoh-unity-arc-state-parity/1",
                ["status"] = parity ? "pass" : "fail",
                ["generatedAt"] = DateTime.UtcNow.ToString("O"),
                ["arcActionAuthorityCommit"] = root.GetProperty("arcActionAuthorityCommit").GetString(),
                ["sourceSpecDigest"] = root.GetProperty("sourceSpecDigest").GetString(),
                ["sourceArcDigest"] = root.GetProperty("sourceArcDigest").GetString(),
                ["seed"] = seed,
                ["traceRuns"] = trace.Length,
                ["traceTicks"] = ActionTraceRecorder.ExpandedTickCount(trace),
                ["parity"] = parity,
                ["authority"] = "Arc source vector controls; C# mirror must match exactly",
                ["expected"] = expectedNode.DeepClone(),
                ["actual"] = actualNode.DeepClone()
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
                ["format"] = "rodoh-unity-arc-state-parity/1",
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

    private static Snapshot Project(ActionSimulationState state)
    {
        var enemies = new List<ActionEnemyState>(state.enemies);
        enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
        var enemySnapshots = new EnemySnapshot[enemies.Count];
        for (var index = 0; index < enemies.Count; index += 1)
        {
            var enemy = enemies[index];
            enemySnapshots[index] = new EnemySnapshot
            {
                id = enemy.id,
                objectiveId = enemy.objectiveId,
                kit = enemy.kit,
                x = enemy.x,
                y = enemy.y,
                health = enemy.health,
                mode = Mode(enemy.mode),
                modeTick = enemy.modeTick,
                attackResolved = enemy.attackResolved
            };
        }
        var completed = state.completedObjectiveIds.ToArray();
        Array.Sort(completed, StringComparer.Ordinal);
        return new Snapshot
        {
            tick = state.tick,
            activeObjectiveIndex = state.activeObjectiveIndex,
            previousButtons = state.previousButtons,
            player = new PlayerSnapshot
            {
                x = state.player.x,
                y = state.player.y,
                facingX = state.player.facingX,
                facingY = state.player.facingY,
                health = state.player.health,
                mode = Mode(state.player.mode),
                modeTick = state.player.modeTick
            },
            enemies = enemySnapshots,
            completedObjectiveIds = completed,
            stats = Stats(state.stats),
            result = state.result == null ? null : Result(state.result)
        };
    }

    private static ResultSnapshot Result(ActionSimulationResult result)
    {
        var completed = (string[])result.completedObjectiveIds.Clone();
        Array.Sort(completed, StringComparer.Ordinal);
        var objectives = new ObjectiveSnapshot[result.objectives.Length];
        for (var index = 0; index < result.objectives.Length; index += 1)
        {
            var objective = result.objectives[index];
            objectives[index] = new ObjectiveSnapshot
            {
                id = objective.id,
                defeated = objective.defeated,
                target = objective.target,
                completed = objective.completed
            };
        }
        return new ResultSnapshot
        {
            outcome = result.outcome,
            completedObjectiveIds = completed,
            objectives = objectives,
            playerHealth = result.playerHealth,
            playerDefeated = result.playerDefeated,
            totalTicks = result.totalTicks,
            stats = Stats(result.stats)
        };
    }

    private static StatsSnapshot Stats(ActionStats value)
    {
        return new StatsSnapshot
        {
            hitsLanded = value.hitsLanded,
            heavyHits = value.heavyHits,
            damageTaken = value.damageTaken,
            parries = value.parries,
            dodgedAttacks = value.dodgedAttacks,
            enemiesDefeated = value.enemiesDefeated
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
