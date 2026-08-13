using System;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Vendor-neutral room boundary adapter. Meta, OpenXR, or a calibrated printed
    /// board may provide world-space polygon points. The reporter computes nearest
    /// clearance and sends only the safety value to ActionSafetyGate.
    /// </summary>
    public sealed class ActionBoundaryReporter : MonoBehaviour
    {
        [SerializeField] private ActionSafetyGate safetyGate;
        [SerializeField] private Transform trackedHead;
        [SerializeField, Min(0.05f)] private float updateIntervalSeconds = 0.1f;
        [SerializeField] private bool boundaryValid;
        [SerializeField] private Vector3[] boundaryWorld = Array.Empty<Vector3>();
        private float _nextUpdate;

        public bool BoundaryValid => boundaryValid;
        public IReadOnlyList<Vector3> BoundaryWorld => boundaryWorld;

        private void Awake()
        {
            if (safetyGate == null) safetyGate = GetComponentInParent<ActionSafetyGate>();
            if (trackedHead == null && Camera.main != null) trackedHead = Camera.main.transform;
        }

        private void Update()
        {
            if (Time.unscaledTime < _nextUpdate) return;
            _nextUpdate = Time.unscaledTime + updateIntervalSeconds;
            PublishClearance();
        }

        public void Configure(ActionSafetyGate gate, Transform head)
        {
            safetyGate = gate;
            trackedHead = head;
            PublishClearance();
        }

        public void ReportBoundary(Vector3[] worldPoints, bool valid)
        {
            if (!valid || worldPoints == null || worldPoints.Length < 3)
            {
                boundaryWorld = Array.Empty<Vector3>();
                boundaryValid = false;
                safetyGate?.ReportBoundaryClearance(0f, false);
                return;
            }
            boundaryWorld = (Vector3[])worldPoints.Clone();
            boundaryValid = true;
            PublishClearance();
        }

        public void ReportAxisAlignedRectangle(Vector3 center, Vector2 size, float floorY)
        {
            var half = size * 0.5f;
            ReportBoundary(new[]
            {
                new Vector3(center.x - half.x, floorY, center.z - half.y),
                new Vector3(center.x + half.x, floorY, center.z - half.y),
                new Vector3(center.x + half.x, floorY, center.z + half.y),
                new Vector3(center.x - half.x, floorY, center.z + half.y),
            }, size.x > 0f && size.y > 0f);
        }

        public float CurrentClearanceMeters()
        {
            if (!boundaryValid || trackedHead == null || boundaryWorld == null || boundaryWorld.Length < 3) return -1f;
            var point = new Vector2(trackedHead.position.x, trackedHead.position.z);
            if (!Inside(point, boundaryWorld)) return 0f;
            var nearest = float.PositiveInfinity;
            for (var index = 0; index < boundaryWorld.Length; index += 1)
            {
                var first = boundaryWorld[index];
                var second = boundaryWorld[(index + 1) % boundaryWorld.Length];
                nearest = Mathf.Min(nearest, DistanceToSegment(point, new Vector2(first.x, first.z), new Vector2(second.x, second.z)));
            }
            return float.IsInfinity(nearest) ? -1f : nearest;
        }

        private void PublishClearance()
        {
            if (safetyGate == null) return;
            var clearance = CurrentClearanceMeters();
            safetyGate.ReportBoundaryClearance(clearance, clearance >= 0f);
        }

        private static bool Inside(Vector2 point, Vector3[] polygon)
        {
            var inside = false;
            for (var first = 0, second = polygon.Length - 1; first < polygon.Length; second = first++)
            {
                var a = new Vector2(polygon[first].x, polygon[first].z);
                var b = new Vector2(polygon[second].x, polygon[second].z);
                var crosses = (a.y > point.y) != (b.y > point.y);
                if (!crosses) continue;
                var x = (b.x - a.x) * (point.y - a.y) / Mathf.Max(0.000001f, b.y - a.y) + a.x;
                if (point.x < x) inside = !inside;
            }
            return inside;
        }

        private static float DistanceToSegment(Vector2 point, Vector2 first, Vector2 second)
        {
            var line = second - first;
            var denominator = line.sqrMagnitude;
            if (denominator <= 0.000001f) return Vector2.Distance(point, first);
            var t = Mathf.Clamp01(Vector2.Dot(point - first, line) / denominator);
            return Vector2.Distance(point, first + line * t);
        }
    }
}
