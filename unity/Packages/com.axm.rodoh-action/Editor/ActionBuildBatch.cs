using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Axm.Rodoh.Action.Editor
{
    /// <summary>
    /// Builds one generated action estate for Windows or Android/Quest and writes an
    /// exact product receipt. Project-owned XR, signing, graphics, and package
    /// settings remain in Embodied-AR-Lab; this batch does not invent a second project.
    /// </summary>
    public static class ActionBuildBatch
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
            public string format = "rodoh-unity-action-build/1";
            public string status = "fail";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string unityVersion = Application.unityVersion;
            public string target;
            public string buildTarget;
            public string scenePath;
            public string outputPath;
            public string jobId;
            public string jobDigest;
            public string actionSpecDigest;
            public string arcDigest;
            public string presentationManifestId;
            public ulong totalBytes;
            public string productSha256;
            public int productFiles;
            public uint totalErrors;
            public uint totalWarnings;
            public double totalBuildSeconds;
            public string buildResult;
            public bool strictMode = true;
            public bool developmentBuild;
            public string actionAuthority = "Arc replay and axm-action-receipt/1";
            public string buildAuthority = "Unity BuildPipeline over the exact generated scene";
            public string error;
        }

        public static void Run()
        {
            var receiptRoot = Path.GetFullPath(GetArgument("-receiptRoot") ?? Path.Combine("local", "action-build", "receipts"));
            var receipt = new Receipt();
            try
            {
                var scenePath = GetRequiredArgument("-scenePath").Replace('\\', '/');
                if (!scenePath.StartsWith("Assets/", StringComparison.Ordinal)) throw new InvalidOperationException("Action build scene must remain under Assets/.");
                var sceneJobPath = Path.GetFullPath(GetRequiredArgument("-sceneJob"));
                var sceneJob = JsonUtility.FromJson<SceneJob>(File.ReadAllText(sceneJobPath));
                if (sceneJob == null || sceneJob.format != "rodoh-action-scene-job/1") throw new InvalidOperationException("Unknown action scene-job format.");
                var targetToken = (GetArgument("-target") ?? "windows").Trim().ToLowerInvariant();
                var development = ParseBoolean(GetArgument("-development"), false);
                var configuration = ResolveTarget(targetToken);
                var outputPath = GetArgument("-outputPath");
                if (string.IsNullOrWhiteSpace(outputPath)) outputPath = DefaultOutput(sceneJob.jobId, targetToken);
                outputPath = Path.GetFullPath(outputPath);
                Directory.CreateDirectory(Path.GetDirectoryName(outputPath) ?? throw new InvalidOperationException("Build output directory is unavailable."));

                if (!EditorUserBuildSettings.SwitchActiveBuildTarget(configuration.group, configuration.target)) throw new InvalidOperationException("Unity refused to switch to build target " + configuration.target + ".");
                var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
                var runtime = FindExactlyOne<ActionRuntimeBehaviour>(scene);
                if (runtime.GetComponent<ActionStandaloneSmoke>() == null) runtime.gameObject.AddComponent<ActionStandaloneSmoke>();
                if (runtime.GetComponent<ActionSessionSpoolRuntime>() == null) throw new InvalidOperationException("Action build scene lacks the production offline session spool.");
                if (runtime.GetComponent<ActionQualityGovernor>() == null) throw new InvalidOperationException("Action build scene lacks the adaptive quality governor.");
                if (runtime.GetComponent<ActionPerformanceRecorder>() == null) throw new InvalidOperationException("Action build scene lacks the performance receipt recorder.");
                if (!EditorSceneManager.SaveScene(scene, scenePath)) throw new InvalidOperationException("Unity refused to save the smoke-enabled action scene.");
                AssetDatabase.SaveAssets();

                var options = BuildOptions.StrictMode | BuildOptions.CompressWithLz4HC;
                if (development) options |= BuildOptions.Development | BuildOptions.AllowDebugging;
                var buildPlayerOptions = new BuildPlayerOptions
                {
                    scenes = new[] { scenePath },
                    locationPathName = outputPath,
                    target = configuration.target,
                    targetGroup = configuration.group,
                    options = options
                };
                var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
                var summary = report.summary;
                receipt.target = targetToken;
                receipt.buildTarget = configuration.target.ToString();
                receipt.scenePath = scenePath;
                receipt.outputPath = outputPath;
                receipt.jobId = sceneJob.jobId;
                receipt.jobDigest = sceneJob.jobDigest;
                receipt.actionSpecDigest = sceneJob.source.actionSpecDigest;
                receipt.arcDigest = sceneJob.source.arcDigest;
                receipt.presentationManifestId = sceneJob.source.presentationManifestId;
                receipt.totalBytes = summary.totalSize;
                receipt.totalErrors = summary.totalErrors;
                receipt.totalWarnings = summary.totalWarnings;
                receipt.totalBuildSeconds = summary.totalTime.TotalSeconds;
                receipt.buildResult = summary.result.ToString();
                receipt.developmentBuild = development;
                if (summary.result != BuildResult.Succeeded) throw new InvalidOperationException("Unity build failed with result " + summary.result + ".");
                var product = ProductDigest(outputPath, configuration.target == BuildTarget.StandaloneWindows64);
                receipt.productSha256 = product.digest;
                receipt.productFiles = product.files;
                receipt.status = "pass";
                Directory.CreateDirectory(receiptRoot);
                var receiptPath = Path.Combine(receiptRoot, "build-" + targetToken + ".json");
                File.WriteAllText(receiptPath, JsonUtility.ToJson(receipt, true));
                Debug.Log("RODOH action build passed: " + receiptPath);
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
            catch (Exception exception)
            {
                receipt.status = "fail";
                receipt.error = exception.ToString();
                try
                {
                    Directory.CreateDirectory(receiptRoot);
                    File.WriteAllText(Path.Combine(receiptRoot, "build-" + (receipt.target ?? "unknown") + ".json"), JsonUtility.ToJson(receipt, true));
                }
                catch
                {
                    // Preserve the controlling build failure.
                }
                Debug.LogException(exception);
                if (Application.isBatchMode) EditorApplication.Exit(1);
                else throw;
            }
        }

        private static (BuildTargetGroup group, BuildTarget target) ResolveTarget(string token)
        {
            if (token == "windows" || token == "windows64") return (BuildTargetGroup.Standalone, BuildTarget.StandaloneWindows64);
            if (token == "android" || token == "quest") return (BuildTargetGroup.Android, BuildTarget.Android);
            throw new ArgumentException("Unsupported action build target: " + token + ".");
        }

        private static string DefaultOutput(string jobId, string target)
        {
            var safe = Sanitize(jobId);
            if (target == "android" || target == "quest") return Path.Combine("local", "action-build", target, safe + ".apk");
            return Path.Combine("local", "action-build", "windows", safe + ".exe");
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
            if (count != 1 || match == null) throw new InvalidOperationException("Action build scene contains " + count + " " + typeof(T).Name + " components; expected exactly one.");
            return match;
        }

        private static (string digest, int files) ProductDigest(string outputPath, bool windowsTree)
        {
            var files = new List<string>();
            var fullOutput = Path.GetFullPath(outputPath);
            if (File.Exists(fullOutput)) files.Add(fullOutput);
            if (windowsTree)
            {
                var directory = Path.GetDirectoryName(fullOutput) ?? throw new InvalidOperationException("Windows output directory is unavailable.");
                var stem = Path.GetFileNameWithoutExtension(fullOutput) + "_Data";
                var dataDirectory = Path.Combine(directory, stem);
                if (!Directory.Exists(dataDirectory)) throw new DirectoryNotFoundException("Windows player data directory is absent: " + dataDirectory);
                files.AddRange(Directory.GetFiles(dataDirectory, "*", SearchOption.AllDirectories));
                var unityPlayer = Path.Combine(directory, "UnityPlayer.dll");
                if (File.Exists(unityPlayer)) files.Add(unityPlayer);
            }
            files.Sort(StringComparer.Ordinal);
            using (var aggregate = SHA256.Create())
            {
                foreach (var file in files)
                {
                    var relative = Path.GetRelativePath(Path.GetDirectoryName(fullOutput) ?? Directory.GetCurrentDirectory(), file).Replace('\\', '/');
                    var pathBytes = Encoding.UTF8.GetBytes(relative + "\0");
                    aggregate.TransformBlock(pathBytes, 0, pathBytes.Length, null, 0);
                    using (var stream = File.OpenRead(file))
                    using (var fileHash = SHA256.Create())
                    {
                        var digest = fileHash.ComputeHash(stream);
                        aggregate.TransformBlock(digest, 0, digest.Length, null, 0);
                    }
                }
                aggregate.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return (BitConverter.ToString(aggregate.Hash).Replace("-", string.Empty).ToLowerInvariant(), files.Count);
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

        private static bool ParseBoolean(string value, bool fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : bool.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private static string Sanitize(string value)
        {
            foreach (var invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '-');
            return string.IsNullOrWhiteSpace(value) ? "action" : value;
        }
    }
}
