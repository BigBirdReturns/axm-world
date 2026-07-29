using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    public static class ActionBridgeBatch
    {
        [Serializable]
        private sealed class ValidationReceipt
        {
            public string format = "rodoh-unity-action-validation/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string actionProjectionFormat;
            public string sourceActionSpecDigest;
            public string sourceArcDigest;
            public string challengeId;
            public int tickRate;
            public string scenePath;
            public string stateFingerprint;
            public string replayFingerprint;
            public string traceFingerprint;
            public int traceTicks;
            public bool deterministicReplay;
            public bool unityPhysicsAuthority;
            public string actionAuthority = "Arc Engine 1.4 replay and receipt verification";
            public string presentationAuthority = "Unity scene, tracking, animation, camera, VFX, audio, and haptics";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = GetArgument("-outputRoot") ?? Path.Combine("local", "scene-jobs", GetArgument("-jobId") ?? "action-001", "output");
            var receipt = new ValidationReceipt();
            try
            {
                var sourcePath = GetRequiredArgument("-actionSpec");
                var jobId = SanitizeName(GetArgument("-jobId") ?? Path.GetFileNameWithoutExtension(sourcePath));
                outputRoot = Path.GetFullPath(outputRoot);
                Directory.CreateDirectory(outputRoot);

                var json = File.ReadAllText(Path.GetFullPath(sourcePath));
                var spec = ActionBridgeJson.ParseSpec(json);
                receipt.actionProjectionFormat = spec.format;
                receipt.sourceActionSpecDigest = spec.sourceSpecDigest;
                receipt.sourceArcDigest = spec.sourceArcDigest;
                receipt.challengeId = spec.challengeId;
                receipt.tickRate = spec.tickRate;

                var assetDirectory = "Assets/AXM/Generated/" + jobId;
                Directory.CreateDirectory(Path.GetFullPath(assetDirectory));
                var projectionAssetPath = assetDirectory + "/" + jobId + ".unity-action-spec.json";
                File.WriteAllText(Path.GetFullPath(projectionAssetPath), json);
                AssetDatabase.ImportAsset(projectionAssetPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
                var projectionAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(projectionAssetPath);
                if (projectionAsset == null) throw new InvalidOperationException("Unity did not import the action projection as a TextAsset.");

                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var runtimeObject = new GameObject("RODOH Action Runtime");
                var router = runtimeObject.AddComponent<ActionInputRouter>();
                var presentation = runtimeObject.AddComponent<ActionPrimitivePresentation>();
                var runtime = runtimeObject.AddComponent<ActionRuntimeBehaviour>();
                runtime.Configure(projectionAsset, 1u, 0, "unity-player", new[] { "unity-player" });

                if (ParseBoolean(GetArgument("-createDesktopRig"), true)) CreateDesktopRig(runtimeObject.transform);

                var requestedScenePath = GetArgument("-scenePath");
                var scenePath = string.IsNullOrWhiteSpace(requestedScenePath) ? assetDirectory + "/" + jobId + ".unity" : requestedScenePath.Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Scene path must be inside Assets/.");
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(scenePath)) ?? throw new InvalidOperationException("Scene directory is unavailable."));
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the generated action scene.");
                receipt.scenePath = scenePath;

                var trace = BuildSmokeTrace(spec, 1u, out var firstState);
                var replay = ActionKernel.RunTrace(spec, 1u, trace.Snapshot());
                receipt.stateFingerprint = ActionConformanceFingerprint.State(spec, firstState);
                receipt.replayFingerprint = ActionConformanceFingerprint.State(spec, replay);
                receipt.traceFingerprint = ActionConformanceFingerprint.Trace(trace.Snapshot());
                receipt.traceTicks = trace.TotalTicks;
                receipt.deterministicReplay = receipt.stateFingerprint == receipt.replayFingerprint;
                receipt.unityPhysicsAuthority = presentation.UsesUnityPhysicsAuthority();
                if (!receipt.deterministicReplay) throw new InvalidOperationException("Unity action mirror replay diverged on an identical trace.");
                if (receipt.unityPhysicsAuthority) throw new InvalidOperationException("Generated action presentation contains an enabled collider or Rigidbody.");

                receipt.status = "pass";
                File.WriteAllText(Path.Combine(outputRoot, "validation.json"), JsonUtility.ToJson(receipt, true));
                AssetDatabase.SaveAssets();
                Debug.Log("RODOH Unity action bridge validation passed: " + Path.Combine(outputRoot, "validation.json"));
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(Path.GetFullPath(outputRoot));
                    File.WriteAllText(Path.Combine(Path.GetFullPath(outputRoot), "validation.json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the original compiler failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
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
            if (state.result == null) throw new InvalidOperationException("Smoke trace did not reach a terminal state by maxTicks.");
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
            var buttons = 0;
            var light = spec.AttackLaw("light");
            if (state.player.mode == ActionPlayerMode.Idle)
            {
                if (target.mode == ActionEnemyMode.Telegraph && target.modeTick >= Math.Max(0, spec.EnemyLaw(target.kit).telegraphTicks - spec.player.parryActiveTicks)) buttons = ActionContract.Parry;
                else if (nearest <= (long)light.range * light.range) buttons = state.tick % 4 == 0 ? ActionContract.Heavy : ActionContract.Light;
            }
            return new ActionInputFrame
            {
                moveX = nearest <= (long)light.range * light.range ? 0 : moveX,
                moveY = nearest <= (long)light.range * light.range ? 0 : moveY,
                aimX = moveX,
                aimY = moveY,
                buttons = buttons
            };
        }

        private static void CreateDesktopRig(Transform parent)
        {
            var cameraObject = new GameObject("Desktop Preview Camera");
            cameraObject.transform.SetParent(parent, false);
            cameraObject.transform.position = new Vector3(0f, 11f, -10f);
            cameraObject.transform.rotation = Quaternion.Euler(43f, 0f, 0f);
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            cameraObject.AddComponent<AudioListener>();

            var lightObject = new GameObject("Preview Light");
            lightObject.transform.SetParent(parent, false);
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.shadows = LightShadows.None;
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
            for (var index = 0; index < arguments.Length - 1; index += 1)
            {
                if (arguments[index] == name) return arguments[index + 1];
            }
            return null;
        }

        private static bool ParseBoolean(string value, bool fallback)
        {
            if (string.IsNullOrWhiteSpace(value)) return fallback;
            return bool.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private static string SanitizeName(string value)
        {
            foreach (var invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '-');
            return string.IsNullOrWhiteSpace(value) ? "action-001" : value;
        }
    }
}
