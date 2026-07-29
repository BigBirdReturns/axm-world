using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Axm.Rodoh.Action;

internal static class CueParityProgram
{
    [Serializable]
    private sealed class ArcReference
    {
        public string format = string.Empty;
        public string timingProfileId = string.Empty;
        public ActionReceiptView acceptedReceipt = new ActionReceiptView();
        public ActionCueTrace cueTrace = new ActionCueTrace();
    }

    [Serializable]
    private sealed class ActionReceiptView
    {
        public string timingProfileId = string.Empty;
        public uint seed = 0;
        public ActionInputRun[] trace = Array.Empty<ActionInputRun>();
        public int totalTicks = 0;
        public string receiptDigest = string.Empty;
    }

    [Serializable]
    private sealed class Receipt
    {
        public string format = "rodoh-unity-action-cue-parity/1";
        public string status = "fail";
        public string projection = string.Empty;
        public string sourceSpecDigest = string.Empty;
        public string sourceArcDigest = string.Empty;
        public string challengeId = string.Empty;
        public string timingProfileId = string.Empty;
        public int cueCount;
        public string arcCueTraceDigest = string.Empty;
        public string csharpCueTraceDigest = string.Empty;
        public bool exactCueParity;
        public bool candidateTimingProfilePreserved;
        public bool presentationOnly;
        public string authority = "C# mirrors Arc cues; Arc replay remains action and outcome authority";
        public string error = string.Empty;
    }

    private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
    {
        IncludeFields = true,
        PropertyNameCaseInsensitive = false,
        WriteIndented = true
    };

    public static int Main(string[] args)
    {
        var receipt = new Receipt();
        try
        {
            if (args.Length < 2) throw new ArgumentException("usage: cue-parity <unity-projection.json> <arc-reference.json> [receipt.json] [candidate.json]");
            var projectionPath = Path.GetFullPath(args[0]);
            var referencePath = Path.GetFullPath(args[1]);
            if (!File.Exists(projectionPath)) throw new FileNotFoundException("Unity action projection is absent.", projectionPath);
            if (!File.Exists(referencePath)) throw new FileNotFoundException("Arc action-player reference is absent.", referencePath);

            var spec = ActionBridgeJson.ParseSpec(File.ReadAllText(projectionPath));
            var reference = JsonSerializer.Deserialize<ArcReference>(File.ReadAllText(referencePath), Options);
            if (reference == null || reference.acceptedReceipt == null || reference.cueTrace == null)
            {
                throw new InvalidOperationException("Arc action-player reference is incomplete.");
            }
            if (reference.format != "axm-action-player-reference/1") throw new InvalidOperationException("Arc action-player reference format mismatch.");
            if (reference.acceptedReceipt.trace == null || reference.acceptedReceipt.trace.Length == 0) throw new InvalidOperationException("Arc action-player reference trace is empty.");
            if (spec.timingProfileId != reference.timingProfileId) throw new InvalidOperationException("Unity projection dropped the Arc timing-profile identity.");
            if (reference.acceptedReceipt.timingProfileId != reference.timingProfileId) throw new InvalidOperationException("Arc receipt timing-profile identity mismatch.");

            var csharp = ActionCueProjector.BuildTrace(spec, reference.acceptedReceipt.seed, reference.acceptedReceipt.trace);
            CompareCueTraces(reference.cueTrace, csharp);

            var recorder = new ActionTraceRecorder();
            var terminal = ActionKernel.InitialState(spec, reference.acceptedReceipt.seed);
            foreach (var run in reference.acceptedReceipt.trace)
            {
                for (var tick = 0; tick < run.ticks && terminal.result == null; tick += 1)
                {
                    recorder.Append(run.input);
                    ActionKernel.Step(spec, terminal, run.input);
                }
                if (terminal.result != null) break;
            }
            if (terminal.result == null) throw new InvalidOperationException("C# reference trace did not reach a terminal result.");
            if (terminal.tick != reference.acceptedReceipt.totalTicks) throw new InvalidOperationException("C# terminal tick differs from the accepted Arc receipt.");
            var candidate = ActionCandidateBuilder.Build(spec, 2, reference.acceptedReceipt.seed, "rhea-venn", new[] { "rhea-venn" }, recorder, terminal);

            receipt.projection = spec.format;
            receipt.sourceSpecDigest = spec.sourceSpecDigest;
            receipt.sourceArcDigest = spec.sourceArcDigest;
            receipt.challengeId = spec.challengeId;
            receipt.timingProfileId = spec.timingProfileId;
            receipt.cueCount = csharp.cues.Length;
            receipt.arcCueTraceDigest = reference.cueTrace.cueTraceDigest;
            receipt.csharpCueTraceDigest = csharp.cueTraceDigest;
            receipt.exactCueParity = csharp.cueTraceDigest == reference.cueTrace.cueTraceDigest;
            receipt.candidateTimingProfilePreserved = candidate.timingProfileId == spec.timingProfileId;
            receipt.presentationOnly = true;
            if (!receipt.exactCueParity) throw new InvalidOperationException("Arc and C# cue-trace digests differ.");
            if (!receipt.candidateTimingProfilePreserved) throw new InvalidOperationException("Unity candidate dropped the timing-profile identity.");
            if (candidate.authority != "Arc replay required") throw new InvalidOperationException("Unity candidate claimed accepted authority.");
            if (args.Length > 3)
            {
                var candidatePath = Path.GetFullPath(args[3]);
                Directory.CreateDirectory(Path.GetDirectoryName(candidatePath) ?? Directory.GetCurrentDirectory());
                File.WriteAllText(candidatePath, ActionBridgeJson.SerializeCandidate(candidate, true));
            }
            receipt.status = "pass";
            return Write(receipt, args.Length > 2 ? args[2] : null, false);
        }
        catch (Exception exception)
        {
            receipt.error = exception.ToString();
            return Write(receipt, args.Length > 2 ? args[2] : null, true);
        }
    }

