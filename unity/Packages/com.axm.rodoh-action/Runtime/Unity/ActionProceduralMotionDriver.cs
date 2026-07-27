using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Low-cost fallback motion for neutral or unanimated bodies. It reads the exact
    /// deterministic action state and applies presentation-only squash, lean, swing,
    /// lunge, brace, recoil, and defeat poses in LateUpdate. Authored animators win.
    /// </summary>
    public sealed class ActionProceduralMotionDriver : MonoBehaviour
    {
        private sealed class PoseCache
        {
            public ActionActorBinding binding;
            public Vector3 baseScale;
            public Quaternion rotation;
            public Vector3 scale;
            public int lastStateTick = -1;
            public int lastX;
            public int lastY;
            public bool movedThisStateTick;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool reducedMotion;
        [SerializeField, Range(0f, 2f)] private float amplitude = 1f;
        [SerializeField, Range(1f, 40f)] private float smoothing = 18f;
        [SerializeField, Range(0f, 0.25f)] private float idleBob = 0.04f;
        [SerializeField, Range(0f, 30f)] private float moveLeanDegrees = 10f;
        private readonly Dictionary<string, PoseCache> _poses = new Dictionary<string, PoseCache>(StringComparer.Ordinal);

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (actorRoot == null)
            {
                var production = GetComponentInParent<ActionProductionPresentation>();
                actorRoot = production == null ? transform : production.transform;
            }
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, Transform root, bool reduceMotion = false)
        {
            runtime = actionRuntime;
            actorRoot = root;
            reducedMotion = reduceMotion;
        }

        public void SetEnabled(bool value)
        {
            enabledByPreference = value;
        }

        public void SetReducedMotion(bool value)
        {
            reducedMotion = value;
        }

        private void LateUpdate()
        {
            if (!enabledByPreference || runtime == null || runtime.State == null || actorRoot == null) return;
            var state = runtime.State;
            var bindings = actorRoot.GetComponentsInChildren<ActionActorBinding>(true);
            foreach (var binding in bindings)
            {
                if (binding == null || string.IsNullOrWhiteSpace(binding.ActorId)) continue;
                var cache = Cache(binding);
                if (binding.Animator != null && binding.Animator.enabled)
                {
                    Restore(cache);
                    continue;
                }
                if (binding.ActorId == "player") ApplyPlayer(cache, state);
                else
                {
                    var enemy = FindEnemy(state, binding.ActorId);
                    if (enemy == null)
                    {
                        binding.gameObject.SetActive(false);
                        continue;
                    }
                    ApplyEnemy(cache, state, enemy);
                }
            }
        }

        private PoseCache Cache(ActionActorBinding binding)
        {
            if (_poses.TryGetValue(binding.ActorId, out var existing) && existing.binding == binding) return existing;
            var cache = new PoseCache
            {
                binding = binding,
                baseScale = binding.VisualRoot.localScale,
                rotation = binding.VisualRoot.localRotation,
                scale = binding.VisualRoot.localScale
            };
            _poses[binding.ActorId] = cache;
            return cache;
        }

        private void Restore(PoseCache cache)
        {
            var factor = Blend();
            cache.scale = Vector3.Lerp(cache.scale, cache.baseScale, factor);
            cache.binding.VisualRoot.localScale = cache.scale;
        }

        private void ApplyPlayer(PoseCache cache, ActionSimulationState state)
        {
            var player = state.player;
            if (cache.lastStateTick != state.tick)
            {
                cache.movedThisStateTick = cache.lastStateTick >= 0 && (cache.lastX != player.x || cache.lastY != player.y);
                cache.lastStateTick = state.tick;
                cache.lastX = player.x;
                cache.lastY = player.y;
            }
            var facing = Facing(player.facingX, player.facingY, cache.binding.VisualRoot.localRotation);
            var pose = PlayerPose(player.mode, player.modeTick, state.tick, cache.movedThisStateTick);
            Apply(cache, facing, pose.euler, pose.scale, player.mode == ActionPlayerMode.Defeated);
        }

        private void ApplyEnemy(PoseCache cache, ActionSimulationState state, ActionEnemyState enemy)
        {
            var facing = Facing(Math.Sign(state.player.x - enemy.x), Math.Sign(state.player.y - enemy.y), cache.binding.VisualRoot.localRotation);
            var pose = EnemyPose(enemy.mode, enemy.modeTick, state.tick, enemy.id);
            Apply(cache, facing, pose.euler, pose.scale, enemy.mode == ActionEnemyMode.Defeated);
        }

        private void Apply(PoseCache cache, Quaternion facing, Vector3 euler, Vector3 scaleFactor, bool defeated)
        {
            if (defeated) cache.binding.gameObject.SetActive(true);
            var factor = Blend();
            var motionScale = reducedMotion ? 0.25f : amplitude;
            var targetRotation = facing * Quaternion.Euler(euler * motionScale);
            var targetScale = Vector3.Scale(cache.baseScale, Vector3.Lerp(Vector3.one, scaleFactor, motionScale));
            cache.rotation = Quaternion.Slerp(cache.rotation, targetRotation, factor);
            cache.scale = Vector3.Lerp(cache.scale, targetScale, factor);
            cache.binding.VisualRoot.localRotation = cache.rotation;
            cache.binding.VisualRoot.localScale = cache.scale;
        }

        private (Vector3 euler, Vector3 scale) PlayerPose(ActionPlayerMode mode, int modeTick, int tick, bool moving)
        {
            var pulse = Mathf.Sin((tick + modeTick * 0.5f) * 0.35f);
            if (mode == ActionPlayerMode.Idle && moving) return (new Vector3(moveLeanDegrees, 0f, -pulse * 4f), new Vector3(1f - idleBob, 1f + idleBob, 1f));
            if (mode == ActionPlayerMode.Light) return (AttackPose(modeTick, 8f, 46f), new Vector3(0.94f, 1.04f, 1.08f));
            if (mode == ActionPlayerMode.Heavy) return (AttackPose(modeTick, 18f, 78f), new Vector3(0.88f, 1.12f, 1.16f));
            if (mode == ActionPlayerMode.Dodge) return (new Vector3(24f, 0f, -32f), new Vector3(1.18f, 0.72f, 1.22f));
            if (mode == ActionPlayerMode.Parry) return (new Vector3(-12f, 0f, 22f), new Vector3(1.08f, 0.93f, 1.02f));
            if (mode == ActionPlayerMode.Stagger) return (new Vector3(-22f, 0f, pulse * 18f), new Vector3(1.12f, 0.82f, 1.08f));
            if (mode == ActionPlayerMode.Defeated) return (new Vector3(0f, 0f, 88f), new Vector3(1.18f, 0.34f, 1.05f));
            return (new Vector3(pulse * 1.5f, 0f, -pulse * 1.5f), new Vector3(1f + pulse * idleBob, 1f - pulse * idleBob, 1f + pulse * idleBob));
        }

        private (Vector3 euler, Vector3 scale) EnemyPose(ActionEnemyMode mode, int modeTick, int tick, string id)
        {
            var phase = (StableHash(id) % 31) * 0.17f;
            var pulse = Mathf.Sin(tick * 0.32f + phase);
            if (mode == ActionEnemyMode.Approach) return (new Vector3(8f + pulse * 5f, 0f, pulse * 6f), new Vector3(1f - idleBob, 1f + idleBob * 1.4f, 1f));
            if (mode == ActionEnemyMode.Telegraph) return (new Vector3(-18f, 0f, pulse * 8f), new Vector3(1.14f + pulse * 0.04f, 0.82f - pulse * 0.03f, 1.14f + pulse * 0.04f));
            if (mode == ActionEnemyMode.Active) return (new Vector3(34f, 0f, -pulse * 10f), new Vector3(0.82f, 1.08f, 1.28f));
            if (mode == ActionEnemyMode.Recover) return (new Vector3(-16f, 0f, pulse * 6f), new Vector3(1.08f, 0.92f, 0.94f));
            if (mode == ActionEnemyMode.Stagger) return (new Vector3(-26f, 0f, pulse * 20f), new Vector3(1.18f, 0.72f, 1.1f));
            if (mode == ActionEnemyMode.Defeated) return (new Vector3(0f, 0f, 92f), new Vector3(1.22f, 0.28f, 1.08f));
            return (new Vector3(pulse * 2f, 0f, -pulse * 2f), new Vector3(1f + pulse * idleBob, 1f - pulse * idleBob, 1f + pulse * idleBob));
        }

        private static Vector3 AttackPose(int modeTick, float windup, float swing)
        {
            var phase = Mathf.Clamp01(modeTick / 12f);
            var angle = phase < 0.35f
                ? Mathf.Lerp(-windup, -windup * 1.6f, phase / 0.35f)
                : Mathf.Lerp(-windup * 1.6f, swing, (phase - 0.35f) / 0.65f);
            return new Vector3(10f, 0f, angle);
        }

        private static ActionEnemyState FindEnemy(ActionSimulationState state, string id)
        {
            foreach (var enemy in state.enemies) if (enemy.id == id) return enemy;
            return null;
        }

        private static Quaternion Facing(int x, int y, Quaternion fallback)
        {
            var direction = new Vector3(x, 0f, y);
            return direction.sqrMagnitude <= 0f ? fallback : Quaternion.LookRotation(direction.normalized, Vector3.up);
        }

        private float Blend()
        {
            return 1f - Mathf.Exp(-smoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
        }

        private static int StableHash(string value)
        {
            unchecked
            {
                var hash = 17;
                foreach (var character in value) hash = hash * 31 + character;
                return hash & int.MaxValue;
            }
        }
    }
}
