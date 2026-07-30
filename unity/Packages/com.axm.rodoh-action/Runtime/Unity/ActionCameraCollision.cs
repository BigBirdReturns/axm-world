using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Resolves the rendered camera against static scene geometry after the action
    /// camera has chosen its pose. The query changes presentation only and never
    /// moves an authoritative actor or advances action state.
    /// </summary>
    [DefaultExecutionOrder(1000)]
    [DisallowMultipleComponent]
    public sealed class ActionCameraCollision : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private Camera targetCamera;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private LayerMask collisionMask = ~0;
        [SerializeField, Range(0.05f, 1f)] private float sphereRadius = 0.28f;
        [SerializeField, Range(0f, 1f)] private float surfacePadding = 0.12f;
        [SerializeField, Range(0.25f, 4f)] private float minimumDistance = 1.1f;
        [SerializeField, Range(0f, 4f)] private float pivotHeight = 1.25f;

        private int _adjustments;
        private float _nearestHitDistance = float.PositiveInfinity;

        public bool CollisionEnabled => enabledByPreference;
        public int CollisionAdjustments => _adjustments;
        public float NearestHitDistance => float.IsPositiveInfinity(_nearestHitDistance) ? 0f : _nearestHitDistance;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (actorRoot == null)
            {
                var bodies = GameObject.Find("Action Bodies");
                actorRoot = bodies == null ? transform : bodies.transform;
            }
            if (targetCamera == null) targetCamera = Camera.main;
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, Transform bodies, Camera camera)
        {
            runtime = actionRuntime;
            actorRoot = bodies;
            targetCamera = camera;
        }

        private void LateUpdate()
        {
            if (!enabledByPreference || targetCamera == null || actorRoot == null) return;
            var player = FindPlayer();
            if (player == null) return;
            var pivot = player.VisualRoot.position + Vector3.up * pivotHeight;
            var offset = targetCamera.transform.position - pivot;
            var distance = offset.magnitude;
            if (distance <= minimumDistance || distance <= 0.0001f) return;
            var direction = offset / distance;
            if (!Physics.SphereCast(
                    pivot,
                    sphereRadius,
                    direction,
                    out var hit,
                    distance,
                    collisionMask,
                    QueryTriggerInteraction.Ignore)) return;
            var resolvedDistance = Mathf.Clamp(hit.distance - surfacePadding, minimumDistance, distance);
            if (resolvedDistance >= distance - 0.001f) return;
            targetCamera.transform.position = pivot + direction * resolvedDistance;
            _adjustments += 1;
            _nearestHitDistance = Mathf.Min(_nearestHitDistance, hit.distance);
        }

        private ActionActorBinding FindPlayer()
        {
            foreach (var binding in actorRoot.GetComponentsInChildren<ActionActorBinding>(false))
            {
                if (binding != null && binding.ActorId == "player" && binding.gameObject.activeInHierarchy) return binding;
            }
            return null;
        }
    }
}
