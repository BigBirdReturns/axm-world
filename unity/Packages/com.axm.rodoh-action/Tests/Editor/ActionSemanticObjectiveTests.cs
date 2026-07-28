using NUnit.Framework;

namespace Axm.Rodoh.Action.Tests
{
    public sealed class ActionSemanticObjectiveTests
    {
        [Test]
        public void ClearingPressureEnemiesDoesNotCompleteAnInteractObjective()
        {
            var spec = BuildSpec(new ActionObjectiveSemanticCompletion
            {
                kind = "interact_count",
                targetCount = 1,
                targets = new[] { new ActionObjectiveTarget { id = "valve-01", x = 0, y = 0, radius = 1000 } }
            });
            var state = ActionKernel.InitialState(spec, 17u);
            foreach (var enemy in state.enemies)
            {
                enemy.health = 0;
                enemy.mode = ActionEnemyMode.Defeated;
            }

            ActionKernel.Step(spec, state, default);
            Assert.That(state.completedObjectiveIds, Is.Empty);
            Assert.That(state.result, Is.Null);

            ActionKernel.Step(spec, state, new ActionInputFrame { buttons = ActionContract.Interact });
            Assert.That(state.completedObjectiveIds, Is.EqualTo(new[] { "operate-valve" }));
            Assert.That(state.result, Is.Not.Null);
            Assert.That(state.result.outcome, Is.EqualTo("success"));
            Assert.That(state.stats.objectiveInteractions, Is.EqualTo(1));
            Assert.That(state.result.objectives[0].kind, Is.EqualTo("interact_count"));
            Assert.That(state.result.objectives[0].progress, Is.EqualTo(1));
        }

        [Test]
        public void HoldObjectiveRequiresContinuousInteractTicks()
        {
            var spec = BuildSpec(new ActionObjectiveSemanticCompletion
            {
                kind = "hold_ticks",
                targetTicks = 3,
                target = new ActionObjectiveTarget { id = "pump-wheel", x = 0, y = 0, radius = 1000 }
            });
            var state = ActionKernel.InitialState(spec, 29u);

            ActionKernel.Step(spec, state, new ActionInputFrame { buttons = ActionContract.Interact });
            Assert.That(state.objectiveProgress["operate-valve"], Is.EqualTo(1));
            ActionKernel.Step(spec, state, default);
            Assert.That(state.objectiveProgress["operate-valve"], Is.EqualTo(1));
            ActionKernel.Step(spec, state, new ActionInputFrame { buttons = ActionContract.Interact });
            ActionKernel.Step(spec, state, new ActionInputFrame { buttons = ActionContract.Interact });

            Assert.That(state.result, Is.Not.Null);
            Assert.That(state.result.outcome, Is.EqualTo("success"));
            Assert.That(state.stats.objectiveHoldTicks, Is.EqualTo(3));
            Assert.That(state.stats.enemiesDefeated, Is.EqualTo(0));
        }

        [Test]
        public void InputNormalizationPreservesTheFifthGovernedButton()
        {
            var frame = ActionInputFrame.Normalize(new ActionInputFrame { buttons = ActionContract.Interact | 64 });
            Assert.That(frame.buttons, Is.EqualTo(ActionContract.Interact));
        }

        private static ActionSpecProjection BuildSpec(ActionObjectiveSemanticCompletion semanticCompletion)
        {
            return new ActionSpecProjection
            {
                runtimeVersion = ActionContract.SemanticRuntimeVersion,
                sourceSpecDigest = "actspec1_0123456789abcdef",
                sourceArcDigest = "cart1_0123456789abcdef",
                challengeId = "semantic-pump",
                title = "Semantic Pump",
                tickRate = 30,
                maxTicks = 90,
                arena = new ActionArenaSpec { kit = "ring", radius = 6500 },
                player = new ActionPlayerLaw
                {
                    kit = "staff",
                    maxHealth = 12,
                    radius = 360,
                    movePerTick = 180,
                    dodgePerTick = 480,
                    dodgeTicks = 10,
                    dodgeInvulnerableTicks = 6,
                    parryTicks = 5,
                    parryActiveTicks = 3,
                    parryRecoveryTicks = 7,
                    staggerTicks = 12,
                    attacks = new[]
                    {
                        new ActionAttackLaw { id = "light", startupTicks = 4, activeTicks = 3, recoveryTicks = 7, damage = 2, range = 1550, coneNumerator = 0, coneDenominator = 1, knockback = 320 },
                        new ActionAttackLaw { id = "heavy", startupTicks = 10, activeTicks = 4, recoveryTicks = 15, damage = 4, range = 1900, coneNumerator = 1, coneDenominator = 2, knockback = 760 }
                    }
                },
                enemyLaws = new[]
                {
                    new ActionEnemyLaw { kit = "skirmisher", maxHealth = 3, radius = 300, movePerTick = 115, attackRange = 900, attackDamage = 1, telegraphTicks = 18, activeTicks = 2, recoveryTicks = 16, staggerTicks = 20 },
                    new ActionEnemyLaw { kit = "duelist", maxHealth = 5, radius = 320, movePerTick = 125, attackRange = 980, attackDamage = 2, telegraphTicks = 14, activeTicks = 2, recoveryTicks = 18, staggerTicks = 24 },
                    new ActionEnemyLaw { kit = "swarm", maxHealth = 2, radius = 270, movePerTick = 145, attackRange = 760, attackDamage = 1, telegraphTicks = 20, activeTicks = 2, recoveryTicks = 20, staggerTicks = 16 },
                    new ActionEnemyLaw { kit = "hexer", maxHealth = 4, radius = 300, movePerTick = 85, attackRange = 2600, attackDamage = 1, telegraphTicks = 28, activeTicks = 2, recoveryTicks = 24, staggerTicks = 22 },
                    new ActionEnemyLaw { kit = "breaker", maxHealth = 9, radius = 430, movePerTick = 80, attackRange = 1150, attackDamage = 3, telegraphTicks = 32, activeTicks = 3, recoveryTicks = 28, staggerTicks = 30 }
                },
                objectives = new[]
                {
                    new ActionObjectiveSpec
                    {
                        id = "operate-valve",
                        label = "Operate the valve",
                        brief = "Set the mechanism while a defender applies pressure.",
                        enemyKit = "skirmisher",
                        enemyCount = 1,
                        targetDefeats = 1,
                        failureKind = "stress",
                        severity = 0.4,
                        semanticCompletion = semanticCompletion
                    }
                },
                completion = new ActionCompletionSpec { kind = "clear", successObjectiveCount = 1, partialObjectiveCount = 1 }
            };
        }
    }
}
