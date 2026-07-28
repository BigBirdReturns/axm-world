using UnityEngine;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    public enum ActionCameraMode
    {
        PlayerFollow,
        GroupFraming
    }

    /// <summary>
    /// Desktop action camera with free yaw and pitch, shoulder follow, gentle
    /// movement recentering, and event impulses. Player follow is the default game
    /// surface. Group framing remains an explicit diagnostic mode.
    /// </summary>
    public sealed class ActionCombatCamera : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private Camera targetCamera;
        [SerializeField] private ActionCameraMode cameraMode = ActionCameraMode.PlayerFollow;
        [SerializeField] private bool controlCameraInXr;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool reducedMotion;

        [Header("Player follow")]
        [SerializeField, Range(2.5f, 12f)] private float followDistance = 6.4f;
        [SerializeField, Range(-2f, 2f)] private float shoulderOffset = 0.65f;
        [SerializeField, Range(0f, 4f)] private float lookHeight = 1.25f;
        [SerializeField, Range(8f, 70f)] private float minimumPitch = 16f;
        [SerializeField, Range(10f, 80f)] private float maximumPitch = 58f;
        [SerializeField, Range(1f, 30f)] private float followSmoothing = 15f;
        [SerializeField, Range(1f, 30f)] private float rotationSmoothing = 18f;
        [SerializeField] private bool autoRecenter = true;
        [SerializeField, Range(0.1f, 5f)] private float recenterDelay = 1.1f;
        [SerializeField, Range(0.1f, 12f)] private float recenterSpeed = 2.8f;
        [SerializeField, Range(35f, 90f)] private float baseFieldOfView = 58f;

        [Header("Diagnostic framing")]
        [SerializeField, Range(20f, 75f)] private float framingPitchDegrees = 48f;
        [SerializeField, Min(2f)] private float minimumFramingDistance = 8f;
        [SerializeField, Min(3f)] private float maximumFramingDistance = 22f;
        [SerializeField, Min(0f)] private float framingPadding = 3f;

        [Header("Feedback")]
        [SerializeField, Range(0f, 2f)] private float impulseScale = 1f;
        [SerializeField, Range(1f, 30f)] private float impulseDecay = 14f;
        [SerializeField, Range(0f, 12f)] private float maximumFovKick = 5f;

        private Vector3 _impulse;
        private Vector3 _impulseVelocity;
        private float _fovKick;
        private float _yaw;
        private float _pitch = 34f;
        private float _lastManualLookTime = -100f;
        private Vector3 _previousPlayerPosition;
        private bool _initialized;

        public ActionCameraMode Mode => cameraMode;
        public float YawDegrees => _yaw;
        public float PitchDegrees => _pitch;

        public Vector2 PlanarForward
        {
            get
            {
                var forward = Quaternion.Euler(0f, _yaw, 0f) * Vector3.forward;
                return new Vector2(forward.x, forward.z);
            }
        }

        public Vector2 PlanarRight
        {
            get
            {
                var right = Quaternion.Euler(0f, _yaw, 0f) * Vector3.right;
                return new Vector2(right.x, right.z);
            }
        }

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
            if (targetCamera != null)
            {
                _yaw = targetCamera.transform.eulerAngles.y;
                _pitch = Mathf.Clamp(NormalizePitch(targetCamera.transform.eulerAngles.x), minimumPitch, maximumPitch);
                targetCamera.fieldOfView = baseFieldOfView;
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
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionProductionPresentation actionPresentation, Transform bodies, Camera camera)
        {
            runtime = actionRuntime;
            presentation = actionPresentation;
            actorRoot = bodies;
            targetCamera = camera;
            _initialized = false;
            if (targetCamera != null) targetCamera.fieldOfView = baseFieldOfView;
        }

        public void SetCameraMode(ActionCameraMode value)
        {
            cameraMode = value;
            _initialized = false;
        }

        public void SetReducedMotion(bool value)
        {
            reducedMotion = value;
        }

        public void AddLook(Vector2 deltaDegrees)
        {
            if (cameraMode != ActionCameraMode.PlayerFollow) return;
            if (deltaDegrees.sqrMagnitude <= 0f) return;
            _yaw += deltaDegrees.x;
            _pitch = Mathf.Clamp(_pitch - deltaDegrees.y, minimumPitch, maximumPitch);
            _lastManualLookTime = Time.unscaledTime;
        }

        public void ResetBehindPlayer()
        {
            if (runtime?.State?.player == null) return;
            var facing = new Vector2(runtime.State.player.facingX, runtime.State.player.facingY);
            if (facing.sqrMagnitude <= 0f) return;
            _yaw = Mathf.Atan2(facing.x, facing.y) * Mathf.Rad2Deg;
            _lastManualLookTime = Time.unscaledTime;
        }

        private void LateUpdate()
        {
            if (!enabledByPreference || targetCamera == null || actorRoot == null) return;
            if (XRSettings.isDeviceActive && !controlCameraInXr) return;

            _impulse = Vector3.SmoothDamp(
                _impulse,
                Vector3.zero,
                ref _impulseVelocity,
                1f / Mathf.Max(1f, impulseDecay),
                Mathf.Infinity,
                Time.unscaledDeltaTime);
            _fovKick = Mathf.MoveTowards(_fovKick, 0f, Time.unscaledDeltaTime * 18f);
            targetCamera.fieldOfView = baseFieldOfView + (reducedMotion ? _fovKick * 0.2f : _fovKick);

            if (cameraMode == ActionCameraMode.GroupFraming) UpdateGroupFraming();
            else UpdatePlayerFollow();
        }

        private void UpdatePlayerFollow()
        {
            var player = FindPlayer();
            if (player == null) return;
            var position = player.VisualRoot.position;
            if (!_initialized)
            {
                ResetBehindPlayer();
                _previousPlayerPosition = position;
                _initialized = true;
            }

            var movement = position - _previousPlayerPosition;
            _previousPlayerPosition = position;
            movement.y = 0f;
            if (autoRecenter && movement.sqrMagnitude > 0.0001f && Time.unscaledTime - _lastManualLookTime >= recenterDelay)
            {
                var desiredYaw = Mathf.Atan2(movement.x, movement.z) * Mathf.Rad2Deg;
                _yaw = Mathf.MoveTowardsAngle(_yaw, desiredYaw, recenterSpeed * 90f * Time.unscaledDeltaTime);
            }

            var pivot = position + Vector3.up * lookHeight;
            var orbitRotation = Quaternion.Euler(_pitch, _yaw, 0f);
            var desiredPosition = pivot + orbitRotation * new Vector3(shoulderOffset, 0f, -followDistance);
            var impulse = reducedMotion ? _impulse * 0.2f : _impulse;
            desiredPosition += impulse;
            var desiredLook = Quaternion.LookRotation((pivot - desiredPosition).normalized, Vector3.up);

            var positionBlend = 1f - Mathf.Exp(-followSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            var rotationBlend = 1f - Mathf.Exp(-rotationSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            targetCamera.transform.position = Vector3.Lerp(targetCamera.transform.position, desiredPosition, positionBlend);
            targetCamera.transform.rotation = Quaternion.Slerp(targetCamera.transform.rotation, desiredLook, rotationBlend);
        }

        private void UpdateGroupFraming()
        {
            if (!TryBounds(out var center, out var radius)) return;
            var distance = Mathf.Clamp(radius * 1.55f + framingPadding, minimumFramingDistance, maximumFramingDistance);
            var pitchRadians = framingPitchDegrees * Mathf.Deg2Rad;
            var direction = new Vector3(0f, Mathf.Sin(pitchRadians), -Mathf.Cos(pitchRadians));
            var impulse = reducedMotion ? _impulse * 0.2f : _impulse;
            var targetPosition = center + direction * distance + impulse;
            var positionBlend = 1f - Mathf.Exp(-followSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            var rotationBlend = 1f - Mathf.Exp(-rotationSmoothing * Mathf.Max(0f, Time.unscaledDeltaTime));
            targetCamera.transform.position = Vector3.Lerp(targetCamera.transform.position, targetPosition, positionBlend);
            var lookDirection = center - targetCamera.transform.position;
            if (lookDirection.sqrMagnitude <= 0.0001f) return;
            targetCamera.transform.rotation = Quaternion.Slerp(
                targetCamera.transform.rotation,
                Quaternion.LookRotation(lookDirection.normalized, Vector3.up),
                rotationBlend);
        }

        private ActionActorBinding FindPlayer()
        {
            foreach (var binding in actorRoot.GetComponentsInChildren<ActionActorBinding>(false))
            {
                if (binding != null && binding.ActorId == "player" && binding.gameObject.activeInHierarchy) return binding;
            }
            return null;
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
            var strength = eventName == "player_hit" ? 0.78f
                : eventName == "parry" ? 0.72f
                : eventName == "dodge" ? 0.28f
                : eventName == "enemy_hit" ? 0.38f
                : eventName == "encounter_completed" ? 0.25f
                : 0.08f;
            strength = Mathf.Clamp(strength + Mathf.Max(0, damage - 1) * 0.05f, 0f, 1.2f) * impulseScale;
            var side = ((runtime?.State?.tick ?? 0) & 1) == 0 ? 1f : -1f;
            _impulse += targetCamera.transform.right * side * strength
                + Vector3.up * strength * 0.35f
                - targetCamera.transform.forward * strength * 0.3f;
            var requestedKick = eventName == "dodge" ? 4f : eventName == "parry" ? 3f : eventName == "player_hit" ? 2.5f : damage >= 5 ? 2.2f : 1.1f;
            _fovKick = Mathf.Max(_fovKick, Mathf.Min(maximumFovKick, requestedKick));
        }

        private static float NormalizePitch(float value)
        {
            return value > 180f ? value - 360f : value;
        }

        private void OnValidate()
        {
            maximumPitch = Mathf.Max(minimumPitch + 1f, maximumPitch);
            minimumFramingDistance = Mathf.Max(2f, minimumFramingDistance);
            maximumFramingDistance = Mathf.Max(minimumFramingDistance, maximumFramingDistance);
        }
    }
}
