using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Generates a complete, local, low-cost production floor from governed Unity
    /// primitives. The generated bodies, motion clips, and arena are presentation
    /// assets only. They never acquire action, physics-combat, or campaign authority.
    /// </summary>
    public static class ActionGovernedProductionBatch
    {
        private const string Format = "rodoh-action-governed-production-assets/1";
        private const string MotionVersion = "rodoh-procedural-motion-v1";

        [Serializable]
        private sealed class Receipt
        {
            public string format = Format;
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string sourceManifest;
            public string sourceManifestId;
            public string outputManifest;
            public string outputManifestId;
            public string outputManifestSha256;
            public string assetRoot;
            public string playerPrefab;
            public string[] enemyPrefabs = Array.Empty<string>();
            public string arenaRecipe;
            public string[] motionClips = Array.Empty<string>();
            public string[] materials = Array.Empty<string>();
            public int bodyPrefabs;
            public int enemyKits;
            public int motionClipCount;
            public int materialCount;
            public bool authoredArena;
            public bool neutralFallbackBodies;
            public bool activePhysicsAuthority;
            public bool remoteRuntimeReferences;
            public string motionAuthority = "presentation-only deterministic-state reader";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string error;
        }

        private sealed class Palette
        {
            public Material player;
            public Material skirmisher;
            public Material duelist;
            public Material swarm;
            public Material hexer;
            public Material breaker;
            public Material eye;
            public Material pupil;
            public Material metal;
            public Material floor;
            public Material trim;
            public Material marker;
            public string[] paths;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-production", "receipts"));
            var receipt = new Receipt();
            try
            {
                var sourceManifest = Path.GetFullPath(GetRequiredArgument("-sourceManifest"));
                var outputManifest = Path.GetFullPath(GetRequiredArgument("-outputManifest"));
                var requestedRoot = (GetArgument("-assetRoot") ?? "Assets/AXM/Generated/ActionProduction/GovernedV1").Replace('\\', '/').TrimEnd('/');
                if (!requestedRoot.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Governed action assets must remain under Assets/.");
                if (!File.Exists(sourceManifest)) throw new FileNotFoundException("Source action presentation manifest is absent.", sourceManifest);

                var manifest = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(sourceManifest));
                if (manifest == null) throw new InvalidOperationException("Source action presentation manifest did not parse.");
                var sourceErrors = manifest.Validate();
                if (sourceErrors.Count > 0) throw new InvalidOperationException("Source action presentation manifest is invalid: " + string.Join(" ", sourceErrors));

                var sourceId = manifest.manifestId;
                var governedId = sourceId.EndsWith("-governed-v1", StringComparison.Ordinal) ? sourceId : sourceId + "-governed-v1";
                var assetRoot = requestedRoot + "/" + Sanitize(governedId);
                EnsureAssetFolder(assetRoot);
                EnsureAssetFolder(assetRoot + "/Materials");
                EnsureAssetFolder(assetRoot + "/Motion");
                EnsureAssetFolder(assetRoot + "/Bodies");
                EnsureAssetFolder(assetRoot + "/Arena");

                var palette = BuildPalette(assetRoot + "/Materials");
                var motionPaths = BuildMotionKit(assetRoot + "/Motion");
                var playerPath = BuildPlayerPrefab(assetRoot + "/Bodies/Player.prefab", palette, motionPaths);
                var enemyPaths = new[]
                {
                    BuildFrogPrefab(assetRoot + "/Bodies/Skirmisher.prefab", "skirmisher", palette.skirmisher, palette, 0.86f, 0),
                    BuildFrogPrefab(assetRoot + "/Bodies/Duelist.prefab", "duelist", palette.duelist, palette, 0.94f, 1),
                    BuildFrogPrefab(assetRoot + "/Bodies/Swarm.prefab", "swarm", palette.swarm, palette, 0.58f, 2),
                    BuildFrogPrefab(assetRoot + "/Bodies/Hexer.prefab", "hexer", palette.hexer, palette, 1.02f, 3),
                    BuildFrogPrefab(assetRoot + "/Bodies/Breaker.prefab", "breaker", palette.breaker, palette, 1.28f, 4),
                };
                var arenaPath = BuildArenaPrefab(assetRoot + "/Arena/" + Sanitize(manifest.arena.kit) + ".prefab", manifest.arena.kit, palette);

                manifest.manifestId = governedId;
                manifest.player.bodyPrefab = playerPath;
                manifest.player.animatorController = null;
                manifest.player.motionSet = MotionSet(motionPaths);
                manifest.player.neutralFallback = false;
                for (var index = 0; index < manifest.enemies.Length; index += 1)
                {
                    var enemy = manifest.enemies[index];
                    enemy.bodyPrefab = EnemyPath(enemy.kit, enemyPaths);
                    enemy.animatorController = null;
                    enemy.motionSet = MotionSet(motionPaths);
                    enemy.neutralFallback = false;
                }
                manifest.arena.recipe = arenaPath;
                manifest.arena.neutralFallback = false;
                manifest.provenance.assetRoots = MergeRoots(manifest.provenance.assetRoots, assetRoot);
                manifest.provenance.remoteRuntimeReferencesAllowed = false;
                if (string.IsNullOrWhiteSpace(manifest.provenance.license)) manifest.provenance.license = "MIT";

                var governedErrors = manifest.Validate();
                if (governedErrors.Count > 0) throw new InvalidOperationException("Governed action presentation manifest is invalid: " + string.Join(" ", governedErrors));
                Directory.CreateDirectory(Path.GetDirectoryName(outputManifest) ?? throw new InvalidOperationException("Output manifest directory is unavailable."));
                File.WriteAllText(outputManifest, JsonUtility.ToJson(manifest, true) + Environment.NewLine, new UTF8Encoding(false));
                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);

                RequireAsset<GameObject>(playerPath, "governed player body");
                foreach (var enemyPath in enemyPaths) RequireAsset<GameObject>(enemyPath, "governed enemy body");
                RequireAsset<GameObject>(arenaPath, "governed arena recipe");
                foreach (var motionPath in motionPaths) RequireAsset<AnimationClip>(motionPath, "governed motion clip");
                var activePhysics = HasActivePhysics(playerPath, enemyPaths, arenaPath);
                if (activePhysics) throw new InvalidOperationException("Generated governed production assets retain active Unity physics authority.");

                receipt.sourceManifest = sourceManifest;
                receipt.sourceManifestId = sourceId;
                receipt.outputManifest = outputManifest;
                receipt.outputManifestId = governedId;
                receipt.outputManifestSha256 = Sha256File(outputManifest);
                receipt.assetRoot = assetRoot;
                receipt.playerPrefab = playerPath;
                receipt.enemyPrefabs = enemyPaths;
                receipt.arenaRecipe = arenaPath;
                receipt.motionClips = motionPaths;
                receipt.materials = palette.paths;
                receipt.bodyPrefabs = 1 + enemyPaths.Length;
                receipt.enemyKits = enemyPaths.Length;
                receipt.motionClipCount = motionPaths.Length;
                receipt.materialCount = palette.paths.Length;
                receipt.authoredArena = true;
                receipt.neutralFallbackBodies = false;
                receipt.activePhysicsAuthority = false;
                receipt.remoteRuntimeReferences = false;
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "governed-production-assets.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                Debug.Log("RODOH governed action production assets passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "governed-production-assets.json"), JsonUtility.ToJson(receipt, true) + Environment.NewLine, new UTF8Encoding(false));
                }
                catch
                {
                    // Preserve the controlling production-generation failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static Palette BuildPalette(string root)
        {
            var values = new List<string>();
            var palette = new Palette
            {
                player = Material(root + "/Player.mat", new Color(0.10f, 0.72f, 0.82f), values),
                skirmisher = Material(root + "/Skirmisher.mat", new Color(0.24f, 0.64f, 0.30f), values),
                duelist = Material(root + "/Duelist.mat", new Color(0.26f, 0.48f, 0.68f), values),
                swarm = Material(root + "/Swarm.mat", new Color(0.54f, 0.72f, 0.26f), values),
                hexer = Material(root + "/Hexer.mat", new Color(0.52f, 0.30f, 0.66f), values),
                breaker = Material(root + "/Breaker.mat", new Color(0.46f, 0.38f, 0.24f), values),
                eye = Material(root + "/Eye.mat", new Color(0.96f, 0.94f, 0.82f), values),
                pupil = Material(root + "/Pupil.mat", new Color(0.04f, 0.05f, 0.04f), values),
                metal = Material(root + "/Metal.mat", new Color(0.54f, 0.58f, 0.60f), values),
                floor = Material(root + "/Floor.mat", new Color(0.10f, 0.16f, 0.14f), values),
                trim = Material(root + "/Trim.mat", new Color(0.22f, 0.32f, 0.26f), values),
                marker = Material(root + "/Marker.mat", new Color(0.88f, 0.46f, 0.16f), values),
            };
            palette.paths = values.ToArray();
            return palette;
        }

        private static Material Material(string path, Color color, List<string> paths)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            if (shader == null) throw new InvalidOperationException("Unity project contains no supported governed-production shader.");
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(shader) { name = Path.GetFileNameWithoutExtension(path) };
                AssetDatabase.CreateAsset(material, path);
            }
            material.shader = shader;
            material.color = color;
            material.enableInstancing = true;
            EditorUtility.SetDirty(material);
            paths.Add(path);
            return material;
        }

        private static string[] BuildMotionKit(string root)
        {
            return new[]
            {
                MotionClip(root + "/Idle.anim", "Idle", true, 0.00f, 0.04f, 0f),
                MotionClip(root + "/Move.anim", "Move", true, 0.00f, 0.10f, 8f),
                MotionClip(root + "/Light.anim", "Light", false, -18f, 52f, 0f),
                MotionClip(root + "/Heavy.anim", "Heavy", false, -32f, 88f, 0f),
                MotionClip(root + "/Dodge.anim", "Dodge", false, 0f, -30f, -0.10f),
                MotionClip(root + "/Parry.anim", "Parry", false, -12f, 24f, 0.03f),
                MotionClip(root + "/Stagger.anim", "Stagger", false, 18f, -24f, 0f),
                MotionClip(root + "/Defeat.anim", "Defeat", false, 0f, 90f, -0.35f),
            };
        }

        private static string MotionClip(string path, string name, bool loop, float startRotation, float endRotation, float verticalOffset)
        {
            AssetDatabase.DeleteAsset(path);
            var clip = new AnimationClip { name = MotionVersion + "-" + name, frameRate = 30f, wrapMode = loop ? WrapMode.Loop : WrapMode.Once };
            clip.SetCurve("Visual", typeof(Transform), "localEulerAnglesRaw.z", new AnimationCurve(
                new Keyframe(0f, startRotation),
                new Keyframe(loop ? 0.5f : 0.35f, endRotation),
                new Keyframe(loop ? 1f : 0.8f, loop ? startRotation : endRotation)
            ));
            clip.SetCurve("Visual", typeof(Transform), "localPosition.y", new AnimationCurve(
                new Keyframe(0f, 0f),
                new Keyframe(loop ? 0.5f : 0.35f, verticalOffset),
                new Keyframe(loop ? 1f : 0.8f, 0f)
            ));
            AssetDatabase.CreateAsset(clip, path);
            return path;
        }

        private static ActionMotionSet MotionSet(string[] paths)
        {
            return new ActionMotionSet
            {
                idle = paths[0],
                move = paths[1],
                light = paths[2],
                heavy = paths[3],
                dodge = paths[4],
                parry = paths[5],
                stagger = paths[6],
                defeat = paths[7],
            };
        }

        private static string BuildPlayerPrefab(string path, Palette palette, string[] motionPaths)
        {
            var root = new GameObject("RODOH Player Body");
            try
            {
                var visual = Child(root.transform, "Visual");
                Primitive("Torso", PrimitiveType.Capsule, visual, new Vector3(0f, 1.05f, 0f), new Vector3(0.62f, 0.84f, 0.46f), palette.player);
                Primitive("Head", PrimitiveType.Sphere, visual, new Vector3(0f, 1.92f, 0.05f), new Vector3(0.56f, 0.48f, 0.50f), palette.player);
                Primitive("Left Hand", PrimitiveType.Sphere, visual, new Vector3(-0.55f, 1.12f, 0.10f), new Vector3(0.18f, 0.18f, 0.18f), palette.player);
                Primitive("Right Hand", PrimitiveType.Sphere, visual, new Vector3(0.55f, 1.12f, 0.10f), new Vector3(0.18f, 0.18f, 0.18f), palette.player);
                var staff = Primitive("Staff", PrimitiveType.Cylinder, visual, new Vector3(0.48f, 1.10f, 0.10f), new Vector3(0.06f, 0.92f, 0.06f), palette.metal);
                staff.transform.localRotation = Quaternion.Euler(0f, 0f, -22f);
                AddEyes(visual, palette, 1.94f, 0.43f, 0.42f);
                var binding = root.AddComponent<ActionActorBinding>();
                binding.Configure("player", null, visual);
                root.AddComponent<ActionPhysicsQuarantine>();
                SavePrefab(root, path);
                return path;
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static string BuildFrogPrefab(string path, string kit, Material bodyMaterial, Palette palette, float scale, int variant)
        {
            var root = new GameObject("RODOH " + kit + " Body");
            try
            {
                var visual = Child(root.transform, "Visual");
                Primitive("Body", PrimitiveType.Sphere, visual, new Vector3(0f, 0.62f, 0f), new Vector3(0.74f, 0.56f, 0.58f) * scale, bodyMaterial);
                Primitive("Head", PrimitiveType.Sphere, visual, new Vector3(0f, 1.12f, 0.05f), new Vector3(0.66f, 0.48f, 0.54f) * scale, bodyMaterial);
                Primitive("Left Leg", PrimitiveType.Capsule, visual, new Vector3(-0.50f * scale, 0.24f, -0.02f), new Vector3(0.23f, 0.36f, 0.23f) * scale, bodyMaterial).transform.localRotation = Quaternion.Euler(0f, 0f, 58f);
                Primitive("Right Leg", PrimitiveType.Capsule, visual, new Vector3(0.50f * scale, 0.24f, -0.02f), new Vector3(0.23f, 0.36f, 0.23f) * scale, bodyMaterial).transform.localRotation = Quaternion.Euler(0f, 0f, -58f);
                AddEyes(visual, palette, 1.36f * scale, 0.42f * scale, 0.38f * scale);
                AddKitSilhouette(visual, kit, palette, scale, variant);
                var binding = root.AddComponent<ActionActorBinding>();
                binding.Configure(kit, null, visual);
                root.AddComponent<ActionPhysicsQuarantine>();
                SavePrefab(root, path);
                return path;
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static void AddKitSilhouette(Transform parent, string kit, Palette palette, float scale, int variant)
        {
            if (kit == "skirmisher")
            {
                var spear = Primitive("Spear", PrimitiveType.Cylinder, parent, new Vector3(0.55f * scale, 0.82f * scale, 0.08f), new Vector3(0.04f, 0.72f * scale, 0.04f), palette.metal);
                spear.transform.localRotation = Quaternion.Euler(0f, 0f, -18f);
            }
            else if (kit == "duelist")
            {
                var blade = Primitive("Blade", PrimitiveType.Cube, parent, new Vector3(0.58f * scale, 0.90f * scale, 0.06f), new Vector3(0.06f, 0.62f * scale, 0.10f), palette.metal);
                blade.transform.localRotation = Quaternion.Euler(0f, 0f, -35f);
            }
            else if (kit == "swarm")
            {
                Primitive("Swarm Echo Left", PrimitiveType.Sphere, parent, new Vector3(-0.62f, 0.46f, 0.18f), new Vector3(0.28f, 0.22f, 0.28f), palette.swarm);
                Primitive("Swarm Echo Right", PrimitiveType.Sphere, parent, new Vector3(0.62f, 0.46f, 0.18f), new Vector3(0.28f, 0.22f, 0.28f), palette.swarm);
            }
            else if (kit == "hexer")
            {
                Primitive("Hex Orb", PrimitiveType.Sphere, parent, new Vector3(0f, 1.82f * scale, 0f), new Vector3(0.22f, 0.22f, 0.22f), palette.marker);
                for (var index = 0; index < 3; index += 1)
                {
                    var horn = Primitive("Hex Crown " + index, PrimitiveType.Cylinder, parent, new Vector3((index - 1) * 0.22f, 1.58f * scale, 0f), new Vector3(0.035f, 0.24f, 0.035f), palette.metal);
                    horn.transform.localRotation = Quaternion.Euler(0f, 0f, (index - 1) * 15f);
                }
            }
            else if (kit == "breaker")
            {
                Primitive("Left Guard", PrimitiveType.Cube, parent, new Vector3(-0.70f * scale, 0.74f * scale, 0.08f), new Vector3(0.28f, 0.32f, 0.30f), palette.trim);
                Primitive("Right Guard", PrimitiveType.Cube, parent, new Vector3(0.70f * scale, 0.74f * scale, 0.08f), new Vector3(0.28f, 0.32f, 0.30f), palette.trim);
            }
        }

        private static void AddEyes(Transform parent, Palette palette, float y, float x, float forward)
        {
            foreach (var side in new[] { -1f, 1f })
            {
                Primitive(side < 0 ? "Left Eye" : "Right Eye", PrimitiveType.Sphere, parent, new Vector3(side * x, y, forward), new Vector3(0.18f, 0.18f, 0.14f), palette.eye);
                Primitive(side < 0 ? "Left Pupil" : "Right Pupil", PrimitiveType.Sphere, parent, new Vector3(side * x, y, forward + 0.13f), new Vector3(0.07f, 0.09f, 0.04f), palette.pupil);
            }
        }

        private static string BuildArenaPrefab(string path, string kit, Palette palette)
        {
            var root = new GameObject("RODOH Governed " + kit + " Arena");
            try
            {
                var visual = Child(root.transform, "Visual");
                if (kit == "lane") BuildLaneArena(visual, palette);
                else if (kit == "islands") BuildIslandsArena(visual, palette);
                else BuildRingArena(visual, palette);
                root.AddComponent<ActionPhysicsQuarantine>();
                SavePrefab(root, path);
                return path;
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(root);
            }
        }

        private static void BuildRingArena(Transform root, Palette palette)
        {
            Primitive("Ring Floor", PrimitiveType.Cylinder, root, Vector3.zero, new Vector3(5.8f, 0.08f, 5.8f), palette.floor);
            for (var index = 0; index < 16; index += 1)
            {
                var angle = index * Mathf.PI * 2f / 16f;
                var marker = Primitive("Ring Marker " + (index + 1), PrimitiveType.Cube, root, new Vector3(Mathf.Cos(angle) * 5.35f, 0.22f, Mathf.Sin(angle) * 5.35f), new Vector3(0.22f, 0.30f, 0.65f), index % 4 == 0 ? palette.marker : palette.trim);
                marker.transform.localRotation = Quaternion.Euler(0f, -angle * Mathf.Rad2Deg, 0f);
            }
            for (var index = 0; index < 4; index += 1)
            {
                var angle = index * Mathf.PI * 0.5f + Mathf.PI * 0.25f;
                Primitive("Arena Monolith " + (index + 1), PrimitiveType.Cube, root, new Vector3(Mathf.Cos(angle) * 4.1f, 0.72f, Mathf.Sin(angle) * 4.1f), new Vector3(0.40f, 1.45f, 0.40f), palette.trim);
            }
        }

        private static void BuildLaneArena(Transform root, Palette palette)
        {
            Primitive("Lane Floor", PrimitiveType.Cube, root, Vector3.zero, new Vector3(7.5f, 0.08f, 3.2f), palette.floor);
            for (var index = -5; index <= 5; index += 1)
            {
                Primitive("Lane Left " + index, PrimitiveType.Cube, root, new Vector3(index * 1.2f, 0.28f, -2.85f), new Vector3(0.42f, 0.52f, 0.24f), index == 0 ? palette.marker : palette.trim);
                Primitive("Lane Right " + index, PrimitiveType.Cube, root, new Vector3(index * 1.2f, 0.28f, 2.85f), new Vector3(0.42f, 0.52f, 0.24f), index == 0 ? palette.marker : palette.trim);
            }
        }

        private static void BuildIslandsArena(Transform root, Palette palette)
        {
            for (var index = 0; index < 5; index += 1)
            {
                var angle = index * Mathf.PI * 2f / 5f;
                var position = new Vector3(Mathf.Cos(angle) * 3.1f, 0f, Mathf.Sin(angle) * 3.1f);
                Primitive("Island " + (index + 1), PrimitiveType.Cylinder, root, position, new Vector3(1.75f, 0.10f, 1.75f), index == 0 ? palette.marker : palette.floor);
            }
            Primitive("Commons", PrimitiveType.Cylinder, root, Vector3.zero, new Vector3(2.0f, 0.08f, 2.0f), palette.trim);
        }

        private static Transform Child(Transform parent, string name)
        {
            var child = new GameObject(name);
            child.transform.SetParent(parent, false);
            return child.transform;
        }

        private static GameObject Primitive(string name, PrimitiveType type, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            var value = GameObject.CreatePrimitive(type);
            value.name = name;
            value.transform.SetParent(parent, false);
            value.transform.localPosition = position;
            value.transform.localScale = scale;
            var collider = value.GetComponent<Collider>();
            if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
            var renderer = value.GetComponent<Renderer>();
            if (renderer != null) renderer.sharedMaterial = material;
            return value;
        }

        private static void SavePrefab(GameObject value, string path)
        {
            AssetDatabase.DeleteAsset(path);
            var prefab = PrefabUtility.SaveAsPrefabAsset(value, path);
            if (prefab == null) throw new InvalidOperationException("Unity refused to save governed prefab: " + path);
        }

        private static string EnemyPath(string kit, string[] paths)
        {
            if (kit == "skirmisher") return paths[0];
            if (kit == "duelist") return paths[1];
            if (kit == "swarm") return paths[2];
            if (kit == "hexer") return paths[3];
            if (kit == "breaker") return paths[4];
            throw new InvalidOperationException("Governed production received an unknown enemy kit: " + kit);
        }

        private static bool HasActivePhysics(string player, string[] enemies, string arena)
        {
            var paths = new List<string> { player, arena };
            paths.AddRange(enemies);
            foreach (var path in paths)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (prefab == null) return true;
                foreach (var body in prefab.GetComponentsInChildren<Rigidbody>(true)) if (!body.isKinematic || body.detectCollisions || body.useGravity) return true;
                foreach (var collider in prefab.GetComponentsInChildren<Collider>(true)) if (collider.enabled) return true;
                foreach (var controller in prefab.GetComponentsInChildren<CharacterController>(true)) if (controller.enabled) return true;
            }
            return false;
        }

        private static string[] MergeRoots(string[] existing, string root)
        {
            var values = new List<string>();
            if (existing != null)
            {
                foreach (var value in existing)
                {
                    if (string.IsNullOrWhiteSpace(value)) continue;
                    var normalized = value.Replace('\\', '/');
                    if (!values.Contains(normalized)) values.Add(normalized);
                }
            }
            if (!values.Contains(root)) values.Add(root);
            values.Sort(StringComparer.Ordinal);
            return values.ToArray();
        }

        private static void EnsureAssetFolder(string path)
        {
            Directory.CreateDirectory(Path.GetFullPath(path));
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        }

        private static T RequireAsset<T>(string path, string label) where T : UnityEngine.Object
        {
            var value = AssetDatabase.LoadAssetAtPath<T>(path);
            if (value == null) throw new InvalidOperationException(label + " is absent or has the wrong type: " + path);
            return value;
        }

        private static string Sha256File(string path)
        {
            using (var stream = File.OpenRead(path))
            using (var sha = SHA256.Create())
            {
                return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", string.Empty).ToLowerInvariant();
            }
        }

        private static string Sanitize(string value)
        {
            var result = new StringBuilder(value == null ? "action" : value.Length);
            foreach (var character in value ?? "action") result.Append(char.IsLetterOrDigit(character) || character == '-' || character == '_' ? character : '-');
            var text = result.ToString().Trim('-');
            return string.IsNullOrWhiteSpace(text) ? "action" : text;
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
