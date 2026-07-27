using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.Rendering;

namespace Axm.Rodoh.Action
{
    [Serializable]
    public sealed class ActionQualityChangedEvent : UnityEvent<string> { }

    /// <summary>
    /// Presentation-only adaptive quality. It may change rendering, animation, VFX,
    /// and target frame rate. It never reads or writes the fixed-step action state,
    /// input trace, seed, objective, candidate, or Arc receipt.
    /// </summary>
    public sealed class ActionQualityGovernor : MonoBehaviour
    {
        [SerializeField] private ActionQualityProfile[] profiles = Array.Empty<ActionQualityProfile>();
        [SerializeField] private string initialProfile = "standard";
        [SerializeField, Range(30, 600)] private int sampleWindowFrames = 180;
        [SerializeField, Range(0.5f, 0.99f)] private float exponentialSmoothing = 0.92f;
        [SerializeField, Range(1.02f, 2f)] private float degradeThreshold = 1.18f;
        [SerializeField, Range(0.25f, 0.98f)] private float upgradeThreshold = 0.78f;
        [SerializeField, Min(1f)] private float minimumSecondsBetweenChanges = 8f;
        [SerializeField, Min(1f)] private float minimumSecondsBeforeUpgrade = 20f;
        [SerializeField] private bool adaptive = true;
        [SerializeField] private ActionQualityChangedEvent onQualityChanged = new ActionQualityChangedEvent();

        private readonly Dictionary<string, ActionQualityProfile> _byId = new Dictionary<string, ActionQualityProfile>(StringComparer.Ordinal);
        private readonly Queue<float> _samples = new Queue<float>();
        private ActionQualityProfile _current;
        private float _smoothedMilliseconds;
        private float _lastChangeTime = float.NegativeInfinity;
        private float _stableSince;
        private int _profileIndex;

        public ActionQualityProfile CurrentProfile => _current;
        public float SmoothedFrameMilliseconds => _smoothedMilliseconds;
        public event Action<ActionQualityProfile> QualityChanged;
        public ActionQualityChangedEvent OnQualityChanged => onQualityChanged;

        public void Configure(ActionQualityProfile[] qualityProfiles, string startingProfile = "standard", bool allowAdaptive = true)
        {
            profiles = qualityProfiles ?? Array.Empty<ActionQualityProfile>();
            initialProfile = startingProfile;
            adaptive = allowAdaptive;
            RebuildProfiles();
            ApplyProfile(initialProfile, true);
        }

        private void Awake()
        {
            RebuildProfiles();
        }

        private void Start()
        {
            ApplyProfile(initialProfile, true);
        }

        private void Update()
        {
            var milliseconds = Mathf.Clamp(Time.unscaledDeltaTime * 1000f, 0f, 1000f);
            _smoothedMilliseconds = _smoothedMilliseconds <= 0f
                ? milliseconds
                : _smoothedMilliseconds * exponentialSmoothing + milliseconds * (1f - exponentialSmoothing);
            _samples.Enqueue(milliseconds);
            while (_samples.Count > sampleWindowFrames) _samples.Dequeue();
            if (!adaptive || _current == null || _samples.Count < sampleWindowFrames) return;
            if (Time.unscaledTime - _lastChangeTime < minimumSecondsBetweenChanges) return;

            var targetMilliseconds = 1000f / Mathf.Max(1, _current.targetFps);
            var p95 = Percentile95(_samples);
            if ((p95 > targetMilliseconds * degradeThreshold || _smoothedMilliseconds > targetMilliseconds * degradeThreshold) && _profileIndex > 0)
            {
                ApplyProfile(profiles[_profileIndex - 1].id, false);
                _stableSince = Time.unscaledTime;
                return;
            }
            if (p95 < targetMilliseconds * upgradeThreshold && _smoothedMilliseconds < targetMilliseconds * upgradeThreshold)
            {
                if (_stableSince <= 0f) _stableSince = Time.unscaledTime;
                if (Time.unscaledTime - _stableSince >= minimumSecondsBeforeUpgrade && _profileIndex < profiles.Length - 1)
                {
                    ApplyProfile(profiles[_profileIndex + 1].id, false);
                    _stableSince = Time.unscaledTime;
                }
            }
            else
            {
                _stableSince = Time.unscaledTime;
            }
        }

