using System;
using System.IO;
using Axm.Rodoh.Action;

internal static class CandidateProgram
{
    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("usage: CandidateProgram <projection.json> <candidate.json> [cycle] [seed] [controlled-agent]");
            return 2;
        }
        var specPath = Path.GetFullPath(args[0]);
        var candidatePath = Path.GetFullPath(args[1]);
        var cycle = args.Length > 2 ? int.Parse(args[2]) : 0;
        var seed = args.Length > 3 ? uint.Parse(args[3]) : 1u;
        var controlledAgent = args.Length > 4 ? args[4] : "unity-player";
        try
        {
            var spec = ActionBridgeJson.ParseSpec(File.ReadAllText(specPath));
            var recorder = new ActionTraceRecorder();
            var state = ActionKernel.InitialState(spec, seed);
            while (state.result == null && state.tick < spec.maxTicks)
            {
                var input = Policy(spec, state);
                recorder.Append(input);
                ActionKernel.Step(spec, state, input);
            }
            if (state.result == null) throw new InvalidOperationException("Candidate policy did not reach a terminal state.");
            if (recorder.TotalTicks != state.tick) throw new InvalidOperationException("Candidate trace and terminal state cover different tick counts.");
            var replay = ActionKernel.RunTrace(spec, seed, recorder.Snapshot());
            var firstFingerprint = ActionConformanceFingerprint.State(spec, state);
            var replayFingerprint = ActionConformanceFingerprint.State(spec, replay);
            if (firstFingerprint != replayFingerprint) throw new InvalidOperationException("Candidate trace does not reproduce the provisional terminal state.");
            var candidate = ActionCandidateBuilder.Build(
                spec,
                cycle,
                seed,
                controlledAgent,
                new[] { controlledAgent },
                recorder,
                state);
            var json = ActionBridgeJson.SerializeObject(candidate);
            Directory.CreateDirectory(Path.GetDirectoryName(candidatePath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(candidatePath, json + "\n");
            Console.WriteLine(ActionBridgeJson.SerializeObject(new
            {
                format = "rodoh-action-candidate-generation/1",
                status = "pass",
                actionSpecDigest = spec.sourceSpecDigest,
                arcDigest = spec.sourceArcDigest,
                challengeId = spec.challengeId,
                cycle,
                seed,
                traceRuns = recorder.Runs.Count,
                traceTicks = recorder.TotalTicks,
                provisionalOutcome = state.result.outcome,
                provisionalStateFingerprint = firstFingerprint,
                replayStateFingerprint = replayFingerprint,
                candidate = candidatePath,
                authority = candidate.authority
            }));
            return 0;
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);
            return 1;
        }
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
        var aimX = Math.Sign(target.x - state.player.x);
        var aimY = Math.Sign(target.y - state.player.y);
        var light = spec.AttackLaw("light");
        var heavy = spec.AttackLaw("heavy");
        var inLightRange = nearest <= (long)light.range * light.range;
        var inHeavyRange = nearest <= (long)heavy.range * heavy.range;
        var buttons = 0;
        if (state.player.mode == ActionPlayerMode.Idle)
        {
            var enemyLaw = spec.EnemyLaw(target.kit);
            if (target.mode == ActionEnemyMode.Telegraph && target.modeTick >= Math.Max(0, enemyLaw.telegraphTicks - spec.player.parryActiveTicks))
            {
                buttons = state.tick % 2 == 0 ? ActionContract.Parry : ActionContract.Dodge;
            }
            else if (inHeavyRange && state.tick % 24 == 0)
            {
                buttons = ActionContract.Heavy;
            }
            else if (inLightRange && state.tick % 6 == 0)
            {
                buttons = ActionContract.Light;
            }
        }
        return new ActionInputFrame
        {
            moveX = inLightRange ? 0 : aimX,
            moveY = inLightRange ? 0 : aimY,
            aimX = aimX,
            aimY = aimY,
            buttons = buttons
        };
    }
}
