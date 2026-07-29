using System;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// File-only bridge from Unity or Quest into axm-embodied. It writes immutable
    /// spool entries that another machine can ingest later. No Python, network, or
    /// cloud service is required in the headset process.
    /// </summary>
    public sealed class ActionSessionSpool : MonoBehaviour
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

        private string _sessionDirectory;
        private string _entriesDirectory;
        private string _payloadDirectory;
        private string _indexPath;
        private bool _initialized;
        private bool _candidateWritten;

        public string SessionDirectory => _sessionDirectory;

        public void Configure(ActionRuntimeBehaviour actionRuntime, string id, string device, string jobDigest, string root = null)
        {
            runtime = actionRuntime;
            sessionId = id ?? string.Empty;
            deviceId = device ?? string.Empty;
            unityJobDigest = jobDigest;
            if (!string.IsNullOrWhiteSpace(root)) spoolRoot = root;
        }

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
        }

        private void OnEnable()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            if (runtime != null) runtime.EncounterCompleted += OnEncounterCompleted;
        }

        private void OnDisable()
        {
            if (runtime != null) runtime.EncounterCompleted -= OnEncounterCompleted;
        }

        private void Start()
        {
            Initialize();
        }

        public void Initialize()
        {
            if (_initialized) return;
            if (runtime == null || runtime.Spec == null) throw new InvalidOperationException("Action session spool requires a started action runtime.");
            if (string.IsNullOrWhiteSpace(sessionId)) throw new InvalidOperationException("Action session spool id is absent.");
            if (string.IsNullOrWhiteSpace(deviceId)) throw new InvalidOperationException("Action session device id is absent.");
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
            WriteNewFile(startPath, JsonUtility.ToJson(start, true));
            if (!File.Exists(_indexPath))
            {
                WriteAtomic(_indexPath, JsonUtility.ToJson(new SpoolIndex { sessionId = sessionId }, true));
            }
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
            if (string.IsNullOrWhiteSpace(observationPath)) throw new ArgumentException("Observation path is absent.", nameof(observationPath));
            var fullPath = Path.GetFullPath(observationPath);
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
            AppendCandidate();
            _candidateWritten = true;
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
            File.WriteAllText(temporary, text);
            if (File.Exists(path)) File.Replace(temporary, path, null);
            else File.Move(temporary, path);
        }

        private static string Sanitize(string value)
        {
            foreach (var invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '-');
            return string.IsNullOrWhiteSpace(value) ? "action-session" : value;
        }
    }

    public static class ActionFileDigest
    {
        public static string Sha256(string path)
        {
            using (var sha = System.Security.Cryptography.SHA256.Create())
            using (var stream = File.OpenRead(path))
            {
                var digest = sha.ComputeHash(stream);
                return BitConverter.ToString(digest).Replace("-", string.Empty).ToLowerInvariant();
            }
        }
    }
}
