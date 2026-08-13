using System;
using System.Collections;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Deferred-start production spool for Unity and Quest. It waits until the action
    /// runtime has loaded the exact spec, then writes immutable payload and entry
    /// files. This avoids Start-order coupling between Unity components.
    /// </summary>
    [DefaultExecutionOrder(10000)]
    public sealed class ActionSessionSpoolRuntime : MonoBehaviour
    {
        [Serializable]
        private sealed class SessionStart
        {
            public string format = "rodoh-action-session-spool-start/1";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string sessionId;
            public string deviceId;
            public string arcDigest;
            public string actionSpecDigest;
            public string unityJobDigest;
            public string unityVersion = Application.unityVersion;
            public string platform = Application.platform.ToString();
            public string authority = "physical and provisional Unity source only";
        }

        [Serializable]
        private sealed class SpoolIndex
        {
            public string format = "rodoh-action-session-spool-index/1";
            public string sessionId;
            public int nextSequence = 1;
            public string lastEntry;
        }

        [Serializable]
        private sealed class EntryEnvelope
        {
            public string format = "rodoh-action-session-spool-entry/1";
            public string sessionId;
            public int sequence;
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string kind;
            public string payloadFile;
            public string payloadSha256;
            public string authority;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField] private string sessionId = "action-session-001";
        [SerializeField] private string deviceId = "unity-device";
        [SerializeField] private string unityJobDigest;
        [SerializeField] private string spoolRoot = "axm-action-session-spool";
        [SerializeField] private bool writeCandidateOnCompletion = true;
        [SerializeField, Min(1)] private int startupFrameLimit = 600;

        private string _sessionDirectory;
        private string _entriesDirectory;
        private string _payloadDirectory;
        private string _indexPath;
        private bool _initialized;
        private bool _candidateWritten;
        private bool _completionSubscribed;

        public string SessionDirectory => _sessionDirectory;
        public bool Initialized => _initialized;

        public void Configure(ActionRuntimeBehaviour actionRuntime, string id, string device, string jobDigest, string root = null)
        {
            runtime = actionRuntime;
            sessionId = id ?? string.Empty;
            deviceId = device ?? string.Empty;
            unityJobDigest = jobDigest;
            if (!string.IsNullOrWhiteSpace(root)) spoolRoot = root;
            SubscribeCompletion();
        }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            SubscribeCompletion();
        }

        private void OnEnable()
        {
            SubscribeCompletion();
        }

        private void OnDisable()
        {
            if (runtime != null && _completionSubscribed)
            {
                runtime.EncounterCompleted -= OnEncounterCompleted;
                _completionSubscribed = false;
            }
        }

        private IEnumerator Start()
        {
            var frames = 0;
            while ((runtime == null || runtime.Spec == null) && frames < startupFrameLimit)
            {
                if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
                frames += 1;
                yield return null;
            }
            if (runtime == null || runtime.Spec == null)
            {
                Debug.LogError("RODOH action-session spool timed out waiting for the action spec.");
                yield break;
            }
            Initialize();
        }

        public void Initialize()
        {
            if (_initialized) return;
            if (runtime == null || runtime.Spec == null) throw new InvalidOperationException("Action session spool requires a started action runtime.");
            ValidateIdentity();
            var root = Path.Combine(Application.persistentDataPath, spoolRoot);
            _sessionDirectory = Path.Combine(root, Sanitize(sessionId));
            _entriesDirectory = Path.Combine(_sessionDirectory, "entries");
            _payloadDirectory = Path.Combine(_sessionDirectory, "payloads");
            _indexPath = Path.Combine(_sessionDirectory, "index.json");
            Directory.CreateDirectory(_entriesDirectory);
            Directory.CreateDirectory(_payloadDirectory);
            var startPath = Path.Combine(_sessionDirectory, "session-start.json");
            var start = new SessionStart
            {
                sessionId = sessionId,
                deviceId = deviceId,
                arcDigest = runtime.Spec.sourceArcDigest,
                actionSpecDigest = runtime.Spec.sourceSpecDigest,
                unityJobDigest = unityJobDigest
            };
            if (File.Exists(startPath))
            {
                var existing = JsonUtility.FromJson<SessionStart>(File.ReadAllText(startPath));
                if (existing == null || existing.format != start.format || existing.sessionId != start.sessionId || existing.deviceId != start.deviceId || existing.arcDigest != start.arcDigest || existing.actionSpecDigest != start.actionSpecDigest || existing.unityJobDigest != start.unityJobDigest)
                {
                    throw new InvalidOperationException("Existing action spool start belongs to a different session identity.");
                }
            }
            else
            {
                WriteNewFile(startPath, JsonUtility.ToJson(start, true));
            }
            if (!File.Exists(_indexPath)) WriteAtomic(_indexPath, JsonUtility.ToJson(new SpoolIndex { sessionId = sessionId }, true));
            else ReadIndex();
            _initialized = true;
        }

        public string AppendPayload(string kind, string payloadJson, string authority)
        {
            Initialize();
            if (string.IsNullOrWhiteSpace(kind)) throw new ArgumentException("Spool entry kind is absent.", nameof(kind));
            if (string.IsNullOrWhiteSpace(payloadJson)) throw new ArgumentException("Spool payload JSON is absent.", nameof(payloadJson));
            if (string.IsNullOrWhiteSpace(authority)) throw new ArgumentException("Spool authority statement is absent.", nameof(authority));
            var index = ReadIndex();
            var sequence = index.nextSequence;
            var stem = sequence.ToString("D8") + "-" + Sanitize(kind);
            var payloadName = stem + ".payload.json";
            var payloadPath = Path.Combine(_payloadDirectory, payloadName);
            WriteNewFile(payloadPath, payloadJson);
            var envelope = new EntryEnvelope
            {
                sessionId = sessionId,
                sequence = sequence,
                kind = kind,
                payloadFile = "payloads/" + payloadName,
                payloadSha256 = ActionFileDigest.Sha256(payloadPath),
                authority = authority
            };
            var entryName = stem + ".entry.json";
            var entryPath = Path.Combine(_entriesDirectory, entryName);
            WriteNewFile(entryPath, JsonUtility.ToJson(envelope, true));
            index.nextSequence = sequence + 1;
            index.lastEntry = "entries/" + entryName;
            WriteAtomic(_indexPath, JsonUtility.ToJson(index, true));
            return entryPath;
        }

        public string AppendObservationFile(string observationPath)
        {
            var fullPath = Path.GetFullPath(observationPath ?? throw new ArgumentNullException(nameof(observationPath)));
            if (!File.Exists(fullPath)) throw new FileNotFoundException("Embodied action observation is absent.", fullPath);
            return AppendPayload("physical_session_stopped", File.ReadAllText(fullPath), "physical safety stop only");
        }

        public string AppendCandidate()
        {
            if (runtime == null) throw new InvalidOperationException("Action session spool runtime is absent.");
            return AppendPayload("action_candidate", runtime.BuildCandidateJson(), "Arc replay required");
        }

        private void OnEncounterCompleted(ActionSimulationResult result)
        {
            if (!writeCandidateOnCompletion || _candidateWritten) return;
            try
            {
                AppendCandidate();
                _candidateWritten = true;
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
        }

        private void SubscribeCompletion()
        {
            if (runtime == null || _completionSubscribed) return;
            runtime.EncounterCompleted += OnEncounterCompleted;
            _completionSubscribed = true;
        }

        private void ValidateIdentity()
        {
            if (string.IsNullOrWhiteSpace(sessionId)) throw new InvalidOperationException("Action session spool id is absent.");
            if (string.IsNullOrWhiteSpace(deviceId)) throw new InvalidOperationException("Action session device id is absent.");
            if (!string.IsNullOrWhiteSpace(unityJobDigest) && (!unityJobDigest.StartsWith("unityjob1_", StringComparison.Ordinal) || unityJobDigest.Length != 74)) throw new InvalidOperationException("Action session Unity job digest is malformed.");
        }

        private SpoolIndex ReadIndex()
        {
            var value = JsonUtility.FromJson<SpoolIndex>(File.ReadAllText(_indexPath));
            if (value == null || value.format != "rodoh-action-session-spool-index/1" || value.sessionId != sessionId || value.nextSequence < 1) throw new InvalidOperationException("Action session spool index is malformed.");
            return value;
        }

        private static void WriteNewFile(string path, string text)
        {
            if (File.Exists(path)) throw new IOException("Action session spool refuses to replace an existing file: " + path);
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            using (var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.Read))
            using (var writer = new StreamWriter(stream))
            {
                writer.Write(text);
                writer.Flush();
                stream.Flush(true);
            }
        }

        private static void WriteAtomic(string path, string text)
        {
            var temporary = path + ".tmp-" + Guid.NewGuid().ToString("N");
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            using (var writer = new StreamWriter(stream))
            {
                writer.Write(text);
                writer.Flush();
                stream.Flush(true);
            }
            if (File.Exists(path)) File.Replace(temporary, path, null);
            else File.Move(temporary, path);
        }

        private static string Sanitize(string value)
        {
            foreach (var invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '-');
            return string.IsNullOrWhiteSpace(value) ? "action-session" : value;
        }
    }
}
