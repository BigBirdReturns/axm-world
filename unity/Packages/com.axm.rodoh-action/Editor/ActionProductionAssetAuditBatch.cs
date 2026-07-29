using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Recomputes the imported-source digest of every named-approved production
    /// prefab after scene serialization. The batch is read-only: it refuses stale
    /// markers, changed approval custody, moved sources, built-in primitives,
    /// generated roots, active combat physics, or an arena without a static
    /// camera-collision surface.
    /// </summary>
    public static class ActionProductionAssetAuditBatch
    {
        private const string ProfileFormat = "rodoh-action-player-product-profile/1";
        private const string ReceiptFormat = "rodoh-action-production-asset-audit/1";

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
        private sealed class AssetAudit
        {
            public string assetId;
            public string role;
            public string prefabPath;
            public string prefabGuid;
            public string prefabSha256;
            public string markerSourceSha256;
            public string computedSourceSha256;
            public string[] visualSourcePaths = Array.Empty<string>();
            public string provenance;
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvedAt;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool exactSourceCustody;
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
            public string approvalId;
            public string approvalAuthorityId;
            public string approvalName;
            public string approvedAt;
            public AssetAudit[] assets = Array.Empty<AssetAudit>();
            public int assetCount;
            public bool exactSourceCustody;
            public bool productionApproved;
            public bool generatedPrimitive;
            public bool activePhysicsAuthority;
            public string semanticAuthority = "read-only presentation asset provenance and approval-custody audit";
            public string approvalAuthorityAuthentication = "not-performed";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string playerProductAcceptance = "not-issued";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-production-audit"));
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
                if (profile.player == null || profile.arena == null || profile.enemies == null || profile.enemies.Length != 5) throw new InvalidOperationException("Action production audit profile is incomplete.");
                if (presentation.player == null || presentation.arena == null || presentation.enemies == null || presentation.enemies.Length != 5) throw new InvalidOperationException("Authored action presentation asset inventory is incomplete.");

                var assets = new List<AssetAudit>();
                assets.Add(Audit(presentation.player.bodyPrefab, profile.player, profile.forbiddenAssetRoots, false));
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
                    assets.Add(Audit(enemy.bodyPrefab, required, profile.forbiddenAssetRoots, false));
                }
                assets.Add(Audit(presentation.arena.recipe, profile.arena, profile.forbiddenAssetRoots, true));

                if (assets.Select(value => value.assetId).Distinct(StringComparer.Ordinal).Count() != assets.Count) throw new InvalidOperationException("Production asset audit contains duplicate asset identities.");
                var approvalIds = assets.Select(value => value.approvalId).Distinct(StringComparer.Ordinal).ToArray();
                var authorityIds = assets.Select(value => value.approvalAuthorityId).Distinct(StringComparer.Ordinal).ToArray();
                var approvalNames = assets.Select(value => value.approvalName).Distinct(StringComparer.Ordinal).ToArray();
                var approvedTimes = assets.Select(value => value.approvedAt).Distinct(StringComparer.Ordinal).ToArray();
                if (approvalIds.Length != 1 || authorityIds.Length != 1 || approvalNames.Length != 1 || approvedTimes.Length != 1)
                {
                    throw new InvalidOperationException("Production asset audit found mixed named approval custody across the seven-asset floor.");
                }

                receipt.productId = profile.productId;
                receipt.presentationManifestId = presentation.manifestId;
                receipt.presentationManifest = presentationPath;
                receipt.productProfile = profilePath;
                receipt.approvalId = approvalIds[0];
                receipt.approvalAuthorityId = authorityIds[0];
                receipt.approvalName = approvalNames[0];
                receipt.approvedAt = approvedTimes[0];
                receipt.assets = assets.ToArray();
                receipt.assetCount = assets.Count;
                receipt.exactSourceCustody = assets.All(value => value.exactSourceCustody);
                receipt.productionApproved = assets.All(value => value.productionApproved);
                receipt.generatedPrimitive = assets.Any(value => value.generatedPrimitive);
                receipt.activePhysicsAuthority = assets.Any(value => value.activePhysicsAuthority);
                if (receipt.assetCount != 7 || !receipt.exactSourceCustody || !receipt.productionApproved || receipt.generatedPrimitive || receipt.activePhysicsAuthority)
                {
                    throw new InvalidOperationException("Production asset audit did not retain the complete named-approved seven-asset floor.");
                }

                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "production-asset-audit.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("RODOH production asset audit passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "production-asset-audit.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling audit failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static AssetAudit Audit(string prefabPath, AssetRequirement requirement, string[] forbiddenRoots, bool arena)
        {
            if (requirement == null || string.IsNullOrWhiteSpace(requirement.assetId) || string.IsNullOrWhiteSpace(requirement.role)) throw new InvalidOperationException("Production asset requirement is incomplete.");
            var path = NormalizeAssetPath(prefabPath, "Production prefab " + requirement.assetId);
            ActionProductionAssetDigest.RefuseForbidden(path, forbiddenRoots);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab == null) throw new InvalidOperationException("Production prefab is absent or not a GameObject: " + path);
            var markers = prefab.GetComponentsInChildren<ActionProductionAssetMarker>(true);
            if (markers.Length != 1) throw new InvalidOperationException("Production prefab " + path + " contains " + markers.Length + " production markers; expected exactly one.");
            var marker = markers[0];
            var errors = marker.Validate(requirement.role);
            if (errors.Count > 0) throw new InvalidOperationException("Production asset marker is invalid: " + string.Join(" ", errors));
            if (marker.AssetId != requirement.assetId) throw new InvalidOperationException("Production asset id differs from the player-product profile: " + marker.AssetId + ".");

            var computed = ActionProductionAssetDigest.Compute(prefab, forbiddenRoots, out var sources);
            var exactSourceCustody = marker.SourceSha256 == computed;
            if (!exactSourceCustody) throw new InvalidOperationException("Production asset source digest is stale for " + path + ": marker=" + marker.SourceSha256 + " computed=" + computed + ".");
            ValidatePhysics(prefab, arena, path, out var arenaCollisionSurface);
            return new AssetAudit
            {
                assetId = marker.AssetId,
                role = marker.Role,
                prefabPath = path,
                prefabGuid = AssetDatabase.AssetPathToGUID(path),
                prefabSha256 = Sha256File(ActionProductionAssetDigest.ProjectFilePath(path)),
                markerSourceSha256 = marker.SourceSha256,
                computedSourceSha256 = computed,
                visualSourcePaths = sources.ToArray(),
                provenance = marker.Provenance,
                approvalId = marker.ApprovalId,
                approvalAuthorityId = marker.ApprovalAuthorityId,
                approvalName = marker.ApprovalName,
                approvedAt = marker.ApprovedAt,
                productionApproved = marker.ProductionApproved,
                generatedPrimitive = marker.GeneratedPrimitive,
                exactSourceCustody = exactSourceCustody,
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