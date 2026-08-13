using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Converts tracked room-scale displacement into bounded directional intent.
    /// Tracking remains sensor input. It never writes the deterministic action
    /// position directly and it never classifies an attack gesture.
    /// </summary>
    public sealed class TrackedPoseQuantizer : MonoBehaviour
    {
        [SerializeField] private Transform trackedPose;
        [SerializeField] private Transform actionOrigin;
        [SerializeField] private ActionInputRouter router;
        [SerializeField, Min(0.01f)] private float fullIntentMetersPerSecond = 0.65f;
        [SerializeField, Min(0f)] private float motionDeadzoneMetersPerSecond = 0.08f;
        [SerializeField, Range(0f, 1f)] private float smoothing = 0.35f;
        [SerializeField] private bool bodyForwardDefinesAim;

        private Vector3 _previousPosition;
        private Vector2 _smoothedVelocity;
        private bool _calibrated;

        public void Configure(Transform source, Transform origin, ActionInputRouter inputRouter)
        {
            trackedPose = source;
            actionOrigin = origin;
            router = inputRouter;
            Recalibrate();
        }

        public void Recalibrate()
        {
            if (trackedPose == null)
            {
                _calibrated = false;
                return;
            }
            _previousPosition = trackedPose.position;
            _smoothedVelocity = Vector2.zero;
            _calibrated = true;
        }

        private void OnEnable()
        {
            Recalibrate();
        }

        private void Update()
        {
            if (trackedPose == null || router == null) return;
            if (!_calibrated)
            {
                Recalibrate();
                return;
            }
            var deltaTime = Mathf.Max(Time.unscaledDeltaTime, 1f / 240f);
            var delta = trackedPose.position - _previousPosition;
            _previousPosition = trackedPose.position;
            if (!IsFinite(delta))
            {
                router.SetMove(Vector2.zero);
                return;
            }

            var right = actionOrigin != null ? actionOrigin.right : Vector3.right;
            var forward = actionOrigin != null ? actionOrigin.forward : Vector3.forward;
            right.y = 0f;
            forward.y = 0f;
            right.Normalize();
            forward.Normalize();
            var planarVelocity = new Vector2(Vector3.Dot(delta, right), Vector3.Dot(delta, forward)) / deltaTime;
            if (planarVelocity.magnitude < motionDeadzoneMetersPerSecond) planarVelocity = Vector2.zero;
            var normalized = Vector2.ClampMagnitude(planarVelocity / Mathf.Max(fullIntentMetersPerSecond, 0.01f), 1f);
            _smoothedVelocity = Vector2.Lerp(_smoothedVelocity, normalized, 1f - smoothing);
            router.SetMove(_smoothedVelocity);

            if (bodyForwardDefinesAim)
            {
                var trackedForward = trackedPose.forward;
                trackedForward.y = 0f;
                if (trackedForward.sqrMagnitude > 0.0001f)
                {
                    trackedForward.Normalize();
                    router.SetAim(new Vector2(Vector3.Dot(trackedForward, right), Vector3.Dot(trackedForward, forward)));
                }
            }
        }

        private static bool IsFinite(Vector3 value)
        {
            return !(float.IsNaN(value.x) || float.IsNaN(value.y) || float.IsNaN(value.z) ||
                     float.IsInfinity(value.x) || float.IsInfinity(value.y) || float.IsInfinity(value.z));
        }
    }
}