    private static void CompareCueTraces(ActionCueTrace expected, ActionCueTrace actual)
    {
        if (expected.actionSpecDigest != actual.actionSpecDigest) throw new InvalidOperationException("Cue trace action-spec identity mismatch.");
        if (expected.seed != actual.seed) throw new InvalidOperationException("Cue trace seed mismatch.");
        if (expected.totalTicks != actual.totalTicks) throw new InvalidOperationException("Cue trace terminal tick mismatch.");
        if (expected.cues == null || actual.cues == null || expected.cues.Length != actual.cues.Length)
        {
            throw new InvalidOperationException("Cue trace length mismatch.");
        }
        for (var index = 0; index < expected.cues.Length; index += 1)
        {
            var left = expected.cues[index];
            var right = actual.cues[index];
            if (left == null || right == null) throw new InvalidOperationException("Cue trace contains a null cue.");
            var mismatch = new List<string>();
            Equal(mismatch, "format", left.format, right.format);
            Equal(mismatch, "cueId", left.cueId, right.cueId);
            Equal(mismatch, "tick", left.tick, right.tick);
            Equal(mismatch, "sequence", left.sequence, right.sequence);
            Equal(mismatch, "subjectId", left.subjectId, right.subjectId);
            Equal(mismatch, "objectiveId", left.objectiveId, right.objectiveId);
            Equal(mismatch, "targetId", left.targetId, right.targetId);
            Equal(mismatch, "action", left.action, right.action);
            Equal(mismatch, "durationTicks", left.durationTicks, right.durationTicks);
            Equal(mismatch, "progress", left.progress, right.progress);
            Equal(mismatch, "target", left.target, right.target);
            Equal(mismatch, "outcome", left.outcome, right.outcome);
            Equal(mismatch, "source", left.source, right.source);
            Equal(mismatch, "cueDigest", left.cueDigest, right.cueDigest);
            if (mismatch.Count > 0)
            {
                throw new InvalidOperationException("Cue mismatch at index " + index + ": " + string.Join(", ", mismatch));
            }
        }
        if (expected.cueTraceDigest != actual.cueTraceDigest) throw new InvalidOperationException("Cue trace digest mismatch.");
    }

    private static void Equal<T>(List<string> mismatch, string field, T expected, T actual)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual)) mismatch.Add(field);
    }

    private static int Write(Receipt receipt, string outputPath, bool failure)
    {
        var json = JsonSerializer.Serialize(receipt, Options);
        if (!string.IsNullOrWhiteSpace(outputPath))
        {
            var fullPath = Path.GetFullPath(outputPath);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(fullPath, json);
        }
        if (failure) Console.Error.WriteLine(json);
        else Console.WriteLine(json);
        return failure ? 1 : 0;
    }
}
