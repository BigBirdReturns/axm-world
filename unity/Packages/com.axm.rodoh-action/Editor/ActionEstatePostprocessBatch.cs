using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Installs the complete post-compile estate around a generated action scene:
    /// adaptive quality, immutable Quest spool, physical-stop linkage, performance
    /// telemetry, and explicit presentation-only authority. It does not alter the
    /// action projection or deterministic runtime state.
    /// </summary>
    public static class ActionEstatePostprocessBatch
    {
        [Serializable]
        private sealed class SceneJobSource
        {
            public string actionProjection;
            public string actionSpecDigest;
            public string arcDigest;
            public string presentationManifest;
            public string presentationManifestId;
        }

        [Serializable]
        private sealed class SceneJob
        {
            public string format;
            public string jobId;
            public SceneJobSource source;
            public string jobDigest;
        }

        [Serializable]
        private sealed class Receipt
        {
            public string format = "rodoh-unity-action-estate-postprocess/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string scenePath;
            public string jobDigest;
            public string actionSpecDigest;
            public string presentationManifestId;
            public string sessionId;
            public string deviceId;
            public string initialQuality;
            public bool adaptiveQuality;
            public bool questSpool;
            public bool safetySpool;
            public bool performanceReceipt;
            public bool productionPresentation;
            public bool activePhysicsAuthority;
            public int qualityProfiles;
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string presentationAuthority = "Unity generated scene and cartridge presentation manifest";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "scene-jobs", "action-estate", "output"));
            var receipt = new Receipt();
            try
            {
                var projectRoot = Path.GetFullPath(GetArgument("-projectPath") ?? Directory.GetCurrentDirectory());
                var scenePath = GetRequiredArgument("-scenePath").Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Action estate scene must remain under Assets/.");
                var absoluteScene = Path.GetFullPath(Path.Combine(projectRoot, scenePath));
                if (!File.Exists(absoluteScene)) throw new FileNotFoundException("Generated action scene is absent.", absoluteScene);
                var sceneJobPath = Path.GetFullPath(GetRequiredArgument("-sceneJob"));
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var sceneJob = JsonUtility.FromJson<SceneJob>(File.ReadAllText(sceneJobPath));
                var presentation = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                if (sceneJob == null || sceneJob.format != "rodoh-action-scene-job/1") throw new InvalidOperationException("Unknown action scene-job format.");
                if (presentation == null) throw new InvalidOperationException("Action presentation manifest did not parse.");
                var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
                var runtime = FindExactlyOne<ActionRuntimeBehaviour>(scene, "action runtime");
                var production = FindExactlyOne<ActionProductionPresentation>(scene, "production presentation");
                var bodyRoot = FindChildByName(scene, "Action Bodies") ?? production.transform;
                var quarantine = bodyRoot.GetComponent<ActionPhysicsQuarantine>() ?? bodyRoot.gameObject.AddComponent<ActionPhysicsQuarantine>();
                quarantine.ApplyHierarchy();
                if (quarantine.HasActivePhysicsAuthority()) throw new InvalidOperationException("Action body hierarchy retains active Unity physics authority.");

                var quality = runtime.GetComponent<ActionQualityGovernor>() ?? runtime.gameObject.AddComponent<ActionQualityGovernor>();
                var initialQuality = GetArgument("-initialQuality") ?? "standard";
                var adaptive = ParseBoolean(GetArgument("-adaptiveQuality"), true);
                quality.Configure(presentation.qualityProfiles, initialQuality, adaptive);

                var qualityAdapter = runtime.GetComponent<ActionQualityPresentationAdapter>() ?? runtime.gameObject.AddComponent<ActionQualityPresentationAdapter>();
                var effectsRoot = FindChildByName(scene, "Action Effects");
                if (effectsRoot == null)
                {
                    var effects = new GameObject("Action Effects");
                    effects.transform.SetParent(runtime.transform, false);
                    effectsRoot = effects.transform;
                }
                qualityAdapter.Configure(quality, bodyRoot, effectsRoot, FindSceneCameras(scene));

                var sessionId = GetArgument("-sessionId") ?? sceneJob.jobId;
                var deviceId = GetArgument("-deviceId") ?? "unity-local";
                var spool = runtime.GetComponent<ActionSessionSpoolRuntime>() ?? runtime.gameObject.AddComponent<ActionSessionSpoolRuntime>();
                spool.Configure(runtime, sessionId, deviceId, sceneJob.jobDigest);

                var safety = runtime.GetComponent<ActionSafetyGate>() ?? runtime.gameObject.AddComponent<ActionSafetyGate>();
                var safetySpool = runtime.GetComponent<ActionSafetySpoolRuntimeAdapter>() ?? runtime.gameObject.AddComponent<ActionSafetySpoolRuntimeAdapter>();
                var performance = runtime.GetComponent<ActionPerformanceRecorder>() ?? runtime.gameObject.AddComponent<ActionPerformanceRecorder>();
                runtime.GetComponent<ActionGestureLatch>() ?? runtime.gameObject.AddComponent<ActionGestureLatch>();
                runtime.GetComponent<ActionSpaceAnchor>() ?? runtime.gameObject.AddComponent<ActionSpaceAnchor>();

                var trackedHeadPath = GetArgument("-trackedHeadPath");
                var trackedHead = string.IsNullOrWhiteSpace(trackedHeadPath) ? null : GameObject.Find(trackedHeadPath)?.transform;
                var presentationRoot = FindChildByName(scene, "Action Arena") ?? runtime.transform;
                if (trackedHead != null)
                {
                    var anchor = runtime.GetComponent<ActionSpaceAnchor>();
                    anchor.Configure(runtime.transform, trackedHead, trackedHead);
                    safety.Configure(runtime, runtime.GetComponent<ActionInputRouter>(), trackedHead, presentationRoot);
                }

                EditorUtility.SetDirty(runtime.gameObject);
                EditorUtility.SetDirty(bodyRoot.gameObject);
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the postprocessed action scene.");
                AssetDatabase.SaveAssets();

                receipt.scenePath = scenePath;
                receipt.jobDigest = sceneJob.jobDigest;
                receipt.actionSpecDigest = sceneJob.source.actionSpecDigest;
                receipt.presentationManifestId = sceneJob.source.presentationManifestId;
                receipt.sessionId = sessionId;
                receipt.deviceId = deviceId;
                receipt.initialQuality = initialQuality;
                receipt.adaptiveQuality = adaptive;
                receipt.questSpool = spool != null;
                receipt.safetySpool = safetySpool != null;
                receipt.performanceReceipt = performance != null;
                receipt.productionPresentation = production != null;
                receipt.activePhysicsAuthority = quarantine.HasActivePhysicsAuthority();
                receipt.qualityProfiles = presentation.qualityProfiles?.Length ?? 0;
                if (!receipt.questSpool || !receipt.safetySpool || !receipt.performanceReceipt || !receipt.productionPresentation) throw new InvalidOperationException("Postprocessed action estate is missing a required runtime component.");
                if (receipt.qualityProfiles != 3) throw new InvalidOperationException("Postprocessed action estate does not carry low, standard, and high quality profiles.");
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                File.WriteAllText(Path.Combine(outputRoot, "estate-postprocess.json"), JsonUtility.ToJson(receipt, true));
                Debug.Log("RODOH action estate postprocess passed: " + Path.Combine(outputRoot, "estate-postprocess.json"));
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "estate-postprocess.json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the controlling Unity failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static T FindExactlyOne<T>(Scene scene, string label) where T : Component
        {
            T match = null;
            var count = 0;
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var component in root.GetComponentsInChildren<T>(true))
                {
                    match = component;
                    count += 1;
                }
            }
            if (count != 1 || match == null) throw new InvalidOperationException("Generated action scene contains " + count + " " + label + " components; expected exactly one.");
            return match;
        }

        private static Transform FindChildByName(Scene scene, string name)
        {
            foreach (var root in scene.GetRootGameObjects())
            {
                var transforms = root.GetComponentsInChildren<Transform>(true);
                foreach (var transform in transforms) if (transform.name == name) return transform;
            }
            return null;
        }

        private static Camera[] FindSceneCameras(Scene scene)
        {
            var values = new System.Collections.Generic.List<Camera>();
            foreach (var root in scene.GetRootGameObjects()) values.AddRange(root.GetComponentsInChildren<Camera>(true));
            return values.ToArray();
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
    }
}
