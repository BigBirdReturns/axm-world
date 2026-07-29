using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.XR;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Adds the dependency-light Quest/OpenXR receiver to a completed action estate.
    /// Existing Embodied-AR-Lab XR packages and project settings remain authoritative.
    /// </summary>
    public static class ActionQuestAugmentBatch
    {
        [Serializable]
        private sealed class Receipt
        {
            public string format = "rodoh-unity-action-quest-augmentation/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string scenePath;
            public string actionSpecDigest;
            public string trackedHead;
            public bool oneHanded;
            public string dominantHand;
            public bool xrControllerInput;
            public bool xrHaptics;
            public bool xrTrackingSafety;
            public bool boundaryReporter;
            public bool sessionSpool;
            public bool adaptiveQuality;
            public bool activePhysicsAuthority;
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string xrAuthority = "Unity XR input, haptics, tracking, and physical safety only";
            public string error;
        }

        public static void Run()
        {
            var outputRoot = Path.GetFullPath(GetArgument("-outputRoot") ?? Path.Combine("local", "action-quest", "receipts"));
            var receipt = new Receipt();
            try
            {
                var scenePath = GetRequiredArgument("-scenePath").Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Quest action scene must remain under Assets/.");
                var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
                var runtime = FindExactlyOne<ActionRuntimeBehaviour>(scene);
                var router = runtime.GetComponent<ActionInputRouter>() ?? runtime.gameObject.AddComponent<ActionInputRouter>();
                var production = FindExactlyOne<ActionProductionPresentation>(scene);
                var quality = runtime.GetComponent<ActionQualityGovernor>() ?? throw new InvalidOperationException("Quest action scene lacks the adaptive quality governor.");
                var spool = runtime.GetComponent<ActionSessionSpoolRuntime>() ?? throw new InvalidOperationException("Quest action scene lacks the immutable session spool.");
                var safety = runtime.GetComponent<ActionSafetyGate>() ?? runtime.gameObject.AddComponent<ActionSafetyGate>();
                var camera = ResolveTrackedHead(scene, GetArgument("-trackedHeadPath"));
                var oneHanded = ParseBoolean(GetArgument("-oneHanded"), false);
                var dominant = ParseHand(GetArgument("-dominantHand") ?? "right");

                var controller = runtime.GetComponent<ActionXrControllerInput>() ?? runtime.gameObject.AddComponent<ActionXrControllerInput>();
                controller.Configure(router, oneHanded, dominant);
                var haptics = runtime.GetComponent<ActionXrHaptics>() ?? runtime.gameObject.AddComponent<ActionXrHaptics>();
                var tracking = runtime.GetComponent<ActionXrTrackingSafety>() ?? runtime.gameObject.AddComponent<ActionXrTrackingSafety>();
                tracking.Configure(runtime, router, spool, camera);
                var boundary = runtime.GetComponent<ActionBoundaryReporter>() ?? runtime.gameObject.AddComponent<ActionBoundaryReporter>();
                boundary.Configure(safety, camera);
                var arena = FindChildByName(scene, "Action Arena") ?? runtime.transform;
                safety.Configure(runtime, router, camera, arena);
                var anchor = runtime.GetComponent<ActionSpaceAnchor>() ?? runtime.gameObject.AddComponent<ActionSpaceAnchor>();
                anchor.Configure(runtime.transform, camera, camera);

                var bodyRoot = FindChildByName(scene, "Action Bodies") ?? production.transform;
                var quarantine = bodyRoot.GetComponent<ActionPhysicsQuarantine>() ?? bodyRoot.gameObject.AddComponent<ActionPhysicsQuarantine>();
                quarantine.ApplyHierarchy();
                if (quarantine.HasActivePhysicsAuthority()) throw new InvalidOperationException("Quest action body hierarchy retains active Unity physics authority.");

                EditorUtility.SetDirty(runtime.gameObject);
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the Quest-augmented action scene.");
                AssetDatabase.SaveAssets();

                receipt.scenePath = scenePath;
                receipt.actionSpecDigest = runtime.Spec?.sourceSpecDigest;
                receipt.trackedHead = FullPath(camera);
                receipt.oneHanded = oneHanded;
                receipt.dominantHand = dominant.ToString();
                receipt.xrControllerInput = controller != null;
                receipt.xrHaptics = haptics != null;
                receipt.xrTrackingSafety = tracking != null;
                receipt.boundaryReporter = boundary != null;
                receipt.sessionSpool = spool != null;
                receipt.adaptiveQuality = quality != null;
                receipt.activePhysicsAuthority = quarantine.HasActivePhysicsAuthority();
                if (!receipt.xrControllerInput || !receipt.xrHaptics || !receipt.xrTrackingSafety || !receipt.boundaryReporter || !receipt.sessionSpool || !receipt.adaptiveQuality) throw new InvalidOperationException("Quest augmentation is missing one or more required receiver components.");
                receipt.status = "pass";
                Directory.CreateDirectory(outputRoot);
                var receiptPath = Path.Combine(outputRoot, "quest-augmentation.json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true));
                Debug.Log("RODOH action Quest augmentation passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(outputRoot);
                    File.WriteAllText(Path.Combine(outputRoot, "quest-augmentation.json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the controlling Quest augmentation failure.
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
            if (count != 1 || match == null) throw new InvalidOperationException("Quest action scene contains " + count + " " + typeof(T).Name + " components; expected exactly one.");
            return match;
        }

        private static Transform ResolveTrackedHead(Scene scene, string configuredPath)
        {
            if (!string.IsNullOrWhiteSpace(configuredPath))
            {
                var configured = GameObject.Find(configuredPath)?.transform;
                if (configured == null) throw new InvalidOperationException("Configured Quest tracked-head path is absent: " + configuredPath);
                return configured;
            }
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var camera in root.GetComponentsInChildren<Camera>(true))
                {
                    if (camera.CompareTag("MainCamera")) return camera.transform;
                }
            }
            foreach (var root in scene.GetRootGameObjects())
            {
                var camera = root.GetComponentInChildren<Camera>(true);
                if (camera != null) return camera.transform;
            }
            throw new InvalidOperationException("Quest action scene contains no camera or tracked-head transform.");
        }

        private static Transform FindChildByName(Scene scene, string name)
        {
            foreach (var root in scene.GetRootGameObjects())
            {
                foreach (var transform in root.GetComponentsInChildren<Transform>(true)) if (transform.name == name) return transform;
            }
            return null;
        }

        private static XRNode ParseHand(string value)
        {
            return value.Trim().ToLowerInvariant() == "left" ? XRNode.LeftHand : XRNode.RightHand;
        }

        private static string FullPath(Transform transform)
        {
            var value = transform.name;
            var current = transform.parent;
            while (current != null)
            {
                value = current.name + "/" + value;
                current = current.parent;
            }
            return value;
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
