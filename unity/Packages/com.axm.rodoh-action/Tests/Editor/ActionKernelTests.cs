using NUnit.Framework;
using UnityEngine;

namespace Axm.Rodoh.Action.Tests
{
    public sealed class ActionKernelTests
    {
        [Test]
        public void IdenticalTraceProducesIdenticalTerminalFingerprint()
        {
            var spec = BuildSpec();
            var recorder = new ActionTraceRecorder();
            for (var tick = 0; tick < spec.maxTicks; tick += 1)
            {
                recorder.Append(new ActionInputFrame
                {
                    moveX = tick < 20 ? 1 : 0,
                    aimX = 1,
                    buttons = tick % 12 == 0 ? ActionContract.Light : 0
                });
            }
            var first = ActionKernel.RunTrace(spec, 7u, recorder.Snapshot());
            var second = ActionKernel.RunTrace(spec, 7u, recorder.Snapshot());
            Assert.That(ActionConformanceFingerprint.State(spec, first), Is.EqualTo(ActionConformanceFingerprint.State(spec, second)));
            Assert.That(first.tick, Is.EqualTo(recorder.TotalTicks));
        }

        [Test]
        public void TraceRecorderRunLengthCompressesQuantizedInput()
        {
            var recorder = new ActionTraceRecorder();
            recorder.Append(new ActionInputFrame { moveX = 80 });
            recorder.Append(new ActionInputFrame { moveX = 1 });
            recorder.Append(new ActionInputFrame { moveX = 1, buttons = ActionContract.Light });
            var runs = recorder.Snapshot();
            Assert.That(runs.Length, Is.EqualTo(2));
            Assert.That(runs[0].ticks, Is.EqualTo(2));
            Assert.That(runs[0].input.moveX, Is.EqualTo(1));
            Assert.That(ActionTraceRecorder.ExpandedTickCount(runs), Is.EqualTo(3));
        }

        [Test]
        public void CandidatePreservesArcIdentityAndRemainsExplicitlyProvisional()
        {
            var spec = BuildSpec();
            var recorder = new ActionTraceRecorder();
            recorder.Append(default);
            var state = ActionKernel.InitialState(spec, 9u);
            ActionKernel.Step(spec, state, default);
            var candidate = ActionCandidateBuilder.Build(spec, 4, 9u, "agent-a", new[] { "agent-a" }, recorder, state);
            Assert.That(candidate.actionSpecDigest, Is.EqualTo(spec.sourceSpecDigest));
            Assert.That(candidate.arcDigest, Is.EqualTo(spec.sourceArcDigest));
            Assert.That(candidate.authority, Is.EqualTo("Arc replay required"));
            Assert.That(candidate.format, Is.EqualTo(ActionContract.CandidateFormat));
        }

        [Test]
        public void PrimitivePresentationCreatesNoPhysicsAuthority()
        {
            var root = new GameObject("action-test");
            try
            {
                var presentation = root.AddComponent<ActionPrimitivePresentation>();
                var spec = BuildSpec();
                var state = ActionKernel.InitialState(spec, 1u);
                presentation.Initialize(spec, state);
                Assert.That(presentation.UsesUnityPhysicsAuthority(), Is.False);
                Assert.That(root.GetComponentInChildren<Rigidbody>(true), Is.Null);
            }
            finally
            {
                Object.DestroyImmediate(root);
            }
        }

        [Test]
        public void InputRouterLatchesButtonForOneTick()
        {
            var root = new GameObject("input-test");
            try
            {
                var router = root.AddComponent<ActionInputRouter>();
                router.SetMove(new Vector2(0.8f, 0f));
                router.PressParry();
                var first = router.SampleTick();
                var second = router.SampleTick();
                Assert.That(first.moveX, Is.EqualTo(1));
                Assert.That(first.buttons, Is.EqualTo(ActionContract.Parry));
                Assert.That(second.buttons, Is.EqualTo(0));
            }
            finally
            {
                Object.DestroyImmediate(root);
            }
        }

        private static ActionSpecProjection BuildSpec()
        {
            return new ActionSpecProjection
            {
                sourceSpecDigest = "actspec1_0123456789abcdef",
                sourceArcDigest = "cart1_0123456789abcdef",
                challengeId = "frog-pit",
                title = "Frog Pit",
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
                    new ActionObjectiveSpec { id = "clear-frogs", label = "Clear the frogs", brief = "Defeat the pit guard.", enemyKit = "skirmisher", enemyCount = 1, targetDefeats = 1, failureKind = "stress", severity = 0.4 }
                },
                completion = new ActionCompletionSpec { kind = "clear", successObjectiveCount = 1, partialObjectiveCount = 1 }
            };
        }
    }
}
