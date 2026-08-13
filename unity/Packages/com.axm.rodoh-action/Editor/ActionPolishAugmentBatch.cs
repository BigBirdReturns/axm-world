using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Installs the complete low-cost presentation floor into a generated action
    /// scene. All components are downstream readers of deterministic action state.
    /// </summary>
    public static class ActionPolishAugmentBatch
    {
        [Serializable]
        private sealed class SceneJobSource
        {
            public string actionSpecDigest;
            public string arcDigest;
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
            public string format = "rodoh-unity-action-polish-augmentation/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string scenePath;
            public string jobDigest;
            public string actionSpecDigest;
            public string presentationManifestId;
            public string themeId;
            public bool proceduralMotion;
            public bool boundedCamera;
            public bool visualFeedback;
            public bool proceduralAudio;
            public bool preferenceControlled;
            public bool reducedMotion;
            public bool highContrast;
            public bool activePhysicsAuthority;
            public string semanticAuthority = "presentation only";
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-polish", "receipts"));
            var receipt = new Receipt();
            try
            {
                var scenePath = GetRequiredArgument("-scenePath").Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Action polish scene must remain under Assets/.");
                var sceneJobPath = Path.GetFullPath(GetRequiredArgument("-sceneJob"));
                var presentationPath = Path.GetFullPath(GetRequiredArgument("-presentation"));
                var sceneJob = JsonUtility.FromJson<SceneJob>(File.ReadAllText(sceneJobPath));
                var manifest = JsonUtility.FromJson<ActionPresentationManifest>(File.ReadAllText(presentationPath));
                if (sceneJob == null || sceneJob.format != "rodoh-action-scene-job/1") throw new InvalidOperationException("Unknown action scene-job format.");
                if (manifest == null || manifest.format != "rodoh-action-presentation-manifest/1") throw new InvalidOperationException("Unknown action presentation manifest format.");
                if (manifest.sourceActionSpecDigest != sceneJob.source.actionSpecDigest) throw new InvalidOperationException("Action polish manifest is bound to a different action spec.");
                var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
                var runtime = FindExactlyOne<ActionRuntimeBehaviour>(scene);
                var production = FindExactlyOne<ActionProductionPresentation>(scene);
                var bodies = FindChildByName(scene, "Action Bodies") ?? production.transform;
                var camera = FindCamera(scene);
                var reducedMotion = ParseBoolean(GetArgument("-reducedMotion"), false);
                var highContrast = ParseBoolean(GetArgument("-highContrast"), false);

                var motion = runtime.GetComponent<ActionProceduralMotionDriver>() ?? runtime.gameObject.AddComponent<ActionProceduralMotionDriver>();
                motion.Configure(runtime, bodies, reducedMotion);
                var visual = runtime.GetComponent<ActionVisualFeedback>() ?? runtime.gameObject.AddComponent<ActionVisualFeedback>();
                visual.Configure(runtime, production, bodies);
                visual.SetPreferences(true, reducedMotion, highContrast);
                var audio = runtime.GetComponent<ActionProceduralAudio>() ?? runtime.gameObject.AddComponent<ActionProceduralAudio>();
                audio.Configure(production, manifest.themeId);
                var combatCamera = runtime.GetComponent<ActionCombatCamera>() ?? runtime.gameObject.AddComponent<ActionCombatCamera>();
                combatCamera.Configure(runtime, production, bodies, camera);
                combatCamera.SetReducedMotion(reducedMotion);

                var quarantine = bodies.GetComponent<ActionPhysicsQuarantine>() ?? bodies.gameObject.AddComponent<ActionPhysicsQuarantine>();
                quarantine.ApplyHierarchy();
                if (quarantine.HasActivePhysicsAuthority()) throw new InvalidOperationException("Polished action body hierarchy retains active Unity physics authority.");

                EditorUtility.SetDirty(runtime.gameObject);
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the polished action scene.");
                AssetDatabase.SaveAssets();

                receipt.scenePath = scenePath;
                receipt.jobDigest = sceneJob.jobDigest;
                receipt.actionSpecDigest = sceneJob.source.actionSpecDigest;
                receipt.presentationManifestId = sceneJob.source.presentationManifestId;
                receipt.themeId = manifest.themeId;
                receipt.proceduralMotion = motion != null;
                receipt.boundedCamera = combatCamera != null;
                receipt.visualFeedback = visual != null;
                receipt.proceduralAudio = audio != null;
                receipt.preferenceControlled = true;
                receipt.reducedMotion = reducedMotion;
                receipt.highContrast = highContrast;
                receipt.activePhysicsAuthority = quarantine.HasActivePhysicsAuthority();
                if (!receipt.proceduralMotion || !receipt.boundedCamera || !receipt.visualFeedback || !receipt.proceduralAudio) throw new InvalidOperationException("Action polish augmentation is incomplete.");
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "polish-augmentation.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true));
                Debug.Log("RODOH action polish augmentation passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "polish-augmentation.json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the controlling polish failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static T FindExactlyOne<T>(Scene scene) where T : Component
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
            if (count != 1 || match == null) throw new InvalidOperationException("Action polish scene contains " + count + " " + typeof(T).Name + " components; expected exactly one.");
            return match;
        }

        private static Transform FindChildByName(Scene scene, string name)
        {
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var transform in root.GetComponentsInChildren<Transform>(true)) if (transform.name == name) return transform;
            }
            return null;
        }

        private static Camera FindCamera(Scene scene)
        {
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var camera in root.GetComponentsInChildren<Camera>(true)) if (camera.CompareTag("MainCamera")) return camera;
            }
            foreach (var root in scene.GetRootGameObjects())
            {
                var camera = root.GetComponentInChildren<Camera>(true);
                if (camera != null) return camera;
            }
            throw new InvalidOperationException("Action polish scene contains no camera.");
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
