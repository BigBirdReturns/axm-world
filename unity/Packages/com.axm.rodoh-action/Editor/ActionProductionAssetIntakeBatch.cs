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
    /// Admits named-approved, project-owned UNDERDRAIN prefabs into the player path.
    /// The batch is read-only. It recomputes imported visual-source custody, recursive
    /// project-owned dependencies, final approved prefab bytes, Unity meta/GUID custody,
    /// and all 27 declared representation bindings. Only
    /// ActionProductionAssetApprovalBatch may create named approval state.
    /// </summary>
    public static class ActionProductionAssetIntakeBatch
    {
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string ApprovalFormat = "rodoh-action-production-asset-approval/2";
        private const string ReceiptFormat = "rodoh-action-production-asset-intake/3";

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
        private sealed class ApprovalAsset
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
            public int dependencyCount;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvalAttestation;
            public string approvedAt;
            public bool approved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
        }

        [Serializable]
        private sealed class ApprovalReceipt
        {
            public string format;
            public string status;
            public string productId;
            public string presentationManifestId;
            public string presentationManifestSha256;
            public string productProfileSha256;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvalAttestation;
            public string approvedAt;
            public bool confirmedAllAssets;
            public ApprovalAsset[] assets = Array.Empty<ApprovalAsset>();
            public int assetCount;
            public string declaredBindingClosureSha256;
            public int declaredBindingCount;
            public int uniqueDeclaredAssetCount;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public string authorityAuthentication;
            public string playerProductAcceptance;
        }

        [Serializable]
        private sealed class AssetReceipt
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
            public string approvedAt;
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
            public string presentationManifestSha256;
            public string productProfile;
            public string productProfileSha256;
            public string approvalReceipt;
            public string approvalReceiptSha256;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvalAttestation;
            public string approvedAt;
            public AssetReceipt[] assets = Array.Empty<AssetReceipt>();
            public int assetCount;
            public string declaredBindingClosureSha256;
            public ActionProductionAssetDigest.DeclaredBindingRecord[] declaredBindings = Array.Empty<ActionProductionAssetDigest.DeclaredBindingRecord>();
            public int declaredBindingCount;
            public int uniqueDeclaredAssetCount;
            public bool exactRepresentationCustody;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public string semanticAuthority = "named-approval-bound presentation asset intake only";
            public string approvalAuthorityAuthentication = "not-performed";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string playerProductAcceptance = "not-issued";
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
                var approvalPath = Path.GetFullPath(GetRequiredArgument("-approvalReceipt"));
                if (!File.Exists(presentationPath)) throw new FileNotFoundException("Authored action presentation manifest is absent.", presentationPath);
                if (!File.Exists(profilePath)) throw new FileNotFoundException("Action player-product profile is absent.", profilePath);
                if (!File.Exists(approvalPath)) throw new FileNotFoundException("Named production-asset approval receipt is absent.", approvalPath);

                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                var profile = JsonUtility.FromJson<PlayerProductProfile>(File.ReadAllText(profilePath));
                var approval = JsonUtility.FromJson<ApprovalReceipt>(File.ReadAllText(approvalPath));
                if (presentation == null || presentation.format != ActionPresentationManifest.Format) throw new InvalidOperationException("Authored action presentation format is unsupported.");
                if (profile == null || profile.format != ProfileFormat) throw new InvalidOperationException("Action player-product profile format is unsupported.");
                if (approval == null || approval.format != ApprovalFormat || approval.status != "approved") throw new InvalidOperationException("Named production-asset approval receipt is unsupported or not approved.");
                if (string.IsNullOrWhiteSpace(profile.productId) || approval.productId != profile.productId) throw new InvalidOperationException("Production-asset approval product identity differs from the player-product profile.");
                if (approval.presentationManifestId != presentation.manifestId) throw new InvalidOperationException("Production-asset approval presentation identity differs from the authored manifest.");
                if (approval.presentationManifestSha256 != ActionProductionAssetDigest.Sha256File(presentationPath)) throw new InvalidOperationException("Named production-asset approval presentation manifest bytes changed after review.");
                if (approval.productProfileSha256 != ActionProductionAssetDigest.Sha256File(profilePath)) throw new InvalidOperationException("Named production-asset approval product profile bytes changed after review.");
                if (!approval.confirmedAllAssets || !approval.productionApproved || approval.generatedPrimitive || approval.activePhysicsAuthority) throw new InvalidOperationException("Named production-asset approval did not establish a safe complete asset floor.");
                if (string.IsNullOrWhiteSpace(approval.approvalId) || string.IsNullOrWhiteSpace(approval.approvalAuthorityId) || string.IsNullOrWhiteSpace(approval.approvalName) || string.IsNullOrWhiteSpace(approval.approvalAttestation)) throw new InvalidOperationException("Named production-asset approval identity or attestation is absent.");
                if (approval.playerProductAcceptance != "not-issued") throw new InvalidOperationException("Presentation asset approval falsely claims player-product acceptance.");
                if (profile.player == null || profile.arena == null || profile.enemies == null || profile.enemies.Length != 5) throw new InvalidOperationException("Action production intake profile is incomplete.");
                if (presentation.player == null || presentation.arena == null || presentation.enemies == null || presentation.enemies.Length != 5) throw new InvalidOperationException("Authored action presentation asset inventory is incomplete.");
                if (approval.assets == null || approval.assetCount != 7 || approval.assets.Length != 7) throw new InvalidOperationException("Named production-asset approval does not contain exactly seven assets.");

                var declared = ActionProductionAssetDigest.ComputeDeclaredBindingClosure(presentation, profile.forbiddenAssetRoots);
                if (approval.declaredBindingClosureSha256 != declared.declaredBindingClosureSha256 || approval.declaredBindingCount != 27 || approval.uniqueDeclaredAssetCount != 23 || declared.declaredBindingCount != 27 || declared.uniqueDeclaredAssetCount != 23)
                {
                    throw new InvalidOperationException("Named production-asset approval no longer matches the complete 27-role representation binding closure.");
                }

                var approvalById = new Dictionary<string, ApprovalAsset>(StringComparer.Ordinal);
                foreach (var value in approval.assets)
                {
                    if (value == null || string.IsNullOrWhiteSpace(value.assetId)) throw new InvalidOperationException("Named production-asset approval contains an asset without identity.");
                    if (approvalById.ContainsKey(value.assetId)) throw new InvalidOperationException("Named production-asset approval contains duplicate asset identity: " + value.assetId + ".");
                    if (!value.approved || value.generatedPrimitive || value.activePhysicsAuthority) throw new InvalidOperationException("Named production-asset approval contains an unapproved or unsafe asset: " + value.assetId + ".");
                    approvalById.Add(value.assetId, value);
                }

                var assets = new List<AssetReceipt>
                {
                    Intake(presentation.player.bodyPrefab, profile.player, profile.forbiddenAssetRoots, false, approval, RequiredApproval(approvalById, profile.player.assetId))
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
                    assets.Add(Intake(enemy.bodyPrefab, required, profile.forbiddenAssetRoots, false, approval, RequiredApproval(approvalById, required.assetId)));
                }
                assets.Add(Intake(presentation.arena.recipe, profile.arena, profile.forbiddenAssetRoots, true, approval, RequiredApproval(approvalById, profile.arena.assetId)));
                if (assets.Select(value => value.assetId).Distinct(StringComparer.Ordinal).Count() != assets.Count) throw new InvalidOperationException("Production asset intake contains duplicate asset identities.");

                receipt.productId = profile.productId;
                receipt.presentationManifestId = presentation.manifestId;
                receipt.presentationManifest = presentationPath;
                receipt.presentationManifestSha256 = ActionProductionAssetDigest.Sha256File(presentationPath);
                receipt.productProfile = profilePath;
                receipt.productProfileSha256 = ActionProductionAssetDigest.Sha256File(profilePath);
                receipt.approvalReceipt = approvalPath;
                receipt.approvalReceiptSha256 = ActionProductionAssetDigest.Sha256File(approvalPath);
                receipt.approvalId = approval.approvalId;
                receipt.approvalAuthorityId = approval.approvalAuthorityId;
                receipt.approvalName = approval.approvalName;
                receipt.approvalAttestation = approval.approvalAttestation;
                receipt.approvedAt = approval.approvedAt;
                receipt.assets = assets.ToArray();
                receipt.assetCount = assets.Count;
                receipt.declaredBindingClosureSha256 = declared.declaredBindingClosureSha256;
                receipt.declaredBindings = declared.bindings;
                receipt.declaredBindingCount = declared.declaredBindingCount;
                receipt.uniqueDeclaredAssetCount = declared.uniqueDeclaredAssetCount;
                receipt.exactRepresentationCustody = assets.All(value => value.prefabSha256 == RequiredApproval(approvalById, value.assetId).prefabSha256 && value.dependencyClosureSha256 == RequiredApproval(approvalById, value.assetId).dependencyClosureSha256) && receipt.declaredBindingClosureSha256 == approval.declaredBindingClosureSha256;
                receipt.productionApproved = assets.All(value => value.productionApproved);
                receipt.generatedPrimitive = assets.Any(value => value.generatedPrimitive);
                receipt.activePhysicsAuthority = assets.Any(value => value.activePhysicsAuthority);
                if (receipt.assetCount != 7 || receipt.declaredBindingCount != 27 || receipt.uniqueDeclaredAssetCount != 23 || !receipt.exactRepresentationCustody || !receipt.productionApproved || receipt.generatedPrimitive || receipt.activePhysicsAuthority)
                {
                    throw new InvalidOperationException("Production asset intake did not retain the complete named-approved seven-asset and 27-binding floor.");
                }

                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "production-asset-intake.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("RODOH named-approved production asset intake passed: " + receiptPath);
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

        private static ApprovalAsset RequiredApproval(Dictionary<string, ApprovalAsset> approvals, string assetId)
        {
            if (!approvals.TryGetValue(assetId, out var approval)) throw new InvalidOperationException("Named production-asset approval is absent for " + assetId + ".");
            return approval;
        }

        private static AssetReceipt Intake(string prefabPath, AssetRequirement requirement, string[] forbiddenRoots, bool arena, ApprovalReceipt approvalReceipt, ApprovalAsset approval)
        {
            if (requirement == null || string.IsNullOrWhiteSpace(requirement.assetId) || string.IsNullOrWhiteSpace(requirement.role)) throw new InvalidOperationException("Production asset requirement is incomplete.");
            var path = NormalizeAssetPath(prefabPath, "Production prefab " + requirement.assetId);
            ActionProductionAssetDigest.RefuseForbidden(path, forbiddenRoots);
            if (approval.assetId != requirement.assetId || approval.role != requirement.role || NormalizeAssetPath(approval.prefabPath, "Approval prefab") != path) throw new InvalidOperationException("Named approval identity, role, or prefab path differs for " + requirement.assetId + ".");
            if (approval.approvalId != approvalReceipt.approvalId || approval.approvalAuthorityId != approvalReceipt.approvalAuthorityId || approval.approvalName != approvalReceipt.approvalName || approval.approvalAttestation != approvalReceipt.approvalAttestation || approval.approvedAt != approvalReceipt.approvedAt) throw new InvalidOperationException("Named approval custody differs for " + requirement.assetId + ".");

            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab is absent or not a GameObject: " + path);
            var markers = prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true);
            if (markers.Length != 1) throw new InvalidOperationException("Production prefab " + path + " contains " + markers.Length + " production markers; expected exactly one named-approved marker.");
            var marker = markers[0];
            var errors = marker.Validate(requirement.role);
            if (errors.Count > 0) throw new InvalidOperationException("Production asset marker is invalid: " + string.Join(" ", errors));
            if (marker.AssetId != requirement.assetId) throw new InvalidOperationException("Production asset id differs from the player-product profile: " + marker.AssetId + ".");
            if (marker.ApprovalId != approvalReceipt.approvalId || marker.ApprovalAuthorityId != approvalReceipt.approvalAuthorityId || marker.ApprovalName != approvalReceipt.approvalName || marker.ApprovalAttestation != approvalReceipt.approvalAttestation || marker.ApprovedAt != approvalReceipt.approvedAt) throw new InvalidOperationException("Serialized production marker differs from the named approval receipt for " + requirement.assetId + ".");

            var closure = ActionProductionAssetDigest.ComputePrefabClosure(prefab, forbiddenRoots);
            var prefabGuid = ActionProductionAssetDigest.AssetGuid(path);
            var prefabSha = ActionProductionAssetDigest.AssetSha256(path);
            var prefabMetaSha = ActionProductionAssetDigest.AssetMetaSha256(path);
            if (approval.sourceSha256 != approval.visualSourceSha256) throw new InvalidOperationException("Named approval contains divergent legacy and visual-source digests for " + path + ".");
            if (closure.visualSourceSha256 != marker.VisualSourceSha256 || closure.visualSourceSha256 != approval.visualSourceSha256) throw new InvalidOperationException("Named-approved visual-source digest is stale for " + path + ".");
            if (closure.dependencyClosureSha256 != marker.DependencyClosureSha256 || closure.dependencyClosureSha256 != approval.dependencyClosureSha256 || closure.dependencyCount != marker.DependencyCount || closure.dependencyCount != approval.dependencyCount) throw new InvalidOperationException("Named-approved dependency closure is stale for " + path + ".");
            if (prefabGuid != approval.prefabGuid || prefabSha != approval.prefabSha256 || prefabMetaSha != approval.prefabMetaSha256) throw new InvalidOperationException("Named-approved prefab bytes, Unity meta bytes, or GUID changed for " + path + ".");
            ValidatePhysics(prefab, arena, path, out var arenaCollisionSurface);
            return new AssetReceipt
            {
                assetId = marker.AssetId,
                role = marker.Role,
                prefabPath = path,
                prefabGuid = prefabGuid,
                prefabSha256 = prefabSha,
                prefabMetaSha256 = prefabMetaSha,
                sourceSha256 = closure.visualSourceSha256,
                visualSourceSha256 = closure.visualSourceSha256,
                visualSourcePaths = closure.visualSourcePaths,
                dependencyClosureSha256 = closure.dependencyClosureSha256,
                dependencyRecords = closure.dependencyRecords,
                dependencyCount = closure.dependencyCount,
                provenance = marker.Provenance,
                approvalId = marker.ApprovalId,
                approvalAuthorityId = marker.ApprovalAuthorityId,
                approvalName = marker.ApprovalName,
                approvedAt = marker.ApprovedAt,
                productionApproved = marker.ProductionApproved,
                generatedPrimitive = marker.GeneratedPrimitive,
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
