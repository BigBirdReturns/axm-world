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
    /// Computes deterministic custody for UNDERDRAIN production representation assets.
    /// The visual-source digest preserves the imported mesh and sprite identity used by
    /// a core prefab. The dependency closure additionally binds every project-owned
    /// material, texture, animation controller, animation clip, child prefab, VFX asset,
    /// audio asset, and other Assets/ dependency together with its Unity .meta bytes and
    /// GUID. The declared-binding closure binds all 27 manifest roles, including the two
    /// shared animator-controller paths and all feedback assets. Built-in primitives and
    /// forbidden generated roots are refused.
    /// </summary>
    public static class ActionProductionAssetDigest
    {
        [Serializable]
        public sealed class DependencyRecord
        {
            public string assetPath;
            public string guid;
            public string assetSha256;
            public string metaSha256;
        }

        [Serializable]
        public sealed class PrefabClosure
        {
            public string visualSourceSha256;
            public string[] visualSourcePaths = Array.Empty<string>();
            public string dependencyClosureSha256;
            public DependencyRecord[] dependencyRecords = Array.Empty<DependencyRecord>();
            public int dependencyCount;
        }

        [Serializable]
        public sealed class DeclaredBindingRecord
        {
            public string role;
            public string assetPath;
            public string guid;
            public string assetSha256;
            public string metaSha256;
            public string dependencyClosureSha256;
            public int dependencyCount;
        }

        [Serializable]
        public sealed class DeclaredBindingClosure
        {
            public string declaredBindingClosureSha256;
            public DeclaredBindingRecord[] bindings = Array.Empty<DeclaredBindingRecord>();
            public int declaredBindingCount;
            public int uniqueDeclaredAssetCount;
        }

        private sealed class DeclaredBinding
        {
            public string Role;
            public string Path;
        }

        public static List<string> VisualSourcePaths(GameObject prefab, string[] forbiddenRoots)
        {
            if (prefab == null) throw new ArgumentNullException(nameof(prefab));
            var values = new HashSet<string>(StringComparer.Ordinal);
            foreach (var filter in prefab.GetComponentsInChildren<MeshFilter>(true)) AddVisualPath(filter?.sharedMesh, values, forbiddenRoots);
            foreach (var renderer in prefab.GetComponentsInChildren<SkinnedMeshRenderer>(true)) AddVisualPath(renderer?.sharedMesh, values, forbiddenRoots);
            foreach (var renderer in prefab.GetComponentsInChildren<SpriteRenderer>(true)) AddVisualPath(renderer?.sprite, values, forbiddenRoots);
            var result = values.ToList();
            result.Sort(StringComparer.Ordinal);
            return result;
        }

        public static string Compute(GameObject prefab, string[] forbiddenRoots, out List<string> sourcePaths)
        {
            sourcePaths = VisualSourcePaths(prefab, forbiddenRoots);
            if (sourcePaths.Count == 0) throw new InvalidOperationException("Production prefab has no imported mesh or sprite source: " + AssetDatabase.GetAssetPath(prefab));
            return Compute(sourcePaths);
        }

        public static string Compute(IEnumerable<string> sourcePaths)
        {
            var paths = (sourcePaths ?? Array.Empty<string>())
                .Select(NormalizeAssetPath)
                .Distinct(StringComparer.Ordinal)
                .OrderBy(value => value, StringComparer.Ordinal)
                .ToArray();
            if (paths.Length == 0) throw new InvalidOperationException("Production source digest has no source paths.");
            using (var aggregate = SHA256.Create())
            {
                foreach (var path in paths)
                {
                    TransformUtf8(aggregate, path);
                    TransformByte(aggregate, 0);
                    TransformHexDigest(aggregate, Sha256File(ProjectFilePath(path)));
                }
                aggregate.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return Hex(aggregate.Hash);
            }
        }

        public static PrefabClosure ComputePrefabClosure(GameObject prefab, string[] forbiddenRoots)
        {
            if (prefab == null) throw new ArgumentNullException(nameof(prefab));
            var prefabPath = NormalizeAssetPath(AssetDatabase.GetAssetPath(prefab));
            var visualSha = Compute(prefab, forbiddenRoots, out var sourcePaths);
            var dependencies = DependencyRecords(prefabPath, forbiddenRoots, true);
            if (dependencies.Count == 0)
            {
                throw new InvalidOperationException("Production prefab has no project-owned dependency closure: " + prefabPath + ".");
            }
            return new PrefabClosure
            {
                visualSourceSha256 = visualSha,
                visualSourcePaths = sourcePaths.ToArray(),
                dependencyClosureSha256 = ComputeDependencyDigest(dependencies),
                dependencyRecords = dependencies.ToArray(),
                dependencyCount = dependencies.Count
            };
        }

        public static DeclaredBindingClosure ComputeDeclaredBindingClosure(ActionPresentationManifest presentation, string[] forbiddenRoots)
        {
            if (presentation == null) throw new ArgumentNullException(nameof(presentation));
            var declarations = DeclaredBindings(presentation);
            if (declarations.Count != 27)
            {
                throw new InvalidOperationException("UNDERDRAIN presentation must declare exactly 27 production bindings; found " + declarations.Count + ".");
            }

            var records = new List<DeclaredBindingRecord>();
            foreach (var declaration in declarations.OrderBy(value => value.Role, StringComparer.Ordinal).ThenBy(value => value.Path, StringComparer.Ordinal))
            {
                var path = NormalizeAssetPath(declaration.Path);
                RefuseForbidden(path, forbiddenRoots);
                var direct = DirectRecord(path, forbiddenRoots);
                var dependencies = DependencyRecords(path, forbiddenRoots, true);
                records.Add(new DeclaredBindingRecord
                {
                    role = declaration.Role,
                    assetPath = path,
                    guid = direct.guid,
                    assetSha256 = direct.assetSha256,
                    metaSha256 = direct.metaSha256,
                    dependencyClosureSha256 = ComputeDependencyDigest(dependencies),
                    dependencyCount = dependencies.Count
                });
            }

            var uniqueCount = records.Select(value => value.assetPath).Distinct(StringComparer.Ordinal).Count();
            if (uniqueCount != 23)
            {
                throw new InvalidOperationException("UNDERDRAIN presentation must resolve its 27 roles to exactly 23 unique top-level assets; found " + uniqueCount + ".");
            }

            return new DeclaredBindingClosure
            {
                declaredBindingClosureSha256 = ComputeDeclaredBindingDigest(records),
                bindings = records.ToArray(),
                declaredBindingCount = records.Count,
                uniqueDeclaredAssetCount = uniqueCount
            };
        }

        public static string AssetSha256(string assetPath)
        {
            return Sha256File(ProjectFilePath(NormalizeAssetPath(assetPath)));
        }

        public static string AssetMetaSha256(string assetPath)
        {
            var path = ProjectFilePath(NormalizeAssetPath(assetPath)) + ".meta";
            if (!File.Exists(path)) throw new FileNotFoundException("Unity meta file is absent for production asset.", path);
            return Sha256File(path);
        }

        public static string AssetGuid(string assetPath)
        {
            var path = NormalizeAssetPath(assetPath);
            var guid = AssetDatabase.AssetPathToGUID(path);
            if (string.IsNullOrWhiteSpace(guid) || guid.Length != 32)
            {
                throw new InvalidOperationException("Unity GUID is absent or malformed for production asset: " + path + ".");
            }
            return guid.ToLowerInvariant();
        }

        public static string Sha256File(string path)
        {
            if (!File.Exists(path)) throw new FileNotFoundException("Production custody file is absent.", path);
            using (var stream = File.OpenRead(path))
            using (var sha = SHA256.Create())
            {
                return Hex(sha.ComputeHash(stream));
            }
        }

        public static string ProjectFilePath(string assetPath)
        {
            var path = NormalizeAssetPath(assetPath);
            var projectRoot = Directory.GetParent(Application.dataPath)?.FullName;
            if (string.IsNullOrWhiteSpace(projectRoot)) throw new InvalidOperationException("Unity project root could not be resolved from Application.dataPath.");
            return Path.GetFullPath(Path.Combine(projectRoot, path.Replace('/', Path.DirectorySeparatorChar)));
        }

        public static void RefuseForbidden(string path, string[] forbiddenRoots)
        {
            var value = NormalizeAssetPath(path);
            foreach (var raw in forbiddenRoots ?? Array.Empty<string>())
            {
                var root = (raw ?? string.Empty).Replace('\\', '/').TrimEnd('/');
                if (string.IsNullOrWhiteSpace(root)) continue;
                if (value == root || value.StartsWith(root + "/", StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("Production asset uses forbidden generated primitive custody: " + value + ".");
                }
            }
        }

        private static List<DependencyRecord> DependencyRecords(string assetPath, string[] forbiddenRoots, bool excludeSelf)
        {
            var path = NormalizeAssetPath(assetPath);
            var dependencies = AssetDatabase.GetDependencies(path, true) ?? Array.Empty<string>();
            var records = new List<DependencyRecord>();
            foreach (var raw in dependencies
                .Select(value => (value ?? string.Empty).Replace('\\', '/'))
                .Where(value => value.StartsWith("Assets/", StringComparison.Ordinal))
                .Where(value => !excludeSelf || !string.Equals(value, path, StringComparison.Ordinal))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(value => value, StringComparer.Ordinal))
            {
                records.Add(DirectRecord(raw, forbiddenRoots));
            }
            return records;
        }

        private static DependencyRecord DirectRecord(string assetPath, string[] forbiddenRoots)
        {
            var path = NormalizeAssetPath(assetPath);
            RefuseForbidden(path, forbiddenRoots);
            var fullPath = ProjectFilePath(path);
            if (!File.Exists(fullPath)) throw new FileNotFoundException("Imported production dependency is absent.", fullPath);
            var metaPath = fullPath + ".meta";
            if (!File.Exists(metaPath)) throw new FileNotFoundException("Unity meta file is absent for imported production dependency.", metaPath);
            return new DependencyRecord
            {
                assetPath = path,
                guid = AssetGuid(path),
                assetSha256 = Sha256File(fullPath),
                metaSha256 = Sha256File(metaPath)
            };
        }

        private static string ComputeDependencyDigest(IEnumerable<DependencyRecord> records)
        {
            var values = (records ?? Array.Empty<DependencyRecord>())
                .Where(value => value != null)
                .OrderBy(value => value.assetPath, StringComparer.Ordinal)
                .ToArray();
            using (var aggregate = SHA256.Create())
            {
                foreach (var value in values)
                {
                    TransformField(aggregate, value.assetPath);
                    TransformField(aggregate, value.guid);
                    TransformField(aggregate, value.assetSha256);
                    TransformField(aggregate, value.metaSha256);
                }
                aggregate.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return Hex(aggregate.Hash);
            }
        }

        private static string ComputeDeclaredBindingDigest(IEnumerable<DeclaredBindingRecord> records)
        {
            var values = (records ?? Array.Empty<DeclaredBindingRecord>())
                .Where(value => value != null)
                .OrderBy(value => value.role, StringComparer.Ordinal)
                .ThenBy(value => value.assetPath, StringComparer.Ordinal)
                .ToArray();
            using (var aggregate = SHA256.Create())
            {
                foreach (var value in values)
                {
                    TransformField(aggregate, value.role);
                    TransformField(aggregate, value.assetPath);
                    TransformField(aggregate, value.guid);
                    TransformField(aggregate, value.assetSha256);
                    TransformField(aggregate, value.metaSha256);
                    TransformField(aggregate, value.dependencyClosureSha256);
                    TransformField(aggregate, value.dependencyCount.ToString(System.Globalization.CultureInfo.InvariantCulture));
                }
                aggregate.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return Hex(aggregate.Hash);
            }
        }

        private static List<DeclaredBinding> DeclaredBindings(ActionPresentationManifest presentation)
        {
            if (presentation.player == null || presentation.arena == null || presentation.enemies == null || presentation.feedback == null)
            {
                throw new InvalidOperationException("Authored action presentation asset inventory is incomplete.");
            }
            var values = new List<DeclaredBinding>
            {
                new DeclaredBinding { Role = "player:body", Path = presentation.player.bodyPrefab },
                new DeclaredBinding { Role = "player:animator", Path = presentation.player.animatorController },
                new DeclaredBinding { Role = "arena:recipe", Path = presentation.arena.recipe }
            };
            foreach (var enemy in presentation.enemies)
            {
                if (enemy == null || string.IsNullOrWhiteSpace(enemy.kit)) throw new InvalidOperationException("Authored enemy presentation kit is absent.");
                values.Add(new DeclaredBinding { Role = "enemy:" + enemy.kit + ":body", Path = enemy.bodyPrefab });
                values.Add(new DeclaredBinding { Role = "enemy:" + enemy.kit + ":animator", Path = enemy.animatorController });
            }
            foreach (var feedback in presentation.feedback)
            {
                if (feedback == null || string.IsNullOrWhiteSpace(feedback.@event)) throw new InvalidOperationException("Authored feedback presentation event is absent.");
                values.Add(new DeclaredBinding { Role = "feedback:" + feedback.@event + ":vfx", Path = feedback.vfxPrefab });
                values.Add(new DeclaredBinding { Role = "feedback:" + feedback.@event + ":audio", Path = feedback.audioClip });
            }
            return values;
        }

        private static void AddVisualPath(UnityEngine.Object asset, HashSet<string> values, string[] forbiddenRoots)
        {
            if (asset == null) return;
            var path = AssetDatabase.GetAssetPath(asset)?.Replace('\\', '/');
            if (string.IsNullOrWhiteSpace(path) || !path.StartsWith("Assets/", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Production asset uses a built-in or untracked primitive visual: " + asset.name + ".");
            }
            RefuseForbidden(path, forbiddenRoots);
            values.Add(path);
        }

        private static void TransformField(HashAlgorithm aggregate, string value)
        {
            TransformUtf8(aggregate, value ?? string.Empty);
            TransformByte(aggregate, 0);
        }

        private static void TransformUtf8(HashAlgorithm aggregate, string value)
        {
            var bytes = Encoding.UTF8.GetBytes(value ?? string.Empty);
            aggregate.TransformBlock(bytes, 0, bytes.Length, null, 0);
        }

        private static void TransformByte(HashAlgorithm aggregate, byte value)
        {
            var bytes = new[] { value };
            aggregate.TransformBlock(bytes, 0, bytes.Length, null, 0);
        }

        private static void TransformHexDigest(HashAlgorithm aggregate, string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Length != 64) throw new InvalidOperationException("Production custody digest is absent or malformed.");
            var bytes = new byte[32];
            for (var index = 0; index < bytes.Length; index += 1)
            {
                bytes[index] = Convert.ToByte(value.Substring(index * 2, 2), 16);
            }
            aggregate.TransformBlock(bytes, 0, bytes.Length, null, 0);
        }

        private static string Hex(byte[] bytes)
        {
            return BitConverter.ToString(bytes ?? Array.Empty<byte>()).Replace("-", string.Empty).ToLowerInvariant();
        }

        private static string NormalizeAssetPath(string value)
        {
            var path = (value ?? string.Empty).Replace('\\', '/');
            if (!path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Production source must remain under Assets/: " + path);
            return path;
        }
    }
}
