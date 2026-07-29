using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Adds short contact holds to the player-facing presentation. The runtime emits
    /// no trace row and advances no action state during a hold, so Arc still accepts
    /// the exact bounded trace that was actually played.
    /// </summary>
    public sealed class ActionGameFeelController : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool reducedMotion;
        [SerializeField, Range(0f, 0.12f)] private float lightHitSeconds = 0.035f;
        [SerializeField, Range(0f, 0.12f)] private float heavyHitSeconds = 0.065f;
        [SerializeField, Range(0f, 0.12f)] private float playerHitSeconds = 0.075f;
        [SerializeField, Range(0f, 0.12f)] private float parrySeconds = 0.09f;

        private readonly Dictionary<Animator, float> _animatorSpeeds = new Dictionary<Animator, float>();
        private bool _animatorsHeld;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (actorRoot == null)
            {
                var bodies = GameObject.Find("Action Bodies");
                actorRoot = bodies == null ? transform : bodies.transform;
            }
        }

        private void OnEnable()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (presentation != null) presentation.OnFeedback.AddListener(OnFeedback);
        }

        private void OnDisable()
        {
            if (presentation != null) presentation.OnFeedback.RemoveListener(OnFeedback);
            RestoreAnimators();
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionProductionPresentation actionPresentation, Transform bodies, bool reduceMotion = false)
        {
            runtime = actionRuntime;
            presentation = actionPresentation;
            actorRoot = bodies;
            reducedMotion = reduceMotion;
        }

        public void SetReducedMotion(bool value)
        {
            reducedMotion = value;
        }

        private void Update()
        {
            if (_animatorsHeld && (runtime == null || runtime.PresentationHoldRemaining <= 0f)) RestoreAnimators();
        }

        private void OnFeedback(string eventName, string actorId, int damage, Vector3 position)
        {
            if (!enabledByPreference || runtime == null) return;
            var seconds = eventName == "parry" ? parrySeconds
                : eventName == "player_hit" ? playerHitSeconds
                : eventName == "enemy_hit" ? (damage >= 5 ? heavyHitSeconds : lightHitSeconds)
                : 0f;
            if (seconds <= 0f) return;
            if (reducedMotion) seconds *= 0.25f;
            runtime.RequestPresentationHold(seconds);
            HoldAnimators();
        }

        private void HoldAnimators()
        {
            if (actorRoot == null) return;
            foreach (var animator in actorRoot.GetComponentsInChildren<Animator>(true))
            {
                if (animator == null || _animatorSpeeds.ContainsKey(animator)) continue;
                _animatorSpeeds.Add(animator, animator.speed);
                animator.speed = 0f;
            }
            _animatorsHeld = _animatorSpeeds.Count > 0;
        }

        private void RestoreAnimators()
        {
            foreach (var pair in _animatorSpeeds)
            {
                if (pair.Key != null) pair.Key.speed = pair.Value;
            }
            _animatorSpeeds.Clear();
            _animatorsHeld = false;
        }
    }
}
