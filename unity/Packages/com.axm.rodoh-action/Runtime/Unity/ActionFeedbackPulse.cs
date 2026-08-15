using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Reusable presentation-only pulse used by authored feedback prefabs. It has no
    /// collider, rigid body, action-state mutation, or receipt authority.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionFeedbackPulse : MonoBehaviour
    {
        [SerializeField] private SpriteRenderer spriteRenderer;
        [SerializeField, Min(0.02f)] private float durationSeconds = 0.28f;
        [SerializeField, Min(0.01f)] private float startScale = 0.35f;
        [SerializeField, Min(0.01f)] private float endScale = 1.35f;
        [SerializeField] private Color startColor = Color.white;
        [SerializeField] private Color endColor = new Color(1f, 1f, 1f, 0f);
        private float startedAt;

        public void Configure(SpriteRenderer renderer, float duration, float fromScale, float toScale, Color fromColor, Color toColor)
        {
            spriteRenderer = renderer;
            durationSeconds = Mathf.Max(0.02f, duration);
            startScale = Mathf.Max(0.01f, fromScale);
            endScale = Mathf.Max(0.01f, toScale);
            startColor = fromColor;
            endColor = toColor;
        }

        private void Awake()
        {
            if (spriteRenderer == null) spriteRenderer = GetComponentInChildren<SpriteRenderer>(true);
        }

        private void OnEnable()
        {
            startedAt = Time.unscaledTime;
            Apply(0f);
        }

        private void Update()
        {
            var progress = Mathf.Clamp01((Time.unscaledTime - startedAt) / Mathf.Max(0.02f, durationSeconds));
            Apply(progress);
            if (progress >= 1f) gameObject.SetActive(false);
        }

        private void Apply(float progress)
        {
            var scale = Mathf.Lerp(startScale, endScale, progress);
            transform.localScale = new Vector3(scale, scale, scale);
            if (spriteRenderer != null) spriteRenderer.color = Color.Lerp(startColor, endColor, progress);
        }
    }
}
