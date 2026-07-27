using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Tiny local procedural audio bank generated once at startup. It provides a
    /// complete neutral sound floor with no network, imported media, or runtime DSP
    /// graph allocation. Sound remains optional and presentation-only.
    /// </summary>
    public sealed class ActionProceduralAudio : MonoBehaviour
    {
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField, Range(0f, 1f)] private float masterVolume = 0.55f;
        [SerializeField, Range(1, 8)] private int sourcePoolSize = 4;
        [SerializeField, Range(8000, 48000)] private int sampleRate = 22050;
        [SerializeField] private string themeId = "neutral-action";
        private readonly Dictionary<string, AudioClip> _clips = new Dictionary<string, AudioClip>(StringComparer.Ordinal);
        private AudioSource[] _sources = Array.Empty<AudioSource>();
        private int _sourceIndex;

        private void Awake()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            BuildSources();
            BuildBank();
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

        public void Configure(ActionProductionPresentation actionPresentation, string cartridgeThemeId)
        {
            presentation = actionPresentation;
            if (!string.IsNullOrWhiteSpace(cartridgeThemeId) && cartridgeThemeId != themeId)
            {
                themeId = cartridgeThemeId;
                BuildBank();
            }
        }

        public void SetEnabled(bool value)
        {
            enabledByPreference = value;
            if (!value)
            {
                foreach (var source in _sources) source.Stop();
            }
        }

        public void SetVolume(float value)
        {
            masterVolume = Mathf.Clamp01(value);
        }

        private void OnFeedback(string eventName, string actorId, int damage, Vector3 position)
        {
            if (!enabledByPreference || masterVolume <= 0f || _sources.Length == 0) return;
            var key = eventName;
            if (eventName == "player_action") key = damage >= 3 ? "player_action_heavy" : "player_action_light";
            if (!_clips.TryGetValue(key, out var clip) || clip == null) return;
            var source = _sources[_sourceIndex++ % _sources.Length];
            source.transform.position = position;
            source.pitch = 1f;
            source.volume = masterVolume * VolumeFor(key, damage);
            source.PlayOneShot(clip);
        }

        private void BuildSources()
        {
            var count = Mathf.Clamp(sourcePoolSize, 1, 8);
            _sources = new AudioSource[count];
            for (var index = 0; index < count; index += 1)
            {
                var child = new GameObject("Action Procedural Audio " + (index + 1));
                child.transform.SetParent(transform, false);
                var source = child.AddComponent<AudioSource>();
                source.playOnAwake = false;
                source.loop = false;
                source.spatialBlend = 0.35f;
                source.rolloffMode = AudioRolloffMode.Linear;
                source.minDistance = 1f;
                source.maxDistance = 18f;
                source.dopplerLevel = 0f;
                _sources[index] = source;
            }
        }

        private void BuildBank()
        {
            foreach (var clip in _clips.Values) if (clip != null) Destroy(clip);
            _clips.Clear();
            var root = ThemeRoot(themeId);
            _clips["player_action_light"] = Tone("action-light", root * 1.5f, 0.08f, Wave.Triangle, 0.18f, root * 1.2f);
            _clips["player_action_heavy"] = Tone("action-heavy", root * 0.75f, 0.16f, Wave.Square, 0.22f, root * 0.48f);
            _clips["enemy_hit"] = Tone("enemy-hit", root * 1.1f, 0.09f, Wave.Noise, 0.24f, root * 0.7f);
            _clips["player_hit"] = Tone("player-hit", root * 0.56f, 0.14f, Wave.Noise, 0.34f, root * 0.32f);
            _clips["parry"] = Chord("parry", new[] { root * 2f, root * 2.5f, root * 3f }, 0.13f, 0.18f);
            _clips["dodge"] = Tone("dodge", root * 1.25f, 0.07f, Wave.Sine, 0.14f, root * 1.8f);
            _clips["objective_completed"] = Chord("objective", new[] { root, root * 1.25f, root * 1.5f }, 0.28f, 0.15f);
            _clips["encounter_completed"] = Chord("completed", new[] { root * 0.75f, root, root * 1.5f, root * 2f }, 0.42f, 0.13f);
        }

        private AudioClip Tone(string name, float startFrequency, float seconds, Wave wave, float gain, float endFrequency)
        {
            var samples = Mathf.Max(1, Mathf.CeilToInt(sampleRate * seconds));
            var data = new float[samples];
            var random = unchecked((uint)StableHash(themeId + ":" + name));
            var phase = 0f;
            for (var index = 0; index < samples; index += 1)
            {
                var progress = index / (float)Mathf.Max(1, samples - 1);
                var frequency = Mathf.Lerp(startFrequency, endFrequency, progress);
                phase += frequency / sampleRate;
                random = random * 1664525u + 1013904223u;
                var value = Sample(wave, phase, random);
                var envelope = Mathf.Sin(Mathf.Clamp01(progress) * Mathf.PI) * Mathf.Pow(1f - progress, 0.35f);
                data[index] = value * envelope * gain;
            }
            return Clip(name, data);
        }

        private AudioClip Chord(string name, float[] frequencies, float seconds, float gain)
        {
            var samples = Mathf.Max(1, Mathf.CeilToInt(sampleRate * seconds));
            var data = new float[samples];
            var phases = new float[frequencies.Length];
            for (var index = 0; index < samples; index += 1)
            {
                var progress = index / (float)Mathf.Max(1, samples - 1);
                var sum = 0f;
                for (var tone = 0; tone < frequencies.Length; tone += 1)
                {
                    phases[tone] += frequencies[tone] / sampleRate;
                    sum += Mathf.Sin(phases[tone] * Mathf.PI * 2f);
                }
                var envelope = Mathf.Sin(Mathf.Clamp01(progress) * Mathf.PI) * Mathf.Pow(1f - progress, 0.25f);
                data[index] = sum / Mathf.Max(1, frequencies.Length) * envelope * gain;
            }
            return Clip(name, data);
        }

        private AudioClip Clip(string name, float[] data)
        {
            var clip = AudioClip.Create("RODOH " + name, data.Length, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private static float Sample(Wave wave, float phase, uint random)
        {
            var cycle = phase - Mathf.Floor(phase);
            if (wave == Wave.Sine) return Mathf.Sin(cycle * Mathf.PI * 2f);
            if (wave == Wave.Triangle) return 1f - 4f * Mathf.Abs(cycle - 0.5f);
            if (wave == Wave.Square) return cycle < 0.5f ? 1f : -1f;
            return ((random >> 8) & 0x00ffffff) / 8388607.5f - 1f;
        }

        private static float ThemeRoot(string value)
        {
            var semitone = StableHash(value) % 24;
            return 110f * Mathf.Pow(2f, semitone / 12f);
        }

        private static float VolumeFor(string key, int damage)
        {
            if (key == "player_hit") return Mathf.Clamp(0.7f + damage * 0.05f, 0.7f, 1f);
            if (key == "enemy_hit") return Mathf.Clamp(0.55f + damage * 0.04f, 0.55f, 0.9f);
            if (key == "encounter_completed") return 0.85f;
            return 0.65f;
        }

        private static int StableHash(string value)
        {
            unchecked
            {
                var hash = 23;
                foreach (var character in value ?? string.Empty) hash = hash * 31 + character;
                return hash & int.MaxValue;
            }
        }

        private enum Wave
        {
            Sine,
            Triangle,
            Square,
            Noise
        }
    }
}
