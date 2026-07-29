using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Axm.Rodoh.Action
{
    public static class ActionCueContract
    {
        public const string CueFormat = "axm-action-cue/1";
        public const string TraceFormat = "axm-action-cue-trace/1";

        public static readonly string[] RequiredCueIds =
        {
            "cue.player-action-started",
            "cue.player-action-active",
            "cue.player-action-recovery",
            "cue.enemy-attack-anticipated",
            "cue.enemy-attack-active",
            "cue.enemy-attack-recovery",
            "cue.defense-window-opened",
            "cue.defense-window-closed",
            "cue.parry-succeeded",
            "cue.dodge-invulnerability",
            "cue.enemy-stagger-started",
            "cue.mechanism-available",
            "cue.mechanism-progress",
            "cue.work-window-opened",
            "cue.work-window-closed",
            "cue.objective-completed",
            "cue.encounter-completed"
        };

        private static readonly HashSet<string> Required = new HashSet<string>(RequiredCueIds, StringComparer.Ordinal);

        public static bool IsRequiredCue(string cueId)
        {
            return !string.IsNullOrEmpty(cueId) && Required.Contains(cueId);
        }

        public static int CueCode(string cueId)
        {
            for (var index = 0; index < RequiredCueIds.Length; index += 1)
            {
                if (RequiredCueIds[index] == cueId) return index + 1;
            }
            return 0;
        }
    }

    [Serializable]
    public sealed class ActionSemanticCue
    {
        public string format = ActionCueContract.CueFormat;
        public string cueId = string.Empty;
        public int tick;
        public int sequence;
        public string subjectId = string.Empty;
        public string objectiveId;
        public string targetId;
        public string action;
        public int? durationTicks;
        public int? progress;
        public int? target;
        public string outcome;
        public string source;
        public string cueDigest = string.Empty;
    }

    [Serializable]
    public sealed class ActionCueTrace
    {
        public string format = ActionCueContract.TraceFormat;
        public string actionSpecDigest = string.Empty;
        public uint seed;
        public int totalTicks;
        public ActionSemanticCue[] cues = Array.Empty<ActionSemanticCue>();
        public string cueTraceDigest = string.Empty;
    }

    internal sealed class ActionCueCandidate
    {
        public string cueId;
        public int tick;
        public string subjectId;
        public string objectiveId;
        public string targetId;
        public string action;
        public int? durationTicks;
        public int? progress;
        public int? target;
        public string outcome;
        public string source;
        public int ordinal;
    }

    /// <summary>
    /// Pure presentation-only projection over exact Arc mirror state. It does not
    /// mutate action state, trace, damage, objectives, candidates, or receipts.
    /// </summary>
    public static class ActionCueProjector
    {
        private static readonly Dictionary<string, int> CueOrder = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            { "cue.mechanism-available", 10 },
            { "cue.player-action-started", 20 },
            { "cue.defense-window-opened", 21 },
            { "cue.dodge-invulnerability", 22 },
            { "cue.enemy-attack-anticipated", 30 },
            { "cue.player-action-active", 40 },
            { "cue.enemy-attack-active", 50 },
            { "cue.parry-succeeded", 60 },
            { "cue.enemy-stagger-started", 61 },
            { "cue.work-window-opened", 62 },
            { "cue.enemy-attack-recovery", 63 },
            { "cue.mechanism-progress", 70 },
            { "cue.objective-completed", 80 },
            { "cue.work-window-closed", 81 },
            { "cue.player-action-recovery", 90 },
            { "cue.defense-window-closed", 91 },
            { "cue.encounter-completed", 100 }
        };

        public static ActionSemanticCue[] Initial(ActionSpecProjection spec, ActionSimulationState state)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            if (state == null) throw new ArgumentNullException(nameof(state));
            var candidates = new List<ActionCueCandidate>();
            AddMechanismAvailable(spec, state, candidates);
            return FinalizeCues(candidates);
        }

        public static ActionSemanticCue[] Project(
            ActionSpecProjection spec,
            ActionSimulationState prior,
            ActionSimulationState next)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            if (prior == null) throw new ArgumentNullException(nameof(prior));
            if (next == null) throw new ArgumentNullException(nameof(next));
            var candidates = new List<ActionCueCandidate>();
            AddPlayerCues(spec, prior, next, candidates);
            AddEnemyCues(spec, prior, next, candidates);
            AddEventCues(spec, next, candidates);
            if (prior.activeObjectiveIndex != next.activeObjectiveIndex && next.result == null)
            {
                AddMechanismAvailable(spec, next, candidates);
            }
            return FinalizeCues(candidates);
        }

        public static ActionCueTrace BuildTrace(
            ActionSpecProjection spec,
            uint seed,
            IEnumerable<ActionInputRun> runs)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            var state = ActionKernel.InitialState(spec, seed);
            var cues = new List<ActionSemanticCue>(Initial(spec, state));
            if (runs != null)
            {
                foreach (var run in runs)
                {
                    if (run == null || run.ticks <= 0) throw new InvalidOperationException("Action cue trace contains a non-positive input run.");
                    for (var tick = 0; tick < run.ticks && state.result == null; tick += 1)
                    {
                        var prior = ActionStateSnapshot.Clone(state);
                        ActionKernel.Step(spec, state, run.input);
                        cues.AddRange(Project(spec, prior, state));
                    }
                    if (state.result != null) break;
                }
            }
            var trace = new ActionCueTrace
            {
                actionSpecDigest = spec.sourceSpecDigest,
                seed = seed,
                totalTicks = state.tick,
                cues = cues.ToArray()
            };
            trace.cueTraceDigest = "actcuetrace1_" + Sha256Hex(CanonicalTrace(trace));
            return trace;
        }

        private static void AddMechanismAvailable(
            ActionSpecProjection spec,
            ActionSimulationState state,
            List<ActionCueCandidate> cues)
        {
            var objective = ActiveObjective(spec, state);
            var completion = objective == null ? null : objective.semanticCompletion;
            if (completion == null) return;
            var targets = new List<ActionObjectiveTarget>();
            if (completion.kind == "interact_count")
            {
                if (completion.targets != null) targets.AddRange(completion.targets);
                targets.Sort((left, right) => string.CompareOrdinal(left == null ? string.Empty : left.id, right == null ? string.Empty : right.id));
            }
            else if (completion.kind == "hold_ticks" && completion.target != null)
            {
                targets.Add(completion.target);
            }
            foreach (var target in targets)
            {
                if (target == null || state.completedInteractionTargetIds.Contains(target.id)) continue;
                Add(cues, new ActionCueCandidate
                {
                    cueId = "cue.mechanism-available",
                    tick = state.tick,
                    subjectId = target.id,
                    objectiveId = objective.id,
                    targetId = target.id
                });
            }
        }

        private static void AddPlayerCues(
            ActionSpecProjection spec,
            ActionSimulationState prior,
            ActionSimulationState next,
            List<ActionCueCandidate> cues)
        {
            var before = prior.player;
            var after = next.player;
            if (IsActionMode(after.mode) && before.mode != after.mode)
            {
                var action = PlayerAction(after.mode);
                Add(cues, new ActionCueCandidate
                {
                    cueId = "cue.player-action-started",
                    tick = next.tick,
                    subjectId = "player",
                    action = action,
                    durationTicks = PlayerActionTicks(spec, after.mode)
                });
                if (after.mode == ActionPlayerMode.Parry)
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.defense-window-opened",
                        tick = next.tick,
                        subjectId = "player",
                        action = "parry",
                        durationTicks = spec.player.parryActiveTicks
                    });
                }
                if (after.mode == ActionPlayerMode.Dodge)
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.dodge-invulnerability",
                        tick = next.tick,
                        subjectId = "player",
                        action = "dodge",
                        durationTicks = spec.player.dodgeInvulnerableTicks
                    });
                }
            }

            AddAttackPhase(spec, before, after, next.tick, ActionPlayerMode.Light, "light", cues);
            AddAttackPhase(spec, before, after, next.tick, ActionPlayerMode.Heavy, "heavy", cues);

            if (before.mode == ActionPlayerMode.Parry)
            {
                var beforeOpen = before.modeTick < spec.player.parryActiveTicks;
                var afterOpen = after.mode == ActionPlayerMode.Parry && after.modeTick < spec.player.parryActiveTicks;
                if (beforeOpen && !afterOpen)
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.defense-window-closed",
                        tick = next.tick,
                        subjectId = "player",
                        action = "parry"
                    });
                }
                if (after.mode == ActionPlayerMode.Parry
                    && before.modeTick < spec.player.parryTicks
                    && after.modeTick >= spec.player.parryTicks)
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.player-action-recovery",
                        tick = next.tick,
                        subjectId = "player",
                        action = "parry",
                        durationTicks = spec.player.parryRecoveryTicks
                    });
                }
            }
        }

        private static void AddAttackPhase(
            ActionSpecProjection spec,
            ActionPlayerState before,
            ActionPlayerState after,
            int tick,
            ActionPlayerMode mode,
            string action,
            List<ActionCueCandidate> cues)
        {
            if (before.mode != mode || after.mode != mode) return;
            var law = spec.AttackLaw(action);
            var activeStart = law.startupTicks;
            var recoveryStart = activeStart + law.activeTicks;
            if (before.modeTick < activeStart && after.modeTick >= activeStart)
            {
                Add(cues, new ActionCueCandidate
                {
                    cueId = "cue.player-action-active",
                    tick = tick,
                    subjectId = "player",
                    action = action,
                    durationTicks = law.activeTicks
                });
            }
            if (before.modeTick < recoveryStart && after.modeTick >= recoveryStart)
            {
                Add(cues, new ActionCueCandidate
                {
                    cueId = "cue.player-action-recovery",
                    tick = tick,
                    subjectId = "player",
                    action = action,
                    durationTicks = law.recoveryTicks
                });
            }
        }

        private static void AddEnemyCues(
            ActionSpecProjection spec,
            ActionSimulationState prior,
            ActionSimulationState next,
            List<ActionCueCandidate> cues)
        {
            var beforeById = new Dictionary<string, ActionEnemyState>(StringComparer.Ordinal);
            foreach (var enemy in prior.enemies) beforeById[enemy.id] = enemy;
            var enemies = new List<ActionEnemyState>(next.enemies);
            enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
            var objective = ActiveObjective(spec, next) ?? ActiveObjective(spec, prior);
            var objectiveId = objective == null ? null : objective.id;
            foreach (var enemy in enemies)
            {
                ActionEnemyState before;
                if (!beforeById.TryGetValue(enemy.id, out before) || before.mode == enemy.mode) continue;
                var law = spec.EnemyLaw(enemy.kit);
                if (before.mode == ActionEnemyMode.Approach && enemy.mode == ActionEnemyMode.Telegraph)
                {
                    Add(cues, EnemyCue("cue.enemy-attack-anticipated", next.tick, enemy.id, objectiveId, law.telegraphTicks, null));
                }
                if (before.mode == ActionEnemyMode.Telegraph && enemy.mode == ActionEnemyMode.Active)
                {
                    Add(cues, EnemyCue("cue.enemy-attack-active", next.tick, enemy.id, objectiveId, law.activeTicks, null));
                }
                if (before.mode == ActionEnemyMode.Active && enemy.mode == ActionEnemyMode.Recover)
                {
                    Add(cues, EnemyCue("cue.enemy-attack-recovery", next.tick, enemy.id, objectiveId, law.recoveryTicks, null));
                    Add(cues, EnemyCue("cue.work-window-opened", next.tick, enemy.id, objectiveId, law.recoveryTicks, "enemy_recovery"));
                }
                if (enemy.mode == ActionEnemyMode.Stagger && before.mode != ActionEnemyMode.Stagger)
                {
                    Add(cues, EnemyCue("cue.enemy-stagger-started", next.tick, enemy.id, objectiveId, law.staggerTicks, null));
                    Add(cues, EnemyCue("cue.work-window-opened", next.tick, enemy.id, objectiveId, law.staggerTicks, "parry_stagger"));
                }
                if (before.mode == ActionEnemyMode.Recover && enemy.mode == ActionEnemyMode.Approach)
                {
                    Add(cues, EnemyCue("cue.work-window-closed", next.tick, enemy.id, objectiveId, null, "enemy_recovery"));
                }
                if (before.mode == ActionEnemyMode.Stagger && enemy.mode == ActionEnemyMode.Approach)
                {
                    Add(cues, EnemyCue("cue.work-window-closed", next.tick, enemy.id, objectiveId, null, "parry_stagger"));
                }
            }
        }

        private static ActionCueCandidate EnemyCue(
            string cueId,
            int tick,
            string subjectId,
            string objectiveId,
            int? durationTicks,
            string source)
        {
            return new ActionCueCandidate
            {
                cueId = cueId,
                tick = tick,
                subjectId = subjectId,
                objectiveId = objectiveId,
                durationTicks = durationTicks,
                source = source
            };
        }

        private static void AddEventCues(
            ActionSpecProjection spec,
            ActionSimulationState state,
            List<ActionCueCandidate> cues)
        {
            foreach (var actionEvent in state.events)
            {
                if (actionEvent == null) continue;
                if (actionEvent.type == "parry")
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.parry-succeeded",
                        tick = state.tick,
                        subjectId = actionEvent.enemyId,
                        objectiveId = ActiveObjective(spec, state) == null ? null : ActiveObjective(spec, state).id
                    });
                }
                else if (actionEvent.type == "objective_progress")
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.mechanism-progress",
                        tick = state.tick,
                        subjectId = string.IsNullOrEmpty(actionEvent.targetId) ? actionEvent.objectiveId : actionEvent.targetId,
                        objectiveId = actionEvent.objectiveId,
                        targetId = actionEvent.targetId,
                        progress = actionEvent.progress,
                        target = actionEvent.target
                    });
                }
                else if (actionEvent.type == "objective_completed")
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.objective-completed",
                        tick = state.tick,
                        subjectId = actionEvent.objectiveId,
                        objectiveId = actionEvent.objectiveId
                    });
                }
                else if (actionEvent.type == "encounter_completed")
                {
                    Add(cues, new ActionCueCandidate
                    {
                        cueId = "cue.encounter-completed",
                        tick = state.tick,
                        subjectId = spec.challengeId,
                        outcome = actionEvent.outcome
                    });
                }
            }
        }

        private static ActionObjectiveSpec ActiveObjective(ActionSpecProjection spec, ActionSimulationState state)
        {
            if (spec.objectives == null || state.activeObjectiveIndex < 0 || state.activeObjectiveIndex >= spec.objectives.Length) return null;
            return spec.objectives[state.activeObjectiveIndex];
        }

        private static bool IsActionMode(ActionPlayerMode mode)
        {
            return mode == ActionPlayerMode.Light
                || mode == ActionPlayerMode.Heavy
                || mode == ActionPlayerMode.Dodge
                || mode == ActionPlayerMode.Parry;
        }

        private static string PlayerAction(ActionPlayerMode mode)
        {
            if (mode == ActionPlayerMode.Light) return "light";
            if (mode == ActionPlayerMode.Heavy) return "heavy";
            if (mode == ActionPlayerMode.Dodge) return "dodge";
            if (mode == ActionPlayerMode.Parry) return "parry";
            return string.Empty;
        }

        private static int PlayerActionTicks(ActionSpecProjection spec, ActionPlayerMode mode)
        {
            if (mode == ActionPlayerMode.Dodge) return spec.player.dodgeTicks;
            if (mode == ActionPlayerMode.Parry) return spec.player.parryTicks + spec.player.parryRecoveryTicks;
            if (mode == ActionPlayerMode.Light)
            {
                var attack = spec.AttackLaw("light");
                return attack.startupTicks + attack.activeTicks + attack.recoveryTicks;
            }
            if (mode == ActionPlayerMode.Heavy)
            {
                var attack = spec.AttackLaw("heavy");
                return attack.startupTicks + attack.activeTicks + attack.recoveryTicks;
            }
            return 0;
        }

        private static void Add(List<ActionCueCandidate> cues, ActionCueCandidate candidate)
        {
            candidate.ordinal = cues.Count;
            cues.Add(candidate);
        }

        private static ActionSemanticCue[] FinalizeCues(List<ActionCueCandidate> candidates)
        {
            candidates.Sort(CompareCandidates);
            var result = new ActionSemanticCue[candidates.Count];
            for (var index = 0; index < candidates.Count; index += 1)
            {
                var candidate = candidates[index];
                var cue = new ActionSemanticCue
                {
                    cueId = candidate.cueId,
                    tick = candidate.tick,
                    sequence = index,
                    subjectId = candidate.subjectId ?? string.Empty,
                    objectiveId = candidate.objectiveId,
                    targetId = candidate.targetId,
                    action = candidate.action,
                    durationTicks = candidate.durationTicks,
                    progress = candidate.progress,
                    target = candidate.target,
                    outcome = candidate.outcome,
                    source = candidate.source
                };
                cue.cueDigest = "actcue1_" + Sha256Hex(CanonicalCue(cue, false));
                result[index] = cue;
            }
            return result;
        }

        private static int CompareCandidates(ActionCueCandidate left, ActionCueCandidate right)
        {
            var order = CueOrder[left.cueId].CompareTo(CueOrder[right.cueId]);
            if (order != 0) return order;
            order = string.CompareOrdinal(left.subjectId ?? string.Empty, right.subjectId ?? string.Empty);
            if (order != 0) return order;
            order = string.CompareOrdinal(left.objectiveId ?? string.Empty, right.objectiveId ?? string.Empty);
            if (order != 0) return order;
            order = string.CompareOrdinal(left.targetId ?? string.Empty, right.targetId ?? string.Empty);
            if (order != 0) return order;
            order = string.CompareOrdinal(left.action ?? string.Empty, right.action ?? string.Empty);
            if (order != 0) return order;
            order = string.CompareOrdinal(left.source ?? string.Empty, right.source ?? string.Empty);
            return order != 0 ? order : left.ordinal.CompareTo(right.ordinal);
        }

        private static string CanonicalCue(ActionSemanticCue cue, bool includeDigest)
        {
            var text = new StringBuilder(256);
            text.Append('{');
            var comma = false;
            AppendString(text, ref comma, "action", cue.action);
            if (includeDigest) AppendString(text, ref comma, "cueDigest", cue.cueDigest);
            AppendString(text, ref comma, "cueId", cue.cueId);
            AppendInteger(text, ref comma, "durationTicks", cue.durationTicks);
            AppendString(text, ref comma, "format", cue.format);
            AppendString(text, ref comma, "objectiveId", cue.objectiveId);
            AppendString(text, ref comma, "outcome", cue.outcome);
            AppendInteger(text, ref comma, "progress", cue.progress);
            AppendInteger(text, ref comma, "sequence", cue.sequence);
            AppendString(text, ref comma, "source", cue.source);
            AppendString(text, ref comma, "subjectId", cue.subjectId);
            AppendInteger(text, ref comma, "target", cue.target);
            AppendString(text, ref comma, "targetId", cue.targetId);
            AppendInteger(text, ref comma, "tick", cue.tick);
            text.Append('}');
            return text.ToString();
        }

        private static string CanonicalTrace(ActionCueTrace trace)
        {
            var text = new StringBuilder(1024 + trace.cues.Length * 256);
            text.Append('{');
            text.Append("\"actionSpecDigest\":").Append(JsonString(trace.actionSpecDigest));
            text.Append(",\"cues\":[");
            for (var index = 0; index < trace.cues.Length; index += 1)
            {
                if (index > 0) text.Append(',');
                text.Append(CanonicalCue(trace.cues[index], true));
            }
            text.Append(']');
            text.Append(",\"format\":").Append(JsonString(trace.format));
            text.Append(",\"seed\":").Append(trace.seed.ToString(CultureInfo.InvariantCulture));
            text.Append(",\"totalTicks\":").Append(trace.totalTicks.ToString(CultureInfo.InvariantCulture));
            text.Append('}');
            return text.ToString();
        }

        private static void AppendString(StringBuilder text, ref bool comma, string name, string value)
        {
            if (value == null) return;
            if (comma) text.Append(',');
            comma = true;
            text.Append(JsonString(name)).Append(':').Append(JsonString(value));
        }

        private static void AppendInteger(StringBuilder text, ref bool comma, string name, int? value)
        {
            if (!value.HasValue) return;
            if (comma) text.Append(',');
            comma = true;
            text.Append(JsonString(name)).Append(':').Append(value.Value.ToString(CultureInfo.InvariantCulture));
        }

        private static void AppendInteger(StringBuilder text, ref bool comma, string name, int value)
        {
            if (comma) text.Append(',');
            comma = true;
            text.Append(JsonString(name)).Append(':').Append(value.ToString(CultureInfo.InvariantCulture));
        }

        private static string JsonString(string value)
        {
            var text = new StringBuilder((value ?? string.Empty).Length + 2);
            text.Append('"');
            foreach (var character in value ?? string.Empty)
            {
                switch (character)
                {
                    case '"': text.Append("\\\""); break;
                    case '\\': text.Append("\\\\"); break;
                    case '\b': text.Append("\\b"); break;
                    case '\f': text.Append("\\f"); break;
                    case '\n': text.Append("\\n"); break;
                    case '\r': text.Append("\\r"); break;
                    case '\t': text.Append("\\t"); break;
                    default:
                        if (character < 0x20) text.Append("\\u").Append(((int)character).ToString("x4", CultureInfo.InvariantCulture));
                        else text.Append(character);
                        break;
                }
            }
            text.Append('"');
            return text.ToString();
        }

        private static string Sha256Hex(string value)
        {
            using (var sha = SHA256.Create())
            {
                var digest = sha.ComputeHash(Encoding.UTF8.GetBytes(value));
                var result = new StringBuilder(digest.Length * 2);
                foreach (var item in digest) result.Append(item.ToString("x2", CultureInfo.InvariantCulture));
                return result.ToString();
            }
        }
    }

    public static class ActionStateSnapshot
    {
        public static ActionSimulationState Clone(ActionSimulationState source)
        {
            if (source == null) return null;
            var state = new ActionSimulationState
            {
                format = source.format,
                seed = source.seed,
                tick = source.tick,
                activeObjectiveIndex = source.activeObjectiveIndex,
                player = new ActionPlayerState
                {
                    x = source.player.x,
                    y = source.player.y,
                    facingX = source.player.facingX,
                    facingY = source.player.facingY,
                    health = source.player.health,
                    mode = source.player.mode,
                    modeTick = source.player.modeTick
                },
                stats = source.stats == null ? new ActionStats() : source.stats.Clone(),
                previousButtons = source.previousButtons,
                result = CloneResult(source.result)
            };
            foreach (var id in source.player.hitEnemyIds) state.player.hitEnemyIds.Add(id);
            foreach (var enemy in source.enemies)
            {
                state.enemies.Add(new ActionEnemyState
                {
                    id = enemy.id,
                    objectiveId = enemy.objectiveId,
                    kit = enemy.kit,
                    x = enemy.x,
                    y = enemy.y,
                    health = enemy.health,
                    mode = enemy.mode,
                    modeTick = enemy.modeTick,
                    attackResolved = enemy.attackResolved
                });
            }
            state.completedObjectiveIds.AddRange(source.completedObjectiveIds);
            foreach (var pair in source.objectiveProgress) state.objectiveProgress[pair.Key] = pair.Value;
            foreach (var id in source.completedInteractionTargetIds) state.completedInteractionTargetIds.Add(id);
            foreach (var actionEvent in source.events)
            {
                state.events.Add(new ActionEvent
                {
                    type = actionEvent.type,
                    objectiveId = actionEvent.objectiveId,
                    enemyId = actionEvent.enemyId,
                    action = actionEvent.action,
                    attack = actionEvent.attack,
                    outcome = actionEvent.outcome,
                    targetId = actionEvent.targetId,
                    progress = actionEvent.progress,
                    target = actionEvent.target,
                    damage = actionEvent.damage,
                    health = actionEvent.health,
                    defeated = actionEvent.defeated
                });
            }
            return state;
        }

        private static ActionSimulationResult CloneResult(ActionSimulationResult source)
        {
            if (source == null) return null;
            var objectives = source.objectives == null ? Array.Empty<ActionObjectiveProgress>() : new ActionObjectiveProgress[source.objectives.Length];
            for (var index = 0; index < objectives.Length; index += 1)
            {
                var value = source.objectives[index];
                objectives[index] = new ActionObjectiveProgress
                {
                    id = value.id,
                    defeated = value.defeated,
                    target = value.target,
                    completed = value.completed,
                    kind = value.kind,
                    progress = value.progress
                };
            }
            return new ActionSimulationResult
            {
                outcome = source.outcome,
                completedObjectiveIds = source.completedObjectiveIds == null ? Array.Empty<string>() : (string[])source.completedObjectiveIds.Clone(),
                objectives = objectives,
                playerHealth = source.playerHealth,
                playerDefeated = source.playerDefeated,
                totalTicks = source.totalTicks,
                stats = source.stats == null ? new ActionStats() : source.stats.Clone()
            };
        }
    }
}
