using UnityEngine;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Dependency-free desktop action camera. It frames the visible actor set and
    /// adds presentation-only impulses from action events. XR camera control is off
    /// by default because the tracked head remains physical authority there.
    /// </summary>
    public sealed class ActionCombatCamera : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private Camera targetCamera;
        [SerializeField] private bool controlCameraInXr;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool reducedMotion;
        [SerializeField, Range(1f, 30f)] private float positionSmoothing = 9f;
        [SerializeField, Range(1f, 30f)] private float rotationSmoothing = 12f;
        [SerializeField, Range(20f, 75f)] private float pitchDegrees = 48f;
        [SerializeField, Min(2f)] private float minimumDistance = 8f;
        [SerializeField, Min(3f)] private float maximumDistance = 22f;
        [SerializeField, Min(0f)] private float framingPadding = 3f;
        [SerializeField, Range(0f, 2f)] private float impulseScale = 1f;
        [SerializeField, Range(1f, 30f)] private float impulseDecay = 12f;
        private Vector3 _impulse;
        private Vector3 _impulseVelocity;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (actorRoot == null)
            {
                var bodies = GameObject.Find("Action Bodies");
                actorRoot = bodies == null ? transform : bodies.transform;
            }
            if (targetCamera == null) targetCamera = Camera.main;
        }

        private void OnEnable()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (presentation != null) presentation.OnFeedback.AddListener(OnFeedback);
        }

        private void OnDisable()
        {
            if (presentation != null) presentation.OnFeedback.RemoveListener(OnFeedback);
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionProductionPresentation actionPresentation, Transform bodies, Camera camera)
        {
            runtime = actionRuntime;
            presentation = actionPresentation;
            actorRoot = bodies;
            targetCamera = camera;
        }

        public void SetReducedMotion(bool value)
        {
            reducedMotion = value;
        }

        private void LateUpdate()
        {
            if (!enabledByPreference || targetCamera == null || actorRoot == null) return;
            if (XRSettings.isDeviceActive && !controlCameraInXr) return;
            if (!TryBounds(out var center, out var radius)) return;
            var distance = Mathf.Clamp(radius * 1.55f + framingPadding, minimumDistance, maximumDistance);
            var pitchRadians = pitchDegrees * Mathf.Deg2Rad;
            var direction = new Vector3(0f, Mathf.Sin(pitchRadians), -Mathf.Cos(pitchRadians));
            _impulse = Vector3.SmoothDamp(_impulse, Vector3.zero, ref _impulseVelocity, 1f / Mathf.Max(1f, impulseDecay), Mathf.Infinity, Time.unscaledDeltaTime);
            var impulse = reducedMotion ? _impulse * 0.2f : _impulse;
            var targetPosition = center + direction * distance + impulse;
            var positionBlend = 1f - Mathf.Exp(-positionSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            var rotationBlend = 1f - Mathf.Exp(-rotationSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            targetCamera.transform.position = Vector3.Lerp(targetCamera.transform.position, targetPosition, positionBlend);
            var lookDirection = center - targetCamera.transform.position;
            if (lookDirection.sqrMagnitude > 0.0001f)
            {
                var targetRotation = Quaternion.LookRotation(lookDirection.normalized, Vector3.up);
                targetCamera.transform.rotation = Quaternion.Slerp(targetCamera.transform.rotation, targetRotation, rotationBlend);
            }
        }

        private bool TryBounds(out Vector3 center, out float radius)
        {
            center = Vector3.zero;
            radius = 0f;
            var count = 0;
            foreach (var binding in actorRoot.GetComponentsInChildren<ActionActorBinding>(false))
            {
                if (binding == null || !binding.gameObject.activeInHierarchy) continue;
                center += binding.VisualRoot.position;
                count += 1;
            }
            if (count == 0) return false;
            center /= count;
            foreach (var binding in actorRoot.GetComponentsInChildren<ActionActorBinding>(false))
            {
                if (binding == null || !binding.gameObject.activeInHierarchy) continue;
                radius = Mathf.Max(radius, Vector3.Distance(center, binding.VisualRoot.position));
            }
            radius = Mathf.Max(1f, radius);
            return true;
        }

        private void OnFeedback(string eventName, string actorId, int damage, Vector3 position)
        {
            if (reducedMotion || targetCamera == null) return;
            var strength = eventName == "player_hit" ? 0.75f : eventName == "parry" ? 0.65f : eventName == "enemy_hit" ? 0.35f : eventName == "encounter_completed" ? 0.28f : 0.08f;
            strength = Mathf.Clamp(strength + Mathf.Max(0, damage - 1) * 0.05f, 0f, 1.2f) * impulseScale;
            var side = ((runtime?.State?.tick ?? 0) & 1) == 0 ? 1f : -1f;
            _impulse += new Vector3(side * strength, strength * 0.45f, -strength * 0.35f);
        }
    }
}
