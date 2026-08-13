using System;
using System.IO;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    [Serializable]
    public sealed class ActionXrTrackingStoppedEvent : UnityEvent<string> { }

    /// <summary>
    /// Stops a local XR presentation after bounded head-tracking loss. The emitted
    /// record is physical evidence only, carries no campaign effect, and is spooled
    /// for later axm-embodied ingestion.
    /// </summary>
    public sealed class ActionXrTrackingSafety : MonoBehaviour
    {
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
            public bool applicationFocused = true;
            public string actionOutcome = "uncommitted";
            public string authority = "physical safety stop only";
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionInputRouter inputRouter;
        [SerializeField] private ActionSessionSpoolRuntime spool;
        [SerializeField] private Transform trackedHead;
        [SerializeField, Min(0f)] private float lossGraceSeconds = 0.35f;
        [SerializeField] private string observationDirectory = "axm-embodied";
        [SerializeField] private ActionXrTrackingStoppedEvent onTrackingStop = new ActionXrTrackingStoppedEvent();

        private InputDevice _headDevice;
        private float _lostSince = -1f;
        private bool _stopped;

        public ActionXrTrackingStoppedEvent OnTrackingStop => onTrackingStop;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (inputRouter == null) inputRouter = GetComponentInParent<ActionInputRouter>();
            if (spool == null) spool = GetComponentInParent<ActionSessionSpoolRuntime>();
            if (trackedHead == null && Camera.main != null) trackedHead = Camera.main.transform;
            _headDevice = InputDevices.GetDeviceAtXRNode(XRNode.Head);
        }

        private void OnEnable()
        {
            InputDevices.deviceConnected += OnDeviceChanged;
            InputDevices.deviceDisconnected += OnDeviceChanged;
            _headDevice = InputDevices.GetDeviceAtXRNode(XRNode.Head);
        }

        private void OnDisable()
        {
            InputDevices.deviceConnected -= OnDeviceChanged;
            InputDevices.deviceDisconnected -= OnDeviceChanged;
        }

        private void Update()
        {
            if (_stopped || runtime == null || !runtime.Running) return;
            if (!_headDevice.isValid) _headDevice = InputDevices.GetDeviceAtXRNode(XRNode.Head);
            var tracked = _headDevice.isValid && (!_headDevice.TryGetFeatureValue(CommonUsages.isTracked, out var isTracked) || isTracked);
            if (tracked)
            {
                _lostSince = -1f;
                return;
            }
            if (_lostSince < 0f)
            {
                _lostSince = Time.unscaledTime;
                inputRouter?.ClearContinuousInput();
                return;
            }
            if (Time.unscaledTime - _lostSince >= lossGraceSeconds) StopForTrackingLoss();
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionInputRouter router, ActionSessionSpoolRuntime sessionSpool, Transform head)
        {
            runtime = actionRuntime;
            inputRouter = router;
            spool = sessionSpool;
            trackedHead = head;
        }

        private void StopForTrackingLoss()
        {
            if (_stopped) return;
            _stopped = true;
            inputRouter?.ClearContinuousInput();
            runtime?.StopRuntime();
            var position = trackedHead == null ? Vector3.zero : trackedHead.position;
            var observation = new Observation
            {
                reason = "xr-head-tracking-lost",
                actionSpecDigest = runtime?.Spec?.sourceSpecDigest,
                actionTick = runtime?.State?.tick ?? 0,
                headX = position.x,
                headY = position.y,
                headZ = position.z,
                displacementMeters = 0f,
                boundaryClearanceMeters = 0f,
                boundaryKnown = false,
                applicationFocused = Application.isFocused,
            };
            var json = JsonUtility.ToJson(observation, true);
            try
            {
                var directory = Path.Combine(Application.persistentDataPath, observationDirectory);
                Directory.CreateDirectory(directory);
                var path = Path.Combine(directory, "action-safety-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + "-xr-tracking.json");
                File.WriteAllText(path, json);
                spool?.AppendPayload("physical_session_stopped", json, "physical safety stop only");
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
            onTrackingStop?.Invoke(observation.reason);
        }

        private void OnDeviceChanged(InputDevice device)
        {
            if ((device.characteristics & InputDeviceCharacteristics.HeadMounted) != 0) _headDevice = InputDevices.GetDeviceAtXRNode(XRNode.Head);
        }
    }
}
