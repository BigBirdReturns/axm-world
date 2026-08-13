using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Observational performance receipt for one local presentation. It measures
    /// rendering and device behavior only and never enters action resolution.
    /// </summary>
    public sealed class ActionPerformanceRecorder : MonoBehaviour
    {
        [Serializable]
        private sealed class QualityTransition
        {
            public int frame;
            public float elapsedSeconds;
            public string profile;
            public float smoothedFrameMilliseconds;
        }

        [Serializable]
        private sealed class Receipt
        {
            public string format = "rodoh-action-performance-receipt/1";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string actionSpecDigest;
            public string arcDigest;
            public string challengeId;
            public string unityVersion = Application.unityVersion;
            public string platform = Application.platform.ToString();
            public string deviceModel = SystemInfo.deviceModel;
            public string processorType = SystemInfo.processorType;
            public int processorCount = SystemInfo.processorCount;
            public int systemMemoryMb = SystemInfo.systemMemorySize;
            public string graphicsDeviceName = SystemInfo.graphicsDeviceName;
            public string graphicsDeviceType = SystemInfo.graphicsDeviceType.ToString();
            public int graphicsMemoryMb = SystemInfo.graphicsMemorySize;
            public int screenWidth;
            public int screenHeight;
            public float elapsedSeconds;
            public int frames;
            public float p50FrameMilliseconds;
            public float p95FrameMilliseconds;
            public float p99FrameMilliseconds;
            public float maximumFrameMilliseconds;
            public int framesOverTarget;
            public int targetFps;
            public int maximumActiveBodies;
            public string terminalOutcome;
            public int terminalActionTicks;
            public QualityTransition[] qualityTransitions;
            public string semanticAuthority = "presentation performance only";
            public bool changesActionResult = false;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionQualityGovernor qualityGovernor;
        [SerializeField] private ActionProductionPresentation productionPresentation;
        [SerializeField] private ActionSessionSpoolRuntime spool;
        [SerializeField, Range(120, 20000)] private int maximumSamples = 7200;
        [SerializeField] private string outputDirectory = "axm-action-performance";
        [SerializeField] private bool appendToSessionSpool;

        private readonly List<float> _frameMilliseconds = new List<float>();
        private readonly List<QualityTransition> _transitions = new List<QualityTransition>();
        private float _startedAt;
        private int _frame;
        private int _maximumBodies;
        private bool _written;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (qualityGovernor == null) qualityGovernor = GetComponentInParent<ActionQualityGovernor>();
            if (productionPresentation == null) productionPresentation = GetComponentInParent<ActionProductionPresentation>();
            if (spool == null) spool = GetComponentInParent<ActionSessionSpoolRuntime>();
        }

        private void OnEnable()
        {
            if (runtime != null) runtime.EncounterCompleted += OnCompleted;
            if (qualityGovernor != null) qualityGovernor.QualityChanged += OnQualityChanged;
        }

        private void OnDisable()
        {
            if (runtime != null) runtime.EncounterCompleted -= OnCompleted;
            if (qualityGovernor != null) qualityGovernor.QualityChanged -= OnQualityChanged;
        }

        private void Start()
        {
            _startedAt = Time.realtimeSinceStartup;
            if (qualityGovernor != null && qualityGovernor.CurrentProfile != null) OnQualityChanged(qualityGovernor.CurrentProfile);
        }

        private void Update()
        {
            if (_written) return;
            var milliseconds = Mathf.Clamp(Time.unscaledDeltaTime * 1000f, 0f, 10000f);
            if (_frameMilliseconds.Count < maximumSamples) _frameMilliseconds.Add(milliseconds);
            else _frameMilliseconds[_frame % maximumSamples] = milliseconds;
            _frame += 1;
            if (productionPresentation != null) _maximumBodies = Mathf.Max(_maximumBodies, productionPresentation.ActiveAuthoredBodies());
        }

        public string WriteReceipt(ActionSimulationResult result = null)
        {
            if (_written) return null;
            _written = true;
            var sorted = new List<float>(_frameMilliseconds);
            sorted.Sort();
            var currentQuality = qualityGovernor?.CurrentProfile;
            var targetFps = currentQuality?.targetFps ?? Mathf.Max(1, Application.targetFrameRate > 0 ? Application.targetFrameRate : 60);
            var targetMilliseconds = 1000f / targetFps;
            var over = 0;
            foreach (var value in sorted) if (value > targetMilliseconds) over += 1;
            var receipt = new Receipt
            {
                actionSpecDigest = runtime?.Spec?.sourceSpecDigest,
                arcDigest = runtime?.Spec?.sourceArcDigest,
                challengeId = runtime?.Spec?.challengeId,
                screenWidth = Screen.width,
                screenHeight = Screen.height,
                elapsedSeconds = Mathf.Max(0f, Time.realtimeSinceStartup - _startedAt),
                frames = _frame,
                p50FrameMilliseconds = Percentile(sorted, 0.50f),
                p95FrameMilliseconds = Percentile(sorted, 0.95f),
                p99FrameMilliseconds = Percentile(sorted, 0.99f),
                maximumFrameMilliseconds = sorted.Count == 0 ? 0f : sorted[sorted.Count - 1],
                framesOverTarget = over,
                targetFps = targetFps,
                maximumActiveBodies = _maximumBodies,
                terminalOutcome = result?.outcome,
                terminalActionTicks = result?.totalTicks ?? runtime?.State?.tick ?? 0,
                qualityTransitions = _transitions.ToArray()
            };
            var json = JsonUtility.ToJson(receipt, true);
            var directory = Path.Combine(Application.persistentDataPath, outputDirectory);
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, "action-performance-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + ".json");
            File.WriteAllText(path, json);
            if (appendToSessionSpool && spool != null)
            {
                try
                {
                    spool.AppendPayload("performance_receipt", json, "presentation telemetry only");
                }
                catch (Exception exception)
                {
                    Debug.LogException(exception);
                }
            }
            return path;
        }

        private void OnCompleted(ActionSimulationResult result)
        {
            WriteReceipt(result);
        }

        private void OnQualityChanged(ActionQualityProfile profile)
        {
            if (profile == null) return;
            _transitions.Add(new QualityTransition
            {
                frame = _frame,
                elapsedSeconds = Mathf.Max(0f, Time.realtimeSinceStartup - _startedAt),
                profile = profile.id,
                smoothedFrameMilliseconds = qualityGovernor?.SmoothedFrameMilliseconds ?? 0f
            });
        }

        private static float Percentile(IReadOnlyList<float> sorted, float percentile)
        {
            if (sorted == null || sorted.Count == 0) return 0f;
            var index = Mathf.Clamp(Mathf.CeilToInt(sorted.Count * percentile) - 1, 0, sorted.Count - 1);
            return sorted[index];
        }
    }
}
