using System;
using System.IO;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Copies the exact observation written by ActionSafetyGate into the portable
    /// action-session spool after the gate has stopped the local session.
    /// </summary>
    public sealed class ActionSafetySpoolAdapter : MonoBehaviour
    {
        [SerializeField] private ActionSafetyGate safetyGate;
        [SerializeField] private ActionSessionSpool spool;
        [SerializeField] private string observationDirectory = "axm-embodied";
        private string _lastObservation;

        private void Awake()
        {
            if (safetyGate == null) safetyGate = GetComponentInParent<ActionSafetyGate>();
            if (spool == null) spool = GetComponentInParent<ActionSessionSpool>();
        }

        private void OnEnable()
        {
            if (safetyGate == null) safetyGate = GetComponentInParent<ActionSafetyGate>();
            if (safetyGate != null) safetyGate.OnBreach.AddListener(OnBreach);
        }

        private void OnDisable()
        {
            if (safetyGate != null) safetyGate.OnBreach.RemoveListener(OnBreach);
        }

        private void OnBreach(string reason)
        {
            if (spool == null)
            {
                Debug.LogError("Action safety observation could not enter the spool because ActionSessionSpool is absent.");
                return;
            }
            try
            {
                var directory = Path.Combine(Application.persistentDataPath, observationDirectory);
                if (!Directory.Exists(directory)) throw new DirectoryNotFoundException("Action safety observation directory is absent: " + directory);
                var files = Directory.GetFiles(directory, "action-safety-*.json", SearchOption.TopDirectoryOnly);
                if (files.Length == 0) throw new FileNotFoundException("ActionSafetyGate did not produce an observation file.");
                Array.Sort(files, StringComparer.Ordinal);
                var latest = files[files.Length - 1];
                if (latest == _lastObservation) return;
                spool.AppendObservationFile(latest);
                _lastObservation = latest;
            }
            catch (Exception exception)
            {
                Debug.LogException(exception);
            }
        }
    }
}
