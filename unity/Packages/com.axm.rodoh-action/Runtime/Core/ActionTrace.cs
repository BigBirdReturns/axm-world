using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
#if UNITY_5_3_OR_NEWER
using UnityEngine;
#else
using System.Text.Json;
#endif

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Renderer-independent trace custody pinned by the hosted real-cartridge,
    /// cross-language matrix, and multi-cartridge Arc replay gates.
    /// </summary>
    public sealed class ActionTraceRecorder
    {
        private readonly List<ActionInputRun> _runs = new List<ActionInputRun>();
        private int _totalTicks;

        public int TotalTicks => _totalTicks;
        public IReadOnlyList<ActionInputRun> Runs => _runs;

        public void Append(ActionInputFrame rawInput)
        {
            var input = ActionInputFrame.Normalize(rawInput);
            _totalTicks += 1;
            if (_runs.Count > 0 && _runs[_runs.Count - 1].input.Equals(input))
            {
                _runs[_runs.Count - 1].ticks += 1;
                return;
            }
            _runs.Add(new ActionInputRun { ticks = 1, input = input });
        }

        public ActionInputRun[] Snapshot()
        {
            var result = new ActionInputRun[_runs.Count];
            for (var index = 0; index < _runs.Count; index += 1)
            {
                result[index] = new ActionInputRun
                {
                    ticks = _runs[index].ticks,
                    input = _runs[index].input
                };
            }
            return result;
        }

        public void Reset()
        {
            _runs.Clear();
            _totalTicks = 0;
        }

        public static int ExpandedTickCount(IEnumerable<ActionInputRun> runs)
        {
            var total = 0;
            if (runs == null) return total;
            foreach (var run in runs)
            {
                if (run == null || run.ticks <= 0) throw new InvalidOperationException("Action trace contains a non-positive run.");
                checked { total += run.ticks; }
            }
            return total;
        }
    }

    public static class ActionBridgeJson
    {
#if !UNITY_5_3_OR_NEWER
        private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
        {
            IncludeFields = true,
            PropertyNameCaseInsensitive = false,
            WriteIndented = true
        };
#endif

        public static ActionSpecProjection ParseSpec(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) throw new ArgumentException("Action projection JSON is empty.", nameof(json));
#if UNITY_5_3_OR_NEWER
            var value = JsonUtility.FromJson<ActionSpecProjection>(json);
#else
            var value = JsonSerializer.Deserialize<ActionSpecProjection>(json, Options);
#endif
            if (value == null) throw new InvalidOperationException("Action projection JSON did not produce an object.");
            var errors = value.Validate();
            if (errors.Count > 0) throw new InvalidOperationException(string.Join(" ", errors));
            return value;
        }

        public static string SerializeCandidate(ActionExecutionCandidate candidate, bool pretty = true)
        {
            if (candidate == null) throw new ArgumentNullException(nameof(candidate));
#if UNITY_5_3_OR_NEWER
            return JsonUtility.ToJson(candidate, pretty);
#else
            return JsonSerializer.Serialize(candidate, Options);
#endif
        }

        public static string SerializeObject<T>(T value, bool pretty = true)
        {
#if UNITY_5_3_OR_NEWER
            return JsonUtility.ToJson(value, pretty);
#else
            return JsonSerializer.Serialize(value, Options);
#endif
        }
    }

    public static class ActionConformanceFingerprint
    {
        public static string State(ActionSpecProjection spec, ActionSimulationState state)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            if (state == null) throw new ArgumentNullException(nameof(state));
            var text = new StringBuilder(2048);
            text.Append("rodoh-unity-action-state-fingerprint/1\n");
            text.Append(spec.sourceSpecDigest).Append('\n');
            text.Append(state.seed.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append(state.tick.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append(state.activeObjectiveIndex.ToString(CultureInfo.InvariantCulture)).Append('\n');
            text.Append(state.player.x).Append(',').Append(state.player.y).Append(',')
                .Append(state.player.facingX).Append(',').Append(state.player.facingY).Append(',')
                .Append(state.player.health).Append(',').Append((int)state.player.mode).Append(',')
                .Append(state.player.modeTick).Append('\n');

            var enemies = new List<ActionEnemyState>(state.enemies);
            enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
            foreach (var enemy in enemies)
            {
                text.Append(enemy.id).Append('|').Append(enemy.objectiveId).Append('|').Append(enemy.kit).Append('|')
                    .Append(enemy.x).Append(',').Append(enemy.y).Append(',').Append(enemy.health).Append(',')
                    .Append((int)enemy.mode).Append(',').Append(enemy.modeTick).Append(',')
                    .Append(enemy.attackResolved ? '1' : '0').Append('\n');
            }

            var completed = new List<string>(state.completedObjectiveIds);
            completed.Sort(StringComparer.Ordinal);
            text.Append("completed:").Append(string.Join(",", completed)).Append('\n');
  if (spec.runtimeVersion == ActionContract.SemanticRuntimeVersion)
  {
      var progressIds = new List<string>(state.objectiveProgress.Keys);
      progressIds.Sort(StringComparer.Ordinal);
      foreach (var id in progressIds) text.Append("progress:").Append(id).Append('=').Append(state.objectiveProgress[id]).Append('\n');
      var targetIds = new List<string>(state.completedInteractionTargetIds);
      targetIds.Sort(StringComparer.Ordinal);
      text.Append("interaction-targets:").Append(string.Join(",", targetIds)).Append('\n');
  }
  text.Append("stats:").Append(state.stats.hitsLanded).Append(',').Append(state.stats.heavyHits).Append(',')
      .Append(state.stats.damageTaken).Append(',').Append(state.stats.parries).Append(',')
      .Append(state.stats.dodgedAttacks).Append(',').Append(state.stats.enemiesDefeated);
  if (spec.runtimeVersion == ActionContract.SemanticRuntimeVersion)
      text.Append(',').Append(state.stats.objectiveInteractions).Append(',').Append(state.stats.objectiveHoldTicks);
  text.Append('\n');
            text.Append("result:").Append(state.result == null ? "open" : state.result.outcome).Append('\n');
            return "unitystate1_" + Sha256Hex(Encoding.UTF8.GetBytes(text.ToString()));
        }

        public static string Trace(IEnumerable<ActionInputRun> runs)
        {
            var text = new StringBuilder(1024);
            text.Append("rodoh-unity-action-trace-fingerprint/1\n");
            if (runs != null)
            {
                foreach (var run in runs)
                {
                    if (run == null || run.ticks <= 0) throw new InvalidOperationException("Action trace contains a non-positive run.");
                    var input = ActionInputFrame.Normalize(run.input);
                    text.Append(run.ticks).Append(':').Append(input.moveX).Append(',').Append(input.moveY).Append(',')
                        .Append(input.aimX).Append(',').Append(input.aimY).Append(',').Append(input.buttons).Append('\n');
                }
            }
            return "unitytrace1_" + Sha256Hex(Encoding.UTF8.GetBytes(text.ToString()));
        }

        private static string Sha256Hex(byte[] bytes)
        {
            using (var sha = SHA256.Create())
            {
                var digest = sha.ComputeHash(bytes);
                var result = new StringBuilder(digest.Length * 2);
                foreach (var value in digest) result.Append(value.ToString("x2", CultureInfo.InvariantCulture));
                return result.ToString();
            }
        }
    }

    public static class ActionCandidateBuilder
    {
        public static ActionExecutionCandidate Build(
            ActionSpecProjection spec,
            int cycle,
            uint seed,
            string controlledAgentId,
            string[] partyAgentIds,
            ActionTraceRecorder recorder,
            ActionSimulationState state)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            if (recorder == null) throw new ArgumentNullException(nameof(recorder));
            if (state == null) throw new ArgumentNullException(nameof(state));
            return new ActionExecutionCandidate
  {
      runtimeVersion = spec.runtimeVersion,
      arcDigest = spec.sourceArcDigest,
                challengeId = spec.challengeId,
                difficultyModeId = spec.difficultyModeId,
                actionSpecDigest = spec.sourceSpecDigest,
                cycle = cycle,
                seed = seed,
                controlledAgentId = controlledAgentId ?? string.Empty,
                partyAgentIds = partyAgentIds ?? Array.Empty<string>(),
                trace = recorder.Snapshot(),
                totalTicks = recorder.TotalTicks,
                provisionalResult = state.result ?? new ActionSimulationResult
                {
                    outcome = "open",
                    completedObjectiveIds = state.completedObjectiveIds.ToArray(),
                    playerHealth = state.player.health,
                    playerDefeated = state.player.mode == ActionPlayerMode.Defeated,
                    totalTicks = state.tick,
                    stats = state.stats.Clone()
                }
            };
        }
    }
}
