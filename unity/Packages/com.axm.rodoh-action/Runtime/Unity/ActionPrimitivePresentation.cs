using System;
using System.Collections.Generic;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Dependency-free greybox presentation. Primitive colliders are disabled and
    /// no Rigidbody is created. Arc integer state determines every combat position,
    /// hit, parry, dodge, defeat, and terminal result.
    /// </summary>
    public sealed class ActionPrimitivePresentation : MonoBehaviour, IActionPresentationAdapter
    {
        [SerializeField, Min(0.00001f)] private float unityUnitsPerActionUnit = 0.0005f;
        [SerializeField] private Transform presentationRoot;
        [SerializeField] private bool buildArena = true;
        [SerializeField] private bool buildActors = true;

        private readonly Dictionary<string, Transform> _enemyVisuals = new Dictionary<string, Transform>(StringComparer.Ordinal);
        private Transform _playerVisual;
        private Material _playerMaterial;
        private Material _enemyMaterial;
        private Material _telegraphMaterial;
        private Material _arenaMaterial;
        private ActionSpecProjection _spec;
        private int _lastRenderedTick = -1;

        public string AdapterId => "diagnostic.primitive/v1";
        public bool DiagnosticOnly => true;

        public void Initialize(ActionSpecProjection spec, ActionSimulationState state)
        {
            _spec = spec ?? throw new ArgumentNullException(nameof(spec));
            if (presentationRoot == null)
            {
                var root = new GameObject("RODOH Action Presentation");
                root.transform.SetParent(transform, false);
                presentationRoot = root.transform;
            }
            ClearChildren(presentationRoot);
            _enemyVisuals.Clear();
            CreateMaterials();
            if (buildArena) CreateArena(spec);
            if (buildActors)
            {
                _playerVisual = CreatePrimitive("Player", PrimitiveType.Capsule, presentationRoot, _playerMaterial);
                foreach (var enemy in state.enemies) EnsureEnemy(enemy);
            }
            Render(state, 0f);
        }

        public void Render(ActionSimulationState state, float interpolation)
        {
            if (state == null || _spec == null) return;
            if (_playerVisual != null)
            {
                _playerVisual.localPosition = ToUnity(state.player.x, state.player.y, 0.9f);
                var facing = new Vector3(state.player.facingX, 0f, state.player.facingY);
                if (facing.sqrMagnitude > 0f) _playerVisual.localRotation = Quaternion.LookRotation(facing.normalized, Vector3.up);
                var attackScale = state.player.mode == ActionPlayerMode.Heavy ? 1.15f : state.player.mode == ActionPlayerMode.Light ? 1.07f : 1f;
                _playerVisual.localScale = new Vector3(0.75f / attackScale, 0.95f * attackScale, 0.75f / attackScale);
                _playerVisual.gameObject.SetActive(state.player.mode != ActionPlayerMode.Defeated);
            }

            foreach (var enemy in state.enemies)
            {
                var visual = EnsureEnemy(enemy);
                visual.localPosition = ToUnity(enemy.x, enemy.y, 0.55f);
                visual.gameObject.SetActive(enemy.mode != ActionEnemyMode.Defeated);
                visual.localScale = EnemyScale(enemy.kit, enemy.mode);
                var renderer = visual.GetComponent<Renderer>();
                if (renderer != null) renderer.sharedMaterial = enemy.mode == ActionEnemyMode.Telegraph ? _telegraphMaterial : _enemyMaterial;
            }
            _lastRenderedTick = state.tick;
        }

        public bool SupportsCue(string cueId)
        {
            return ActionCueContract.IsRequiredCue(cueId);
        }

        public IReadOnlyList<string> ValidatePlayerProfile()
        {
            return new[] { "diagnostic.primitive/v1 is not a player presentation" };
        }

        public void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)
        {
            if (cues == null) return;
            foreach (var cue in cues)
            {
                if (cue == null) continue;
                if (cue.cueId == "cue.parry-succeeded" && _playerVisual != null) _playerVisual.localScale = new Vector3(1.2f, 0.8f, 1.2f);
                if (cue.cueId == "cue.dodge-invulnerability" && _playerVisual != null) _playerVisual.localScale = new Vector3(0.6f, 0.6f, 1.4f);
                if (cue.cueId == "cue.enemy-stagger-started" && cue.subjectId != null && _enemyVisuals.TryGetValue(cue.subjectId, out var enemy)) enemy.localScale *= 1.2f;
            }
        }

        public bool UsesUnityPhysicsAuthority()
        {
            if (presentationRoot == null) return false;
            return presentationRoot.GetComponentInChildren<Rigidbody>(true) != null || HasEnabledCollider(presentationRoot);
        }

        private Transform EnsureEnemy(ActionEnemyState enemy)
        {
            if (_enemyVisuals.TryGetValue(enemy.id, out var existing)) return existing;
            var primitive = enemy.kit == "swarm" ? PrimitiveType.Sphere : enemy.kit == "breaker" ? PrimitiveType.Cube : PrimitiveType.Capsule;
            var visual = CreatePrimitive("Enemy " + enemy.id, primitive, presentationRoot, _enemyMaterial);
            _enemyVisuals.Add(enemy.id, visual);
            return visual;
        }

        private void CreateArena(ActionSpecProjection spec)
        {
            if (spec.arena.kit == "lane")
            {
                var floor = CreatePrimitive("Lane", PrimitiveType.Cube, presentationRoot, _arenaMaterial);
                floor.localScale = new Vector3(spec.arena.radius * unityUnitsPerActionUnit * 1.8f, 0.08f, spec.arena.radius * unityUnitsPerActionUnit * 0.65f);
                floor.localPosition = new Vector3(0f, -0.08f, 0f);
                return;
            }
            if (spec.arena.kit == "islands")
            {
                var radius = spec.arena.radius * unityUnitsPerActionUnit;
                for (var index = 0; index < 5; index += 1)
                {
                    var angle = index * Mathf.PI * 2f / 5f;
                    var island = CreatePrimitive("Island " + (index + 1), PrimitiveType.Cylinder, presentationRoot, _arenaMaterial);
                    island.localScale = new Vector3(radius * 0.28f, 0.05f, radius * 0.28f);
                    island.localPosition = new Vector3(Mathf.Cos(angle) * radius * 0.45f, -0.05f, Mathf.Sin(angle) * radius * 0.45f);
                }
                return;
            }
            var ring = CreatePrimitive("Ring", PrimitiveType.Cylinder, presentationRoot, _arenaMaterial);
            ring.localScale = new Vector3(spec.arena.radius * unityUnitsPerActionUnit, 0.05f, spec.arena.radius * unityUnitsPerActionUnit);
            ring.localPosition = new Vector3(0f, -0.05f, 0f);
        }

        private Vector3 ToUnity(int actionX, int actionY, float height)
        {
            return new Vector3(actionX * unityUnitsPerActionUnit, height, actionY * unityUnitsPerActionUnit);
        }

        private static Vector3 EnemyScale(string kit, ActionEnemyMode mode)
        {
            var baseScale = kit == "breaker" ? new Vector3(1.3f, 1.3f, 1.3f) : kit == "swarm" ? new Vector3(0.45f, 0.45f, 0.45f) : new Vector3(0.7f, 0.8f, 0.7f);
            if (mode == ActionEnemyMode.Telegraph) return baseScale * 1.18f;
            if (mode == ActionEnemyMode.Stagger) return new Vector3(baseScale.x * 1.25f, baseScale.y * 0.65f, baseScale.z * 1.25f);
            return baseScale;
        }

        private static Transform CreatePrimitive(string name, PrimitiveType type, Transform parent, Material material)
        {
            var gameObject = GameObject.CreatePrimitive(type);
            gameObject.name = name;
            gameObject.transform.SetParent(parent, false);
            var collider = gameObject.GetComponent<Collider>();
            if (collider != null) collider.enabled = false;
            var renderer = gameObject.GetComponent<Renderer>();
            if (renderer != null) renderer.sharedMaterial = material;
            return gameObject.transform;
        }

        private void CreateMaterials()
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            _playerMaterial = NewMaterial(shader, new Color(0.20f, 0.75f, 0.88f));
            _enemyMaterial = NewMaterial(shader, new Color(0.22f, 0.48f, 0.20f));
            _telegraphMaterial = NewMaterial(shader, new Color(0.95f, 0.42f, 0.12f));
            _arenaMaterial = NewMaterial(shader, new Color(0.28f, 0.30f, 0.34f));
        }

        private static Material NewMaterial(Shader shader, Color color)
        {
            if (shader == null) return null;
            var material = new Material(shader) { color = color };
            material.hideFlags = HideFlags.DontSave;
            return material;
        }

        private static bool HasEnabledCollider(Transform root)
        {
            var colliders = root.GetComponentsInChildren<Collider>(true);
            foreach (var collider in colliders) if (collider != null && collider.enabled) return true;
            return false;
        }

        private static void ClearChildren(Transform root)
        {
            for (var index = root.childCount - 1; index >= 0; index -= 1)
            {
                var child = root.GetChild(index).gameObject;
                if (Application.isPlaying) Destroy(child);
                else DestroyImmediate(child);
            }
        }
    }
}
