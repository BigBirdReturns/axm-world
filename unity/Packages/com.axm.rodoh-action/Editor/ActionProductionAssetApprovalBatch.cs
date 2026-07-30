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
    /// Records a named presentation-asset approval assertion over the exact seven
    /// UNDERDRAIN production prefabs, their imported visual sources, their recursive
    /// project-owned dependency closures, and all 27 top-level manifest bindings.
    /// This is the only batch permitted to set ProductionApproved. It preserves the
    /// supplied authority and attestation but does not authenticate either one and
    /// grants no action, physics, campaign, receipt, or player-product authority.
    /// </summary>
    public static class ActionProductionAssetApprovalBatch
    {
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string ReceiptFormat = "rodoh-action-production-asset-approval/2";

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
        private sealed class AssetApproval
        {
            public string assetId;
            public string role;
            public string prefabPath;
            public string prefabGuid;
            public string prefabSha256;
            public string prefabMetaSha256;
            public string sourceSha256;
            public string visualSourceSha256;
            public string[] visualSourcePaths = Array.Empty<string>();
            public string dependencyClosureSha256;
            public ActionProductionAssetDigest.DependencyRecord[] dependencyRecords = Array.Empty<ActionProductionAssetDigest.DependencyRecord>();
            public int dependencyCount;
            public string provenance;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvalAttestation;
            public string approvedAt;
            public bool approved;
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
            public string presentationManifestSha256;
            public string productProfile;
            public string productProfileSha256;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvalAttestation;
            public string approvedAt;
            public bool confirmedAllAssets;
            public AssetApproval[] assets = Array.Empty<AssetApproval>();
            public int assetCount;
            public string declaredBindingClosureSha256;
            public ActionProductionAssetDigest.DeclaredBindingRecord[] declaredBindings = Array.Empty<ActionProductionAssetDigest.DeclaredBindingRecord>();
            public int declaredBindingCount;
            public int uniqueDeclaredAssetCount;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public string approvalScope = "presentation assets and exact representation dependency closure only";
            public string authorityAuthentication = "not-performed";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string playerProductAcceptance = "not-issued";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-production-approval"));
            var receipt = new Receipt();
            try
            {
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var profilePath = Path.GetFullPath(GetRequiredArgument("-productProfile"));
                var approvalId = GetRequiredArgument("-approvalId");
                var approvalAuthorityId = GetRequiredArgument("-approvalAuthorityId");
                var approvalName = GetRequiredArgument("-approvalName");
                var approvalAttestation = GetRequiredArgument("-approvalAttestation");
                var confirmedAll = string.Equals(GetRequiredArgument("-confirmAllAssets"), "true", StringComparison.OrdinalIgnoreCase);
                if (!confirmedAll) throw new InvalidOperationException("Named production-asset approval requires explicit confirmation of all seven assets.");
                if (!File.Exists(presentationPath)) throw new FileNotFoundException("Authored action presentation manifest is absent.", presentationPath);
                if (!File.Exists(profilePath)) throw new FileNotFoundException("Action player-product profile is absent.", profilePath);

                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                var profile = JsonUtility.FromJson<PlayerProductProfile>(File.ReadAllText(profilePath));
                if (presentation == null || presentation.format != ActionPresentationManifest.Format) throw new InvalidOperationException("Authored action presentation format is unsupported.");
                if (profile == null || profile.format != ProfileFormat) throw new InvalidOperationException("Action player-product profile format is unsupported.");
                if (string.IsNullOrWhiteSpace(profile.productId)) throw new InvalidOperationException("Action player-product id is absent.");
                if (profile.player == null || profile.arena == null || profile.enemies == null || profile.enemies.Length != 5) throw new InvalidOperationException("Action production approval profile is incomplete.");
                if (presentation.player == null || presentation.arena == null || presentation.enemies == null || presentation.enemies.Length != 5) throw new InvalidOperationException("Authored action presentation asset inventory is incomplete.");

                var approvedAt = DateTime.UtcNow.ToString("O");
                var assets = new List<AssetApproval>
                {
                    Approve(presentation.player.bodyPrefab, profile.player, profile.forbiddenAssetRoots, false, profile.productId, approvalId, approvalAuthorityId, approvalName, approvalAttestation, approvedAt)
                };

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
                    assets.Add(Approve(enemy.bodyPrefab, required, profile.forbiddenAssetRoots, false, profile.productId, approvalId, approvalAuthorityId, approvalName, approvalAttestation, approvedAt));
                }
                assets.Add(Approve(presentation.arena.recipe, profile.arena, profile.forbiddenAssetRoots, true, profile.productId, approvalId, approvalAuthorityId, approvalName, approvalAttestation, approvedAt));
                if (assets.Select(value => value.assetId).Distinct(StringComparer.Ordinal).Count() != assets.Count) throw new InvalidOperationException("Production asset approval contains duplicate asset identities.");

                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                var declared = ActionProductionAssetDigest.ComputeDeclaredBindingClosure(presentation, profile.forbiddenAssetRoots);

                receipt.productId = profile.productId;
                receipt.presentationManifestId = presentation.manifestId;
                receipt.presentationManifest = presentationPath;
                receipt.presentationManifestSha256 = ActionProductionAssetDigest.Sha256File(presentationPath);
                receipt.productProfile = profilePath;
                receipt.productProfileSha256 = ActionProductionAssetDigest.Sha256File(profilePath);
                receipt.approvalId = approvalId;
                receipt.approvalAuthorityId = approvalAuthorityId;
                receipt.approvalName = approvalName;
                receipt.approvalAttestation = approvalAttestation;
                receipt.approvedAt = approvedAt;
                receipt.confirmedAllAssets = confirmedAll;
                receipt.assets = assets.ToArray();
                receipt.assetCount = assets.Count;
                receipt.declaredBindingClosureSha256 = declared.declaredBindingClosureSha256;
                receipt.declaredBindings = declared.bindings;
                receipt.declaredBindingCount = declared.declaredBindingCount;
                receipt.uniqueDeclaredAssetCount = declared.uniqueDeclaredAssetCount;
                receipt.productionApproved = assets.All(value => value.approved);
                receipt.generatedPrimitive = assets.Any(value => value.generatedPrimitive);
                receipt.activePhysicsAuthority = assets.Any(value => value.activePhysicsAuthority);
                if (receipt.assetCount != 7 || receipt.declaredBindingCount != 27 || receipt.uniqueDeclaredAssetCount != 23 || !receipt.productionApproved || receipt.generatedPrimitive || receipt.activePhysicsAuthority)
                {
                    throw new InvalidOperationException("Named production asset approval did not establish the complete seven-asset and 27-binding authored floor.");
                }

                receipt.status = "approved";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "production-asset-approval.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("RODOH named production asset approval recorded: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "production-asset-approval.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling approval failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static AssetApproval Approve(
            string prefabPath,
            AssetRequirement requirement,
            string[] forbiddenRoots,
            bool arena,
            string productId,
            string approvalId,
            string approvalAuthorityId,
            string approvalName,
            string approvalAttestation,
            string approvedAt)
        {
            if (requirement == null || string.IsNullOrWhiteSpace(requirement.assetId) || string.IsNullOrWhiteSpace(requirement.role)) throw new InvalidOperationException("Production asset requirement is incomplete.");
            var path = NormalizeAssetPath(prefabPath, "Production prefab " + requirement.assetId);
            ActionProductionAssetDigest.RefuseForbidden(path, forbiddenRoots);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab is absent or not a GameObject: " + path);
            var closure = ActionProductionAssetDigest.ComputePrefabClosure(prefab, forbiddenRoots);
            ValidatePhysics(prefab, arena, path, out var arenaCollisionSurface);
            var provenance = "product-profile:" + productId + ";visual-sources:" + string.Join("|", closure.visualSourcePaths) + ";dependency-closure:" + closure.dependencyClosureSha256;

            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var markers = root.GetComponentsInChildren<ActionProductionAssetMarker>(true);
                if (markers.Length > 1) throw new InvalidOperationException("Production prefab contains multiple asset markers: " + path);
                var marker = markers.Length == 1 ? markers[0] : root.AddComponent<ActionProductionAssetMarker>();
                marker.Configure(
                    requirement.assetId,
                    requirement.role,
                    closure.visualSourceSha256,
                    closure.dependencyClosureSha256,
                    closure.dependencyCount,
                    provenance,
                    approvalId,
                    approvalAuthorityId,
                    approvalName,
                    approvalAttestation,
                    approvedAt,
                    true,
                    false);
                EditorUtility.SetDirty(marker);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally
            {
                PrefabUtility.UnloadPrefabContents(root);
            }

            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab disappeared after approval: " + path);
            var admittedMarkers = prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true);
            if (admittedMarkers.Length != 1) throw new InvalidOperationException("Production prefab did not retain exactly one asset marker: " + path);
            var admitted = admittedMarkers[0];
            var errors = admitted.Validate(requirement.role);
            if (errors.Count > 0) throw new InvalidOperationException("Production asset marker did not validate after named approval: " + string.Join(" ", errors));
            if (admitted.AssetId != requirement.assetId || admitted.VisualSourceSha256 != closure.visualSourceSha256 || admitted.DependencyClosureSha256 != closure.dependencyClosureSha256 || admitted.DependencyCount != closure.dependencyCount || admitted.ApprovalId != approvalId || admitted.ApprovalAuthorityId != approvalAuthorityId)
            {
                throw new InvalidOperationException("Production asset marker identity, representation closure, or named approval changed during serialization: " + path);
            }
            var verified = ActionProductionAssetDigest.ComputePrefabClosure(prefab, forbiddenRoots);
            if (verified.visualSourceSha256 != closure.visualSourceSha256 || verified.dependencyClosureSha256 != closure.dependencyClosureSha256 || verified.dependencyCount != closure.dependencyCount)
            {
                throw new InvalidOperationException("Production representation closure changed during named approval: " + path);
            }

            return new AssetApproval
            {
                assetId = admitted.AssetId,
                role = admitted.Role,
                prefabPath = path,
                prefabGuid = ActionProductionAssetDigest.AssetGuid(path),
                prefabSha256 = ActionProductionAssetDigest.AssetSha256(path),
                prefabMetaSha256 = ActionProductionAssetDigest.AssetMetaSha256(path),
                sourceSha256 = verified.visualSourceSha256,
                visualSourceSha256 = verified.visualSourceSha256,
                visualSourcePaths = verified.visualSourcePaths,
                dependencyClosureSha256 = verified.dependencyClosureSha256,
                dependencyRecords = verified.dependencyRecords,
                dependencyCount = verified.dependencyCount,
                provenance = admitted.Provenance,
                approvalId = admitted.ApprovalId,
                approvalAuthorityId = admitted.ApprovalAuthorityId,
                approvalName = admitted.ApprovalName,
                approvalAttestation = admitted.ApprovalAttestation,
                approvedAt = admitted.ApprovedAt,
                approved = admitted.ProductionApproved,
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
