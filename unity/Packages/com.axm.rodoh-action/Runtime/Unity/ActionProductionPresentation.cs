using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

namespace Axm.Rodoh.Action
{
    [Serializable]
    public sealed class ActionEnemyPrefabBinding
    {
        public string kit = "skirmisher";
        public GameObject prefab;
        public RuntimeAnimatorController animatorController;
        public bool neutralFallback = true;
        public float scale = 1f;
    }

    [Serializable]
    public sealed class ActionPresentationFeedbackEvent : UnityEvent<string, string, int, Vector3> { }

    /// <summary>
    /// Dynamic production presentation for arbitrary action waves. Serialized
    /// prefab references are resolved by the editor assembler from the cartridge
    /// presentation manifest. Missing assets use complete local neutral bodies.
    /// </summary>
    public sealed class ActionProductionPresentation : MonoBehaviour
    {
        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private Transform presentationRoot;
        [SerializeField] private GameObject playerPrefab;
        [SerializeField] private RuntimeAnimatorController playerAnimatorController;
        [SerializeField] private bool playerNeutralFallback = true;
        [SerializeField, Min(0.01f)] private float playerScale = 1f;
        [SerializeField] private ActionEnemyPrefabBinding[] enemyPrefabs = Array.Empty<ActionEnemyPrefabBinding>();
        [SerializeField, Min(0.00001f)] private float unityUnitsPerActionUnit = 0.0005f;
        [SerializeField] private ActionPresentationFeedbackEvent onFeedback = new ActionPresentationFeedbackEvent();

        private readonly Dictionary<string, ActionActorBinding> _actors = new Dictionary<string, ActionActorBinding>(StringComparer.Ordinal);
        private readonly Dictionary<string, ActionEnemyPrefabBinding> _enemyByKit = new Dictionary<string, ActionEnemyPrefabBinding>(StringComparer.Ordinal);
        private ActionActorBinding _player;
        private Material _neutralPlayerMaterial;
        private Material _neutralEnemyMaterial;
        private Material _telegraphMaterial;

        private static readonly int Mode = Animator.StringToHash("AXM_Mode");
        private static readonly int ModeTick = Animator.StringToHash("AXM_ModeTick");
        private static readonly int Health = Animator.StringToHash("AXM_Health");
        private static readonly int Active = Animator.StringToHash("AXM_Active");
        private static readonly int Hit = Animator.StringToHash("AXM_Hit");
        private static readonly int Parry = Animator.StringToHash("AXM_Parry");
        private static readonly int Dodge = Animator.StringToHash("AXM_Dodge");
        private static readonly int Defeat = Animator.StringToHash("AXM_Defeat");
        private static readonly int Objective = Animator.StringToHash("AXM_Objective");

        public ActionPresentationFeedbackEvent OnFeedback => onFeedback;

        public void Configure(
            ActionRuntimeBehaviour actionRuntime,
            Transform root,
            GameObject authoredPlayerPrefab,
            RuntimeAnimatorController authoredPlayerController,
            bool allowPlayerFallback,
            float authoredPlayerScale,
            ActionEnemyPrefabBinding[] authoredEnemyPrefabs,
            float metersPerActionUnit)
        {
            if (runtime != null) runtime.TickAdvanced -= ApplyState;
            runtime = actionRuntime;
            presentationRoot = root;
            playerPrefab = authoredPlayerPrefab;
            playerAnimatorController = authoredPlayerController;
            playerNeutralFallback = allowPlayerFallback;
            playerScale = Mathf.Max(0.01f, authoredPlayerScale);
            enemyPrefabs = authoredEnemyPrefabs ?? Array.Empty<ActionEnemyPrefabBinding>();
            unityUnitsPerActionUnit = Mathf.Max(0.00001f, metersPerActionUnit);
            RebuildLibrary();
            if (isActiveAndEnabled && runtime != null) runtime.TickAdvanced += ApplyState;
        }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (presentationRoot == null)
            {
                var root = new GameObject("RODOH Action Bodies");
                root.transform.SetParent(transform, false);
                presentationRoot = root.transform;
            }
            CreateNeutralMaterials();
            RebuildLibrary();
        }

