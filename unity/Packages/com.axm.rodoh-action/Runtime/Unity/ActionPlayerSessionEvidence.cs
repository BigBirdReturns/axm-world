using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Records one real built-player mechanic session. The receipt proves device
    /// ingress, semantic-cue observation, camera behavior, terminal state, and the
    /// exact provisional candidate. It deliberately cannot issue a comprehension or
    /// final product-acceptance receipt.
    /// </summary>
    [DefaultExecutionOrder(-400)]
    [DisallowMultipleComponent]
    public sealed class ActionPlayerSessionEvidence : MonoBehaviour
    {
        [Serializable]
        private sealed class Receipt
        {
            public string format = "rodoh-action-player-session-evidence/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string worldCommit = string.Empty;
            public string arcCommit = string.Empty;
            public string actionSpecDigest = string.Empty;
            public string arcDigest = string.Empty;
            public string challengeId = string.Empty;
            public string timingProfileId = string.Empty;
            public string presentationAdapterId = string.Empty;
            public bool diagnosticPresentation;
            public string requiredDevice = string.Empty;
            public string observedDevice = "none";
            public bool sawKeyboardMouse;
            public bool sawGamepad;
            public string bindingProfileDigest = string.Empty;
            public bool rebindingAvailable;
            public bool cameraCollisionEnabled;
            public int cameraCollisionAdjustments;
            public float nearestCameraCollisionDistance;
            public string[] requiredCueIds = Array.Empty<string>();
            public string[] observedCueIds = Array.Empty<string>();
            public string[] missingCueIds = Array.Empty<string>();
            public bool allRequiredCuesObserved;
            public bool requireAllCues;
            public bool terminal;
            public string outcome = string.Empty;
            public int totalTicks;
            public string candidateAuthority = string.Empty;
            public string candidateSha256 = string.Empty;
            public string candidatePath = string.Empty;
            public string comprehensionReceipt = "not-issued-by-runtime";
            public string acceptance = "diagnostic-mechanic-session-only";
            public string semanticAuthority = "Arc replay remains action and outcome authority";
            public string error = string.Empty;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionNaturalPlayerInput naturalInput;
        [SerializeField] private ActionInputBindings bindings;
        [SerializeField] private ActionCameraCollision cameraCollision;
        [SerializeField] private ActionSessionSpoolRuntime spool;
        [SerializeField] private string outputDirectory = "axm-action-player-sessions";
        [SerializeField] private bool appendToSessionSpool = true;

        private readonly HashSet<string> _observedCues = new HashSet<string>(StringComparer.Ordinal);
        private string _explicitOutput;
        private string _requiredDevice;
        private string _worldCommit;
        private string _arcCommit;
        private bool _requireAllCues;
        private bool _exitOnEvidence;
        private float _timeoutSeconds;
        private float _startedAt;
        private bool _written;

        public string LastEvidencePath { get; private set; }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (naturalInput == null) naturalInput = GetComponent<ActionNaturalPlayerInput>();
            if (bindings == null) bindings = GetComponent<ActionInputBindings>();
            if (cameraCollision == null) cameraCollision = GetComponent<ActionCameraCollision>();
            if (spool == null) spool = GetComponent<ActionSessionSpoolRuntime>();
            _explicitOutput = GetArgument("-axmActionSessionEvidence");
            _requiredDevice = (GetArgument("-axmActionRequiredDevice") ?? string.Empty).Trim().ToLowerInvariant();
            _worldCommit = GetArgument("-axmWorldCommit") ?? string.Empty;
            _arcCommit = GetArgument("-axmArcCommit") ?? string.Empty;
            _requireAllCues = ParseBoolean(GetArgument("-axmActionRequireAllCues"), false);
            _exitOnEvidence = ParseBoolean(GetArgument("-axmActionExitOnEvidence"), false);
            _timeoutSeconds = ParseFloat(GetArgument("-axmActionSessionTimeout"), 0f);
            _startedAt = Time.realtimeSinceStartup;
        }

        private void OnEnable()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (runtime != null)
            {
                runtime.CuesProjected += OnCues;
                runtime.EncounterCompleted += OnCompleted;
            }
        }

        private void OnDisable()
        {
            if (runtime != null)
            {
                runtime.CuesProjected -= OnCues;
                runtime.EncounterCompleted -= OnCompleted;
            }
        }

        private void Update()
        {
            if (_written || _timeoutSeconds <= 0f) return;
            if (Time.realtimeSinceStartup - _startedAt < _timeoutSeconds) return;
            WriteEvidence(null, "Player session exceeded its declared timeout.");
        }

        public void Configure(
            ActionRuntimeBehaviour actionRuntime,
            ActionNaturalPlayerInput playerInput,
            ActionInputBindings inputBindings,
            ActionCameraCollision collision,
            ActionSessionSpoolRuntime actionSpool)
        {
            runtime = actionRuntime;
            naturalInput = playerInput;
            bindings = inputBindings;
            cameraCollision = collision;
            spool = actionSpool;
        }

        public string WriteEvidence(ActionSimulationResult result = null, string failure = null)
        {
            if (_written) return LastEvidencePath;
            _written = true;
            var candidateJson = string.Empty;
            var candidateAuthority = string.Empty;
            var candidateSha256 = string.Empty;
            var candidatePath = string.Empty;
            try
            {
                if (runtime == null || runtime.Spec == null) throw new InvalidOperationException("Player session has no started action runtime.");
                candidateJson = runtime.BuildCandidateJson();
                candidateAuthority = candidateJson.Contains("\"authority\": \"Arc replay required\"")
                    || candidateJson.Contains("\"authority\":\"Arc replay required\"")
                    ? "Arc replay required"
                    : "unknown";
                candidateSha256 = Sha256(candidateJson);
                var directory = ResolveOutputDirectory();
                Directory.CreateDirectory(directory);
                candidatePath = Path.Combine(directory, "provisional-action-candidate.json");
                File.WriteAllText(candidatePath, candidateJson, new UTF8Encoding(false));
            }
            catch (Exception exception)
            {
                failure = string.IsNullOrWhiteSpace(failure) ? exception.ToString() : failure + " " + exception;
            }

            var missing = new List<string>();
            foreach (var cueId in ActionCueContract.RequiredCueIds) if (!_observedCues.Contains(cueId)) missing.Add(cueId);
            var observed = new List<string>(_observedCues);
            observed.Sort(StringComparer.Ordinal);
            var device = naturalInput == null ? "none" : naturalInput.ObservedDeviceClass;
            var devicePass = string.IsNullOrWhiteSpace(_requiredDevice)
                || (_requiredDevice == "keyboard-mouse" && naturalInput != null && naturalInput.SawKeyboardMouse)
                || (_requiredDevice == "gamepad" && naturalInput != null && naturalInput.SawGamepad);
            var terminal = result != null || runtime?.State?.result != null;
            var effectiveResult = result ?? runtime?.State?.result;
            var pass = string.IsNullOrWhiteSpace(failure)
                && terminal
                && runtime != null
                && runtime.PresentationAdapterId == "production.prefab/v1"
                && !runtime.UsesDiagnosticPresentation
                && candidateAuthority == "Arc replay required"
                && devicePass
                && (!_requireAllCues || missing.Count == 0);
            var receipt = new Receipt
            {
                status = pass ? "pass" : "fail",
                worldCommit = _worldCommit,
                arcCommit = _arcCommit,
                actionSpecDigest = runtime?.Spec?.sourceSpecDigest ?? string.Empty,
                arcDigest = runtime?.Spec?.sourceArcDigest ?? string.Empty,
                challengeId = runtime?.Spec?.challengeId ?? string.Empty,
                timingProfileId = runtime?.Spec?.timingProfileId ?? string.Empty,
                presentationAdapterId = runtime?.PresentationAdapterId ?? string.Empty,
                diagnosticPresentation = runtime?.UsesDiagnosticPresentation ?? false,
                requiredDevice = _requiredDevice,
                observedDevice = device,
                sawKeyboardMouse = naturalInput?.SawKeyboardMouse ?? false,
                sawGamepad = naturalInput?.SawGamepad ?? false,
                bindingProfileDigest = bindings?.ProfileDigest ?? string.Empty,
                rebindingAvailable = bindings != null && GetComponent<ActionRebindOverlay>() != null,
                cameraCollisionEnabled = cameraCollision?.CollisionEnabled ?? false,
                cameraCollisionAdjustments = cameraCollision?.CollisionAdjustments ?? 0,
                nearestCameraCollisionDistance = cameraCollision?.NearestHitDistance ?? 0f,
                requiredCueIds = ActionCueContract.RequiredCueIds,
                observedCueIds = observed.ToArray(),
                missingCueIds = missing.ToArray(),
                allRequiredCuesObserved = missing.Count == 0,
                requireAllCues = _requireAllCues,
                terminal = terminal,
                outcome = effectiveResult?.outcome ?? string.Empty,
                totalTicks = effectiveResult?.totalTicks ?? runtime?.State?.tick ?? 0,
                candidateAuthority = candidateAuthority,
                candidateSha256 = candidateSha256,
                candidatePath = candidatePath,
                error = failure ?? (devicePass ? string.Empty : "Required input device was not observed.")
            };
            var json = JsonUtility.ToJson(receipt, true);
            LastEvidencePath = ResolveEvidencePath();
            Directory.CreateDirectory(Path.GetDirectoryName(LastEvidencePath) ?? Directory.GetCurrentDirectory());
            File.WriteAllText(LastEvidencePath, json, new UTF8Encoding(false));
            if (appendToSessionSpool && spool != null)
            {
                try
                {
                    spool.AppendPayload("player_session_evidence", json, "mechanic execution and presentation telemetry only");
                }
                catch (Exception exception)
                {
                    Debug.LogException(exception);
                }
            }
            if (_exitOnEvidence) Application.Quit(pass ? 0 : 3);
            return LastEvidencePath;
        }

        private void OnCues(IReadOnlyList<ActionSemanticCue> cues)
        {
            if (cues == null) return;
            foreach (var cue in cues) if (cue != null && !string.IsNullOrWhiteSpace(cue.cueId)) _observedCues.Add(cue.cueId);
        }

        private void OnCompleted(ActionSimulationResult result)
        {
            WriteEvidence(result);
        }

        private string ResolveOutputDirectory()
        {
            if (!string.IsNullOrWhiteSpace(_explicitOutput))
            {
                var full = Path.GetFullPath(_explicitOutput);
                return Path.GetDirectoryName(full) ?? Directory.GetCurrentDirectory();
            }
            return Path.Combine(Application.persistentDataPath, outputDirectory);
        }

        private string ResolveEvidencePath()
        {
            if (!string.IsNullOrWhiteSpace(_explicitOutput)) return Path.GetFullPath(_explicitOutput);
            return Path.Combine(ResolveOutputDirectory(), "player-session-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff") + ".json");
        }

        private static string Sha256(string value)
        {
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value ?? string.Empty)))
                    .Replace("-", string.Empty)
                    .ToLowerInvariant();
            }
        }

        private static string GetArgument(string name)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length - 1; index += 1) if (arguments[index] == name) return arguments[index + 1];
            return null;
        }

        private static bool ParseBoolean(string value, bool fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : bool.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private static float ParseFloat(string value, float fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : float.TryParse(value, out var parsed) ? parsed : fallback;
        }
    }
}
