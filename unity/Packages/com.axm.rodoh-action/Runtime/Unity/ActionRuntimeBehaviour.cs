using System;
using System.IO;
using UnityEngine;

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
        [SerializeField] private ActionPrimitivePresentation presentation;
        [SerializeField] private bool autoStart = true;
        [SerializeField, Range(1, 30)] private int maximumTicksPerFrame = 8;
        [SerializeField, Range(0f, 0.2f)] private float maximumPresentationHoldSeconds = 0.12f;
        [SerializeField] private bool exportCandidateOnCompletion = true;
        [SerializeField] private string candidateFileName = "latest-action-candidate.json";

        private readonly ActionTraceRecorder _trace = new ActionTraceRecorder();
        private ActionSpecProjection _spec;
        private ActionSimulationState _state;
        private double _accumulator;
        private float _presentationHoldRemaining;
        private bool _running;
        private bool _candidateWritten;

        public ActionSpecProjection Spec => _spec;
        public ActionSimulationState State => _state;
        public ActionTraceRecorder Trace => _trace;
        public bool Running => _running;
        public float PresentationHoldRemaining => _presentationHoldRemaining;
        public event Action<ActionSimulationState> TickAdvanced;
        public event Action<ActionSimulationResult> EncounterCompleted;

        public void Configure(TextAsset projection, uint runtimeSeed, int runtimeCycle, string controlledAgent, string[] party)
        {
            actionProjection = projection;
            seed = runtimeSeed;
            cycle = runtimeCycle;
            controlledAgentId = controlledAgent ?? string.Empty;
            partyAgentIds = party ?? Array.Empty<string>();
        }

        private void Awake()
        {
            if (inputRouter == null) inputRouter = GetComponent<ActionInputRouter>();
            if (presentation == null) presentation = GetComponent<ActionPrimitivePresentation>();
        }

        private void Start()
        {
            if (autoStart) StartRuntime();
        }

        public void StartRuntime()
        {
            if (actionProjection == null) throw new InvalidOperationException("Action projection TextAsset is not assigned.");
            _spec = ActionBridgeJson.ParseSpec(actionProjection.text);
            _state = ActionKernel.InitialState(_spec, seed);
            _trace.Reset();
            _accumulator = 0d;
            _presentationHoldRemaining = 0f;
            _candidateWritten = false;
            _running = true;
            if (presentation != null) presentation.Initialize(_spec, _state);
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
                if (presentation != null) presentation.Render(_state, 0f);
                return;
            }

            var tickDuration = 1d / _spec.tickRate;
            _accumulator += Time.unscaledDeltaTime;
            var advanced = 0;
            while (_accumulator >= tickDuration && advanced < maximumTicksPerFrame && _state.result == null)
            {
                var input = inputRouter != null ? inputRouter.SampleTick(_state.player.mode) : default;
                _trace.Append(input);
                ActionKernel.Step(_spec, _state, input);
                _accumulator -= tickDuration;
                advanced += 1;
                TickAdvanced?.Invoke(_state);
                if (presentation != null) presentation.ApplyEvents(_state.events);
            }

            var interpolation = tickDuration <= 0d ? 0f : Mathf.Clamp01((float)(_accumulator / tickDuration));
            if (presentation != null) presentation.Render(_state, interpolation);

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
    }
}
