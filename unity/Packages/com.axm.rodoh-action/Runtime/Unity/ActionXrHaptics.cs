using UnityEngine;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Presentation-only OpenXR haptics. Pulses are driven by deterministic action
    /// events but are optional, disableable, and absent from action identity or trace.
    /// </summary>
    public sealed class ActionXrHaptics : MonoBehaviour
    {
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField, Range(0f, 1f)] private float amplitudeScale = 1f;
        [SerializeField, Range(0.01f, 0.5f)] private float minimumDurationSeconds = 0.025f;
        [SerializeField, Range(0.01f, 0.75f)] private float maximumDurationSeconds = 0.16f;
        [SerializeField] private XRNode dominantHand = XRNode.RightHand;
        [SerializeField] private XRNode supportHand = XRNode.LeftHand;

        private void Awake()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
        }

        private void OnEnable()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (presentation != null) presentation.OnFeedback.AddListener(OnFeedback);
        }

        private void OnDisable()
        {
            if (presentation != null) presentation.OnFeedback.RemoveListener(OnFeedback);
        }

        public void SetEnabled(bool value)
        {
            enabledByPreference = value;
        }

        public void SetAmplitudeScale(float value)
        {
            amplitudeScale = Mathf.Clamp01(value);
        }

        private void OnFeedback(string eventName, string actorId, int damage, Vector3 position)
        {
            if (!enabledByPreference || amplitudeScale <= 0f) return;
            var amplitude = Amplitude(eventName, damage) * amplitudeScale;
            var duration = Duration(eventName, damage);
            if (amplitude <= 0f || duration <= 0f) return;
            if (eventName == "player_hit")
            {
                Pulse(InputDevices.GetDeviceAtXRNode(dominantHand), amplitude, duration);
                Pulse(InputDevices.GetDeviceAtXRNode(supportHand), amplitude * 0.8f, duration);
                return;
            }
            if (eventName == "parry")
            {
                Pulse(InputDevices.GetDeviceAtXRNode(dominantHand), amplitude, duration);
                Pulse(InputDevices.GetDeviceAtXRNode(supportHand), amplitude * 0.45f, duration * 0.75f);
                return;
            }
            Pulse(InputDevices.GetDeviceAtXRNode(dominantHand), amplitude, duration);
        }

        private float Amplitude(string eventName, int damage)
        {
            if (eventName == "enemy_hit") return Mathf.Clamp01(0.28f + damage * 0.08f);
            if (eventName == "player_hit") return Mathf.Clamp01(0.48f + damage * 0.1f);
            if (eventName == "parry") return 0.65f;
            if (eventName == "dodge") return 0.18f;
            if (eventName == "objective_completed") return 0.35f;
            if (eventName == "encounter_completed") return 0.45f;
            if (eventName == "player_action") return 0.10f;
            return 0f;
        }

        private float Duration(string eventName, int damage)
        {
            var normalized = eventName == "player_hit" || eventName == "parry" ? 0.8f : eventName == "enemy_hit" ? 0.55f : 0.25f;
            normalized = Mathf.Clamp01(normalized + Mathf.Max(0, damage - 1) * 0.05f);
            return Mathf.Lerp(minimumDurationSeconds, maximumDurationSeconds, normalized);
        }

        private static void Pulse(InputDevice device, float amplitude, float duration)
        {
            if (!device.isValid) return;
            if (!device.TryGetHapticCapabilities(out var capabilities) || !capabilities.supportsImpulse || capabilities.numChannels == 0) return;
            device.SendHapticImpulse(0u, Mathf.Clamp01(amplitude), Mathf.Max(0.01f, duration));
        }
    }
}