        private void OnEnable()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (runtime != null) runtime.TickAdvanced += ApplyState;
        }

        private void OnDisable()
        {
            if (runtime != null) runtime.TickAdvanced -= ApplyState;
        }

        private void Start()
        {
            if (runtime != null && runtime.State != null) ApplyState(runtime.State);
        }

        public void RebuildLibrary()
        {
            _enemyByKit.Clear();
            if (enemyPrefabs == null) return;
            foreach (var binding in enemyPrefabs)
            {
                if (binding == null || !ActionContract.IsEnemyKit(binding.kit)) continue;
                if (_enemyByKit.ContainsKey(binding.kit)) throw new InvalidOperationException("Duplicate action enemy presentation kit: " + binding.kit);
                _enemyByKit.Add(binding.kit, binding);
            }
        }

        public void ApplyState(ActionSimulationState state)
        {
            if (state == null) return;
            EnsurePlayer();
            ApplyActor(_player, state.player.x, state.player.y, state.player.facingX, state.player.facingY, (int)state.player.mode, state.player.modeTick, state.player.health, state.player.mode != ActionPlayerMode.Defeated, false);

            var liveIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var enemy in state.enemies)
            {
                liveIds.Add(enemy.id);
                var actor = EnsureEnemy(enemy);
                var facingX = Math.Sign(state.player.x - enemy.x);
                var facingY = Math.Sign(state.player.y - enemy.y);
                ApplyActor(actor, enemy.x, enemy.y, facingX, facingY, (int)enemy.mode, enemy.modeTick, enemy.health, enemy.mode != ActionEnemyMode.Defeated, enemy.mode == ActionEnemyMode.Telegraph);
            }

            var retire = new List<string>();
            foreach (var pair in _actors)
            {
                if (pair.Key == "player") continue;
                if (!liveIds.Contains(pair.Key)) retire.Add(pair.Key);
            }
            foreach (var id in retire)
            {
                var actor = _actors[id];
                _actors.Remove(id);
                if (actor != null) actor.gameObject.SetActive(false);
            }
            ApplyEvents(state.events);
        }

        public int ActiveAuthoredBodies()
        {
            var count = 0;
            foreach (var actor in _actors.Values)
            {
                if (actor != null && actor.gameObject.activeInHierarchy) count += 1;
            }
            return count;
        }

        private void EnsurePlayer()
        {
            if (_player != null) return;
            _player = SpawnActor("player", playerPrefab, playerAnimatorController, playerNeutralFallback, playerScale, true);
            _actors["player"] = _player;
        }

        private ActionActorBinding EnsureEnemy(ActionEnemyState enemy)
        {
            if (_actors.TryGetValue(enemy.id, out var existing) && existing != null)
            {
                existing.gameObject.SetActive(true);
                return existing;
            }
            _enemyByKit.TryGetValue(enemy.kit, out var library);
            var actor = SpawnActor(
                enemy.id,
                library?.prefab,
                library?.animatorController,
                library == null || library.neutralFallback,
                library == null ? NeutralEnemyScale(enemy.kit) : Mathf.Max(0.01f, library.scale),
                false);
            _actors[enemy.id] = actor;
            return actor;
        }

        private ActionActorBinding SpawnActor(string id, GameObject prefab, RuntimeAnimatorController controller, bool allowFallback, float scale, bool player)
        {
            GameObject instance;
            if (prefab != null)
            {
                instance = Instantiate(prefab, presentationRoot, false);
                instance.name = id;
            }
            else
            {
                if (!allowFallback) throw new InvalidOperationException("Authored action body is absent and neutral fallback is disabled: " + id);
                instance = GameObject.CreatePrimitive(player ? PrimitiveType.Capsule : PrimitiveType.Capsule);
                instance.name = id + " Neutral";
                instance.transform.SetParent(presentationRoot, false);
                var collider = instance.GetComponent<Collider>();
                if (collider != null) collider.enabled = false;
                var renderer = instance.GetComponent<Renderer>();
                if (renderer != null) renderer.sharedMaterial = player ? _neutralPlayerMaterial : _neutralEnemyMaterial;
            }
            instance.transform.localScale *= scale;
            var animator = instance.GetComponentInChildren<Animator>();
            if (animator != null)
            {
                animator.applyRootMotion = false;
                if (controller != null) animator.runtimeAnimatorController = controller;
            }
            var binding = instance.GetComponent<ActionActorBinding>() ?? instance.AddComponent<ActionActorBinding>();
            binding.Configure(id, animator, instance.transform);
            return binding;
        }

        private void ApplyActor(ActionActorBinding actor, int x, int y, int facingX, int facingY, int mode, int modeTick, int health, bool active, bool telegraph)
        {
            if (actor == null) return;
            var root = actor.VisualRoot;
            root.localPosition = new Vector3(x * unityUnitsPerActionUnit, root.localPosition.y, y * unityUnitsPerActionUnit);
            var facing = new Vector3(facingX, 0f, facingY);
            if (facing.sqrMagnitude > 0f) root.localRotation = Quaternion.LookRotation(facing.normalized, Vector3.up);
            actor.gameObject.SetActive(active);
            var animator = actor.Animator;
            if (animator != null)
            {
                animator.applyRootMotion = false;
                SetInteger(animator, Mode, mode);
                SetInteger(animator, ModeTick, modeTick);
                SetInteger(animator, Health, health);
                SetBool(animator, Active, active);
            }
            if (telegraph)
            {
                var renderer = actor.GetComponentInChildren<Renderer>();
                if (renderer != null && _telegraphMaterial != null && actor.Animator == null) renderer.sharedMaterial = _telegraphMaterial;
            }
        }

        private void ApplyEvents(IReadOnlyList<ActionEvent> events)
        {
            if (events == null) return;
            foreach (var actionEvent in events)
            {
                if (actionEvent == null) continue;
                ActionActorBinding actor = null;
                if (actionEvent.enemyId != null) _actors.TryGetValue(actionEvent.enemyId, out actor);
                if (actionEvent.type == "player_hit" || actionEvent.type == "parry" || actionEvent.type == "dodge") _actors.TryGetValue("player", out actor);
                var animator = actor?.Animator;
                if (actionEvent.type == "enemy_hit" || actionEvent.type == "player_hit") Trigger(animator, Hit);
                if (actionEvent.type == "parry") Trigger(animator, Parry);
                if (actionEvent.type == "dodge") Trigger(animator, Dodge);
                if (actionEvent.defeated) Trigger(animator, Defeat);
                if (actionEvent.type == "objective_completed")
                {
                    foreach (var value in _actors.Values) Trigger(value?.Animator, Objective);
                }
                onFeedback?.Invoke(actionEvent.type, actionEvent.enemyId ?? actionEvent.objectiveId ?? string.Empty, actionEvent.damage, actor == null ? Vector3.zero : actor.transform.position);
            }
        }

        private void CreateNeutralMaterials()
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (shader == null) return;
            _neutralPlayerMaterial = new Material(shader) { color = new Color(0.20f, 0.75f, 0.88f), hideFlags = HideFlags.DontSave };
            _neutralEnemyMaterial = new Material(shader) { color = new Color(0.22f, 0.48f, 0.20f), hideFlags = HideFlags.DontSave };
            _telegraphMaterial = new Material(shader) { color = new Color(0.95f, 0.42f, 0.12f), hideFlags = HideFlags.DontSave };
        }

        private static float NeutralEnemyScale(string kit)
        {
            if (kit == "swarm") return 0.5f;
            if (kit == "breaker") return 1.35f;
            if (kit == "duelist" || kit == "hexer") return 0.9f;
            return 0.8f;
        }

        private static void SetInteger(Animator animator, int hash, int value)
        {
            if (HasParameter(animator, hash, AnimatorControllerParameterType.Int)) animator.SetInteger(hash, value);
        }

        private static void SetBool(Animator animator, int hash, bool value)
        {
            if (HasParameter(animator, hash, AnimatorControllerParameterType.Bool)) animator.SetBool(hash, value);
        }

        private static void Trigger(Animator animator, int hash)
        {
            if (animator != null && HasParameter(animator, hash, AnimatorControllerParameterType.Trigger)) animator.SetTrigger(hash);
        }

        private static bool HasParameter(Animator animator, int hash, AnimatorControllerParameterType type)
        {
            if (animator == null) return false;
            foreach (var parameter in animator.parameters)
            {
                if (parameter.nameHash == hash && parameter.type == type) return true;
            }
            return false;
        }
    }
}
