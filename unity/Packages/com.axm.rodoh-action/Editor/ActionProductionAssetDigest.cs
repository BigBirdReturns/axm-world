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
    /// Computes a deterministic digest over the imported mesh and sprite source files
    /// used by one production prefab. Paths and file digests are both included so a
    /// marker cannot be retained after either source bytes or source custody changes.
    /// Built-in Unity primitives and forbidden generated roots are refused.
    /// </summary>
    public static class ActionProductionAssetDigest
    {
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
                    var fullPath = ProjectFilePath(path);
                    if (!File.Exists(fullPath)) throw new FileNotFoundException("Imported production source file is absent.", fullPath);
                    var pathBytes = Encoding.UTF8.GetBytes(path + "\0");
                    aggregate.TransformBlock(pathBytes, 0, pathBytes.Length, null, 0);
                    using (var stream = File.OpenRead(fullPath))
                    using (var fileHash = SHA256.Create())
                    {
                        var digest = fileHash.ComputeHash(stream);
                        aggregate.TransformBlock(digest, 0, digest.Length, null, 0);
                    }
                }
                aggregate.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return BitConverter.ToString(aggregate.Hash).Replace("-", string.Empty).ToLowerInvariant();
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

        private static string NormalizeAssetPath(string value)
        {
            var path = (value ?? string.Empty).Replace('\\', '/');
            if (!path.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Production source must remain under Assets/: " + path);
            return path;
        }
    }
}