        public void ApplyProfile(string id, bool force)
        {
            if (_byId.Count == 0) RebuildProfiles();
            if (!_byId.TryGetValue(id, out var profile)) throw new InvalidOperationException("Unknown action quality profile: " + id);
            if (!force && _current != null && _current.id == profile.id) return;
            _current = profile;
            _profileIndex = Array.IndexOf(profiles, profile);
            _lastChangeTime = Time.unscaledTime;
            _stableSince = Time.unscaledTime;
            Application.targetFrameRate = profile.targetFps;
            ApplyGlobalQuality(profile);
            QualityChanged?.Invoke(profile);
            onQualityChanged?.Invoke(profile.id);
        }

        private void RebuildProfiles()
        {
            _byId.Clear();
            if (profiles == null || profiles.Length == 0)
            {
                profiles = new[]
                {
                    new ActionQualityProfile { id = "low", renderScale = 0.7f, maximumSkinnedActors = 5, maximumParticles = 96, shadowMode = "none", postProcessing = false, targetFps = 30 },
                    new ActionQualityProfile { id = "standard", renderScale = 1f, maximumSkinnedActors = 9, maximumParticles = 384, shadowMode = "one-directional", postProcessing = false, targetFps = 60 },
                    new ActionQualityProfile { id = "high", renderScale = 1.15f, maximumSkinnedActors = 13, maximumParticles = 1024, shadowMode = "baked", postProcessing = true, targetFps = 72 },
                };
            }
            Array.Sort(profiles, (left, right) => Rank(left?.id).CompareTo(Rank(right?.id)));
            foreach (var profile in profiles)
            {
                if (profile == null || Rank(profile.id) < 0) throw new InvalidOperationException("Action quality profile is absent or unknown.");
                if (_byId.ContainsKey(profile.id)) throw new InvalidOperationException("Duplicate action quality profile: " + profile.id);
                _byId.Add(profile.id, profile);
            }
            if (_byId.Count != 3 || !_byId.ContainsKey("low") || !_byId.ContainsKey("standard") || !_byId.ContainsKey("high")) throw new InvalidOperationException("Action quality governor requires low, standard, and high profiles.");
        }

        private static int Rank(string id)
        {
            if (id == "low") return 0;
            if (id == "standard") return 1;
            if (id == "high") return 2;
            return -1;
        }

        private static float Percentile95(IEnumerable<float> values)
        {
            var sorted = new List<float>(values);
            sorted.Sort();
            if (sorted.Count == 0) return 0f;
            var index = Mathf.Clamp(Mathf.CeilToInt(sorted.Count * 0.95f) - 1, 0, sorted.Count - 1);
            return sorted[index];
        }

        private static void ApplyGlobalQuality(ActionQualityProfile profile)
        {
            if (profile.shadowMode == "none")
            {
                QualitySettings.shadows = ShadowQuality.Disable;
                QualitySettings.shadowDistance = 0f;
                QualitySettings.pixelLightCount = 1;
            }
            else if (profile.shadowMode == "one-directional")
            {
                QualitySettings.shadows = ShadowQuality.HardOnly;
                QualitySettings.shadowDistance = 25f;
                QualitySettings.pixelLightCount = 1;
            }
            else
            {
                QualitySettings.shadows = ShadowQuality.All;
                QualitySettings.shadowDistance = 50f;
                QualitySettings.pixelLightCount = 2;
            }
            QualitySettings.lodBias = profile.id == "low" ? 0.65f : profile.id == "standard" ? 1f : 1.35f;
            QualitySettings.maximumLODLevel = profile.id == "low" ? 1 : 0;
            TrySetRenderScale(profile.renderScale);
        }

        private static void TrySetRenderScale(float value)
        {
            var asset = GraphicsSettings.currentRenderPipeline ?? GraphicsSettings.defaultRenderPipeline;
            if (asset == null) return;
            var property = asset.GetType().GetProperty("renderScale", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (property == null || !property.CanWrite || property.PropertyType != typeof(float)) return;
            property.SetValue(asset, value);
        }
    }
}
