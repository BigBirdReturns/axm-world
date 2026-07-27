using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Compiles one digest-bound rodoh-action-scene-job/1 into a Unity scene. The
    /// job may point at authored prefabs produced by Embodied-AR-Lab or rely on the
    /// complete neutral fallback. Combat remains Arc-owned in both cases.
    /// </summary>
    public static class ActionEstateBatch
    {
        [Serializable]
        private sealed class JobSource
        {
            public string actionProjection;
            public string actionSpecDigest;
            public string arcDigest;
            public string presentationManifest;
            public string presentationManifestId;
        }

        [Serializable]
        private sealed class JobScene
        {
            public string title;
            public string arenaKit;
            public int arenaRadius;
            public string arenaRecipe;
            public float metersPerActionUnit;
            public int maximumActiveEnemies;
        }

        [Serializable]
        private sealed class JobAuthority
        {
            public string action;
            public string presentation;
            public string physicalEvidence;
            public bool unityPhysicsCombatAuthority;
        }

        [Serializable]
        private sealed class SceneJob
        {
            public string format;
            public string jobId;
            public JobSource source;
            public JobScene scene;
            public ActionPresentationAccessibility accessibility;
            public ActionPresentationProvenance provenance;
            public JobAuthority authority;
            public string jobDigest;
        }

        [Serializable]
        private sealed class ValidationReceipt
        {
            public string format = "rodoh-unity-action-estate-validation/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string worldCandidate;
            public string jobDigest;
            public string jobId;
            public string actionSpecDigest;
            public string arcDigest;
            public string presentationManifestId;
            public string scenePath;
            public int maximumActiveEnemies;
            public int authoredPlayerPrefabs;
            public int authoredEnemyPrefabs;
            public int neutralFallbackBodies;
            public bool arenaAuthored;
            public bool deterministicReplay;
            public bool activePhysicsAuthority;
            public string stateFingerprint;
            public string replayFingerprint;
            public string traceFingerprint;
            public int traceTicks;
            public string actionAuthority = "Arc Engine 1.4 action replay and axm-action-receipt/1";
            public string presentationAuthority = "Unity scene compiled from rodoh-action-presentation-manifest/1";
            public string physicalEvidenceAuthority = "axm-embodied observation stream";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "scene-jobs", GetArgument("-jobId") ?? "action-estate-001", "output"));
            var receipt = new ValidationReceipt();
            try
            {
                var jobPath = Path.GetFullPath(GetRequiredArgument("-sceneJob"));
                var job = JsonUtility.FromJson<SceneJob>(File.ReadAllText(jobPath));
                ValidateJob(job);
                receipt.jobDigest = job.jobDigest;
                receipt.jobId = job.jobId;
                receipt.maximumActiveEnemies = job.scene.maximumActiveEnemies;

                var specPath = ResolveJobPath(jobPath, job.source.actionProjection);
                var presentationPath = ResolveJobPath(jobPath, job.source.presentationManifest);
                var specJson = File.ReadAllText(specPath);
                var presentationJson = File.ReadAllText(presentationPath);
                var spec = ActionBridgeJson.ParseSpec(specJson);
                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(presentationJson);
                if (presentation == null) throw new InvalidOperationException("Presentation manifest did not parse.");
                var presentationErrors = presentation.Validate(spec);
                if (presentationErrors.Count > 0) throw new InvalidOperationException(string.Join(" ", presentationErrors));
                if (job.source.actionSpecDigest != spec.sourceSpecDigest || job.source.arcDigest != spec.sourceArcDigest) throw new InvalidOperationException("Scene job identity differs from the projected action spec.");
                if (job.source.presentationManifestId != presentation.manifestId) throw new InvalidOperationException("Scene job presentation identity differs from the manifest.");
                if (job.scene.arenaKit != spec.arena.kit || job.scene.arenaRadius != spec.arena.radius) throw new InvalidOperationException("Scene job arena differs from action law.");
                if (job.scene.maximumActiveEnemies != MaximumEnemies(spec)) throw new InvalidOperationException("Scene job enemy ceiling is stale.");
                receipt.actionSpecDigest = spec.sourceSpecDigest;
                receipt.arcDigest = spec.sourceArcDigest;
                receipt.presentationManifestId = presentation.manifestId;

                var generatedRoot = "Assets/AXM/Generated/ActionEstate/" + SanitizeName(job.jobId);
                Directory.CreateDirectory(Path.GetFullPath(generatedRoot));
                var projectionAssetPath = generatedRoot + "/action-spec.json";
                var presentationAssetPath = generatedRoot + "/presentation.json";
                File.WriteAllText(Path.GetFullPath(projectionAssetPath), specJson);
                File.WriteAllText(Path.GetFullPath(presentationAssetPath), presentationJson);
                AssetDatabase.ImportAsset(projectionAssetPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                AssetDatabase.ImportAsset(presentationAssetPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                var projectionAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(projectionAssetPath);
                if (projectionAsset == null) throw new InvalidOperationException("Unity did not import the action projection.");

                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var root = new GameObject("RODOH Action Estate");
                var runtime = root.AddComponent<ActionRuntimeBehaviour>();
                root.AddComponent<ActionInputRouter>();
                root.AddComponent<ActionGestureLatch>();
                root.AddComponent<ActionSpaceAnchor>();
                root.AddComponent<ActionSafetyGate>();
                runtime.Configure(projectionAsset, 1u, 0, "unity-player", new[] { "unity-player" });

                var bodyRoot = new GameObject("Action Bodies");
                bodyRoot.transform.SetParent(root.transform, false);
                var quarantine = bodyRoot.AddComponent<ActionPhysicsQuarantine>();
                var production = root.AddComponent<ActionProductionPresentation>();
                var playerPrefab = LoadOptional<GameObject>(presentation.player.bodyPrefab, "player body");
                var playerController = LoadOptional<RuntimeAnimatorController>(presentation.player.animatorController, "player animator controller");
                if (playerPrefab != null) receipt.authoredPlayerPrefabs = 1;
                else receipt.neutralFallbackBodies += 1;

                var enemyBindings = new ActionEnemyPrefabBinding[presentation.enemies.Length];
                for (var index = 0; index < presentation.enemies.Length; index += 1)
                {
                    var enemy = presentation.enemies[index];
                    var prefab = LoadOptional<GameObject>(enemy.bodyPrefab, enemy.kit + " body");
                    var controller = LoadOptional<RuntimeAnimatorController>(enemy.animatorController, enemy.kit + " animator controller");
                    if (prefab != null) receipt.authoredEnemyPrefabs += 1;
                    else receipt.neutralFallbackBodies += 1;
                    enemyBindings[index] = new ActionEnemyPrefabBinding
                    {
                        kit = enemy.kit,
                        prefab = prefab,
                        animatorController = controller,
                        neutralFallback = enemy.neutralFallback,
                        scale = enemy.scale
                    };
                }
                production.Configure(runtime, bodyRoot.transform, playerPrefab, playerController, presentation.player.neutralFallback, presentation.player.scale, enemyBindings, presentation.arena.metersPerActionUnit);

                var arenaRoot = new GameObject("Action Arena");
                arenaRoot.transform.SetParent(root.transform, false);
                receipt.arenaAuthored = BuildArena(job, presentation, arenaRoot.transform);
                if (ParseBoolean(GetArgument("-createDesktopRig"), true)) CreateDesktopRig(root.transform, presentation.Quality("standard"));

                runtime.StartRuntime();
                production.ApplyState(runtime.State);
                quarantine.ApplyHierarchy();
                receipt.activePhysicsAuthority = quarantine.HasActivePhysicsAuthority();
                if (receipt.activePhysicsAuthority) throw new InvalidOperationException("Imported action body retained active physics authority after quarantine.");
                if (production.ActiveAuthoredBodies() < 2) throw new InvalidOperationException("Generated action scene did not materialize player and first-wave bodies.");

                var trace = BuildSmokeTrace(spec, 1u, out var firstState);
                var replay = ActionKernel.RunTrace(spec, 1u, trace.Snapshot());
                receipt.stateFingerprint = ActionConformanceFingerprint.State(spec, firstState);
                receipt.replayFingerprint = ActionConformanceFingerprint.State(spec, replay);
                receipt.traceFingerprint = ActionConformanceFingerprint.Trace(trace.Snapshot());
                receipt.traceTicks = trace.TotalTicks;
                receipt.deterministicReplay = receipt.stateFingerprint == receipt.replayFingerprint;
                if (!receipt.deterministicReplay) throw new InvalidOperationException("Unity estate smoke replay diverged.");

                var requestedScenePath = GetArgument("-scenePath");
                var scenePath = string.IsNullOrWhiteSpace(requestedScenePath) ? generatedRoot + "/" + SanitizeName(job.jobId) + ".unity" : requestedScenePath.Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Generated scene path must remain in Assets/.");
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(scenePath)) ?? throw new InvalidOperationException("Scene output directory is unavailable."));
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the generated action estate scene.");
                receipt.scenePath = scenePath;
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                File.WriteAllText(Path.Combine(outputRoot, "validation.json"), JsonUtility.ToJson(receipt, true));
                AssetDatabase.SaveAssets();
                Debug.Log("RODOH Unity action estate validation passed: " + Path.Combine(outputRoot, "validation.json"));
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "validation.json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the controlling compiler failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static bool BuildArena(SceneJob job, ActionPresentationManifest presentation, Transform root)
        {
            var recipePath = presentation.arena.recipe;
            if (!string.IsNullOrWhiteSpace(recipePath))
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(recipePath);
                if (prefab == null) throw new InvalidOperationException("Authored arena recipe could not be loaded: " + recipePath);
                var instance = PrefabUtility.InstantiatePrefab(prefab, root) as GameObject;
                if (instance == null) throw new InvalidOperationException("Authored arena recipe could not be instantiated: " + recipePath);
                instance.name = "Authored " + job.scene.arenaKit + " Arena";
                QuarantineArenaCombatComponents(instance);
                return true;
            }
            if (!presentation.arena.neutralFallback) throw new InvalidOperationException("Arena recipe is absent and neutral fallback is disabled.");
            var radius = job.scene.arenaRadius * presentation.arena.metersPerActionUnit;
            if (job.scene.arenaKit == "lane")
            {
                CreateFloor("Neutral Lane", root, new Vector3(radius * 1.8f, 0.08f, radius * 0.65f), Vector3.zero);
                return false;
            }
            if (job.scene.arenaKit == "islands")
            {
                for (var index = 0; index < 5; index += 1)
                {
                    var angle = index * Mathf.PI * 2f / 5f;
                    CreateFloor("Neutral Island " + (index + 1), root, new Vector3(radius * 0.28f, 0.05f, radius * 0.28f), new Vector3(Mathf.Cos(angle) * radius * 0.45f, 0f, Mathf.Sin(angle) * radius * 0.45f), PrimitiveType.Cylinder);
                }
                return false;
            }
            CreateFloor("Neutral Ring", root, new Vector3(radius, 0.05f, radius), Vector3.zero, PrimitiveType.Cylinder);
            return false;
        }

        private static void CreateFloor(string name, Transform parent, Vector3 scale, Vector3 position, PrimitiveType primitive = PrimitiveType.Cube)
        {
            var gameObject = GameObject.CreatePrimitive(primitive);
            gameObject.name = name;
            gameObject.transform.SetParent(parent, false);
            gameObject.transform.localPosition = position;
            gameObject.transform.localScale = scale;
            var collider = gameObject.GetComponent<Collider>();
            if (collider != null) collider.enabled = false;
        }

        private static void QuarantineArenaCombatComponents(GameObject root)
        {
            foreach (var body in root.GetComponentsInChildren<Rigidbody>(true))
            {
                body.velocity = Vector3.zero;
                body.angularVelocity = Vector3.zero;
                body.useGravity = false;
                body.detectCollisions = false;
                body.isKinematic = true;
            }
        }

        private static T LoadOptional<T>(string path, string label) where T : UnityEngine.Object
        {
            if (string.IsNullOrWhiteSpace(path)) return null;
            if (!path.Replace('\\', '/').StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException(label + " must remain under Assets/.");
            var value = AssetDatabase.LoadAssetAtPath<T>(path.Replace('\\', '/'));
            if (value == null) throw new InvalidOperationException(label + " is absent or the wrong asset type: " + path);
            return value;
        }

        private static void ValidateJob(SceneJob job)
        {
            if (job == null || job.format != "rodoh-action-scene-job/1") throw new InvalidOperationException("Unknown action scene-job format.");
            if (string.IsNullOrWhiteSpace(job.jobId) || string.IsNullOrWhiteSpace(job.jobDigest) || !job.jobDigest.StartsWith("unityjob1_", StringComparison.Ordinal)) throw new InvalidOperationException("Scene-job identity is absent or malformed.");
            if (job.source == null || job.scene == null || job.authority == null) throw new InvalidOperationException("Scene-job source, scene, or authority block is absent.");
            if (job.authority.unityPhysicsCombatAuthority) throw new InvalidOperationException("Scene job attempts to grant Unity physics combat authority.");
            if (job.scene.maximumActiveEnemies < 1 || job.scene.maximumActiveEnemies > 12) throw new InvalidOperationException("Scene-job enemy ceiling is outside action v1.");
        }

        private static string ResolveJobPath(string jobPath, string value)
        {
            if (string.IsNullOrWhiteSpace(value)) throw new InvalidOperationException("Scene job contains an empty source path.");
            return Path.IsPathRooted(value) ? Path.GetFullPath(value) : Path.GetFullPath(Path.Combine(Path.GetDirectoryName(jobPath) ?? Directory.GetCurrentDirectory(), value));
        }

        private static int MaximumEnemies(ActionSpecProjection spec)
        {
            var maximum = 0;
            foreach (var objective in spec.objectives) maximum = Math.Max(maximum, objective.enemyCount);
            return maximum;
        }

        private static ActionTraceRecorder BuildSmokeTrace(ActionSpecProjection spec, uint seed, out ActionSimulationState terminal)
        {
            var recorder = new ActionTraceRecorder();
            var state = ActionKernel.InitialState(spec, seed);
            while (state.result == null && state.tick < spec.maxTicks)
            {
                var input = PolicyInput(spec, state);
                recorder.Append(input);
                ActionKernel.Step(spec, state, input);
            }
            if (state.result == null) throw new InvalidOperationException("Estate smoke trace did not reach a terminal state.");
            terminal = state;
            return recorder;
        }

        private static ActionInputFrame PolicyInput(ActionSpecProjection spec, ActionSimulationState state)
        {
            ActionEnemyState target = null;
            long nearest = long.MaxValue;
            foreach (var enemy in state.enemies)
            {
                if (enemy.mode == ActionEnemyMode.Defeated) continue;
                var dx = (long)enemy.x - state.player.x;
                var dy = (long)enemy.y - state.player.y;
                var distance = dx * dx + dy * dy;
                if (distance >= nearest) continue;
                target = enemy;
                nearest = distance;
            }
            if (target == null) return default;
            var moveX = Math.Sign(target.x - state.player.x);
            var moveY = Math.Sign(target.y - state.player.y);
            var light = spec.AttackLaw("light");
            var inRange = nearest <= (long)light.range * light.range;
            var buttons = 0;
            if (state.player.mode == ActionPlayerMode.Idle)
            {
                var enemyLaw = spec.EnemyLaw(target.kit);
                if (target.mode == ActionEnemyMode.Telegraph && target.modeTick >= Math.Max(0, enemyLaw.telegraphTicks - spec.player.parryActiveTicks)) buttons = ActionContract.Parry;
                else if (inRange && state.tick % 6 == 0) buttons = state.tick % 24 == 0 ? ActionContract.Heavy : ActionContract.Light;
            }
            return new ActionInputFrame
            {
                moveX = inRange ? 0 : moveX,
                moveY = inRange ? 0 : moveY,
                aimX = moveX,
                aimY = moveY,
                buttons = buttons
            };
        }

        private static void CreateDesktopRig(Transform parent, ActionQualityProfile quality)
        {
            var cameraObject = new GameObject("Desktop Preview Camera");
            cameraObject.transform.SetParent(parent, false);
            cameraObject.transform.position = new Vector3(0f, 11f, -10f);
            cameraObject.transform.rotation = Quaternion.Euler(43f, 0f, 0f);
            cameraObject.AddComponent<Camera>();
            cameraObject.AddComponent<AudioListener>();
            var lightObject = new GameObject("Preview Light");
            lightObject.transform.SetParent(parent, false);
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.shadows = quality != null && quality.shadowMode == "one-directional" ? LightShadows.Hard : LightShadows.None;
            light.intensity = 1.1f;
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

        private static bool ParseBoolean(string value, bool fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : bool.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private static string SanitizeName(string value)
        {
            foreach (var invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '-');
            return string.IsNullOrWhiteSpace(value) ? "action-estate-001" : value;
        }
    }
}
