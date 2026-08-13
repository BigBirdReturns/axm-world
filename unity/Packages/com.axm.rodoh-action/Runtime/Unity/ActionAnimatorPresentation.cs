using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Production-body adapter. It drives authored transforms and Animator parameters
    /// from deterministic state and events while keeping root motion disabled.
    /// </summary>
    public sealed class ActionAnimatorPresentation : MonoBehaviour
    {
        [Serializable]
        public sealed class FeedbackEvent : UnityEvent<string, string, int> { }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionActorBinding[] actors = Array.Empty<ActionActorBinding>();
        [SerializeField, Min(0.00001f)] private float unityUnitsPerActionUnit = 0.0005f;
        [SerializeField] private FeedbackEvent onFeedback = new FeedbackEvent();

        private readonly Dictionary<string, ActionActorBinding> _byId = new Dictionary<string, ActionActorBinding>(StringComparer.Ordinal);
        private static readonly int Mode = Animator.StringToHash("AXM_Mode");
        private static readonly int ModeTick = Animator.StringToHash("AXM_ModeTick");
        private static readonly int Health = Animator.StringToHash("AXM_Health");
        private static readonly int Active = Animator.StringToHash("AXM_Active");
        private static readonly int Hit = Animator.StringToHash("AXM_Hit");
        private static readonly int Parry = Animator.StringToHash("AXM_Parry");
        private static readonly int Dodge = Animator.StringToHash("AXM_Dodge");
        private static readonly int Defeat = Animator.StringToHash("AXM_Defeat");
        private static readonly int Objective = Animator.StringToHash("AXM_Objective");

        public FeedbackEvent OnFeedback => onFeedback;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            RebuildIndex();
        }

        private void OnEnable()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (runtime != null) runtime.TickAdvanced += ApplyState;
        }

        private void OnDisable()
        {
            if (runtime != null) runtime.TickAdvanced -= ApplyState;
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionActorBinding[] bindings)
        {
            if (runtime != null) runtime.TickAdvanced -= ApplyState;
            runtime = actionRuntime;
            actors = bindings ?? Array.Empty<ActionActorBinding>();
            RebuildIndex();
            if (isActiveAndEnabled && runtime != null) runtime.TickAdvanced += ApplyState;
        }

        public void RebuildIndex()
        {
            _byId.Clear();
            if (actors == null || actors.Length == 0) actors = GetComponentsInChildren<ActionActorBinding>(true);
            foreach (var actor in actors)
            {
                if (actor == null || string.IsNullOrWhiteSpace(actor.ActorId)) continue;
                if (_byId.ContainsKey(actor.ActorId)) throw new InvalidOperationException("Duplicate Unity action actor binding: " + actor.ActorId);
                _byId.Add(actor.ActorId, actor);
                if (actor.Animator != null) actor.Animator.applyRootMotion = false;
            }
        }

        public void ApplyState(ActionSimulationState state)
        {
            if (state == null) return;
            if (_byId.TryGetValue("player", out var player))
            {
                ApplyPosition(player.VisualRoot, state.player.x, state.player.y, state.player.facingX, state.player.facingY);
                WriteAnimator(player.Animator, (int)state.player.mode, state.player.modeTick, state.player.health, state.player.mode != ActionPlayerMode.Defeated);
            }
            foreach (var enemy in state.enemies)
            {
                if (!_byId.TryGetValue(enemy.id, out var binding)) continue;
                var facingX = Math.Sign(state.player.x - enemy.x);
                var facingY = Math.Sign(state.player.y - enemy.y);
                ApplyPosition(binding.VisualRoot, enemy.x, enemy.y, facingX, facingY);
                WriteAnimator(binding.Animator, (int)enemy.mode, enemy.modeTick, enemy.health, enemy.mode != ActionEnemyMode.Defeated);
            }
            ApplyEvents(state.events);
        }

        private void ApplyEvents(IReadOnlyList<ActionEvent> events)
        {
            if (events == null) return;
            foreach (var actionEvent in events)
            {
                if (actionEvent == null) continue;
                if (actionEvent.type == "enemy_hit" && actionEvent.enemyId != null && _byId.TryGetValue(actionEvent.enemyId, out var enemy)) Trigger(enemy.Animator, Hit);
                if (actionEvent.type == "player_hit" && _byId.TryGetValue("player", out var player)) Trigger(player.Animator, Hit);
                if (actionEvent.type == "parry" && _byId.TryGetValue("player", out var parrier)) Trigger(parrier.Animator, Parry);
                if (actionEvent.type == "dodge" && _byId.TryGetValue("player", out var dodger)) Trigger(dodger.Animator, Dodge);
                if (actionEvent.type == "objective_completed")
                {
                    foreach (var binding in _byId.Values) Trigger(binding.Animator, Objective);
                }
                if (actionEvent.defeated && actionEvent.enemyId != null && _byId.TryGetValue(actionEvent.enemyId, out var defeated)) Trigger(defeated.Animator, Defeat);
                onFeedback?.Invoke(actionEvent.type, actionEvent.enemyId ?? actionEvent.objectiveId ?? string.Empty, actionEvent.damage);
            }
        }

        private void ApplyPosition(Transform target, int x, int y, int facingX, int facingY)
        {
            if (target == null) return;
            target.localPosition = new Vector3(x * unityUnitsPerActionUnit, target.localPosition.y, y * unityUnitsPerActionUnit);
            var facing = new Vector3(facingX, 0f, facingY);
            if (facing.sqrMagnitude > 0f) target.localRotation = Quaternion.LookRotation(facing.normalized, Vector3.up);
        }

        private static void WriteAnimator(Animator animator, int mode, int modeTick, int health, bool active)
        {
            if (animator == null) return;
            animator.applyRootMotion = false;
            SetIntegerIfPresent(animator, Mode, mode);
            SetIntegerIfPresent(animator, ModeTick, modeTick);
            SetIntegerIfPresent(animator, Health, health);
            SetBoolIfPresent(animator, Active, active);
        }

        private static void Trigger(Animator animator, int hash)
        {
            if (animator == null || !HasParameter(animator, hash, AnimatorControllerParameterType.Trigger)) return;
            animator.SetTrigger(hash);
        }

        private static void SetIntegerIfPresent(Animator animator, int hash, int value)
        {
            if (HasParameter(animator, hash, AnimatorControllerParameterType.Int)) animator.SetInteger(hash, value);
        }

        private static void SetBoolIfPresent(Animator animator, int hash, bool value)
        {
            if (HasParameter(animator, hash, AnimatorControllerParameterType.Bool)) animator.SetBool(hash, value);
        }

        private static bool HasParameter(Animator animator, int hash, AnimatorControllerParameterType type)
        {
            foreach (var parameter in animator.parameters)
            {
                if (parameter.nameHash == hash && parameter.type == type) return true;
            }
            return false;
        }
    }
}
