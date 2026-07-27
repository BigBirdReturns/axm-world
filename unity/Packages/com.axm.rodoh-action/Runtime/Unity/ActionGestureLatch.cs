using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Vendor-neutral edge gate for hand, body, voice, switch, or vision gesture
    /// classifiers already present in Embodied-AR-Lab. Classifier confidence is
    /// presentation-side evidence. Only the resulting button edge enters the trace.
    /// </summary>
    public sealed class ActionGestureLatch : MonoBehaviour
    {
        [Serializable]
        public sealed class Binding
        {
            public string gestureId = string.Empty;
            public int button = ActionContract.Light;
            [Range(0f, 1f)] public float engageConfidence = 0.80f;
            [Range(0f, 1f)] public float releaseConfidence = 0.55f;
            [Min(0f)] public float minimumIntervalSeconds = 0.18f;
        }

        private sealed class State
        {
            public bool engaged;
            public float lastEdgeTime = float.NegativeInfinity;
        }

        [SerializeField] private ActionInputRouter router;
        [SerializeField] private Binding[] bindings = Array.Empty<Binding>();
        private readonly Dictionary<string, State> _states = new Dictionary<string, State>(StringComparer.Ordinal);

        public void Configure(ActionInputRouter inputRouter, Binding[] gestureBindings)
        {
            router = inputRouter;
            bindings = gestureBindings ?? Array.Empty<Binding>();
            _states.Clear();
        }

        public void ReportGesture(string gestureId, float confidence)
        {
            if (router == null || string.IsNullOrWhiteSpace(gestureId)) return;
            if (float.IsNaN(confidence) || float.IsInfinity(confidence)) return;
            confidence = Mathf.Clamp01(confidence);
            foreach (var binding in bindings)
            {
                if (binding == null || binding.gestureId != gestureId) continue;
                if (!_states.TryGetValue(gestureId, out var state))
                {
                    state = new State();
                    _states.Add(gestureId, state);
                }
                if (!state.engaged && confidence >= binding.engageConfidence && Time.unscaledTime - state.lastEdgeTime >= binding.minimumIntervalSeconds)
                {
                    state.engaged = true;
                    state.lastEdgeTime = Time.unscaledTime;
                    router.Latch(binding.button);
                }
                else if (state.engaged && confidence <= binding.releaseConfidence)
                {
                    state.engaged = false;
                }
            }
        }

        public void ReleaseAll()
        {
            foreach (var state in _states.Values) state.engaged = false;
        }

        private void OnValidate()
        {
            if (bindings == null) return;
            foreach (var binding in bindings)
            {
                if (binding == null) continue;
                binding.button &= ActionContract.ButtonMask;
                binding.engageConfidence = Mathf.Clamp01(binding.engageConfidence);
                binding.releaseConfidence = Mathf.Clamp(binding.releaseConfidence, 0f, binding.engageConfidence);
                binding.minimumIntervalSeconds = Mathf.Max(0f, binding.minimumIntervalSeconds);
            }
        }
    }
}
