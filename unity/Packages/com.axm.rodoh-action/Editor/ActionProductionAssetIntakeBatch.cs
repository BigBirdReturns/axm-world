using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Admits real, project-owned UNDERDRAIN prefabs into the player-product path.
    /// The curated product profile supplies the expected asset identities and roles.
    /// Intake refuses generated roots, built-in primitives, absent imported sources,
    /// and active combat physics, then stamps each prefab with a digest over its exact
    /// imported visual source files. This batch changes presentation assets only.
    /// </summary>
    public static class ActionProductionAssetIntakeBatch
    {
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string ReceiptFormat = "rodoh-action-production-asset-intake/1";

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
            public string[] forbiddenAssetRoots = Array.Empty<string>();
            public AssetRequirement player;
            public EnemyRequirement[] enemies = Array.Empty<EnemyRequirement>();
            public AssetRequirement arena;
        }

        [Serializable]
        private sealed class AssetReceipt
        {
            public string assetId;
            public string role;
            public string prefabPath;
            public string prefabGuid;
            public string sourceSha256;
            public string[] visualSourcePaths = Array.Empty<string>();
            public string provenance;
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
            public string productId;
            public string presentationManifestId;
            public string presentationManifest;
            public string productProfile;
            public AssetReceipt[] assets = Array.Empty<AssetReceipt>();
            public int assetCount;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public string semanticAuthority = "presentation asset provenance only";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-production-intake"));
            var receipt = new Receipt();
            try
            {
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var profilePath = Path.GetFullPath(GetRequiredArgument("-productProfile"));
                if (!File.Exists(presentationPath)) throw new FileNotFoundException("Authored action presentation manifest is absent.", presentationPath);
                if (!File.Exists(profilePath)) throw new FileNotFoundException("Action player-product profile is absent.", profilePath);

                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                var profile = JsonUtility.FromJson<PlayerProductProfile>(File.ReadAllText(profilePath));
                if (presentation == null || presentation.format != ActionPresentationManifest.Format) throw new InvalidOperationException("Authored action presentation format is unsupported.");
                if (profile == null || profile.format != ProfileFormat) throw new InvalidOperationException("Action player-product profile format is unsupported.");
                if (string.IsNullOrWhiteSpace(profile.productId)) throw new InvalidOperationException("Action player-product id is absent.");
                if (profile.player == null || profile.arena == null || profile.enemies == null || profile.enemies.Length != 5) throw new InvalidOperationException("Action production intake profile is incomplete.");
                if (presentation.player == null || presentation.arena == null || presentation.enemies == null || presentation.enemies.Length != 5) throw new InvalidOperationException("Authored action presentation asset inventory is incomplete.");

                var assets = new List<AssetReceipt>();
                assets.Add(Intake(presentation.player.bodyPrefab, profile.player, profile.forbiddenAssetRoots, false, profile.productId));

                var presentationsByKit = new Dictionary<string, ActionEnemyPresentation>(StringComparer.Ordinal);
                foreach (var enemy in presentation.enemies)
                {
                    if (enemy == null || string.IsNullOrWhiteSpace(enemy.kit)) throw new InvalidOperationException("Authored enemy presentation kit is absent.");
                    if (presentationsByKit.ContainsKey(enemy.kit)) throw new InvalidOperationException("Authored enemy presentation kit is duplicated: " + enemy.kit + ".");
                    presentationsByKit.Add(enemy.kit, enemy);
                }
                foreach (var required in profile.enemies)
                {
                    if (required == null || string.IsNullOrWhiteSpace(required.kit)) throw new InvalidOperationException("Player-product enemy requirement is incomplete.");
                    if (!presentationsByKit.TryGetValue(required.kit, out var enemy)) throw new InvalidOperationException("Authored enemy presentation is absent: " + required.kit + ".");
                    assets.Add(Intake(enemy.bodyPrefab, required, profile.forbiddenAssetRoots, false, profile.productId));
                }

                assets.Add(Intake(presentation.arena.recipe, profile.arena, profile.forbiddenAssetRoots, true, profile.productId));
                if (assets.Select(value => value.assetId).Distinct(StringComparer.Ordinal).Count() != assets.Count) throw new InvalidOperationException("Production asset intake contains duplicate asset identities.");

                receipt.productId = profile.productId;
                receipt.presentationManifestId = presentation.manifestId;
                receipt.presentationManifest = presentationPath;
                receipt.productProfile = profilePath;
                receipt.assets = assets.ToArray();
                receipt.assetCount = assets.Count;
                receipt.productionApproved = assets.All(value => value.productionApproved);
                receipt.generatedPrimitive = assets.Any(value => value.generatedPrimitive);
                receipt.activePhysicsAuthority = assets.Any(value => value.activePhysicsAuthority);
                if (receipt.assetCount != 7 || !receipt.productionApproved || receipt.generatedPrimitive || receipt.activePhysicsAuthority)
                {
                    throw new InvalidOperationException("Production asset intake did not establish the complete seven-asset authored floor.");
                }

                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "production-asset-intake.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                Debug.Log("RODOH production asset intake passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "production-asset-intake.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling intake failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static AssetReceipt Intake(string prefabPath, AssetRequirement requirement, string[] forbiddenRoots, bool arena, string productId)
        {
            if (requirement == null || string.IsNullOrWhiteSpace(requirement.assetId) || string.IsNullOrWhiteSpace(requirement.role)) throw new InvalidOperationException("Production asset requirement is incomplete.");
            var path = NormalizeAssetPath(prefabPath, "Production prefab " + requirement.assetId);
            ActionProductionAssetDigest.RefuseForbidden(path, forbiddenRoots);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab is absent or not a GameObject: " + path);
            var digest = ActionProductionAssetDigest.Compute(prefab, forbiddenRoots, out var sourcePaths);
            ValidatePhysics(prefab, arena, path, out var arenaCollisionSurface);
            var provenance = "product-profile:" + productId + ";sources:" + string.Join("|", sourcePaths);

            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var markers = root.GetComponentsInChildren<ActionProductionAssetMarker>(true);
                if (markers.Length > 1) throw new InvalidOperationException("Production prefab contains multiple asset markers: " + path);
                var marker = markers.Length == 1 ? markers[0] : root.AddComponent<ActionProductionAssetMarker>();
                marker.Configure(requirement.assetId, requirement.role, digest, provenance, true, false);
                EditorUtility.SetDirty(marker);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally
            {
                PrefabUtility.UnloadPrefabContents(root);
            }

            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab disappeared after marker intake: " + path);
            var admittedMarkers = prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true);
            if (admittedMarkers.Length != 1) throw new InvalidOperationException("Production prefab did not retain exactly one asset marker: " + path);
            var admitted = admittedMarkers[0];
            var errors = admitted.Validate(requirement.role);
            if (errors.Count > 0) throw new InvalidOperationException("Production asset marker did not validate after intake: " + string.Join(" ", errors));
            if (admitted.AssetId != requirement.assetId || admitted.SourceSha256 != digest) throw new InvalidOperationException("Production asset marker identity or source digest changed during intake: " + path);
            var verifiedDigest = ActionProductionAssetDigest.Compute(prefab, forbiddenRoots, out var verifiedSources);
            if (verifiedDigest != digest) throw new InvalidOperationException("Production visual source digest changed during marker serialization: " + path);

            return new AssetReceipt
            {
                assetId = admitted.AssetId,
                role = admitted.Role,
                prefabPath = path,
                prefabGuid = AssetDatabase.AssetPathToGUID(path),
                sourceSha256 = verifiedDigest,
                visualSourcePaths = verifiedSources.ToArray(),
                provenance = admitted.Provenance,
                productionApproved = admitted.ProductionApproved,
                generatedPrimitive = admitted.GeneratedPrimitive,
                activePhysicsAuthority = false,
                arenaCollisionSurface = arenaCollisionSurface
            };
        }

        private static void ValidatePhysics(GameObject prefab, bool arena, string path, out bool arenaCollisionSurface)
        {
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
            arenaCollisionSurface = arena && prefab.GetComponentsInChildren<Collider>(true).Any(value => value != null && value.enabled);
            if (arena && !arenaCollisionSurface) throw new InvalidOperationException("Authored arena prefab contains no enabled static camera-collision surface: " + path);
        }

        private static string NormalizeAssetPath(string value, string label)
        {
            var path = (value ?? string.Empty).Replace('\\', '/');
            if (!path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException(label + " must remain under Assets/: " + path);
            return path;
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
