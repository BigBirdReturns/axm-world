using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Materializes the project-owned UNDERDRAIN 2.5D presentation pack from seven
    /// separately prepared transparent PNG products. The batch creates presentation
    /// only: sprites, materials, transform animation, two AnimatorControllers, seven
    /// core prefabs, seven feedback prefabs, seven deterministic WAV files, and one
    /// review scene. Arc remains the sole action and outcome authority. Named approval
    /// remains a later human-owned transaction.
    /// </summary>
    public static class ActionUnderdrainRepresentationMaterializerBatch
    {
        private const string SourceFormat = "rodoh-underdrain-resolved-representation-source/1";
        private const string ReceiptFormat = "rodoh-underdrain-representation-materialization/1";
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string RequiredUnity = "6000.0.66f2";
        private const string DefaultAssetRoot = "Assets/AXM/Underdrain/Production";

        private static readonly string[] RequiredRoles =
        {
            "player:rhea-venn",
            "enemy:skirmisher",
            "enemy:duelist",
            "enemy:swarm",
            "enemy:hexer",
            "enemy:breaker",
            "arena:pump-seven",
        };

        private static readonly string[] ControllerParameters =
        {
            "AXM_Mode",
            "AXM_ModeTick",
            "AXM_Health",
            "AXM_Active",
            "AXM_Hit",
            "AXM_Parry",
            "AXM_Dodge",
            "AXM_Defeat",
            "AXM_Objective",
            "AXM_Cue",
            "AXM_CueCode",
            "AXM_CueDuration",
            "AXM_DefenseWindow",
            "AXM_WorkWindow",
        };

        [Serializable]
        private sealed class ResolvedSource
        {
            public string format;
            public string productId;
            public string themeId;
            public string unityVersion;
            public string extractionReceipt;
            public string extractionReceiptSha256;
            public SourceAsset[] assets = Array.Empty<SourceAsset>();
        }

        [Serializable]
        private sealed class SourceAsset
        {
            public string assetId;
            public string role;
            public string fileName;
            public string sha256;
            public float pixelsPerUnit = 256f;
            public float displayScale = 1f;
            public float pivotX = 0.5f;
            public float pivotY = 0.08f;
        }

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
        private sealed class PlayerProductProfile
        {
            public string format;
            public string productId;
            public string themeId;
            public AssetRequirement player;
            public EnemyRequirement[] enemies = Array.Empty<EnemyRequirement>();
            public AssetRequirement arena;
            public string[] forbiddenAssetRoots = Array.Empty<string>();
        }

        [Serializable]
        private sealed class SourceAssetReceipt
        {
            public string assetId;
            public string role;
            public string sourceFile;
            public string sourceSha256;
            public string importedPng;
            public string importedPngSha256;
            public string importedPngMetaSha256;
            public string importedPngGuid;
            public float pixelsPerUnit;
            public float displayScale;
        }

        [Serializable]
        private sealed class CoreAssetReceipt
        {
            public string assetId;
            public string role;
            public string prefabPath;
            public string prefabGuid;
            public string visualSourceSha256;
            public string dependencyClosureSha256;
            public int dependencyCount;
            public bool arenaCollisionSurface;
        }

        [Serializable]
        private sealed class Receipt
        {
            public string format = ReceiptFormat;
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string productId;
            public string themeId;
            public string assetRoot;
            public string sourceManifest;
            public string sourceManifestSha256;
            public string sourceRoot;
            public string extractionReceipt;
            public string extractionReceiptSha256;
            public SourceAssetReceipt[] sources = Array.Empty<SourceAssetReceipt>();
            public CoreAssetReceipt[] coreAssets = Array.Empty<CoreAssetReceipt>();
            public string[] topLevelAssets = Array.Empty<string>();
            public string[] motionClips = Array.Empty<string>();
            public string playerController;
            public string enemyController;
            public string[] controllerParameters = Array.Empty<string>();
            public string[] feedbackPrefabs = Array.Empty<string>();
            public string[] audioClips = Array.Empty<string>();
            public string reviewScene;
            public int productionAssetCount;
            public int declaredBindingCount;
            public int uniqueDeclaredAssetCount;
            public string declaredBindingClosureSha256;
            public int actorColliderCount;
            public int activeRigidBodyCount;
            public bool arenaCameraCollisionSurface;
            public bool stableGuidCustody;
            public bool generatedPrimitive;
            public bool gameplayAuthority;
            public bool approvalIssued;
            public string productAcceptance = "not-issued";
            public string authority = "presentation materialization only; Arc replay remains action and outcome authority";
            public string error;
        }

        private sealed class MaterializedSource
        {
            public SourceAsset source;
            public string sourcePath;
            public string importedPath;
            public Sprite sprite;
            public Material material;
        }

        private sealed class ControllerState
        {
            public string name;
            public int mode;
            public AnimationClip clip;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "underdrain-representation", "output"));
            var receipt = new Receipt();
            try
            {
                var sourceManifestPath = Path.GetFullPath(GetRequiredArgument("-sourceManifest"));
                var sourceRoot = Path.GetFullPath(GetRequiredArgument("-sourceRoot"));
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var profilePath = Path.GetFullPath(GetRequiredArgument("-productProfile"));
                var assetRoot = NormalizeAssetRoot(GetArgument("-assetRoot") ?? DefaultAssetRoot);
                if (Application.unityVersion != RequiredUnity) throw new InvalidOperationException("UNDERDRAIN representation materialization requires Unity " + RequiredUnity + ", observed " + Application.unityVersion + ".");
                foreach (var path in new[] { sourceManifestPath, presentationPath, profilePath }) if (!File.Exists(path)) throw new FileNotFoundException("Representation materialization input is absent.", path);
                if (!Directory.Exists(sourceRoot)) throw new DirectoryNotFoundException("Representation source root is absent: " + sourceRoot);

                var source = JsonUtility.FromJson<ResolvedSource>(File.ReadAllText(sourceManifestPath));
                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                var profile = JsonUtility.FromJson<PlayerProductProfile>(File.ReadAllText(profilePath));
                ValidateInputs(source, presentation, profile, sourceRoot, assetRoot);
                RefuseApprovedRepresentation(presentation);

                EnsureFolders(assetRoot,
                    assetRoot + "/Sources",
                    assetRoot + "/Materials",
                    assetRoot + "/Animation",
                    assetRoot + "/Animation/Clips",
                    assetRoot + "/Characters",
                    assetRoot + "/Enemies",
                    assetRoot + "/Environments",
                    assetRoot + "/Feedback",
                    assetRoot + "/Audio",
                    assetRoot + "/Review");

                var sourceByRole = new Dictionary<string, MaterializedSource>(StringComparer.Ordinal);
                var sourceReceipts = new List<SourceAssetReceipt>();
                foreach (var value in source.assets.OrderBy(item => item.role, StringComparer.Ordinal))
                {
                    var materialized = ImportSource(value, sourceRoot, assetRoot + "/Sources", assetRoot + "/Materials");
                    sourceByRole.Add(value.role, materialized);
                    sourceReceipts.Add(SourceReceipt(materialized));
                }

                var motionPaths = BuildMotionKit(assetRoot + "/Animation/Clips");
                var clips = motionPaths.Select(path => RequireAsset<AnimationClip>(path, "UNDERDRAIN motion clip")).ToArray();
                var playerControllerPath = assetRoot + "/Animation/UnderdrainAction.controller";
                var enemyControllerPath = assetRoot + "/Animation/UnderdrainEnemy.controller";
                var playerController = BuildController(playerControllerPath, new[]
                {
                    State("Idle", 0, clips[0]),
                    State("Light", 1, clips[2]),
                    State("Heavy", 2, clips[3]),
                    State("Dodge", 3, clips[4]),
                    State("Parry", 4, clips[5]),
                    State("Stagger", 5, clips[6]),
                    State("Defeat", 6, clips[7]),
                });
                var enemyController = BuildController(enemyControllerPath, new[]
                {
                    State("Approach", 0, clips[1]),
                    State("Telegraph", 1, clips[5]),
                    State("Active", 2, clips[2]),
                    State("Recover", 3, clips[0]),
                    State("Stagger", 4, clips[6]),
                    State("Defeat", 5, clips[7]),
                });

                RefuseApprovedPrefab(presentation.player.bodyPrefab);
                BuildActorPrefab(presentation.player.bodyPrefab, "player", sourceByRole["player:rhea-venn"], playerController);
                foreach (var enemy in presentation.enemies)
                {
                    var role = "enemy:" + enemy.kit;
                    RefuseApprovedPrefab(enemy.bodyPrefab);
                    BuildActorPrefab(enemy.bodyPrefab, enemy.kit, sourceByRole[role], enemyController);
                }
                RefuseApprovedPrefab(presentation.arena.recipe);
                BuildArenaPrefab(presentation.arena.recipe, sourceByRole["arena:pump-seven"]);

                var pulseSpritePath = BuildPulseSprite(assetRoot + "/Sources/FeedbackPulse.png");
                var pulseSprite = RequireAsset<Sprite>(pulseSpritePath, "UNDERDRAIN feedback pulse sprite");
                var pulseMaterial = BuildMaterial(assetRoot + "/Materials/FeedbackPulse.mat", pulseSprite);
                var feedbackPrefabs = BuildFeedbackPrefabs(presentation, pulseSprite, pulseMaterial);
                var audioClips = BuildAudioClips(presentation);
                var reviewScene = BuildReviewScene(assetRoot + "/Review/UnderdrainRepresentationReview.unity", presentation);

                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);

                var closure = ActionProductionAssetDigest.ComputeDeclaredBindingClosure(presentation, profile.forbiddenAssetRoots);
                var coreReceipts = new List<CoreAssetReceipt>
                {
                    CoreReceipt(profile.player, presentation.player.bodyPrefab, false, profile.forbiddenAssetRoots),
                };
                foreach (var requirement in profile.enemies)
                {
                    var enemy = presentation.Enemy(requirement.kit) ?? throw new InvalidOperationException("Authored enemy presentation is absent: " + requirement.kit + ".");
                    coreReceipts.Add(CoreReceipt(requirement, enemy.bodyPrefab, false, profile.forbiddenAssetRoots));
                }
                coreReceipts.Add(CoreReceipt(profile.arena, presentation.arena.recipe, true, profile.forbiddenAssetRoots));

                var actorColliderCount = CountActorColliders(presentation);
                var activeRigidBodies = CountActiveRigidBodies(presentation);
                var arenaCollision = HasArenaCollision(presentation.arena.recipe);
                if (actorColliderCount != 0) throw new InvalidOperationException("Materialized actor prefabs contain enabled colliders.");
                if (activeRigidBodies != 0) throw new InvalidOperationException("Materialized representation contains active rigid-body authority.");
                if (!arenaCollision) throw new InvalidOperationException("Materialized Pump Seven arena lacks a static camera-collision surface.");
                if (coreReceipts.Count != 7 || closure.declaredBindingCount != 27 || closure.uniqueDeclaredAssetCount != 23) throw new InvalidOperationException("Materialized representation does not satisfy the seven-asset, 27-binding, 23-file floor.");
                if (feedbackPrefabs.Length != 7 || audioClips.Length != 7) throw new InvalidOperationException("Materialized feedback or audio floor is incomplete.");

                receipt.productId = source.productId;
                receipt.themeId = source.themeId;
                receipt.assetRoot = assetRoot;
                receipt.sourceManifest = sourceManifestPath;
                receipt.sourceManifestSha256 = Sha256File(sourceManifestPath);
                receipt.sourceRoot = sourceRoot;
                receipt.extractionReceipt = source.extractionReceipt;
                receipt.extractionReceiptSha256 = source.extractionReceiptSha256;
                receipt.sources = sourceReceipts.ToArray();
                receipt.coreAssets = coreReceipts.ToArray();
                receipt.topLevelAssets = closure.bindings.Select(value => value.assetPath).Distinct(StringComparer.Ordinal).OrderBy(value => value, StringComparer.Ordinal).ToArray();
                receipt.motionClips = motionPaths;
                receipt.playerController = playerControllerPath;
                receipt.enemyController = enemyControllerPath;
                receipt.controllerParameters = ControllerParameters;
                receipt.feedbackPrefabs = feedbackPrefabs;
                receipt.audioClips = audioClips;
                receipt.reviewScene = reviewScene;
                receipt.productionAssetCount = coreReceipts.Count;
                receipt.declaredBindingCount = closure.declaredBindingCount;
                receipt.uniqueDeclaredAssetCount = closure.uniqueDeclaredAssetCount;
                receipt.declaredBindingClosureSha256 = closure.declaredBindingClosureSha256;
                receipt.actorColliderCount = actorColliderCount;
                receipt.activeRigidBodyCount = activeRigidBodies;
                receipt.arenaCameraCollisionSurface = arenaCollision;
                receipt.stableGuidCustody = sourceReceipts.All(value => IsGuid(value.importedPngGuid)) && coreReceipts.All(value => IsGuid(value.prefabGuid));
                receipt.generatedPrimitive = false;
                receipt.gameplayAuthority = false;
                receipt.approvalIssued = false;
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "underdrain-representation-materialization.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("UNDERDRAIN representation materialization passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "underdrain-representation-materialization.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling materialization failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static void ValidateInputs(ResolvedSource source, ActionPresentationManifest presentation, PlayerProductProfile profile, string sourceRoot, string assetRoot)
        {
            if (source == null || source.format != SourceFormat) throw new InvalidOperationException("Resolved UNDERDRAIN representation source format is unsupported.");
            if (source.unityVersion != RequiredUnity) throw new InvalidOperationException("Resolved representation source names the wrong Unity version.");
            if (profile == null || profile.format != ProfileFormat) throw new InvalidOperationException("Player-product profile format is unsupported.");
            if (presentation == null || presentation.format != ActionPresentationManifest.Format) throw new InvalidOperationException("Authored presentation manifest format is unsupported.");
            if (source.productId != profile.productId || source.themeId != profile.themeId || source.themeId != presentation.themeId) throw new InvalidOperationException("Representation source, product profile, and presentation theme identities differ.");
            if (source.assets == null || source.assets.Length != 7) throw new InvalidOperationException("Resolved representation source must contain exactly seven core products.");
            if (!string.IsNullOrWhiteSpace(source.extractionReceipt))
            {
                var receiptPath = Path.GetFullPath(Path.IsPathRooted(source.extractionReceipt) ? source.extractionReceipt : Path.Combine(sourceRoot, source.extractionReceipt));
                if (!File.Exists(receiptPath)) throw new FileNotFoundException("Cited Shine extraction receipt is absent.", receiptPath);
                if (!IsSha(source.extractionReceiptSha256) || Sha256File(receiptPath) != source.extractionReceiptSha256) throw new InvalidOperationException("Cited Shine extraction receipt digest differs.");
            }
            var roles = new HashSet<string>(StringComparer.Ordinal);
            var ids = new HashSet<string>(StringComparer.Ordinal);
            var sourceDigests = new HashSet<string>(StringComparer.Ordinal);
            foreach (var asset in source.assets)
            {
                if (asset == null || string.IsNullOrWhiteSpace(asset.assetId) || string.IsNullOrWhiteSpace(asset.role) || string.IsNullOrWhiteSpace(asset.fileName)) throw new InvalidOperationException("Resolved representation source entry is incomplete.");
                if (!roles.Add(asset.role)) throw new InvalidOperationException("Resolved representation source repeats role " + asset.role + ".");
                if (!ids.Add(asset.assetId)) throw new InvalidOperationException("Resolved representation source repeats asset id " + asset.assetId + ".");
                if (!RequiredRoles.Contains(asset.role, StringComparer.Ordinal)) throw new InvalidOperationException("Resolved representation source contains unknown role " + asset.role + ".");
                if (!IsSha(asset.sha256)) throw new InvalidOperationException("Resolved representation source SHA-256 is malformed for " + asset.role + ".");
                if (!sourceDigests.Add(asset.sha256)) throw new InvalidOperationException("Distinct UNDERDRAIN production roles may not share prepared PNG bytes: " + asset.sha256 + ".");
                if (!asset.fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Resolved representation source must use prepared PNG products: " + asset.fileName + ".");
                if (asset.pixelsPerUnit <= 0f || asset.displayScale <= 0f || asset.pivotX < 0f || asset.pivotX > 1f || asset.pivotY < 0f || asset.pivotY > 1f) throw new InvalidOperationException("Resolved representation import settings are invalid for " + asset.role + ".");
                var path = Path.GetFullPath(Path.Combine(sourceRoot, asset.fileName));
                if (!IsPathWithinRoot(sourceRoot, path)) throw new InvalidOperationException("Resolved representation source escapes its source root: " + asset.fileName + ".");
                if (!File.Exists(path) || Sha256File(path) != asset.sha256) throw new InvalidOperationException("Resolved representation source file is absent or stale: " + asset.fileName + ".");
            }
            if (!roles.SetEquals(RequiredRoles)) throw new InvalidOperationException("Resolved representation source does not cover the exact seven-role floor.");
            var requirements = new List<AssetRequirement> { profile.player, profile.arena };
            requirements.AddRange(profile.enemies);
            var sourceById = source.assets.ToDictionary(value => value.assetId, value => value, StringComparer.Ordinal);
            foreach (var requirement in requirements)
            {
                if (requirement == null || !sourceById.TryGetValue(requirement.assetId, out var resolved)) throw new InvalidOperationException("Resolved representation source is missing product asset id " + requirement?.assetId + ".");
                if (resolved.role != requirement.role) throw new InvalidOperationException("Resolved representation source role differs for product asset id " + requirement.assetId + ".");
            }
            foreach (var root in profile.forbiddenAssetRoots ?? Array.Empty<string>())
            {
                var normalized = (root ?? string.Empty).Replace('\\', '/').TrimEnd('/');
                if (assetRoot == normalized || assetRoot.StartsWith(normalized + "/", StringComparison.Ordinal)) throw new InvalidOperationException("Representation materializer selected a forbidden generated root: " + assetRoot + ".");
            }
        }

        private static bool IsPathWithinRoot(string root, string candidate)
        {
            var normalizedRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var normalizedCandidate = Path.GetFullPath(candidate);
            return normalizedCandidate.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase);
        }

        private static MaterializedSource ImportSource(SourceAsset source, string sourceRoot, string importedRoot, string materialRoot)
        {
            var sourcePath = Path.GetFullPath(Path.Combine(sourceRoot, source.fileName));
            var stem = SafeName(source.assetId.Replace("underdrain:", string.Empty));
            var importedPath = importedRoot + "/" + stem + ".png";
            var importedFile = ProjectFilePath(importedPath);
            Directory.CreateDirectory(Path.GetDirectoryName(importedFile) ?? throw new InvalidOperationException("Imported source directory is unavailable."));
            File.Copy(sourcePath, importedFile, true);
            AssetDatabase.ImportAsset(importedPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var importer = AssetImporter.GetAtPath(importedPath) as TextureImporter;
            if (importer == null) throw new InvalidOperationException("Unity did not create a TextureImporter for " + importedPath + ".");
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = source.pixelsPerUnit;
            importer.spriteAlignment = (int)SpriteAlignment.Custom;
            importer.spritePivot = new Vector2(source.pivotX, source.pivotY);
            importer.alphaIsTransparency = true;
            importer.mipmapEnabled = false;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.filterMode = FilterMode.Bilinear;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.SaveAndReimport();
            var sprite = RequireAsset<Sprite>(importedPath, "prepared UNDERDRAIN role sprite");
            var material = BuildMaterial(materialRoot + "/" + stem + ".mat", sprite);
            return new MaterializedSource { source = source, sourcePath = sourcePath, importedPath = importedPath, sprite = sprite, material = material };
        }

        private static SourceAssetReceipt SourceReceipt(MaterializedSource source)
        {
            var metaPath = ProjectFilePath(source.importedPath) + ".meta";
            if (!File.Exists(metaPath)) throw new FileNotFoundException("Unity meta file is absent for imported representation source.", metaPath);
            return new SourceAssetReceipt
            {
                assetId = source.source.assetId,
                role = source.source.role,
                sourceFile = source.sourcePath,
                sourceSha256 = Sha256File(source.sourcePath),
                importedPng = source.importedPath,
                importedPngSha256 = Sha256File(ProjectFilePath(source.importedPath)),
                importedPngMetaSha256 = Sha256File(metaPath),
                importedPngGuid = AssetDatabase.AssetPathToGUID(source.importedPath),
                pixelsPerUnit = source.source.pixelsPerUnit,
                displayScale = source.source.displayScale,
            };
        }

        private static Material BuildMaterial(string path, Sprite sprite)
        {
            var shader = Shader.Find("Universal Render Pipeline/2D/Sprite-Unlit-Default") ?? Shader.Find("Sprites/Default");
            if (shader == null) throw new InvalidOperationException("Unity project contains no supported sprite shader.");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader) { name = Path.GetFileNameWithoutExtension(path) };
                AssetDatabase.CreateAsset(material, path);
            }
            material.shader = shader;
            material.mainTexture = sprite.texture;
            material.color = Color.white;
            material.enableInstancing = true;
            EditorUtility.SetDirty(material);
            return material;
        }

        private static string[] BuildMotionKit(string root)
        {
            return new[]
            {
                MotionClip(root + "/Idle.anim", "Idle", true, 0f, 2.5f, 0.025f, 1f, 1.015f),
                MotionClip(root + "/Move.anim", "Move", true, -2f, 3f, 0.075f, 0.98f, 1.03f),
                MotionClip(root + "/Light.anim", "Light", false, -8f, 22f, 0.04f, 0.96f, 1.08f),
                MotionClip(root + "/Heavy.anim", "Heavy", false, -14f, 38f, 0.02f, 0.92f, 1.16f),
                MotionClip(root + "/Dodge.anim", "Dodge", false, 0f, -18f, -0.14f, 1f, 0.84f),
                MotionClip(root + "/Parry.anim", "Parry", false, -6f, 14f, 0.06f, 0.96f, 1.10f),
                MotionClip(root + "/Stagger.anim", "Stagger", false, 12f, -18f, -0.05f, 1.08f, 0.90f),
                MotionClip(root + "/Defeat.anim", "Defeat", false, 0f, 88f, -0.30f, 1f, 0.82f),
            };
        }

        private static string MotionClip(string path, string label, bool loop, float startRotation, float endRotation, float verticalOffset, float startScale, float endScale)
        {
            var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            if (clip == null)
            {
                clip = new AnimationClip();
                AssetDatabase.CreateAsset(clip, path);
            }
            clip.name = "underdrain.presentation." + label.ToLowerInvariant();
            clip.frameRate = 30f;
            clip.wrapMode = loop ? WrapMode.Loop : WrapMode.Once;
            clip.ClearCurves();
            var duration = loop ? 0.8f : 0.46f;
            clip.SetCurve("Facing/Visual", typeof(Transform), "localEulerAnglesRaw.z", new AnimationCurve(
                new Keyframe(0f, startRotation),
                new Keyframe(duration * 0.5f, endRotation),
                new Keyframe(duration, loop ? startRotation : endRotation)));
            clip.SetCurve("Facing/Visual", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, 0f),
                new Keyframe(duration * 0.5f, verticalOffset),
                new Keyframe(duration, loop ? 0f : verticalOffset)));
            clip.SetCurve("Facing/Visual", typeof(Transform), "localScale.x", new AnimationCurve(new Keyframe(0f, startScale), new Keyframe(duration * 0.5f, endScale), new Keyframe(duration, loop ? startScale : endScale)));
            clip.SetCurve("Facing/Visual", typeof(Transform), "localScale.y", new AnimationCurve(new Keyframe(0f, startScale), new Keyframe(duration * 0.5f, endScale), new Keyframe(duration, loop ? startScale : endScale)));
            EditorUtility.SetDirty(clip);
            return path;
        }

        private static ControllerState State(string name, int mode, AnimationClip clip)
        {
            return new ControllerState { name = name, mode = mode, clip = clip };
        }

        private static AnimatorController BuildController(string path, ControllerState[] bindings)
        {
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
            if (controller == null) controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            if (controller == null) throw new InvalidOperationException("Unity refused to create UNDERDRAIN AnimatorController: " + path + ".");
            controller.parameters = Array.Empty<AnimatorControllerParameter>();
            AddControllerParameters(controller);
            var machine = controller.layers[0].stateMachine;
            foreach (var transition in machine.anyStateTransitions.ToArray()) machine.RemoveAnyStateTransition(transition);
            foreach (var child in machine.states.ToArray()) machine.RemoveState(child.state);
            foreach (var binding in bindings)
            {
                if (binding.clip == null) throw new InvalidOperationException("UNDERDRAIN controller state lacks a motion clip: " + binding.name + ".");
                var state = machine.AddState(binding.name);
                state.motion = binding.clip;
                state.writeDefaultValues = false;
                if (binding.mode == 0) machine.defaultState = state;
                var transition = machine.AddAnyStateTransition(state);
                transition.hasExitTime = false;
                transition.hasFixedDuration = true;
                transition.duration = 0.04f;
                transition.canTransitionToSelf = false;
                transition.AddCondition(AnimatorConditionMode.Equals, binding.mode, "AXM_Mode");
            }
            EditorUtility.SetDirty(controller);
            return controller;
        }

        private static void AddControllerParameters(AnimatorController controller)
        {
            controller.AddParameter("AXM_Mode", AnimatorControllerParameterType.Int);
            controller.AddParameter("AXM_ModeTick", AnimatorControllerParameterType.Int);
            controller.AddParameter("AXM_Health", AnimatorControllerParameterType.Int);
            controller.AddParameter("AXM_Active", AnimatorControllerParameterType.Bool);
            controller.AddParameter("AXM_Hit", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_Parry", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_Dodge", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_Defeat", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_Objective", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_Cue", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("AXM_CueCode", AnimatorControllerParameterType.Int);
            controller.AddParameter("AXM_CueDuration", AnimatorControllerParameterType.Int);
            controller.AddParameter("AXM_DefenseWindow", AnimatorControllerParameterType.Bool);
            controller.AddParameter("AXM_WorkWindow", AnimatorControllerParameterType.Bool);
        }

        private static void BuildActorPrefab(string path, string actorId, MaterializedSource source, RuntimeAnimatorController controller)
        {
            var root = new GameObject(Path.GetFileNameWithoutExtension(path));
            try
            {
                var facing = Child(root.transform, "Facing");
                facing.localScale = Vector3.one * source.source.displayScale;
                var visual = Child(facing, "Visual");
                var renderer = visual.gameObject.AddComponent<SpriteRenderer>();
                renderer.sprite = source.sprite;
                renderer.sharedMaterial = source.material;
                renderer.sortingOrder = 10;
                var animator = root.AddComponent<Animator>();
                animator.runtimeAnimatorController = controller;
                animator.applyRootMotion = false;
                animator.updateMode = AnimatorUpdateMode.Normal;
                var binding = root.AddComponent<ActionActorBinding>();
                binding.Configure(actorId, animator, visual);
                var billboard = root.AddComponent<ActionCameraFacingSprite>();
                billboard.Configure(facing, renderer, true, true);
                root.AddComponent<ActionPhysicsQuarantine>();
                SavePrefab(root, path);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static void BuildArenaPrefab(string path, MaterializedSource source)
        {
            var root = new GameObject("Pump Seven Arena");
            try
            {
                root.isStatic = true;
                var facing = Child(root.transform, "Facing");
                facing.localScale = Vector3.one * source.source.displayScale;
                var visual = Child(facing, "Visual");
                visual.localPosition = new Vector3(0f, 3.4f, 5.5f);
                var renderer = visual.gameObject.AddComponent<SpriteRenderer>();
                renderer.sprite = source.sprite;
                renderer.sharedMaterial = source.material;
                renderer.sortingOrder = -20;
                var billboard = root.AddComponent<ActionCameraFacingSprite>();
                billboard.Configure(facing, renderer, false, true);
                AddStaticCollider(root.transform, "Rear Camera Wall", new Vector3(0f, 2.8f, 5.9f), new Vector3(14f, 5.6f, 0.35f));
                AddStaticCollider(root.transform, "Left Camera Wall", new Vector3(-6.8f, 2.3f, 0f), new Vector3(0.35f, 4.6f, 12f));
                AddStaticCollider(root.transform, "Right Camera Wall", new Vector3(6.8f, 2.3f, 0f), new Vector3(0.35f, 4.6f, 12f));
                SavePrefab(root, path);
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static void AddStaticCollider(Transform parent, string name, Vector3 position, Vector3 size)
        {
            var value = new GameObject(name);
            value.isStatic = true;
            value.transform.SetParent(parent, false);
            value.transform.localPosition = position;
            var collider = value.AddComponent<BoxCollider>();
            collider.size = size;
            collider.isTrigger = false;
        }

        private static string BuildPulseSprite(string path)
        {
            var texture = new Texture2D(64, 64, TextureFormat.RGBA32, false);
            try
            {
                var pixels = new Color32[64 * 64];
                for (var y = 0; y < 64; y += 1)
                {
                    for (var x = 0; x < 64; x += 1)
                    {
                        var dx = (x + 0.5f - 32f) / 32f;
                        var dy = (y + 0.5f - 32f) / 32f;
                        var distance = Mathf.Sqrt(dx * dx + dy * dy);
                        var alpha = (byte)Mathf.RoundToInt(Mathf.Clamp01(1f - distance) * 255f);
                        pixels[y * 64 + x] = new Color32(255, 255, 255, alpha);
                    }
                }
                texture.SetPixels32(pixels);
                texture.Apply(false, false);
                File.WriteAllBytes(ProjectFilePath(path), texture.EncodeToPNG());
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(texture);
            }
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) throw new InvalidOperationException("Unity did not create a TextureImporter for feedback pulse.");
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = 64f;
            importer.spriteAlignment = (int)SpriteAlignment.Custom;
            importer.spritePivot = new Vector2(0.5f, 0.5f);
            importer.alphaIsTransparency = true;
            importer.mipmapEnabled = false;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.filterMode = FilterMode.Bilinear;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.SaveAndReimport();
            RequireAsset<Sprite>(path, "feedback pulse sprite");
            return path;
        }

        private static string[] BuildFeedbackPrefabs(ActionPresentationManifest presentation, Sprite pulseSprite, Material pulseMaterial)
        {
            var values = new List<string>();
            foreach (var feedback in presentation.feedback)
            {
                var path = feedback.vfxPrefab.Replace('\\', '/');
                var root = new GameObject(Path.GetFileNameWithoutExtension(path));
                try
                {
                    var renderer = root.AddComponent<SpriteRenderer>();
                    renderer.sprite = pulseSprite;
                    renderer.sharedMaterial = pulseMaterial;
                    renderer.sortingOrder = 100;
                    var colors = FeedbackColors(feedback.@event);
                    var pulse = root.AddComponent<ActionFeedbackPulse>();
                    pulse.Configure(renderer, FeedbackDuration(feedback.@event), 0.30f, FeedbackScale(feedback.@event), colors[0], colors[1]);
                    SavePrefab(root, path);
                    values.Add(path);
                }
                finally
                {
                    UnityEngine.Object.DestroyImmediate(root);
                }
            }
            return values.ToArray();
        }

        private static Color[] FeedbackColors(string eventName)
        {
            var color = eventName == "parry" ? new Color(0.30f, 0.95f, 1f, 0.95f)
                : eventName == "dodge" ? new Color(0.55f, 0.78f, 1f, 0.80f)
                : eventName == "player_hit" ? new Color(1f, 0.16f, 0.08f, 0.92f)
                : eventName == "objective_completed" ? new Color(0.35f, 1f, 0.55f, 0.90f)
                : eventName == "encounter_completed" ? new Color(1f, 0.78f, 0.20f, 0.95f)
                : new Color(1f, 0.86f, 0.32f, 0.90f);
            return new[] { color, new Color(color.r, color.g, color.b, 0f) };
        }

        private static float FeedbackDuration(string eventName)
        {
            return eventName == "encounter_completed" ? 0.75f : eventName == "objective_completed" ? 0.55f : 0.28f;
        }

        private static float FeedbackScale(string eventName)
        {
            return eventName == "encounter_completed" ? 2.2f : eventName == "objective_completed" ? 1.7f : 1.25f;
        }

        private static string[] BuildAudioClips(ActionPresentationManifest presentation)
        {
            var values = new List<string>();
            foreach (var feedback in presentation.feedback)
            {
                var path = feedback.audioClip.Replace('\\', '/');
                var seed = StableSeed(feedback.@event);
                var duration = feedback.@event == "encounter_completed" ? 0.75f : feedback.@event == "objective_completed" ? 0.48f : 0.22f;
                var frequency = feedback.@event == "parry" ? 820f
                    : feedback.@event == "dodge" ? 440f
                    : feedback.@event == "player_hit" ? 120f
                    : feedback.@event == "encounter_completed" ? 196f
                    : feedback.@event == "objective_completed" ? 294f
                    : 210f + seed % 220;
                WriteWave(ProjectFilePath(path), duration, frequency, seed, feedback.@event.Contains("hit", StringComparison.Ordinal) || feedback.@event == "player_action");
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                RequireAsset<AudioClip>(path, "UNDERDRAIN feedback audio clip");
                values.Add(path);
            }
            return values.ToArray();
        }

        private static void WriteWave(string path, float seconds, float frequency, int seed, bool noisy)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path) ?? throw new InvalidOperationException("Audio directory is unavailable."));
            const int sampleRate = 48000;
            const short channels = 1;
            const short bitsPerSample = 16;
            var sampleCount = Math.Max(1, (int)Math.Round(sampleRate * seconds));
            var dataSize = sampleCount * channels * bitsPerSample / 8;
            var random = new Random(seed);
            using (var stream = File.Create(path))
            using (var writer = new BinaryWriter(stream, Encoding.ASCII, false))
            {
                writer.Write(Encoding.ASCII.GetBytes("RIFF"));
                writer.Write(36 + dataSize);
                writer.Write(Encoding.ASCII.GetBytes("WAVE"));
                writer.Write(Encoding.ASCII.GetBytes("fmt "));
                writer.Write(16);
                writer.Write((short)1);
                writer.Write(channels);
                writer.Write(sampleRate);
                writer.Write(sampleRate * channels * bitsPerSample / 8);
                writer.Write((short)(channels * bitsPerSample / 8));
                writer.Write(bitsPerSample);
                writer.Write(Encoding.ASCII.GetBytes("data"));
                writer.Write(dataSize);
                for (var index = 0; index < sampleCount; index += 1)
                {
                    var time = index / (double)sampleRate;
                    var progress = index / (double)sampleCount;
                    var envelope = Math.Sin(Math.PI * Math.Min(1d, progress * 8d)) * Math.Pow(1d - progress, 1.8d);
                    var harmonic = Math.Sin(Math.PI * 2d * frequency * time) * 0.72d + Math.Sin(Math.PI * 4d * frequency * time) * 0.20d;
                    var noise = noisy ? (random.NextDouble() * 2d - 1d) * 0.22d : 0d;
                    var value = Math.Max(-1d, Math.Min(1d, (harmonic + noise) * envelope * 0.72d));
                    writer.Write((short)Math.Round(value * short.MaxValue));
                }
            }
        }

        private static string BuildReviewScene(string scenePath, ActionPresentationManifest presentation)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var arena = InstantiatePrefab(presentation.arena.recipe, scene, new Vector3(0f, 0f, 0f));
            arena.name = "Pump Seven Arena Review";
            var positions = new[]
            {
                new Vector3(-4.5f, 0f, 0f),
                new Vector3(-2.7f, 0f, 0f),
                new Vector3(-0.9f, 0f, 0f),
                new Vector3(0.9f, 0f, 0f),
                new Vector3(2.7f, 0f, 0f),
                new Vector3(4.5f, 0f, 0f),
            };
            InstantiatePrefab(presentation.player.bodyPrefab, scene, positions[0]).name = "Rhea Venn Review";
            for (var index = 0; index < presentation.enemies.Length; index += 1)
            {
                InstantiatePrefab(presentation.enemies[index].bodyPrefab, scene, positions[index + 1]).name = presentation.enemies[index].kit + " Review";
            }
            var cameraObject = new GameObject("UNDERDRAIN Review Camera");
            SceneManager.MoveGameObjectToScene(cameraObject, scene);
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            cameraObject.transform.position = new Vector3(0f, 3.1f, -14.5f);
            cameraObject.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 1.6f, 0f) - cameraObject.transform.position, Vector3.up);
            camera.fieldOfView = 48f;
            var lightObject = new GameObject("UNDERDRAIN Review Light");
            SceneManager.MoveGameObjectToScene(lightObject, scene);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
            light.color = new Color(0.72f, 0.86f, 0.78f, 1f);
            lightObject.transform.rotation = Quaternion.Euler(42f, -28f, 0f);
            if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the UNDERDRAIN representation review scene.");
            return scenePath;
        }

        private static GameObject InstantiatePrefab(string path, Scene scene, Vector3 position)
        {
            var prefab = RequireAsset<GameObject>(path, "UNDERDRAIN review prefab");
            var instance = PrefabUtility.InstantiatePrefab(prefab, scene) as GameObject;
            if (instance == null) throw new InvalidOperationException("Unity refused to instantiate review prefab: " + path + ".");
            instance.transform.position = position;
            return instance;
        }

        private static CoreAssetReceipt CoreReceipt(AssetRequirement requirement, string path, bool arena, string[] forbiddenRoots)
        {
            var prefab = RequireAsset<GameObject>(path, "UNDERDRAIN core production prefab");
            var closure = ActionProductionAssetDigest.ComputePrefabClosure(prefab, forbiddenRoots);
            return new CoreAssetReceipt
            {
                assetId = requirement.assetId,
                role = requirement.role,
                prefabPath = path,
                prefabGuid = AssetDatabase.AssetPathToGUID(path),
                visualSourceSha256 = closure.visualSourceSha256,
                dependencyClosureSha256 = closure.dependencyClosureSha256,
                dependencyCount = closure.dependencyCount,
                arenaCollisionSurface = arena && prefab.GetComponentsInChildren<Collider>(true).Any(value => value != null && value.enabled),
            };
        }

        private static int CountActorColliders(ActionPresentationManifest presentation)
        {
            var paths = new List<string> { presentation.player.bodyPrefab };
            paths.AddRange(presentation.enemies.Select(value => value.bodyPrefab));
            var count = 0;
            foreach (var path in paths)
            {
                var prefab = RequireAsset<GameObject>(path, "UNDERDRAIN actor prefab");
                count += prefab.GetComponentsInChildren<Collider>(true).Count(value => value != null && value.enabled);
                count += prefab.GetComponentsInChildren<CharacterController>(true).Count(value => value != null && value.enabled);
            }
            return count;
        }

        private static int CountActiveRigidBodies(ActionPresentationManifest presentation)
        {
            var paths = new List<string> { presentation.player.bodyPrefab, presentation.arena.recipe };
            paths.AddRange(presentation.enemies.Select(value => value.bodyPrefab));
            var count = 0;
            foreach (var path in paths)
            {
                var prefab = RequireAsset<GameObject>(path, "UNDERDRAIN representation prefab");
                count += prefab.GetComponentsInChildren<Rigidbody>(true).Count(value => value != null && (!value.isKinematic || value.detectCollisions || value.useGravity));
            }
            return count;
        }

        private static bool HasArenaCollision(string path)
        {
            var prefab = RequireAsset<GameObject>(path, "Pump Seven arena prefab");
            return prefab.GetComponentsInChildren<Collider>(true).Any(value => value != null && value.enabled);
        }

        private static void RefuseApprovedRepresentation(ActionPresentationManifest presentation)
        {
            if (presentation == null) throw new InvalidOperationException("Authored UNDERDRAIN presentation is absent.");
            RefuseApprovedPrefab(presentation.player.bodyPrefab);
            foreach (var enemy in presentation.enemies ?? Array.Empty<ActionEnemyPresentation>()) RefuseApprovedPrefab(enemy.bodyPrefab);
            RefuseApprovedPrefab(presentation.arena.recipe);
        }

        private static void RefuseApprovedPrefab(string path)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) return;
            foreach (var marker in prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true))
            {
                if (marker != null && marker.ProductionApproved) throw new InvalidOperationException("Representation materializer refuses to overwrite named-approved prefab: " + path + ".");
            }
        }

        private static void SavePrefab(GameObject root, string path)
        {
            var saved = PrefabUtility.SaveAsPrefabAsset(root, path);
            if (saved == null) throw new InvalidOperationException("Unity refused to save UNDERDRAIN prefab: " + path + ".");
        }

        private static Transform Child(Transform parent, string name)
        {
            var child = new GameObject(name);
            child.transform.SetParent(parent, false);
            return child.transform;
        }

        private static void EnsureFolders(params string[] paths)
        {
            foreach (var path in paths)
            {
                Directory.CreateDirectory(ProjectFilePath(path));
            }
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
        }

        private static string NormalizeAssetRoot(string value)
        {
            var path = (value ?? string.Empty).Replace('\\', '/').TrimEnd('/');
            if (!path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Representation asset root must remain under Assets/.");
            if (path != DefaultAssetRoot) throw new InvalidOperationException("UNDERDRAIN production representation must remain at " + DefaultAssetRoot + ".");
            return path;
        }

        private static string ProjectFilePath(string assetPath)
        {
            var normalized = (assetPath ?? string.Empty).Replace('\\', '/');
            if (!normalized.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Project asset path must remain under Assets/: " + normalized + ".");
            var projectRoot = Directory.GetParent(Application.dataPath)?.FullName;
            if (string.IsNullOrWhiteSpace(projectRoot)) throw new InvalidOperationException("Unity project root could not be resolved from Application.dataPath.");
            return Path.GetFullPath(Path.Combine(projectRoot, normalized.Replace('/', Path.DirectorySeparatorChar)));
        }

        private static T RequireAsset<T>(string path, string label) where T : UnityEngine.Object
        {
            var value = AssetDatabase.LoadAssetAtPath<T>(path);
            if (value == null) throw new InvalidOperationException(label + " did not import: " + path + ".");
            return value;
        }

        private static string SafeName(string value)
        {
            var builder = new StringBuilder();
            foreach (var character in value ?? string.Empty)
            {
                if (char.IsLetterOrDigit(character)) builder.Append(character);
                else if (builder.Length > 0 && builder[builder.Length - 1] != '-') builder.Append('-');
            }
            var result = builder.ToString().Trim('-');
            if (string.IsNullOrWhiteSpace(result)) throw new InvalidOperationException("Representation source id cannot form a safe asset name.");
            return result;
        }

        private static int StableSeed(string value)
        {
            unchecked
            {
                var hash = 17;
                foreach (var character in value ?? string.Empty) hash = hash * 31 + character;
                return hash;
            }
        }

        private static bool IsSha(string value)
        {
            return !string.IsNullOrWhiteSpace(value) && value.Length == 64 && value.All(character => (character >= '0' && character <= '9') || (character >= 'a' && character <= 'f'));
        }

        private static bool IsGuid(string value)
        {
            return !string.IsNullOrWhiteSpace(value) && value.Length == 32 && value.All(character => (character >= '0' && character <= '9') || (character >= 'a' && character <= 'f'));
        }

        private static string Sha256File(string path)
        {
            using (var stream = File.OpenRead(path))
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", string.Empty).ToLowerInvariant();
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
    }
}
