using System;
using System.IO;
using Axm.Rodoh.Action;

internal static class Program
{
    [Serializable]
    private sealed class Receipt
    {
        public string format = "rodoh-unity-action-conformance/1";
        public string status = "fail";
        public string generatedAt = DateTime.UtcNow.ToString("O");
        public string projection;
        public string sourceSpecDigest;
        public string sourceArcDigest;
        public string challengeId;
        public int tickRate;
        public int traceRuns;
        public int traceTicks;
        public string traceFingerprint;
        public string firstStateFingerprint;
        public string replayStateFingerprint;
        public bool deterministicReplay;
        public bool naturalInputBuffer;
        public bool heldMechanismInput;
        public bool defensiveInputPriority;
        public string outcome;
        public int completedObjectives;
        public string authority = "C# is a conformance mirror; Arc replay is acceptance authority";
        public string error;
    }

    public static int Main(string[] args)
    {
        var receipt = new Receipt();
        try
        {
            var fixture = args.Length > 0
                ? Path.GetFullPath(args[0])
                : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../Fixtures/frog-pit.unity-action-spec.json"));
            if (!File.Exists(fixture)) throw new FileNotFoundException("Action projection fixture not found.", fixture);
            var spec = ActionBridgeJson.ParseSpec(File.ReadAllText(fixture));
            receipt.projection = spec.format;
            receipt.sourceSpecDigest = spec.sourceSpecDigest;
            receipt.sourceArcDigest = spec.sourceArcDigest;
            receipt.challengeId = spec.challengeId;
            receipt.tickRate = spec.tickRate;
            VerifyNaturalInputBuffer(receipt);

            const uint seed = 0x51A7u;
            var recorder = new ActionTraceRecorder();
            var first = ActionKernel.InitialState(spec, seed);
            while (first.result == null && first.tick < spec.maxTicks)
            {
                var input = Policy(spec, first);
                recorder.Append(input);
                ActionKernel.Step(spec, first, input);
            }
            if (first.result == null) throw new InvalidOperationException("Conformance policy did not reach a terminal state.");

            var trace = recorder.Snapshot();
            var replay = ActionKernel.RunTrace(spec, seed, trace);
            receipt.traceRuns = trace.Length;
            receipt.traceTicks = recorder.TotalTicks;
            receipt.traceFingerprint = ActionConformanceFingerprint.Trace(trace);
            receipt.firstStateFingerprint = ActionConformanceFingerprint.State(spec, first);
            receipt.replayStateFingerprint = ActionConformanceFingerprint.State(spec, replay);
            receipt.deterministicReplay = receipt.firstStateFingerprint == receipt.replayStateFingerprint;
            receipt.outcome = first.result.outcome;
            receipt.completedObjectives = first.result.completedObjectiveIds.Length;

            if (!receipt.deterministicReplay) throw new InvalidOperationException("Identical fixed-step trace produced a different terminal state.");
            if (ActionTraceRecorder.ExpandedTickCount(trace) != first.tick) throw new InvalidOperationException("Compressed trace does not cover the terminal tick count.");
            if (spec.tickRate != ActionContract.TickRate) throw new InvalidOperationException("Conformance fixture changed the 30 Hz law.");
            if (first.enemies.Count > 12) throw new InvalidOperationException("Conformance mirror exceeded the v1 active-enemy ceiling.");

            var candidate = ActionCandidateBuilder.Build(spec, 0, seed, "unity-player", new[] { "unity-player" }, recorder, first);
            if (candidate.authority != "Arc replay required") throw new InvalidOperationException("Unity candidate falsely claims accepted authority.");
            if (candidate.actionSpecDigest != spec.sourceSpecDigest) throw new InvalidOperationException("Unity candidate dropped the Arc action-spec identity.");

            receipt.status = "pass";
            var output = ActionBridgeJson.SerializeObject(receipt, true);
            if (args.Length > 1)
            {
                var outputPath = Path.GetFullPath(args[1]);
                Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? Directory.GetCurrentDirectory());
                File.WriteAllText(outputPath, output);
            }
            Console.WriteLine(output);
            return 0;
        }
        catch (Exception exception)
        {
            receipt.status = "fail";
            receipt.error = exception.ToString();
            var output = ActionBridgeJson.SerializeObject(receipt, true);
            Console.Error.WriteLine(output);
            if (args.Length > 1)
            {
                try
                {
                    var outputPath = Path.GetFullPath(args[1]);
                    Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? Directory.GetCurrentDirectory());
                    File.WriteAllText(outputPath, output);
                }
                catch
                {
                    // The original failure remains controlling.
                }
            }
            return 1;
        }
    }

    private static void VerifyNaturalInputBuffer(Receipt receipt)
    {
        var buffer = new ActionBufferedInput(5);
        var continuous = new ActionInputFrame { moveX = 1, aimY = 1 };
        buffer.Buffer(ActionContract.Light);
        for (var index = 0; index < 3; index += 1)
        {
            if (buffer.Sample(continuous, ActionPlayerMode.Heavy).buttons != 0) throw new InvalidOperationException("Buffered attack leaked into a locked player mode.");
        }
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != ActionContract.Light) throw new InvalidOperationException("Buffered light attack was not consumed on the next legal tick.");

        var held = buffer.Sample(new ActionInputFrame { moveY = 1, aimY = 1, buttons = ActionContract.Interact }, ActionPlayerMode.Heavy);
        if (held.buttons != ActionContract.Interact) throw new InvalidOperationException("Held mechanism work did not pass through a non-idle state.");

        buffer.Buffer(ActionContract.Light | ActionContract.Heavy | ActionContract.Dodge | ActionContract.Parry);
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != ActionContract.Dodge) throw new InvalidOperationException("Dodge did not receive defensive input priority.");
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != ActionContract.Parry) throw new InvalidOperationException("Parry did not receive defensive input priority.");
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != ActionContract.Heavy) throw new InvalidOperationException("Heavy attack was not retained after defensive intent.");
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != ActionContract.Light) throw new InvalidOperationException("Light attack was not retained after higher-priority intent.");

        buffer.Buffer(ActionContract.Light);
        for (var index = 0; index < 6; index += 1) buffer.Sample(continuous, ActionPlayerMode.Stagger);
        if (buffer.Sample(continuous, ActionPlayerMode.Idle).buttons != 0) throw new InvalidOperationException("Expired input survived beyond its configured window.");

        receipt.naturalInputBuffer = true;
        receipt.heldMechanismInput = true;
        receipt.defensiveInputPriority = true;
    }

    private static ActionInputFrame Policy(ActionSpecProjection spec, ActionSimulationState state)
    {
        ActionEnemyState target = null;
        long nearest = long.MaxValue;
        foreach (var enemy in state.enemies)
        {
            if (enemy.mode == ActionEnemyMode.Defeated) continue;
            var dx = (long)enemy.x - state.player.x;
            var dy = (long)enemy.y - state.player.y;
            var distance = dx * dx + dy * dy;
            if (distance >= nearest) continue;
            target = enemy;
            nearest = distance;
        }
        if (target == null) return default;

        var directionX = Math.Sign(target.x - state.player.x);
        var directionY = Math.Sign(target.y - state.player.y);
        var light = spec.AttackLaw("light");
        var buttons = 0;
        if (state.player.mode == ActionPlayerMode.Idle)
        {
            var enemyLaw = spec.EnemyLaw(target.kit);
            if (target.mode == ActionEnemyMode.Telegraph && target.modeTick >= Math.Max(0, enemyLaw.telegraphTicks - spec.player.parryActiveTicks))
            {
                buttons = ActionContract.Parry;
            }
            else if (nearest <= (long)light.range * light.range && state.tick % 6 == 0)
            {
                buttons = state.tick % 24 == 0 ? ActionContract.Heavy : ActionContract.Light;
            }
        }
        var inRange = nearest <= (long)light.range * light.range;
        return new ActionInputFrame
        {
            moveX = inRange ? 0 : directionX,
            moveY = inRange ? 0 : directionY,
            aimX = directionX,
            aimY = directionY,
            buttons = buttons
        };
    }
}
