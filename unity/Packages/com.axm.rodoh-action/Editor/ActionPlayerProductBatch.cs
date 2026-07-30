using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Qualifies a serialized Unity player scene against one exact Arc action spec,
    /// one authored presentation manifest, and one player-product profile. It refuses
    /// generated primitive bodies, neutral fallbacks, diagnostic presentation,
    /// unmapped Arc cues, dynamic Unity combat physics, and absent device/session
    /// evidence surfaces. Passing this gate makes a scene build-eligible. It does not
    /// issue Windows-session, mechanic-comprehension, Quest, or final acceptance.
    /// </summary>
    public static class ActionPlayerProductBatch
    {
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string ReceiptFormat = "rodoh-unity-action-player-product-qualification/1";

        [Serializable]
        private class AssetRequirement
        {
            public string assetId;
            public string role;
        }

        [Serializable]
        private sealed class EnemyRequirement : AssetRequirement
        {
            public string kit;
        }

        [Serializable]
        private sealed class InputRequirement
        {
            public bool keyboardMouse;
            public bool gamepad;
            public bool runtimeRebinding;
        }

        [Serializable]
        private sealed class CameraRequirement
        {
            public bool playerFollow;
            public bool collision;
        }

        [Serializable]
        private sealed class PerformanceRequirement
        {
            public int targetFps;
            public float maximumP95FrameMilliseconds;
            public float maximumP99FrameMilliseconds;
        }

        [Serializable]
        private sealed class HumanEvidenceRequirement
        {
            public bool keyboardMouseSessionRequired;
            public bool gamepadSessionRequired;
            public bool independentComprehensionRequired;
            public bool runtimeMayIssueComprehensionReceipt;
        }

        [Serializable]
        private sealed class PlayerProductProfile
        {
            public string format;
            public string productId;
            public string challengeId;
            public string timingProfileId;
            public string themeId;
            public string presentationAdapterId;
            public bool allowDiagnosticPresentation;
            public bool allowPrimitiveFallback;
            public string[] forbiddenAssetRoots = Array.Empty<string>();
            public AssetRequirement player = new AssetRequirement();
            public EnemyRequirement[] enemies = Array.Empty<EnemyRequirement>();
            public AssetRequirement arena = new AssetRequirement();
            public string[] requiredCueIds = Array.Empty<string>();
            public InputRequirement input = new InputRequirement();
            public CameraRequirement camera = new CameraRequirement();
            public PerformanceRequirement performance = new PerformanceRequirement();
            public HumanEvidenceRequirement humanEvidence = new HumanEvidenceRequirement();
        }

        [Serializable]
        private sealed class SceneJobSource
        {
            public string actionSpecDigest;
            public string arcDigest;
            public string presentationManifestId;
        }

        [Serializable]
        private sealed class SceneJob
        {
            public string format;
            public string jobId;
            public SceneJobSource source;
            public string jobDigest;
        }

        [Serializable]
        private sealed class AssetReceipt
        {
            public string assetId;
            public string role;
            public string prefabPath;
            public string prefabGuid;
            public string prefabSha256;
            public string sourceSha256;
            public string provenance;
            public string[] visualSourcePaths = Array.Empty<string>();
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public bool arenaCollisionSurface;
        }

        [Serializable]
        private sealed class Receipt
        {
            public string format = ReceiptFormat;
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string worldCommit;
            public string arcCommit;
            public string productId;
            public string productProfile;
            public string productProfileSha256;
            public string scenePath;
            public string sceneSha256;
            public string sceneJob;
            public string sceneJobDigest;
            public string actionSpecDigest;
            public string arcDigest;
            public string challengeId;
            public string timingProfileId;
            public string presentationManifest;
            public string presentationManifestId;
            public string presentationManifestSha256;
            public string themeId;
            public string presentationAdapterId;
            public bool diagnosticPresentation;
            public bool primitiveFallback;
            public bool exactCueCoverage;
            public string[] requiredCueIds = Array.Empty<string>();
            public string[] productionAssetIds = Array.Empty<string>();
            public AssetReceipt[] assets = Array.Empty<AssetReceipt>();
            public bool playerFollowCamera;
            public bool cameraCollision;
            public int arenaCollisionSurfaces;
            public bool keyboardMouse;
            public bool gamepad;
            public bool runtimeRebinding;
            public string bindingProfileDigest;
            public bool playerSessionEvidence;
            public bool performanceRecorder;
            public int targetFps;
            public float maximumP95FrameMilliseconds;
            public float maximumP99FrameMilliseconds;
            public bool activePhysicsAuthority;
            public bool productIdentityInstalled;
            public string productIdentityQualification;
            public bool buildEligible;
            public string keyboardMouseSession = "open";
            public string gamepadSession = "open";
            public string independentComprehension = "open";
            public string productAcceptance = "not-issued";
            public string authority = "Arc replay remains action and outcome authority";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "underdrain-player-product", "output"));
            var receipt = new Receipt();
            try
            {
                var scenePath = AssetPath(GetRequiredArgument("-scenePath"), "Player-product scene");
                var sceneJobPath = Path.GetFullPath(GetRequiredArgument("-sceneJob"));
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var profilePath = Path.GetFullPath(GetRequiredArgument("-productProfile"));
                var worldCommit = GetRequiredArgument("-worldCommit");
                var arcCommit = GetRequiredArgument("-arcCommit");
                if (!Commit(worldCommit)) throw new InvalidOperationException("World commit identity is malformed.");
                if (!Commit(arcCommit)) throw new InvalidOperationException("Arc commit identity is malformed.");
                if (!File.Exists(sceneJobPath)) throw new FileNotFoundException("Unity scene job is absent.", sceneJobPath);
                if (!File.Exists(presentationPath)) throw new FileNotFoundException("Authored presentation manifest is absent.", presentationPath);
                if (!File.Exists(profilePath)) throw new FileNotFoundException("Player-product profile is absent.", profilePath);

                var sceneJob = JsonUtility.FromJson<SceneJob>(File.ReadAllText(sceneJobPath));
                var manifest = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                var profile = JsonUtility.FromJson<PlayerProductProfile>(File.ReadAllText(profilePath));
                ValidateProfile(profile);
                if (sceneJob == null || sceneJob.format != "rodoh-action-scene-job/1") throw new InvalidOperationException("Unity scene-job format is unsupported.");
                if (!Digest(sceneJob.jobDigest, "unityjob1_")) throw new InvalidOperationException("Unity scene-job digest is malformed.");
                if (manifest == null || manifest.format != ActionPresentationManifest.Format) throw new InvalidOperationException("Authored presentation manifest format is unsupported.");

                var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
                var runtime = FindExactlyOne<ActionRuntimeBehaviour>(scene);
                var production = FindExactlyOne<ActionProductionPresentation>(scene);
                var projectionAsset = runtime.ProjectionAsset;
                if (projectionAsset == null) throw new InvalidOperationException("Serialized action projection is absent from the player scene.");
                var spec = ActionBridgeJson.ParseSpec(projectionAsset.text);
                var manifestErrors = manifest.Validate(spec);
                if (manifestErrors.Count > 0) throw new InvalidOperationException("Authored presentation manifest is invalid: " + string.Join(" ", manifestErrors));

                if (profile.challengeId != spec.challengeId) throw new InvalidOperationException("Player-product challenge differs from the serialized Arc projection.");
                if (profile.timingProfileId != spec.timingProfileId) throw new InvalidOperationException("Player-product timing profile differs from the serialized Arc projection.");
                if (profile.themeId != manifest.themeId) throw new InvalidOperationException("Player-product theme differs from the authored presentation manifest.");
                if (sceneJob.source == null
                    || sceneJob.source.actionSpecDigest != spec.sourceSpecDigest
                    || sceneJob.source.arcDigest != spec.sourceArcDigest
                    || sceneJob.source.presentationManifestId != manifest.manifestId)
                {
                    throw new InvalidOperationException("Player-product scene job differs from the serialized Arc and presentation identities.");
                }
                if (runtime.ConfiguredPresentationComponent != production) throw new InvalidOperationException("Player scene does not serialize the selected production presentation adapter.");
                if (runtime.AllowsDiagnosticPresentation || runtime.UsesDiagnosticPresentation) throw new InvalidOperationException("Player scene permits diagnostic presentation.");
                if (runtime.PresentationAdapterId != profile.presentationAdapterId || profile.presentationAdapterId != "production.prefab/v1") throw new InvalidOperationException("Player scene is not bound to production.prefab/v1.");
                var primitive = runtime.GetComponent<ActionPrimitivePresentation>();
                if (primitive != null && primitive.enabled) throw new InvalidOperationException("Primitive diagnostic presentation remains enabled in the player scene.");
                if (production.PlayerNeutralFallback || profile.allowPrimitiveFallback) throw new InvalidOperationException("Player primitive fallback remains enabled.");
                var presentationErrors = production.ValidatePlayerProfile();
                if (presentationErrors.Count > 0) throw new InvalidOperationException("Production presentation is incomplete: " + string.Join(" ", presentationErrors));

                var assetReceipts = new List<AssetReceipt>();
                if (production.PlayerPrefab == null) throw new InvalidOperationException("Serialized authored player prefab is absent.");
                RequirePathEquals(AssetDatabase.GetAssetPath(production.PlayerPrefab), manifest.player.bodyPrefab, "Serialized player prefab");
                assetReceipts.Add(ValidateAsset(production.PlayerPrefab, profile.player, profile.forbiddenAssetRoots, false));

                var bindingByKit = new Dictionary<string, ActionEnemyPrefabBinding>(StringComparer.Ordinal);
                foreach (var binding in production.EnemyPrefabs)
                {
                    if (binding == null || string.IsNullOrWhiteSpace(binding.kit)) continue;
                    if (bindingByKit.ContainsKey(binding.kit)) throw new InvalidOperationException("Serialized production presentation contains duplicate enemy kit " + binding.kit + ".");
                    bindingByKit.Add(binding.kit, binding);
                }
                foreach (var required in profile.enemies)
                {
                    if (required == null || !bindingByKit.TryGetValue(required.kit, out var binding) || binding == null) throw new InvalidOperationException("Serialized authored enemy prefab is absent: " + required?.kit + ".");
                    if (binding.neutralFallback) throw new InvalidOperationException("Enemy primitive fallback remains enabled: " + required.kit + ".");
                    var manifestEnemy = manifest.Enemy(required.kit);
                    if (manifestEnemy == null) throw new InvalidOperationException("Authored manifest enemy is absent: " + required.kit + ".");
                    RequirePathEquals(AssetDatabase.GetAssetPath(binding.prefab), manifestEnemy.bodyPrefab, "Serialized enemy prefab " + required.kit);
                    assetReceipts.Add(ValidateAsset(binding.prefab, required, profile.forbiddenAssetRoots, false));
                }

                var arenaPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(AssetPath(manifest.arena.recipe, "Authored arena recipe"));
                if (arenaPrefab == null) throw new InvalidOperationException("Authored arena prefab is absent or not a GameObject: " + manifest.arena.recipe);
                var arenaReceipt = ValidateAsset(arenaPrefab, profile.arena, profile.forbiddenAssetRoots, true);
                assetReceipts.Add(arenaReceipt);

                var requiredCueIds = new HashSet<string>(profile.requiredCueIds ?? Array.Empty<string>(), StringComparer.Ordinal);
                if (!requiredCueIds.SetEquals(ActionCueContract.RequiredCueIds)) throw new InvalidOperationException("Player-product cue vocabulary differs from the exact Arc receiver contract.");
                foreach (var cueId in requiredCueIds) if (!production.SupportsCue(cueId)) throw new InvalidOperationException("Production presentation does not support required Arc cue " + cueId + ".");

                var bindings = FindExactlyOne<ActionInputBindings>(scene);
                var naturalInput = FindExactlyOne<ActionNaturalPlayerInput>(scene);
                var rebind = FindExactlyOne<ActionRebindOverlay>(scene);
                var combatCamera = FindExactlyOne<ActionCombatCamera>(scene);
                var cameraCollision = FindExactlyOne<ActionCameraCollision>(scene);
                var sessionEvidence = FindExactlyOne<ActionPlayerSessionEvidence>(scene);
                var performance = FindExactlyOne<ActionPerformanceRecorder>(scene);
                FindExactlyOne<ActionMinimalHud>(scene);
                if (profile.input == null || !profile.input.keyboardMouse || !profile.input.gamepad || !profile.input.runtimeRebinding) throw new InvalidOperationException("Player-product profile does not require the complete input plane.");
                if (!naturalInput.RebindingEnabled || naturalInput.Bindings != bindings || rebind == null) throw new InvalidOperationException("Player scene does not bind runtime input rebinding.");
                if (bindings.Profile == null || bindings.Profile.Validate().Count > 0) throw new InvalidOperationException("Player scene input-binding profile is invalid.");
                if (profile.camera == null || !profile.camera.playerFollow || !profile.camera.collision) throw new InvalidOperationException("Player-product profile does not require player-follow collision-safe camera behavior.");
                if (combatCamera.Mode != ActionCameraMode.PlayerFollow || !cameraCollision.CollisionEnabled) throw new InvalidOperationException("Player scene camera product is incomplete.");
                if (sessionEvidence == null || performance == null) throw new InvalidOperationException("Player scene lacks session or performance evidence.");

                var bodies = production.PresentationRoot;
                if (bodies == null) throw new InvalidOperationException("Production presentation root is absent.");
                var quarantine = bodies.GetComponent<ActionPhysicsQuarantine>();
                if (quarantine == null) throw new InvalidOperationException("Production body hierarchy lacks the physics-authority quarantine.");
                quarantine.ApplyHierarchy();
                var activePhysicsAuthority = quarantine.HasActivePhysicsAuthority() || production.UsesUnityPhysicsAuthority();
                if (activePhysicsAuthority) throw new InvalidOperationException("Player scene retains active Unity physics combat authority.");
                var arenaCollisionSurfaces = CountArenaCollisionSurfaces(scene, bodies);
                if (arenaCollisionSurfaces < 1) throw new InvalidOperationException("Authored arena exposes no static camera-collision surface.");

                var profileSha = Sha256File(profilePath);
                var manifestSha = Sha256File(presentationPath);
                var ids = assetReceipts.Select(value => value.assetId).OrderBy(value => value, StringComparer.Ordinal).ToArray();
                if (ids.Distinct(StringComparer.Ordinal).Count() != ids.Length) throw new InvalidOperationException("Production asset identities are not unique.");
                var identity = runtime.GetComponent<ActionPlayerProductIdentity>() ?? runtime.gameObject.AddComponent<ActionPlayerProductIdentity>();
                identity.Configure(
                    profile.productId,
                    profileSha,
                    worldCommit,
                    arcCommit,
                    spec.sourceSpecDigest,
                    spec.sourceArcDigest,
                    spec.challengeId,
                    spec.timingProfileId,
                    manifest.manifestId,
                    manifestSha,
                    runtime.PresentationAdapterId,
                    sceneJob.jobDigest,
                    ids);
                var identityErrors = identity.Validate();
                if (identityErrors.Count > 0) throw new InvalidOperationException("Player-product identity is invalid: " + string.Join(" ", identityErrors));
                EditorUtility.SetDirty(identity);
                EditorUtility.SetDirty(runtime.gameObject);
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the qualified player-product scene.");
                AssetDatabase.SaveAssets();

                receipt.worldCommit = worldCommit;
                receipt.arcCommit = arcCommit;
                receipt.productId = profile.productId;
                receipt.productProfile = profilePath;
                receipt.productProfileSha256 = profileSha;
                receipt.scenePath = scenePath;
                receipt.sceneSha256 = Sha256File(Path.GetFullPath(scenePath));
                receipt.sceneJob = sceneJobPath;
                receipt.sceneJobDigest = sceneJob.jobDigest;
                receipt.actionSpecDigest = spec.sourceSpecDigest;
                receipt.arcDigest = spec.sourceArcDigest;
                receipt.challengeId = spec.challengeId;
                receipt.timingProfileId = spec.timingProfileId;
                receipt.presentationManifest = presentationPath;
                receipt.presentationManifestId = manifest.manifestId;
                receipt.presentationManifestSha256 = manifestSha;
                receipt.themeId = manifest.themeId;
                receipt.presentationAdapterId = runtime.PresentationAdapterId;
                receipt.diagnosticPresentation = false;
                receipt.primitiveFallback = false;
                receipt.exactCueCoverage = true;
                receipt.requiredCueIds = requiredCueIds.OrderBy(value => value, StringComparer.Ordinal).ToArray();
                receipt.productionAssetIds = ids;
                receipt.assets = assetReceipts.OrderBy(value => value.assetId, StringComparer.Ordinal).ToArray();
                receipt.playerFollowCamera = true;
                receipt.cameraCollision = true;
                receipt.arenaCollisionSurfaces = arenaCollisionSurfaces;
                receipt.keyboardMouse = true;
                receipt.gamepad = true;
                receipt.runtimeRebinding = true;
                receipt.bindingProfileDigest = bindings.ProfileDigest;
                receipt.playerSessionEvidence = true;
                receipt.performanceRecorder = true;
                receipt.targetFps = profile.performance?.targetFps ?? 0;
                receipt.maximumP95FrameMilliseconds = profile.performance?.maximumP95FrameMilliseconds ?? 0f;
                receipt.maximumP99FrameMilliseconds = profile.performance?.maximumP99FrameMilliseconds ?? 0f;
                receipt.activePhysicsAuthority = false;
                receipt.productIdentityInstalled = true;
                receipt.productIdentityQualification = identity.Qualification;
                receipt.buildEligible = true;
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "player-product-qualification.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("RODOH Unity player-product qualification passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "player-product-qualification.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling import or player-product failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static AssetReceipt ValidateAsset(GameObject prefab, AssetRequirement requirement, string[] forbiddenRoots, bool arena)
        {
            if (prefab == null) throw new InvalidOperationException("Production prefab is absent for " + requirement?.role + ".");
            if (requirement == null || string.IsNullOrWhiteSpace(requirement.assetId) || string.IsNullOrWhiteSpace(requirement.role)) throw new InvalidOperationException("Player-product production asset requirement is incomplete.");
            var path = AssetPath(AssetDatabase.GetAssetPath(prefab), "Production prefab " + requirement.assetId);
            RefuseForbidden(path, forbiddenRoots);
            var markers = prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true);
            if (markers.Length != 1) throw new InvalidOperationException("Production prefab " + path + " contains " + markers.Length + " production markers; expected exactly one.");
            var marker = markers[0];
            var markerErrors = marker.Validate(requirement.role);
            if (markerErrors.Count > 0) throw new InvalidOperationException("Production asset " + requirement.assetId + " is invalid: " + string.Join(" ", markerErrors));
            if (marker.AssetId != requirement.assetId) throw new InvalidOperationException("Production asset id differs from the player-product profile: " + marker.AssetId + ".");

            var visualPaths = VisualSourcePaths(prefab, forbiddenRoots);
            if (visualPaths.Count == 0) throw new InvalidOperationException("Production prefab has no imported mesh or sprite source: " + path);
            var activePhysics = false;
            foreach (var body in prefab.GetComponentsInChildren<Rigidbody>(true))
            {
                if (body != null && (!body.isKinematic || body.detectCollisions || body.useGravity)) activePhysics = true;
            }
            if (!arena)
            {
                foreach (var collider in prefab.GetComponentsInChildren<Collider>(true)) if (collider != null && collider.enabled) activePhysics = true;
            }
            if (activePhysics) throw new InvalidOperationException("Production prefab retains active Unity physics authority: " + path);
            var collisionSurface = arena && prefab.GetComponentsInChildren<Collider>(true).Any(value => value != null && value.enabled);
            if (arena && !collisionSurface) throw new InvalidOperationException("Authored arena prefab contains no enabled static camera-collision surface: " + path);

            return new AssetReceipt
            {
                assetId = marker.AssetId,
                role = marker.Role,
                prefabPath = path,
                prefabGuid = AssetDatabase.AssetPathToGUID(path),
                prefabSha256 = Sha256File(Path.GetFullPath(path)),
                sourceSha256 = marker.SourceSha256,
                provenance = marker.Provenance,
                visualSourcePaths = visualPaths.OrderBy(value => value, StringComparer.Ordinal).ToArray(),
                productionApproved = marker.ProductionApproved,
                generatedPrimitive = marker.GeneratedPrimitive,
                activePhysicsAuthority = false,
                arenaCollisionSurface = collisionSurface
            };
        }

        private static List<string> VisualSourcePaths(GameObject prefab, string[] forbiddenRoots)
        {
            var values = new HashSet<string>(StringComparer.Ordinal);
            foreach (var filter in prefab.GetComponentsInChildren<MeshFilter>(true)) AddVisualPath(filter?.sharedMesh, values, forbiddenRoots);
            foreach (var renderer in prefab.GetComponentsInChildren<SkinnedMeshRenderer>(true)) AddVisualPath(renderer?.sharedMesh, values, forbiddenRoots);
            foreach (var renderer in prefab.GetComponentsInChildren<SpriteRenderer>(true)) AddVisualPath(renderer?.sprite, values, forbiddenRoots);
            return values.ToList();
        }

        private static void AddVisualPath(UnityEngine.Object asset, HashSet<string> values, string[] forbiddenRoots)
        {
            if (asset == null) return;
            var path = AssetDatabase.GetAssetPath(asset)?.Replace('\\', '/');
            if (string.IsNullOrWhiteSpace(path) || !path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Player product uses a built-in or untracked primitive visual: " + asset.name + ".");
            RefuseForbidden(path, forbiddenRoots);
            values.Add(path);
        }

        private static int CountArenaCollisionSurfaces(Scene scene, Transform bodies)
        {
            var count = 0;
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var collider in root.GetComponentsInChildren<Collider>(true))
                {
                    if (collider == null || !collider.enabled || collider.transform.IsChildOf(bodies)) continue;
                    var body = collider.GetComponentInParent<Rigidbody>();
                    if (body != null && (!body.isKinematic || body.detectCollisions || body.useGravity)) throw new InvalidOperationException("Authored arena collision surface retains dynamic physics authority: " + collider.name + ".");
                    count += 1;
                }
            }
            return count;
        }

        private static void ValidateProfile(PlayerProductProfile profile)
        {
            if (profile == null || profile.format != ProfileFormat) throw new InvalidOperationException("Player-product profile format is unsupported.");
            if (string.IsNullOrWhiteSpace(profile.productId)) throw new InvalidOperationException("Player-product id is absent.");
            if (string.IsNullOrWhiteSpace(profile.challengeId)) throw new InvalidOperationException("Player-product challenge id is absent.");
            if (string.IsNullOrWhiteSpace(profile.timingProfileId)) throw new InvalidOperationException("Player-product timing profile is absent.");
            if (string.IsNullOrWhiteSpace(profile.themeId)) throw new InvalidOperationException("Player-product theme is absent.");
            if (profile.presentationAdapterId != "production.prefab/v1") throw new InvalidOperationException("Player-product profile does not require production.prefab/v1.");
            if (profile.allowDiagnosticPresentation) throw new InvalidOperationException("Player-product profile permits diagnostic presentation.");
            if (profile.allowPrimitiveFallback) throw new InvalidOperationException("Player-product profile permits primitive fallback.");
            if (profile.player == null || profile.enemies == null || profile.enemies.Length != 5 || profile.arena == null) throw new InvalidOperationException("Player-product production role inventory is incomplete.");
            if (profile.performance == null || profile.performance.targetFps < 30 || profile.performance.maximumP95FrameMilliseconds <= 0f || profile.performance.maximumP99FrameMilliseconds <= 0f) throw new InvalidOperationException("Player-product performance thresholds are incomplete.");
            if (profile.humanEvidence == null
                || !profile.humanEvidence.keyboardMouseSessionRequired
                || !profile.humanEvidence.gamepadSessionRequired
                || !profile.humanEvidence.independentComprehensionRequired
                || profile.humanEvidence.runtimeMayIssueComprehensionReceipt)
            {
                throw new InvalidOperationException("Player-product human-evidence boundary is incomplete or grants runtime comprehension authority.");
            }
        }

        private static T FindExactlyOne<T>(Scene scene) where T : Component
        {
            T match = null;
            var count = 0;
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var component in root.GetComponentsInChildren<T>(true))
                {
                    match = component;
                    count += 1;
                }
            }
            if (count != 1 || match == null) throw new InvalidOperationException("Player-product scene contains " + count + " " + typeof(T).Name + " components; expected exactly one.");
            return match;
        }

        private static string AssetPath(string value, string label)
        {
            var path = (value ?? string.Empty).Replace('\\', '/');
            if (!path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException(label + " must remain under Assets/: " + path);
            return path;
        }

        private static void RequirePathEquals(string actual, string expected, string label)
        {
            var left = AssetPath(actual, label);
            var right = AssetPath(expected, label + " manifest binding");
            if (!string.Equals(left, right, StringComparison.Ordinal)) throw new InvalidOperationException(label + " differs from the authored presentation manifest: " + left + " != " + right + ".");
        }

        private static void RefuseForbidden(string path, string[] forbiddenRoots)
        {
            foreach (var raw in forbiddenRoots ?? Array.Empty<string>())
            {
                var root = (raw ?? string.Empty).Replace('\\', '/').TrimEnd('/');
                if (string.IsNullOrWhiteSpace(root)) continue;
                if (path == root || path.StartsWith(root + "/", StringComparison.Ordinal)) throw new InvalidOperationException("Player product uses forbidden generated primitive custody: " + path + ".");
            }
        }

        private static string GetRequiredArgument(string name)
        {
            var value = GetArgument(name);
            if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException("Missing required command-line argument " + name + ".");
            return value;
        }

        private static string GetArgument(string name)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length - 1; index += 1) if (arguments[index] == name) return arguments[index + 1];
            return null;
        }

        private static string Sha256File(string path)
        {
            using (var stream = File.OpenRead(path))
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", string.Empty).ToLowerInvariant();
            }
        }

        private static bool Commit(string value)
        {
            return Regex.IsMatch(value ?? string.Empty, "^[0-9a-f]{40}$");
        }

        private static bool Digest(string value, string prefix)
        {
            return Regex.IsMatch(value ?? string.Empty, "^" + Regex.Escape(prefix) + "[0-9a-f]{64}$");
        }
    }
}
