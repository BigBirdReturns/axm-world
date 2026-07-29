using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Serialization;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Fixed-step Unity host for the Arc action conformance mirror. Unity samples
    /// control intent and renders state. The exported candidate remains provisional
    /// until Arc reconstructs the spec, replays the trace, and mints the receipt.
    /// </summary>
    public sealed class ActionRuntimeBehaviour : MonoBehaviour
    {
        [Header("Arc projection")]
        [SerializeField] private TextAsset actionProjection;
        [SerializeField] private uint seed = 1;
        [SerializeField, Min(0)] private int cycle;
        [SerializeField] private string controlledAgentId = "player";
        [SerializeField] private string[] partyAgentIds = { "player" };

        [Header("Unity adapters")]
        [SerializeField] private ActionInputRouter inputRouter;
        [FormerlySerializedAs("presentation")]
        [SerializeField] private MonoBehaviour presentationComponent;
        [SerializeField] private bool allowDiagnosticPresentation;
        [SerializeField] private bool autoStart = true;
        [SerializeField, Range(1, 30)] private int maximumTicksPerFrame = 8;
        [SerializeField, Range(0f, 0.2f)] private float maximumPresentationHoldSeconds = 0.12f;
        [SerializeField] private bool exportCandidateOnCompletion = true;
        [SerializeField] private string candidateFileName = "latest-action-candidate.json";

        private readonly ActionTraceRecorder _trace = new ActionTraceRecorder();
        private ActionSpecProjection _spec;
        private ActionSimulationState _state;
        private IActionPresentationAdapter _presentation;
        private double _accumulator;
        private float _presentationHoldRemaining;
        private bool _running;
        private bool _candidateWritten;

        public ActionSpecProjection Spec => _spec;
        public ActionSimulationState State => _state;
        public ActionTraceRecorder Trace => _trace;
        public bool Running => _running;
        public float PresentationHoldRemaining => _presentationHoldRemaining;
        public string PresentationAdapterId => _presentation?.AdapterId ?? string.Empty;
        public bool UsesDiagnosticPresentation => _presentation?.DiagnosticOnly ?? false;
        public event Action<ActionSimulationState> TickAdvanced;
        public event Action<IReadOnlyList<ActionSemanticCue>> CuesProjected;
        public event Action<ActionSimulationResult> EncounterCompleted;

        public void Configure(TextAsset projection, uint runtimeSeed, int runtimeCycle, string controlledAgent, string[] party)
        {
            actionProjection = projection;
            seed = runtimeSeed;
            cycle = runtimeCycle;
            controlledAgentId = controlledAgent ?? string.Empty;
            partyAgentIds = party ?? Array.Empty<string>();
        }

        /// <summary>
        /// Selects the one presentation receiver used by the fixed-step host. The
        /// selected component must implement IActionPresentationAdapter. A player
        /// scene must not permit a diagnostic-only adapter.
        /// </summary>
        public void ConfigurePresentation(MonoBehaviour component, bool allowDiagnostic)
        {
            presentationComponent = component;
            allowDiagnosticPresentation = allowDiagnostic;
            ResolvePresentation(true);
        }

        private void Awake()
        {
            if (inputRouter == null) inputRouter = GetComponent<ActionInputRouter>();
            ResolvePresentation(false);
        }

        private void Start()
        {
            if (autoStart) StartRuntime();
        }

        public void StartRuntime()
        {
            if (actionProjection == null) throw new InvalidOperationException("Action projection TextAsset is not assigned.");
            ResolvePresentation(true);
            if (_presentation == null) throw new InvalidOperationException("Action runtime has no presentation adapter.");
            if (_presentation.DiagnosticOnly && !allowDiagnosticPresentation)
            {
                throw new InvalidOperationException("Diagnostic action presentation is not permitted by this player profile: " + _presentation.AdapterId);
            }
            if (_presentation.UsesUnityPhysicsAuthority())
            {
                throw new InvalidOperationException("Action presentation retains active Unity physics authority: " + _presentation.AdapterId);
            }

            _spec = ActionBridgeJson.ParseSpec(actionProjection.text);
            ValidatePresentationContract();
            _state = ActionKernel.InitialState(_spec, seed);
            _trace.Reset();
            _accumulator = 0d;
            _presentationHoldRemaining = 0f;
            _candidateWritten = false;
            _running = true;
            _presentation.Initialize(_spec, _state);
            DeliverCues(ActionCueProjector.Initial(_spec, _state));
        }

        public void StopRuntime()
        {
            _running = false;
        }

        /// <summary>
        /// Pauses real-time tick admission for a short presentation beat. No hidden
        /// state advances and no trace row is emitted while the hold is active.
        /// </summary>
        public void RequestPresentationHold(float seconds)
        {
            if (seconds <= 0f) return;
            _presentationHoldRemaining = Mathf.Max(
                _presentationHoldRemaining,
                Mathf.Min(seconds, maximumPresentationHoldSeconds));
        }

        private void Update()
        {
            if (!_running || _spec == null || _state == null) return;
            if (_presentationHoldRemaining > 0f)
            {
                _presentationHoldRemaining = Mathf.Max(0f, _presentationHoldRemaining - Time.unscaledDeltaTime);
                _presentation?.Render(_state, 0f);
                return;
            }

            var tickDuration = 1d / _spec.tickRate;
            _accumulator += Time.unscaledDeltaTime;
            var advanced = 0;
            while (_accumulator >= tickDuration && advanced < maximumTicksPerFrame && _state.result == null)
            {
                var input = inputRouter != null ? inputRouter.SampleTick(_state.player.mode) : default;
                var prior = ActionStateSnapshot.Clone(_state);
                _trace.Append(input);
                ActionKernel.Step(_spec, _state, input);
                _accumulator -= tickDuration;
                advanced += 1;
                TickAdvanced?.Invoke(_state);
                DeliverCues(ActionCueProjector.Project(_spec, prior, _state));
            }

            var interpolation = tickDuration <= 0d ? 0f : Mathf.Clamp01((float)(_accumulator / tickDuration));
            _presentation?.Render(_state, interpolation);

            if (_state.result == null) return;
            _running = false;
            if (exportCandidateOnCompletion && !_candidateWritten)
            {
                WriteCandidate(Path.Combine(Application.persistentDataPath, candidateFileName));
                _candidateWritten = true;
            }
            EncounterCompleted?.Invoke(_state.result);
        }

        public string BuildCandidateJson()
        {
            if (_spec == null || _state == null) throw new InvalidOperationException("Action runtime has not started.");
            var candidate = ActionCandidateBuilder.Build(
                _spec,
                cycle,
                seed,
                controlledAgentId,
                partyAgentIds,
                _trace,
                _state);
            if (candidate.authority != "Arc replay required")
            {
                throw new InvalidOperationException("Action execution candidate lost provisional Arc replay authority.");
            }
            return ActionBridgeJson.SerializeCandidate(candidate, true);
        }

        public string WriteCandidate(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Candidate path is empty.", nameof(path));
            var fullPath = Path.GetFullPath(path);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(fullPath, BuildCandidateJson());
            return fullPath;
        }

        private void ValidatePresentationContract()
        {
            foreach (var cueId in ActionCueContract.RequiredCueIds)
            {
                if (!_presentation.SupportsCue(cueId))
                {
                    throw new InvalidOperationException("Action presentation does not map required Arc cue: " + cueId + " (" + _presentation.AdapterId + ")");
                }
            }
            if (allowDiagnosticPresentation) return;
            var errors = _presentation.ValidatePlayerProfile();
            if (errors != null && errors.Count > 0)
            {
                throw new InvalidOperationException("Action player presentation is not production-ready: " + string.Join(" ", errors));
            }
        }

        private void DeliverCues(IReadOnlyList<ActionSemanticCue> cues)
        {
            if (cues == null || cues.Count == 0) return;
            _presentation.ApplyCues(cues);
            CuesProjected?.Invoke(cues);
        }

        private void ResolvePresentation(bool required)
        {
            if (presentationComponent == null)
            {
                presentationComponent = GetComponentInChildren<ActionProductionPresentation>(true);
                if (presentationComponent == null) presentationComponent = GetComponentInChildren<ActionPrimitivePresentation>(true);
            }

            _presentation = presentationComponent as IActionPresentationAdapter;
            if (presentationComponent != null && _presentation == null)
            {
                throw new InvalidOperationException("Selected action presentation component does not implement IActionPresentationAdapter: " + presentationComponent.GetType().FullName);
            }
            if (required && _presentation == null) throw new InvalidOperationException("Action runtime has no IActionPresentationAdapter.");
        }
    }
}
