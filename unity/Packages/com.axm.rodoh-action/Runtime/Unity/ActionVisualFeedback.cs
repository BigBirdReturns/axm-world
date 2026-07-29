using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Pooled telegraph rings and material-property hit flashes. The component uses
    /// one shared mesh, one shared unlit material, no colliders, no lights, and no
    /// particles. It is legibility and impact only.
    /// </summary>
    public sealed class ActionVisualFeedback : MonoBehaviour
    {
        private sealed class Flash
        {
            public Renderer renderer;
            public MaterialPropertyBlock original;
            public float until;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private ActionProductionPresentation presentation;
        [SerializeField] private Transform actorRoot;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool reducedMotion;
        [SerializeField] private bool highContrast;
        [SerializeField, Range(0.02f, 0.3f)] private float flashSeconds = 0.08f;
        [SerializeField, Range(0.02f, 0.5f)] private float ringThickness = 0.12f;
        [SerializeField, Range(0.25f, 3f)] private float ringRadius = 0.9f;
        private readonly List<Flash> _flashes = new List<Flash>();
        private readonly List<GameObject> _rings = new List<GameObject>();
        private Mesh _ringMesh;
        private Material _ringMaterial;
        private MaterialPropertyBlock _ringBlock;
        private static readonly int BaseColor = Shader.PropertyToID("_BaseColor");
        private static readonly int Color = Shader.PropertyToID("_Color");
        private static readonly int EmissionColor = Shader.PropertyToID("_EmissionColor");

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (actorRoot == null)
            {
                var bodies = GameObject.Find("Action Bodies");
                actorRoot = bodies == null ? transform : bodies.transform;
            }
            _ringMesh = BuildRingMesh(32, Mathf.Clamp(ringThickness, 0.02f, 0.5f));
            var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Color") ?? Shader.Find("Sprites/Default");
            if (shader != null)
            {
                _ringMaterial = new Material(shader)
                {
                    color = new Color(1f, 0.35f, 0.08f, 0.78f),
                    hideFlags = HideFlags.DontSave
                };
                _ringMaterial.renderQueue = (int)RenderQueue.Transparent;
            }
            _ringBlock = new MaterialPropertyBlock();
        }

        private void OnEnable()
        {
            if (presentation == null) presentation = GetComponentInParent<ActionProductionPresentation>();
            if (presentation != null) presentation.OnFeedback.AddListener(OnFeedback);
        }

        private void OnDisable()
        {
            if (presentation != null) presentation.OnFeedback.RemoveListener(OnFeedback);
            RestoreAllFlashes();
            HideRings();
        }

        public void Configure(ActionRuntimeBehaviour actionRuntime, ActionProductionPresentation actionPresentation, Transform bodies)
        {
            runtime = actionRuntime;
            presentation = actionPresentation;
            actorRoot = bodies;
        }

        public void SetPreferences(bool enabledValue, bool reduceMotion, bool contrast)
        {
            enabledByPreference = enabledValue;
            reducedMotion = reduceMotion;
            highContrast = contrast;
        }

        private void Update()
        {
            for (var index = _flashes.Count - 1; index >= 0; index -= 1)
            {
                var flash = _flashes[index];
                if (flash.renderer != null && Time.unscaledTime < flash.until) continue;
                if (flash.renderer != null) flash.renderer.SetPropertyBlock(flash.original);
                _flashes.RemoveAt(index);
            }
        }

        private void LateUpdate()
        {
            if (!enabledByPreference || runtime == null || runtime.State == null || actorRoot == null || _ringMaterial == null) return;
            var visible = 0;
            foreach (var enemy in runtime.State.enemies)
            {
                if (enemy.mode != ActionEnemyMode.Telegraph) continue;
                var binding = FindBinding(enemy.id);
                if (binding == null) continue;
                var ring = Ring(visible++);
                ring.SetActive(true);
                ring.transform.position = binding.VisualRoot.position + Vector3.up * 0.035f;
                ring.transform.rotation = Quaternion.identity;
                var law = runtime.Spec.EnemyLaw(enemy.kit);
                var progress = law.telegraphTicks <= 0 ? 1f : Mathf.Clamp01(enemy.modeTick / (float)law.telegraphTicks);
                var pulse = reducedMotion ? 1f : 0.9f + Mathf.Sin((progress * 5f + Time.unscaledTime * 8f) * Mathf.PI) * 0.12f;
                var scale = ringRadius * Mathf.Lerp(0.65f, 1.25f, progress) * pulse;
                ring.transform.localScale = new Vector3(scale, 1f, scale);
                var color = highContrast ? new Color(1f, 1f, 0f, 0.92f) : new Color(1f, 0.25f + progress * 0.2f, 0.06f, 0.72f + progress * 0.2f);
                _ringBlock.Clear();
                _ringBlock.SetColor(BaseColor, color);
                _ringBlock.SetColor(Color, color);
                ring.GetComponent<MeshRenderer>().SetPropertyBlock(_ringBlock);
            }
            for (var index = visible; index < _rings.Count; index += 1) _rings[index].SetActive(false);
        }

        private void OnFeedback(string eventName, string actorId, int damage, Vector3 position)
        {
            if (!enabledByPreference || actorRoot == null) return;
            var targetId = eventName == "player_hit" || eventName == "parry" || eventName == "dodge" ? "player" : actorId;
            if (string.IsNullOrWhiteSpace(targetId)) return;
            var binding = FindBinding(targetId);
            if (binding == null) return;
            var color = eventName == "parry"
                ? new Color(0.35f, 0.95f, 1f, 1f)
                : eventName == "player_hit"
                    ? new Color(1f, 0.16f, 0.08f, 1f)
                    : new Color(1f, 0.88f, 0.4f, 1f);
            foreach (var renderer in binding.GetComponentsInChildren<Renderer>(true)) FlashRenderer(renderer, color);
        }

        private void FlashRenderer(Renderer renderer, Color color)
        {
            if (renderer == null) return;
            for (var index = _flashes.Count - 1; index >= 0; index -= 1)
            {
                if (_flashes[index].renderer != renderer) continue;
                _flashes[index].until = Time.unscaledTime + flashSeconds;
                ApplyFlash(renderer, color);
                return;
            }
            var original = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(original);
            _flashes.Add(new Flash { renderer = renderer, original = original, until = Time.unscaledTime + flashSeconds });
            ApplyFlash(renderer, color);
        }

        private static void ApplyFlash(Renderer renderer, Color color)
        {
            var block = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(block);
            block.SetColor(BaseColor, color);
            block.SetColor(Color, color);
            block.SetColor(EmissionColor, color * 0.65f);
            renderer.SetPropertyBlock(block);
        }

        private ActionActorBinding FindBinding(string id)
        {
            foreach (var binding in actorRoot.GetComponentsInChildren<ActionActorBinding>(true)) if (binding.ActorId == id) return binding;
            return null;
        }

        private GameObject Ring(int index)
        {
            while (_rings.Count <= index)
            {
                var ring = new GameObject("Action Telegraph Ring " + (_rings.Count + 1));
                ring.transform.SetParent(transform, false);
                var filter = ring.AddComponent<MeshFilter>();
                filter.sharedMesh = _ringMesh;
                var renderer = ring.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = _ringMaterial;
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                ring.SetActive(false);
                _rings.Add(ring);
            }
            return _rings[index];
        }

        private static Mesh BuildRingMesh(int segments, float thickness)
        {
            var mesh = new Mesh { name = "RODOH Action Telegraph Ring", hideFlags = HideFlags.DontSave };
            var vertices = new Vector3[segments * 2];
            var triangles = new int[segments * 6];
            var inner = Mathf.Clamp01(1f - thickness);
            for (var index = 0; index < segments; index += 1)
            {
                var angle = index * Mathf.PI * 2f / segments;
                var x = Mathf.Cos(angle);
                var z = Mathf.Sin(angle);
                vertices[index * 2] = new Vector3(x * inner, 0f, z * inner);
                vertices[index * 2 + 1] = new Vector3(x, 0f, z);
                var next = (index + 1) % segments;
                var offset = index * 6;
                triangles[offset] = index * 2;
                triangles[offset + 1] = next * 2 + 1;
                triangles[offset + 2] = index * 2 + 1;
                triangles[offset + 3] = index * 2;
                triangles[offset + 4] = next * 2;
                triangles[offset + 5] = next * 2 + 1;
            }
            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.RecalculateBounds();
            mesh.UploadMeshData(true);
            return mesh;
        }

        private void RestoreAllFlashes()
        {
            foreach (var flash in _flashes) if (flash.renderer != null) flash.renderer.SetPropertyBlock(flash.original);
            _flashes.Clear();
        }

        private void HideRings()
        {
            foreach (var ring in _rings) if (ring != null) ring.SetActive(false);
        }
    }
}
