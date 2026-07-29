using System;
using System.IO;
using UnityEngine;
using UnityEngine.Events;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Physical-session stop gate for embodied AR. A tracking or boundary breach
    /// pauses input and simulation without inventing an Arc success, partial, or
    /// failure outcome. The emitted observation can be sealed by axm-embodied.
    /// </summary>
    public sealed class ActionSafetyGate : MonoBehaviour
    {
        [Serializable]
        public sealed class BreachEvent : UnityEvent<string> { }

        [Serializable]
        private sealed class Observation
        {
            public string format = "rodoh-embodied-action-observation/1";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string reason;
            public string actionSpecDigest;
            public int actionTick;
            public float headX;
            public float headY;
            public float headZ;
            public float displacementMeters;
            public float boundaryClearanceMeters;
            public bool boundaryKnown;
            public bool applicationFocused;
            public string actionOutcome = "uncommitted";
            public string authority = "physical safety stop only";
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionInputRouter inputRouter;
        [SerializeField] private Transform trackedHead;
        [SerializeField] private Transform actionOrigin;
        [SerializeField, Min(0.05f)] private float maximumTrackingJumpMeters = 0.75f;
        [SerializeField, Min(0.05f)] private float maximumVerticalDeviationMeters = 1.25f;
        [SerializeField, Min(0f)] private float minimumBoundaryClearanceMeters = 0.35f;
        [SerializeField] private bool stopWhenBoundaryUnknown;
        [SerializeField] private bool stopOnApplicationFocusLoss = true;
        [SerializeField] private string observationDirectory = "axm-embodied";
        [SerializeField] private BreachEvent onBreach = new BreachEvent();

        private Vector3 _previousHead;
        private bool _hasHeadSample;
        private float _boundaryClearance = float.PositiveInfinity;
        private bool _boundaryKnown;
        private bool _focused = true;
        private bool _breached;

        public bool Breached => _breached;
        public BreachEvent OnBreach => onBreach;

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionInputRouter router, Transform head, Transform origin)
        {
            runtime = actionRuntime;
            inputRouter = router;
            trackedHead = head;
            actionOrigin = origin;
            ResetGate();
        }

        /// <summary>Vendor/OpenXR adapters report the current nearest guardian boundary.</summary>
        public void ReportBoundaryClearance(float meters, bool valid)
        {
            _boundaryKnown = valid && !float.IsNaN(meters) && !float.IsInfinity(meters) && meters >= 0f;
            _boundaryClearance = _boundaryKnown ? meters : float.PositiveInfinity;
        }

        public void ResetGate()
        {
            _breached = false;
            _hasHeadSample = false;
            _focused = Application.isFocused;
            if (trackedHead != null)
            {
                _previousHead = trackedHead.position;
                _hasHeadSample = true;
            }
        }

        private void Update()
        {
            if (_breached || runtime == null || trackedHead == null) return;
            var head = trackedHead.position;
            if (!IsFinite(head))
            {
                Breach("tracking-nonfinite", head, 0f);
                return;
            }
            if (_hasHeadSample)
            {
                var displacement = Vector3.Distance(head, _previousHead);
                if (displacement > maximumTrackingJumpMeters)
                {
                    Breach("tracking-jump", head, displacement);
                    return;
                }
            }
            _previousHead = head;
            _hasHeadSample = true;

            if (actionOrigin != null && Mathf.Abs(head.y - actionOrigin.position.y) > maximumVerticalDeviationMeters)
            {
                Breach("vertical-envelope", head, Mathf.Abs(head.y - actionOrigin.position.y));
                return;
            }
            if (_boundaryKnown && _boundaryClearance < minimumBoundaryClearanceMeters)
            {
                Breach("guardian-clearance", head, 0f);
                return;
            }
            if (!_boundaryKnown && stopWhenBoundaryUnknown)
            {
                Breach("guardian-unknown", head, 0f);
                return;
            }
            if (!_focused && stopOnApplicationFocusLoss)
            {
                Breach("application-focus", head, 0f);
            }
        }

        private void OnApplicationFocus(bool focused)
        {
            _focused = focused;
        }

        private void Breach(string reason, Vector3 head, float displacement)
        {
            _breached = true;
            inputRouter?.ClearContinuousInput();
            runtime.StopRuntime();
            var observation = new Observation
            {
                reason = reason,
                actionSpecDigest = runtime.Spec?.sourceSpecDigest,
                actionTick = runtime.State?.tick ?? 0,
                headX = head.x,
                headY = head.y,
                headZ = head.z,
                displacementMeters = displacement,
                boundaryClearanceMeters = _boundaryKnown ? _boundaryClearance : -1f,
                boundaryKnown = _boundaryKnown,
                applicationFocused = _focused
            };
            try
            {
                var directory = Path.Combine(Application.persistentDataPath, observationDirectory);
                Directory.CreateDirectory(directory);
                var path = Path.Combine(directory, "action-safety-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + ".json");
                File.WriteAllText(path, JsonUtility.ToJson(observation, true));
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
            onBreach?.Invoke(reason);
            Debug.LogError("RODOH embodied action safety gate stopped the session: " + reason);
        }

        private static bool IsFinite(Vector3 value)
        {
            return !(float.IsNaN(value.x) || float.IsNaN(value.y) || float.IsNaN(value.z) ||
                     float.IsInfinity(value.x) || float.IsInfinity(value.y) || float.IsInfinity(value.z));
        }
    }
}
