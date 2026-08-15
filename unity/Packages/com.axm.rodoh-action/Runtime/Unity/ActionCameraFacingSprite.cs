using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Presentation-only billboard for camera-facing 2.5D bodies. Arc state still owns
    /// actor position, facing, mode, damage, objectives, and outcome. This component
    /// rotates a dedicated Facing pivot toward the active camera while preserving
    /// authored animation on its Visual child, then optionally mirrors the sprite from
    /// the Arc-driven actor facing.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionCameraFacingSprite : MonoBehaviour
    {
        [SerializeField] private Transform visualRoot;
        [SerializeField] private SpriteRenderer spriteRenderer;
        [SerializeField] private bool mirrorFromActorFacing = true;
        [SerializeField] private bool yawOnly = true;

        public Transform VisualRoot => visualRoot;
        public SpriteRenderer Renderer => spriteRenderer;
        public bool MirrorFromActorFacing => mirrorFromActorFacing;
        public bool YawOnly => yawOnly;

        public void Configure(Transform authoredVisualRoot, SpriteRenderer authoredRenderer, bool mirror, bool horizontalOnly)
        {
            visualRoot = authoredVisualRoot;
            spriteRenderer = authoredRenderer;
            mirrorFromActorFacing = mirror;
            yawOnly = horizontalOnly;
        }

        private void Awake()
        {
            if (visualRoot == null) visualRoot = transform.Find("Facing") ?? transform.Find("Visual") ?? transform;
            if (spriteRenderer == null) spriteRenderer = visualRoot.GetComponentInChildren<SpriteRenderer>(true);
        }

        private void LateUpdate()
        {
            var camera = Camera.main;
            if (camera == null || visualRoot == null) return;
            var direction = camera.transform.position - visualRoot.position;
            if (yawOnly) direction.y = 0f;
            if (direction.sqrMagnitude > 0.000001f)
            {
                visualRoot.rotation = Quaternion.LookRotation(direction.normalized, Vector3.up);
            }
            if (mirrorFromActorFacing && spriteRenderer != null)
            {
                spriteRenderer.flipX = Vector3.Dot(transform.forward, camera.transform.right) < 0f;
            }
        }
    }
}
