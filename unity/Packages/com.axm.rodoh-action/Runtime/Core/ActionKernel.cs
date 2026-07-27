using System;
using System.Collections.Generic;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Dependency-free integer conformance mirror of Arc Engine 1.4 action law.
    /// This mirror drives local presentation and catches drift. Arc replay remains
    /// the authority that accepts an outcome and mints axm-action-receipt/1.
    /// </summary>
    public static class ActionKernel
    {
        private static readonly int[,] Directions =
        {
            { 1000, 0 }, { 924, 383 }, { 707, 707 }, { 383, 924 },
            { 0, 1000 }, { -383, 924 }, { -707, 707 }, { -924, 383 },
            { -1000, 0 }, { -924, -383 }, { -707, -707 }, { -383, -924 },
            { 0, -1000 }, { 383, -924 }, { 707, -707 }, { 924, -383 }
        };

        public static ActionSimulationState InitialState(ActionSpecProjection spec, uint seed)
        {
            RequireValid(spec);
            var state = new ActionSimulationState
            {
                seed = seed,
                tick = 0,
                activeObjectiveIndex = 0,
                previousButtons = 0,
                player = new ActionPlayerState
                {
                    x = 0,
                    y = 0,
                    facingX = 1,
                    facingY = 0,
                    health = spec.player.maxHealth,
                    mode = ActionPlayerMode.Idle,
                    modeTick = 0
                },
                stats = new ActionStats()
            };
            state.events.Add(new ActionEvent { type = "wave_started", objectiveId = spec.objectives[0].id });
            SpawnWave(spec, state, 0);
            return state;
        }

        public static ActionSimulationState Step(ActionSpecProjection spec, ActionSimulationState state, ActionInputFrame rawInput)
        {
            RequireValid(spec);
            if (state == null) throw new ArgumentNullException(nameof(state));
            if (state.result != null) return state;

            var input = ActionInputFrame.Normalize(rawInput);
            state.events.Clear();
            StepPlayer(spec, state, input);
            StepEnemies(spec, state);
            state.tick += 1;
            state.previousButtons = input.buttons;
            AdvanceWave(spec, state);
            ClassifyTerminal(spec, state);
            return state;
        }

        public static ActionSimulationState RunTrace(ActionSpecProjection spec, uint seed, IEnumerable<ActionInputRun> trace)
        {
            var state = InitialState(spec, seed);
            if (trace == null) return state;
            var totalTicks = 0;
            foreach (var run in trace)
            {
                if (run == null || run.ticks <= 0 || run.ticks > spec.maxTicks)
                    throw new InvalidOperationException("Action trace contains an invalid run length.");
                checked { totalTicks += run.ticks; }
                if (totalTicks > spec.maxTicks)
                    throw new InvalidOperationException("Action trace exceeds the encounter tick budget.");
                var input = ActionInputFrame.Normalize(run.input);
                for (var index = 0; index < run.ticks; index += 1)
                {
                    if (state.result != null)
                        throw new InvalidOperationException("Action trace contains trailing input after terminal state.");
                    Step(spec, state, input);
                }
                if (state.result != null && totalTicks != state.result.totalTicks)
                    throw new InvalidOperationException("Action trace terminal tick does not match its encoded length.");
            }
            return state;
        }

        private static void RequireValid(ActionSpecProjection spec)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            var errors = spec.Validate();
            if (errors.Count > 0) throw new InvalidOperationException(string.Join(" ", errors));
        }

        private static int Sign(int value)
        {
            return value > 0 ? 1 : value < 0 ? -1 : 0;
        }

        private static void MoveVector(int x, int y, int amount, out int dx, out int dy)
        {
            if (x == 0 && y == 0)
            {
                dx = 0;
                dy = 0;
                return;
            }
            if (x != 0 && y != 0)
            {
                dx = x * amount * 707 / 1000;
                dy = y * amount * 707 / 1000;
                return;
            }
            dx = x * amount;
            dy = y * amount;
        }

        private static long DistanceSquared(int ax, int ay, int bx, int by)
        {
            var dx = (long)bx - ax;
            var dy = (long)by - ay;
            return dx * dx + dy * dy;
        }

        private static void ClampToArena(int x, int y, int radius, out int resultX, out int resultY)
        {
            var maximum = Math.Max(Math.Abs(x), Math.Abs(y));
            if (maximum <= radius)
            {
                resultX = x;
                resultY = y;
                return;
            }
            resultX = x * radius / maximum;
            resultY = y * radius / maximum;
        }

        private static void MoveToward(int ax, int ay, int bx, int by, int amount, out int resultX, out int resultY)
        {
            var dx = bx - ax;
            var dy = by - ay;
            var scale = Math.Max(Math.Abs(dx), Math.Abs(dy));
            if (scale == 0)
            {
                resultX = ax;
                resultY = ay;
                return;
            }
            var step = Math.Min(amount, scale);
            resultX = ax + dx * step / scale;
            resultY = ay + dy * step / scale;
        }

        private static void AwayVector(int ax, int ay, int bx, int by, int amount, out int dx, out int dy)
        {
            var rawX = ax - bx;
            var rawY = ay - by;
            var scale = Math.Max(1, Math.Max(Math.Abs(rawX), Math.Abs(rawY)));
            dx = rawX * amount / scale;
            dy = rawY * amount / scale;
        }

        private static bool InAttackCone(ActionPlayerState player, ActionEnemyState enemy, ActionAttackLaw attack)
        {
            var dx = (long)enemy.x - player.x;
            var dy = (long)enemy.y - player.y;
            var distance = dx * dx + dy * dy;
            if (distance > (long)attack.range * attack.range) return false;
            var dot = dx * player.facingX + dy * player.facingY;
            if (dot <= 0) return false;
            if (attack.coneNumerator <= 0) return true;
            return dot * dot * attack.coneDenominator >= distance * attack.coneNumerator;
        }

        private static void SpawnWave(ActionSpecProjection spec, ActionSimulationState state, int objectiveIndex)
        {
            state.enemies.Clear();
            if (objectiveIndex < 0 || objectiveIndex >= spec.objectives.Length) return;
            var objective = spec.objectives[objectiveIndex];
            var law = spec.EnemyLaw(objective.enemyKit);
            var baseIndex = ((int)(state.seed & 15) + objectiveIndex * 5) & 15;
            var spawnRadius = Math.Max(1800, spec.arena.radius - law.radius - 500);
            for (var index = 0; index < objective.enemyCount; index += 1)
            {
                var directionIndex = (baseIndex + index * 16 / objective.enemyCount) & 15;
                state.enemies.Add(new ActionEnemyState
                {
                    id = objective.id + ":" + (index + 1).ToString("00"),
                    objectiveId = objective.id,
                    kit = objective.enemyKit,
                    x = Directions[directionIndex, 0] * spawnRadius / 1000,
                    y = Directions[directionIndex, 1] * spawnRadius / 1000,
                    health = law.maxHealth,
                    mode = ActionEnemyMode.Approach,
                    modeTick = 0,
                    attackResolved = false
                });
            }
            state.enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
        }

        private static bool PlayerInvulnerable(ActionSpecProjection spec, ActionPlayerState player)
        {
            return player.mode == ActionPlayerMode.Dodge && player.modeTick < spec.player.dodgeInvulnerableTicks;
        }

        private static bool PlayerParrying(ActionSpecProjection spec, ActionPlayerState player)
        {
            return player.mode == ActionPlayerMode.Parry && player.modeTick < spec.player.parryActiveTicks;
        }

        private static void BeginPlayerAction(ActionSimulationState state, ActionInputFrame input)
        {
            var player = state.player;
            if (player.mode != ActionPlayerMode.Idle) return;
            var rising = input.buttons & ~state.previousButtons;
            string action = null;
            if ((rising & ActionContract.Dodge) != 0)
            {
                player.mode = ActionPlayerMode.Dodge;
                action = "dodge";
            }
            else if ((rising & ActionContract.Parry) != 0)
            {
                player.mode = ActionPlayerMode.Parry;
                action = "parry";
            }
            else if ((rising & ActionContract.Heavy) != 0)
            {
                player.mode = ActionPlayerMode.Heavy;
                action = "heavy";
            }
            else if ((rising & ActionContract.Light) != 0)
            {
                player.mode = ActionPlayerMode.Light;
                action = "light";
            }
            if (action == null) return;
            player.modeTick = 0;
            player.hitEnemyIds.Clear();
            state.events.Add(new ActionEvent { type = "player_action", action = action });
        }

        private static void StepPlayer(ActionSpecProjection spec, ActionSimulationState state, ActionInputFrame input)
        {
            BeginPlayerAction(state, input);
            var player = state.player;
            var aimX = input.aimX != 0 ? input.aimX : input.moveX;
            var aimY = input.aimY != 0 ? input.aimY : input.moveY;
            if (aimX != 0 || aimY != 0)
            {
                player.facingX = Sign(aimX);
                player.facingY = Sign(aimY);
            }

            if (player.mode == ActionPlayerMode.Idle)
            {
                MoveVector(input.moveX, input.moveY, spec.player.movePerTick, out var dx, out var dy);
                ClampToArena(player.x + dx, player.y + dy, spec.arena.radius - spec.player.radius, out player.x, out player.y);
                return;
            }
            if (player.mode == ActionPlayerMode.Dodge)
            {
                var directionX = input.moveX != 0 ? input.moveX : player.facingX;
                var directionY = input.moveY != 0 ? input.moveY : player.facingY;
                MoveVector(directionX, directionY, spec.player.dodgePerTick, out var dx, out var dy);
                ClampToArena(player.x + dx, player.y + dy, spec.arena.radius - spec.player.radius, out player.x, out player.y);
                player.modeTick += 1;
                if (player.modeTick >= spec.player.dodgeTicks)
                {
                    player.mode = ActionPlayerMode.Idle;
                    player.modeTick = 0;
                }
                return;
            }
            if (player.mode == ActionPlayerMode.Parry)
            {
                player.modeTick += 1;
                if (player.modeTick >= spec.player.parryTicks + spec.player.parryRecoveryTicks)
                {
                    player.mode = ActionPlayerMode.Idle;
                    player.modeTick = 0;
                }
                return;
            }
            if (player.mode == ActionPlayerMode.Stagger)
            {
                player.modeTick += 1;
                if (player.modeTick >= spec.player.staggerTicks)
                {
                    player.mode = ActionPlayerMode.Idle;
                    player.modeTick = 0;
                }
                return;
            }
            if (player.mode != ActionPlayerMode.Light && player.mode != ActionPlayerMode.Heavy) return;

            var attack = spec.AttackLaw(player.mode == ActionPlayerMode.Light ? "light" : "heavy");
            var activeStart = attack.startupTicks;
            var activeEnd = activeStart + attack.activeTicks;
            if (player.modeTick >= activeStart && player.modeTick < activeEnd)
            {
                foreach (var enemy in state.enemies)
                {
                    if (enemy.mode == ActionEnemyMode.Defeated || player.hitEnemyIds.Contains(enemy.id) || !InAttackCone(player, enemy, attack)) continue;
                    player.hitEnemyIds.Add(enemy.id);
                    var priorHealth = enemy.health;
                    enemy.health = Math.Max(0, enemy.health - attack.damage);
                    AwayVector(enemy.x, enemy.y, player.x, player.y, attack.knockback, out var knockX, out var knockY);
                    var enemyLaw = spec.EnemyLaw(enemy.kit);
                    ClampToArena(enemy.x + knockX, enemy.y + knockY, spec.arena.radius - enemyLaw.radius, out enemy.x, out enemy.y);
                    var defeated = enemy.health == 0;
                    enemy.mode = defeated ? ActionEnemyMode.Defeated : ActionEnemyMode.Stagger;
                    enemy.modeTick = 0;
                    enemy.attackResolved = false;
                    state.stats.hitsLanded += 1;
                    if (attack.id == "heavy") state.stats.heavyHits += 1;
                    if (defeated) state.stats.enemiesDefeated += 1;
                    state.events.Add(new ActionEvent
                    {
                        type = "enemy_hit",
                        enemyId = enemy.id,
                        attack = attack.id,
                        damage = Math.Min(priorHealth, attack.damage),
                        defeated = defeated
                    });
                }
            }
            player.modeTick += 1;
            var total = attack.startupTicks + attack.activeTicks + attack.recoveryTicks;
            if (player.modeTick >= total)
            {
                player.mode = ActionPlayerMode.Idle;
                player.modeTick = 0;
                player.hitEnemyIds.Clear();
            }
        }

        private static void StepEnemies(ActionSpecProjection spec, ActionSimulationState state)
        {
            state.enemies.Sort((left, right) => string.CompareOrdinal(left.id, right.id));
            foreach (var enemy in state.enemies) StepEnemy(spec, state, enemy);
        }

        private static void StepEnemy(ActionSpecProjection spec, ActionSimulationState state, ActionEnemyState enemy)
        {
            var law = spec.EnemyLaw(enemy.kit);
            var player = state.player;
            if (enemy.mode == ActionEnemyMode.Defeated) return;
            if (enemy.mode == ActionEnemyMode.Stagger)
            {
                enemy.modeTick += 1;
                if (enemy.modeTick >= law.staggerTicks)
                {
                    enemy.mode = ActionEnemyMode.Approach;
                    enemy.modeTick = 0;
                }
                return;
            }
            if (enemy.mode == ActionEnemyMode.Approach)
            {
                if (DistanceSquared(enemy.x, enemy.y, player.x, player.y) <= (long)law.attackRange * law.attackRange)
                {
                    enemy.mode = ActionEnemyMode.Telegraph;
                    enemy.modeTick = 0;
                    enemy.attackResolved = false;
                }
                else
                {
                    MoveToward(enemy.x, enemy.y, player.x, player.y, law.movePerTick, out enemy.x, out enemy.y);
                }
                return;
            }
            if (enemy.mode == ActionEnemyMode.Telegraph)
            {
                enemy.modeTick += 1;
                if (enemy.modeTick >= law.telegraphTicks)
                {
                    enemy.mode = ActionEnemyMode.Active;
                    enemy.modeTick = 0;
                    enemy.attackResolved = false;
                }
                return;
            }
            if (enemy.mode == ActionEnemyMode.Active)
            {
                if (!enemy.attackResolved)
                {
                    var inRange = DistanceSquared(enemy.x, enemy.y, player.x, player.y) <= (long)law.attackRange * law.attackRange;
                    if (inRange && PlayerParrying(spec, player))
                    {
                        state.stats.parries += 1;
                        state.events.Add(new ActionEvent { type = "parry", enemyId = enemy.id });
                        enemy.mode = ActionEnemyMode.Stagger;
                        enemy.modeTick = 0;
                        enemy.attackResolved = true;
                        return;
                    }
                    if (inRange && PlayerInvulnerable(spec, player))
                    {
                        state.stats.dodgedAttacks += 1;
                        state.events.Add(new ActionEvent { type = "dodge", enemyId = enemy.id });
                    }
                    else if (inRange && player.mode != ActionPlayerMode.Defeated)
                    {
                        var priorHealth = player.health;
                        player.health = Math.Max(0, player.health - law.attackDamage);
                        var damage = priorHealth - player.health;
                        state.stats.damageTaken += damage;
                        player.mode = player.health == 0 ? ActionPlayerMode.Defeated : ActionPlayerMode.Stagger;
                        player.modeTick = 0;
                        player.hitEnemyIds.Clear();
                        state.events.Add(new ActionEvent
                        {
                            type = "player_hit",
                            enemyId = enemy.id,
                            damage = damage,
                            health = player.health
                        });
                    }
                    enemy.attackResolved = true;
                }
                enemy.modeTick += 1;
                if (enemy.modeTick >= law.activeTicks)
                {
                    enemy.mode = ActionEnemyMode.Recover;
                    enemy.modeTick = 0;
                }
                return;
            }
            if (enemy.mode == ActionEnemyMode.Recover)
            {
                enemy.modeTick += 1;
                if (enemy.modeTick >= law.recoveryTicks)
                {
                    enemy.mode = ActionEnemyMode.Approach;
                    enemy.modeTick = 0;
                    enemy.attackResolved = false;
                }
            }
        }

        private static void AdvanceWave(ActionSpecProjection spec, ActionSimulationState state)
        {
            foreach (var enemy in state.enemies)
            {
                if (enemy.mode != ActionEnemyMode.Defeated) return;
            }
            if (state.activeObjectiveIndex < 0 || state.activeObjectiveIndex >= spec.objectives.Length) return;

            var objective = spec.objectives[state.activeObjectiveIndex];
            if (!state.completedObjectiveIds.Contains(objective.id)) state.completedObjectiveIds.Add(objective.id);
            state.completedObjectiveIds.Sort(StringComparer.Ordinal);
            var nextIndex = state.activeObjectiveIndex + 1;
            state.events.Add(new ActionEvent { type = "objective_completed", objectiveId = objective.id });
            if (nextIndex < spec.objectives.Length)
                state.events.Add(new ActionEvent { type = "wave_started", objectiveId = spec.objectives[nextIndex].id });
            state.activeObjectiveIndex = nextIndex;

            var successThresholdReached = spec.completion.kind == "clear"
                && state.completedObjectiveIds.Count >= spec.completion.successObjectiveCount;
            if (successThresholdReached) state.enemies.Clear();
            else SpawnWave(spec, state, nextIndex);
        }

        private static ActionObjectiveProgress[] ObjectiveProgress(ActionSpecProjection spec, ActionSimulationState state)
        {
            var progress = new ActionObjectiveProgress[spec.objectives.Length];
            for (var index = 0; index < spec.objectives.Length; index += 1)
            {
                var objective = spec.objectives[index];
                if (state.completedObjectiveIds.Contains(objective.id))
                {
                    progress[index] = new ActionObjectiveProgress
                    {
                        id = objective.id,
                        defeated = objective.targetDefeats,
                        target = objective.targetDefeats,
                        completed = true
                    };
                    continue;
                }
                if (index != state.activeObjectiveIndex)
                {
                    progress[index] = new ActionObjectiveProgress
                    {
                        id = objective.id,
                        defeated = 0,
                        target = objective.targetDefeats,
                        completed = false
                    };
                    continue;
                }
                var living = 0;
                foreach (var enemy in state.enemies)
                {
                    if (enemy.objectiveId == objective.id && enemy.mode != ActionEnemyMode.Defeated) living += 1;
                }
                progress[index] = new ActionObjectiveProgress
                {
                    id = objective.id,
                    defeated = Math.Max(0, objective.enemyCount - living),
                    target = objective.targetDefeats,
                    completed = false
                };
            }
            return progress;
        }

        private static void ClassifyTerminal(ActionSpecProjection spec, ActionSimulationState state)
        {
            var completed = state.completedObjectiveIds.Count;
            var playerDefeated = state.player.health <= 0 || state.player.mode == ActionPlayerMode.Defeated;
            var timedOut = state.tick >= spec.maxTicks;
            var terminal = false;
            var outcome = "failure";

            if (spec.completion.kind == "survive")
            {
                terminal = playerDefeated || timedOut;
                if (timedOut && !playerDefeated) outcome = "success";
                else if (completed >= spec.completion.partialObjectiveCount) outcome = "partial";
            }
            else
            {
                var allComplete = completed >= spec.completion.successObjectiveCount;
                terminal = allComplete || playerDefeated || timedOut;
                if (allComplete) outcome = "success";
                else if (completed >= spec.completion.partialObjectiveCount) outcome = "partial";
            }
            if (!terminal) return;

            state.result = new ActionSimulationResult
            {
                outcome = outcome,
                completedObjectiveIds = state.completedObjectiveIds.ToArray(),
                objectives = ObjectiveProgress(spec, state),
                playerHealth = state.player.health,
                playerDefeated = playerDefeated,
                totalTicks = state.tick,
                stats = state.stats.Clone()
            };
            state.events.Add(new ActionEvent { type = "encounter_completed", outcome = outcome });
        }
    }
}
