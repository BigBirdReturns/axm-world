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

    [Serializable]
    public sealed class ActionSemanticCueFeedbackEvent : UnityEvent<string, string, string, int, int, Vector3> { }

    /// <summary>
    /// Dynamic production presentation for arbitrary action waves. Serialized
    /// prefab references are resolved by the editor assembler from the cartridge
    /// presentation manifest. Missing assets use complete local neutral bodies only
    /// when the selected player profile explicitly permits them.
    /// </summary>
    public sealed class ActionProductionPresentation : MonoBehaviour, IActionPresentationAdapter
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
        [SerializeField] private ActionSemanticCueFeedbackEvent onSemanticCue = new ActionSemanticCueFeedbackEvent();

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
        private static readonly int Cue = Animator.StringToHash("AXM_Cue");
        private static readonly int CueCode = Animator.StringToHash("AXM_CueCode");
        private static readonly int CueDuration = Animator.StringToHash("AXM_CueDuration");
        private static readonly int DefenseWindow = Animator.StringToHash("AXM_DefenseWindow");
        private static readonly int WorkWindow = Animator.StringToHash("AXM_WorkWindow");
        private static readonly string[] RequiredEnemyKits = { "skirmisher", "duelist", "swarm", "hexer", "breaker" };

        public string AdapterId => "production.prefab/v1";
        public bool DiagnosticOnly => false;
        public ActionPresentationFeedbackEvent OnFeedback => onFeedback;
        public ActionSemanticCueFeedbackEvent OnSemanticCue => onSemanticCue;
        public Transform PresentationRoot => presentationRoot;
        public GameObject PlayerPrefab => playerPrefab;
        public RuntimeAnimatorController PlayerAnimatorController => playerAnimatorController;
        public bool PlayerNeutralFallback => playerNeutralFallback;
        public float PlayerScale => playerScale;
        public IReadOnlyList<ActionEnemyPrefabBinding> EnemyPrefabs => enemyPrefabs ?? Array.Empty<ActionEnemyPrefabBinding>();
        public float UnityUnitsPerActionUnit => unityUnitsPerActionUnit;

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
            runtime = actionRuntime;
            presentationRoot = root;
            playerPrefab = authoredPlayerPrefab;
            playerAnimatorController = authoredPlayerController;
            playerNeutralFallback = allowPlayerFallback;
            playerScale = Mathf.Max(0.01f, authoredPlayerScale);
            enemyPrefabs = authoredEnemyPrefabs ?? Array.Empty<ActionEnemyPrefabBinding>();
            unityUnitsPerActionUnit = Mathf.Max(0.00001f, metersPerActionUnit);
            RebuildLibrary();
        }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            EnsureRoot();
            CreateNeutralMaterials();
            RebuildLibrary();
        }

        public void Initialize(ActionSpecProjection spec, ActionSimulationState state)
        {
            if (spec == null) throw new ArgumentNullException(nameof(spec));
            if (state == null) throw new ArgumentNullException(nameof(state));
            EnsureRoot();
            CreateNeutralMaterials();
            RebuildLibrary();
            ResetActors();
            ApplyState(state);
        }

        public void Render(ActionSimulationState state, float interpolation)
        {
            ApplyState(state);
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
        }

        public bool SupportsCue(string cueId)
        {
            return ActionCueContract.IsRequiredCue(cueId);
        }

        public IReadOnlyList<string> ValidatePlayerProfile()
        {
            var errors = new List<string>();
            if (playerPrefab == null) errors.Add("Authored player prefab is absent.");
            if (playerNeutralFallback) errors.Add("Player primitive fallback remains enabled.");
            foreach (var kit in RequiredEnemyKits)
            {
                if (!_enemyByKit.TryGetValue(kit, out var binding) || binding == null || binding.prefab == null)
                {
                    errors.Add("Authored enemy prefab is absent: " + kit + ".");
                }
                else if (binding.neutralFallback)
                {
                    errors.Add("Enemy primitive fallback remains enabled: " + kit + ".");
                }
            }
            return errors;
        }

        public void ApplyCues(IReadOnlyList<ActionSemanticCue> cues)
        {
            if (cues == null) return;
            foreach (var cue in cues)
            {
                if (cue == null) continue;
                if (!SupportsCue(cue.cueId)) throw new InvalidOperationException("Unsupported Arc semantic cue: " + cue.cueId);
                ActionActorBinding actor = null;
                if (!string.IsNullOrEmpty(cue.subjectId)) _actors.TryGetValue(cue.subjectId, out actor);
                ActionActorBinding playerActor = null;
                _actors.TryGetValue("player", out playerActor);
                if (cue.cueId.StartsWith("cue.player-", StringComparison.Ordinal) || cue.cueId == "cue.dodge-invulnerability") actor = playerActor;
                var animator = actor?.Animator;
                if (cue.cueId == "cue.parry-succeeded") Trigger(playerActor?.Animator, Parry);
                if (cue.cueId == "cue.dodge-invulnerability") Trigger(playerActor?.Animator, Dodge);
                if (cue.cueId == "cue.enemy-stagger-started") Trigger(animator, Hit);
                if (cue.cueId == "cue.objective-completed")
                {
                    foreach (var value in _actors.Values) Trigger(value?.Animator, Objective);
                }
                var cueCode = ActionCueContract.CueCode(cue.cueId);
                var cueDuration = cue.durationTicks ?? 0;
                foreach (var value in new[] { animator, playerActor?.Animator })
                {
                    SetInteger(value, CueCode, cueCode);
                    SetInteger(value, CueDuration, cueDuration);
                    Trigger(value, Cue);
                }
                if (cue.cueId == "cue.defense-window-opened") SetBool(playerActor?.Animator, DefenseWindow, true);
                if (cue.cueId == "cue.defense-window-closed") SetBool(playerActor?.Animator, DefenseWindow, false);
                if (cue.cueId == "cue.work-window-opened") SetBool(playerActor?.Animator, WorkWindow, true);
                if (cue.cueId == "cue.work-window-closed") SetBool(playerActor?.Animator, WorkWindow, false);
                var position = actor == null ? Vector3.zero : actor.transform.position;
                onFeedback?.Invoke(cue.cueId, cue.subjectId ?? cue.objectiveId ?? string.Empty, cueDuration, position);
                onSemanticCue?.Invoke(cue.cueId, cue.subjectId ?? string.Empty, cue.objectiveId ?? string.Empty, cueDuration, cue.progress ?? 0, position);
            }
        }

        public bool UsesUnityPhysicsAuthority()
        {
            if (presentationRoot == null) return false;
            if (presentationRoot.GetComponentInChildren<Rigidbody>(true) != null) return true;
            foreach (var collider in presentationRoot.GetComponentsInChildren<Collider>(true))
            {
                if (collider != null && collider.enabled) return true;
            }
            return false;
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

        private void EnsureRoot()
        {
            if (presentationRoot != null) return;
            var root = new GameObject("RODOH Action Bodies");
            root.transform.SetParent(transform, false);
            presentationRoot = root.transform;
        }

        private void ResetActors()
        {
            foreach (var actor in _actors.Values)
            {
                if (actor == null) continue;
                if (Application.isPlaying) Destroy(actor.gameObject);
                else DestroyImmediate(actor.gameObject);
            }
            _actors.Clear();
            _player = null;
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
            var binding = instance.GetComponent<ActionActorBinding>();
            var visualRoot = binding == null ? instance.transform : binding.VisualRoot;
            if (binding == null) binding = instance.AddComponent<ActionActorBinding>();
            binding.Configure(id, animator, visualRoot);
            return binding;
        }

        private void ApplyActor(ActionActorBinding actor, int x, int y, int facingX, int facingY, int mode, int modeTick, int health, bool active, bool telegraph)
        {
            if (actor == null) return;
            actor.gameObject.SetActive(active);
            actor.transform.localPosition = new Vector3(x * unityUnitsPerActionUnit, 0f, y * unityUnitsPerActionUnit);
            var direction = new Vector3(facingX, 0f, facingY);
            if (direction.sqrMagnitude > 0f) actor.transform.localRotation = Quaternion.LookRotation(direction.normalized, Vector3.up);
            var animator = actor.Animator;
            if (animator != null)
            {
                animator.SetInteger(Mode, mode);
                animator.SetInteger(ModeTick, modeTick);
                animator.SetInteger(Health, health);
                animator.SetBool(Active, active);
            }
            actor.SetTelegraph(telegraph, _telegraphMaterial);
        }

        private void CreateNeutralMaterials()
        {
            if (_neutralPlayerMaterial == null) _neutralPlayerMaterial = CreateMaterial("RODOH Neutral Player", new Color(0.22f, 0.72f, 0.85f));
            if (_neutralEnemyMaterial == null) _neutralEnemyMaterial = CreateMaterial("RODOH Neutral Enemy", new Color(0.62f, 0.45f, 0.82f));
            if (_telegraphMaterial == null) _telegraphMaterial = CreateMaterial("RODOH Telegraph", new Color(1f, 0.34f, 0.12f));
        }

        private static Material CreateMaterial(string name, Color color)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (shader == null) return null;
            var material = new Material(shader) { name = name, color = color };
            return material;
        }

        private static float NeutralEnemyScale(string kit)
        {
            if (kit == "breaker") return 1.4f;
            if (kit == "swarm") return 0.65f;
            if (kit == "hexer") return 1.1f;
            return 0.9f;
        }

        private static void Trigger(Animator animator, int parameter)
        {
            if (animator != null) animator.SetTrigger(parameter);
        }

        private static void SetInteger(Animator animator, int parameter, int value)
        {
            if (animator != null) animator.SetInteger(parameter, value);
        }

        private static void SetBool(Animator animator, int parameter, bool value)
        {
            if (animator != null) animator.SetBool(parameter, value);
        }
    }
}
