using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Observational performance receipt for one local presentation. It measures
    /// rendering and device behavior only and never enters action resolution.
    /// Explicit command-line output and thresholds make Windows-player evidence
    /// collectible without guessing Unity persistent-data paths.
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
            public string format = "rodoh-action-performance-receipt/2";
            public string status = "fail";
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
            public float maximumP95FrameMilliseconds;
            public float maximumP99FrameMilliseconds;
            public bool p95WithinBudget;
            public bool p99WithinBudget;
            public bool withinBudget;
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
        private string _explicitOutput;
        private int _requiredTargetFps;
        private float _maximumP95;
        private float _maximumP99;

        public string LastReceiptPath { get; private set; }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (qualityGovernor == null) qualityGovernor = GetComponentInParent<ActionQualityGovernor>();
            if (productionPresentation == null) productionPresentation = GetComponentInParent<ActionProductionPresentation>();
            if (spool == null) spool = GetComponentInParent<ActionSessionSpoolRuntime>();
            _explicitOutput = GetArgument("-axmActionPerformanceReceipt");
            _requiredTargetFps = ParseInt(GetArgument("-axmActionTargetFps"), 0);
            _maximumP95 = ParseFloat(GetArgument("-axmActionMaxP95Milliseconds"), 0f);
            _maximumP99 = ParseFloat(GetArgument("-axmActionMaxP99Milliseconds"), 0f);
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
            if (_written) return LastReceiptPath;
            _written = true;
            var sorted = new List<float>(_frameMilliseconds);
            sorted.Sort();
            var currentQuality = qualityGovernor?.CurrentProfile;
            var targetFps = _requiredTargetFps > 0
                ? _requiredTargetFps
                : currentQuality?.targetFps ?? Mathf.Max(1, Application.targetFrameRate > 0 ? Application.targetFrameRate : 60);
            var targetMilliseconds = 1000f / targetFps;
            var over = 0;
            foreach (var value in sorted) if (value > targetMilliseconds) over += 1;
            var p95 = Percentile(sorted, 0.95f);
            var p99 = Percentile(sorted, 0.99f);
            var maximumP95 = _maximumP95 > 0f ? _maximumP95 : float.PositiveInfinity;
            var maximumP99 = _maximumP99 > 0f ? _maximumP99 : float.PositiveInfinity;
            var p95Pass = p95 <= maximumP95;
            var p99Pass = p99 <= maximumP99;
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
                p95FrameMilliseconds = p95,
                p99FrameMilliseconds = p99,
                maximumFrameMilliseconds = sorted.Count == 0 ? 0f : sorted[sorted.Count - 1],
                framesOverTarget = over,
                targetFps = targetFps,
                maximumP95FrameMilliseconds = float.IsPositiveInfinity(maximumP95) ? 0f : maximumP95,
                maximumP99FrameMilliseconds = float.IsPositiveInfinity(maximumP99) ? 0f : maximumP99,
                p95WithinBudget = p95Pass,
                p99WithinBudget = p99Pass,
                withinBudget = p95Pass && p99Pass,
                maximumActiveBodies = _maximumBodies,
                terminalOutcome = result?.outcome,
                terminalActionTicks = result?.totalTicks ?? runtime?.State?.tick ?? 0,
                qualityTransitions = _transitions.ToArray()
            };
            receipt.status = receipt.withinBudget && receipt.frames > 0 && receipt.terminalActionTicks > 0 ? "pass" : "fail";
            var json = JsonUtility.ToJson(receipt, true);
            LastReceiptPath = ResolvePath();
            Directory.CreateDirectory(Path.GetDirectoryName(LastReceiptPath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(LastReceiptPath, json);
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
            return LastReceiptPath;
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

        private string ResolvePath()
        {
            if (!string.IsNullOrWhiteSpace(_explicitOutput)) return Path.GetFullPath(_explicitOutput);
            var directory = Path.Combine(Application.persistentDataPath, outputDirectory);
            Directory.CreateDirectory(directory);
            return Path.Combine(directory, "action-performance-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + ".json");
        }

        private static float Percentile(IReadOnlyList<float> sorted, float percentile)
        {
            if (sorted == null || sorted.Count == 0) return 0f;
            var index = Mathf.Clamp(Mathf.CeilToInt(sorted.Count * percentile) - 1, 0, sorted.Count - 1);
            return sorted[index];
        }

        private static string GetArgument(string name)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length - 1; index += 1) if (arguments[index] == name) return arguments[index + 1];
            return null;
        }

        private static int ParseInt(string value, int fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;
        }

        private static float ParseFloat(string value, float fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : float.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;
        }
    }
}
