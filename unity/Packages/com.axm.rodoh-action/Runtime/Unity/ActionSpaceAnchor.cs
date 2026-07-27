using System;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Places the Unity presentation plane into a tracked room. Re-centering changes
    /// only the visual transform. It never teleports or rewrites action simulation.
    /// </summary>
    public sealed class ActionSpaceAnchor : MonoBehaviour
    {
        [SerializeField] private Transform presentationRoot;
        [SerializeField] private Transform trackedHead;
        [SerializeField] private Transform headingSource;
        [SerializeField, Min(0f)] private float forwardOffsetMeters = 1.5f;
        [SerializeField] private float floorHeightMeters;
        [SerializeField] private bool calibrateOnEnable;

        public event Action Recentered;

        private void OnEnable()
        {
            if (calibrateOnEnable) RecenterFromTracking();
        }

        public void Configure(Transform root, Transform head, Transform heading)
        {
            presentationRoot = root;
            trackedHead = head;
            headingSource = heading;
        }

        public void RecenterFromTracking()
        {
            if (presentationRoot == null || trackedHead == null) return;
            var forward = headingSource != null ? headingSource.forward : trackedHead.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.0001f) forward = Vector3.forward;
            forward.Normalize();
            var position = trackedHead.position + forward * forwardOffsetMeters;
            position.y = floorHeightMeters;
            presentationRoot.SetPositionAndRotation(position, Quaternion.LookRotation(forward, Vector3.up));
            Recentered?.Invoke();
        }

        public void Calibrate(Vector3 worldOrigin, Vector3 worldForward, float floorHeight)
        {
            if (presentationRoot == null) throw new InvalidOperationException("Presentation root is not assigned.");
            worldForward.y = 0f;
            if (worldForward.sqrMagnitude < 0.0001f) throw new ArgumentException("World forward vector is degenerate.", nameof(worldForward));
            floorHeightMeters = floorHeight;
            worldOrigin.y = floorHeightMeters;
            presentationRoot.SetPositionAndRotation(worldOrigin, Quaternion.LookRotation(worldForward.normalized, Vector3.up));
            Recentered?.Invoke();
        }
    }
}
