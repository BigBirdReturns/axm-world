using System;
using System.Collections;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Opt-in built-player smoke. It activates only when the player receives
    /// -axmActionSmoke, waits for the real runtime to reach a terminal state,
    /// writes a receipt, and exits. Normal desktop and Quest play are unchanged.
    /// </summary>
    [DefaultExecutionOrder(20000)]
    public sealed class ActionStandaloneSmoke : MonoBehaviour
    {
        [Serializable]
        private sealed class Receipt
        {
            public string format = "rodoh-unity-action-player-smoke/1";
            public string generatedAt = DateTime.UtcNow.ToString("O");
            public string status = "fail";
            public string unityVersion = Application.unityVersion;
            public string platform = Application.platform.ToString();
            public string actionSpecDigest;
            public string arcDigest;
            public string challengeId;
            public int actionTicks;
            public string terminalOutcome;
            public bool terminal;
            public float elapsedSeconds;
            public string authority = "built-player execution smoke only; Arc receipt remains authoritative";
            public string error;
        }

        [SerializeField] private ActionRuntimeBehaviour runtime;
        [SerializeField, Min(5f)] private float defaultTimeoutSeconds = 180f;
        private string _receiptPath;
        private float _startedAt;
        private bool _active;
        private bool _written;

        private void Awake()
        {
            if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
            var arguments = Environment.GetCommandLineArgs();
            _active = Contains(arguments, "-axmActionSmoke");
            if (!_active)
            {
                enabled = false;
                return;
            }
            _receiptPath = Argument(arguments, "-axmActionSmokeReceipt");
            if (string.IsNullOrWhiteSpace(_receiptPath)) _receiptPath = Path.Combine(Application.persistentDataPath, "action-player-smoke.json");
            _receiptPath = Path.GetFullPath(_receiptPath);
            _startedAt = Time.realtimeSinceStartup;
        }

        private IEnumerator Start()
        {
            if (!_active) yield break;
            var frames = 0;
            while ((runtime == null || runtime.Spec == null || runtime.State == null) && frames < 1200)
            {
                if (runtime == null) runtime = GetComponentInParent<ActionRuntimeBehaviour>();
                frames += 1;
                yield return null;
            }
            if (runtime == null || runtime.Spec == null || runtime.State == null)
            {
                Finish(false, "Action runtime did not initialize inside the built player.", 2);
                yield break;
            }
            var timeout = ParseFloat(Argument(Environment.GetCommandLineArgs(), "-axmActionSmokeTimeout"), defaultTimeoutSeconds);
            while (runtime.State.result == null && Time.realtimeSinceStartup - _startedAt < timeout) yield return null;
            if (runtime.State.result == null)
            {
                Finish(false, "Action runtime did not reach a terminal state before the smoke timeout.", 3);
                yield break;
            }
            Finish(true, null, 0);
        }

        private void OnApplicationQuit()
        {
            if (_active && !_written) WriteReceipt(false, "Built player quit before the action smoke reached a terminal state.");
        }

        private void Finish(bool pass, string error, int exitCode)
        {
            WriteReceipt(pass, error);
            Application.Quit(exitCode);
        }

        private void WriteReceipt(bool pass, string error)
        {
            if (_written) return;
            _written = true;
            var result = runtime?.State?.result;
            var receipt = new Receipt
            {
                status = pass ? "pass" : "fail",
                actionSpecDigest = runtime?.Spec?.sourceSpecDigest,
                arcDigest = runtime?.Spec?.sourceArcDigest,
                challengeId = runtime?.Spec?.challengeId,
                actionTicks = runtime?.State?.tick ?? 0,
                terminalOutcome = result?.outcome,
                terminal = result != null,
                elapsedSeconds = Mathf.Max(0f, Time.realtimeSinceStartup - _startedAt),
                error = error
            };
            try
            {
                var directory = Path.GetDirectoryName(_receiptPath);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                File.WriteAllText(_receiptPath, JsonUtility.ToJson(receipt, true));
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
        }

        private static bool Contains(string[] values, string target)
        {
            foreach (var value in values) if (value == target) return true;
            return false;
        }

        private static string Argument(string[] values, string name)
        {
            for (var index = 0; index < values.Length - 1; index += 1) if (values[index] == name) return values[index + 1];
            return null;
        }

        private static float ParseFloat(string value, float fallback)
        {
            return !string.IsNullOrWhiteSpace(value) && float.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var parsed)
                ? Mathf.Max(5f, parsed)
                : fallback;
        }
    }
}
