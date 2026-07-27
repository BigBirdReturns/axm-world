using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Removes rigid-body and collider influence from authored action bodies while
    /// preserving their renderers, animators, bones, particles, audio, and scripts.
    /// Environment safety and camera colliders belong outside this quarantined root.
    /// </summary>
    [DefaultExecutionOrder(-10000)]
    public sealed class ActionPhysicsQuarantine : MonoBehaviour
    {
        [SerializeField] private bool disableColliders = true;
        [SerializeField] private bool disableCharacterControllers = true;

        private void Awake()
        {
            ApplyHierarchy();
        }

        private void OnEnable()
        {
            ApplyHierarchy();
        }

        private void OnTransformChildrenChanged()
        {
            ApplyHierarchy();
        }

        public void ApplyHierarchy()
        {
            var bodies = GetComponentsInChildren<Rigidbody>(true);
            foreach (var body in bodies)
            {
                if (body == null) continue;
                body.velocity = Vector3.zero;
                body.angularVelocity = Vector3.zero;
                body.useGravity = false;
                body.detectCollisions = false;
                body.isKinematic = true;
                body.interpolation = RigidbodyInterpolation.None;
            }
            if (disableColliders)
            {
                var colliders = GetComponentsInChildren<Collider>(true);
                foreach (var collider in colliders) if (collider != null) collider.enabled = false;
            }
            if (disableCharacterControllers)
            {
                var controllers = GetComponentsInChildren<CharacterController>(true);
                foreach (var controller in controllers) if (controller != null) controller.enabled = false;
            }
        }

        public bool HasActivePhysicsAuthority()
        {
            foreach (var body in GetComponentsInChildren<Rigidbody>(true))
            {
                if (body != null && (!body.isKinematic || body.detectCollisions || body.useGravity)) return true;
            }
            if (disableColliders)
            {
                foreach (var collider in GetComponentsInChildren<Collider>(true)) if (collider != null && collider.enabled) return true;
            }
            if (disableCharacterControllers)
            {
                foreach (var controller in GetComponentsInChildren<CharacterController>(true)) if (controller != null && controller.enabled) return true;
            }
            return false;
        }
    }
}
