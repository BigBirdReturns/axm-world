using NUnit.Framework;
using UnityEngine;

namespace Axm.Rodoh.Action.Tests
{
    public sealed class ActionPresentationBoundaryTests
    {
        [Test]
        public void QualityChangesDoNotAlterDeterministicActionState()
        {
            var spec = TestActionSpec();
            var state = ActionKernel.InitialState(spec, 17u);
            for (var index = 0; index < 45; index += 1) ActionKernel.Step(spec, state, new ActionInputFrame { moveX = 1, aimX = 1 });
            var before = ActionConformanceFingerprint.State(spec, state);
            var root = new GameObject("quality-test");
            try
            {
                var governor = root.AddComponent<ActionQualityGovernor>();
                governor.Configure(new[]
                {
                    new ActionQualityProfile { id = "low", renderScale = 0.7f, maximumSkinnedActors = 5, maximumParticles = 96, shadowMode = "none", postProcessing = false, targetFps = 30 },
                    new ActionQualityProfile { id = "standard", renderScale = 1f, maximumSkinnedActors = 9, maximumParticles = 384, shadowMode = "one-directional", postProcessing = false, targetFps = 60 },
                    new ActionQualityProfile { id = "high", renderScale = 1.15f, maximumSkinnedActors = 13, maximumParticles = 1024, shadowMode = "baked", postProcessing = true, targetFps = 72 },
                }, "standard", true);
                governor.ApplyProfile("low", true);
                governor.ApplyProfile("high", true);
                governor.ApplyProfile("standard", true);
                var after = ActionConformanceFingerprint.State(spec, state);
                Assert.That(after, Is.EqualTo(before));
                Assert.That(governor.CurrentProfile.id, Is.EqualTo("standard"));
            }
            finally
            {
                Object.DestroyImmediate(root);
            }
        }

        [Test]
        public void BoundaryReporterComputesInsideClearanceAndOutsideStopDistance()
        {
            var root = new GameObject("boundary-test");
            var head = new GameObject("head");
            try
            {
                var reporter = root.AddComponent<ActionBoundaryReporter>();
                reporter.Configure(null, head.transform);
                reporter.ReportAxisAlignedRectangle(Vector3.zero, new Vector2(4f, 6f), 0f);
                head.transform.position = new Vector3(0f, 1.7f, 0f);
                Assert.That(reporter.CurrentClearanceMeters(), Is.EqualTo(2f).Within(0.001f));
                head.transform.position = new Vector3(2.5f, 1.7f, 0f);
                Assert.That(reporter.CurrentClearanceMeters(), Is.EqualTo(0f).Within(0.001f));
            }
            finally
            {
                Object.DestroyImmediate(head);
                Object.DestroyImmediate(root);
            }
        }

        [Test]
        public void PhysicsQuarantineRemovesCompetingMotionAuthority()
        {
            var root = new GameObject("physics-test");
            try
            {
                var rigidbody = root.AddComponent<Rigidbody>();
                rigidbody.isKinematic = false;
                var collider = root.AddComponent<BoxCollider>();
                collider.enabled = true;
                var controller = root.AddComponent<CharacterController>();
                controller.enabled = true;
                var quarantine = root.AddComponent<ActionPhysicsQuarantine>();
                quarantine.ApplyHierarchy();
                Assert.That(quarantine.HasActivePhysicsAuthority(), Is.False);
                Assert.That(rigidbody.isKinematic, Is.True);
                Assert.That(collider.enabled, Is.False);
                Assert.That(controller.enabled, Is.False);
            }
            finally
            {
                Object.DestroyImmediate(root);
            }
        }

        [Test]
        public void ProceduralPolishComponentsExposeNoActionMutationApi()
        {
            foreach (var type in new[]
            {
                typeof(ActionProceduralMotionDriver),
                typeof(ActionCombatCamera),
                typeof(ActionVisualFeedback),
                typeof(ActionProceduralAudio),
                typeof(ActionXrHaptics),
                typeof(ActionPerformanceRecorder),
            })
            {
                Assert.That(type.GetMethod("Step"), Is.Null, type.Name + " must not expose a competing action step.");
                Assert.That(type.GetMethod("Resolve"), Is.Null, type.Name + " must not expose a competing action resolver.");
                Assert.That(type.GetMethod("ApplyOutcome"), Is.Null, type.Name + " must not apply campaign consequences.");
            }
        }

        private static ActionSpecProjection TestActionSpec()
        {
            return new ActionSpecProjection
            {
                format = ActionContract.ProjectionFormat,
                sourceFormat = ActionContract.SourceSpecFormat,
                sourceSpecDigest = "actspec1_" + new string('1', 64),
                sourceArcDigest = "cart1_" + new string('2', 64),
                runtimeVersion = ActionContract.RuntimeVersion,
                tickRate = ActionContract.TickRate,
                challengeId = "presentation-boundary-test",
                arena = new ActionArenaLaw { kit = "ring", halfWidth = 5000, halfHeight = 5000 },
                player = new ActionPlayerLaw
                {
                    kit = "staff",
                    health = 10,
                    stamina = 10,
                    movePerTick = 180,
                    staminaRegenPerTick = 1,
                    dodgeTicks = 7,
                    dodgeInvulnerableTicks = 5,
                    dodgeCost = 3,
                    parryTicks = 6,
                    parryActiveTicks = 3,
                    parryCost = 2,
                    staggerTicks = 5,
                    light = new ActionAttackLaw { windupTicks = 3, activeTicks = 2, recoveryTicks = 4, range = 900, damage = 2, staggerTicks = 3, staminaCost = 1 },
                    heavy = new ActionAttackLaw { windupTicks = 7, activeTicks = 2, recoveryTicks = 8, range = 1100, damage = 4, staggerTicks = 5, staminaCost = 3 },
                },
                enemyKits = new[]
                {
                    new ActionEnemyLaw { kit = "skirmisher", health = 4, movePerTick = 90, attackRange = 800, attackDamage = 1, telegraphTicks = 10, activeTicks = 2, recoveryTicks = 8, staggerTicks = 4 },
                },
                objectives = new[]
                {
                    new ActionObjectiveLaw { id = "one", enemyKit = "skirmisher", enemyCount = 1, requiredDefeats = 1 },
                },
                maximumActiveEnemies = 1,
                maxTicks = 900,
                partialObjectiveCount = 1,
            };
        }
    }
}
