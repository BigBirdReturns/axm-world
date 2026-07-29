using UnityEngine;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Desktop player ingress for an ordinary action game. Movement is camera-relative,
    /// aim follows the free camera, and familiar mouse, keyboard, and gamepad controls
    /// feed the same bounded deterministic trace used by XR and replay.
    /// </summary>
    [DefaultExecutionOrder(-150)]
    public sealed class ActionNaturalPlayerInput : MonoBehaviour
    {
        [SerializeField] private ActionInputRouter router;
        [SerializeField] private ActionCombatCamera cameraRig;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private bool lockCursorDuringPlay = true;
        [SerializeField, Range(0.01f, 2f)] private float mouseSensitivity = 0.18f;
        [SerializeField, Range(10f, 360f)] private float gamepadLookDegreesPerSecond = 150f;
        [SerializeField, Range(0f, 0.95f)] private float movementDeadzone = 0.18f;
        [SerializeField, Range(0f, 0.95f)] private float lookDeadzone = 0.22f;
        [SerializeField] private string horizontalAxis = "Horizontal";
        [SerializeField] private string verticalAxis = "Vertical";
        [SerializeField] private string rightStickHorizontalAxis = "RightStickHorizontal";
        [SerializeField] private string rightStickVerticalAxis = "RightStickVertical";

        private bool _previousLight;
        private bool _previousHeavy;
        private bool _previousDodge;
        private bool _previousParry;

        private void Awake()
        {
            if (router == null) router = GetComponentInParent<ActionInputRouter>();
            if (cameraRig == null) cameraRig = GetComponentInParent<ActionCombatCamera>();
        }

        private void OnEnable()
        {
            if (router == null) router = GetComponentInParent<ActionInputRouter>();
            if (cameraRig == null) cameraRig = GetComponentInParent<ActionCombatCamera>();
            router?.SetDesktopKeyboardFallback(false);
#if ENABLE_LEGACY_INPUT_MANAGER
            if (lockCursorDuringPlay && !Application.isBatchMode) SetCursorLocked(true);
#endif
        }

        private void OnDisable()
        {
            router?.ClearContinuousInput();
            router?.SetDesktopKeyboardFallback(true);
            ClearEdges();
#if ENABLE_LEGACY_INPUT_MANAGER
            if (!Application.isBatchMode) SetCursorLocked(false);
#endif
        }

        public void Configure(ActionInputRouter inputRouter, ActionCombatCamera actionCamera)
        {
            router = inputRouter;
            cameraRig = actionCamera;
            router?.SetDesktopKeyboardFallback(false);
        }

        private void Update()
        {
            if (!enabledByPreference || router == null) return;
            if (XRSettings.isDeviceActive)
            {
                router.ClearContinuousInput();
                return;
            }

#if ENABLE_LEGACY_INPUT_MANAGER
            HandleCursor();
            var move = ReadMovement();
            var look = ReadLook();
            cameraRig?.AddLook(look);

            var forward = cameraRig == null ? Vector2.up : cameraRig.PlanarForward;
            var right = cameraRig == null ? Vector2.right : cameraRig.PlanarRight;
            var worldMove = Vector2.ClampMagnitude(right * move.x + forward * move.y, 1f);
            router.SetContinuous(worldMove, forward.sqrMagnitude <= 0f ? Vector2.up : forward.normalized);

            var light = Input.GetMouseButton(0) || Input.GetKey(KeyCode.J) || Input.GetKey(KeyCode.JoystickButton0);
            var heavy = Input.GetMouseButton(1) || Input.GetKey(KeyCode.K) || Input.GetKey(KeyCode.JoystickButton2);
            var dodge = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.JoystickButton1);
            var parry = Input.GetKey(KeyCode.Q) || Input.GetKey(KeyCode.L) || Input.GetKey(KeyCode.JoystickButton4);
            LatchEdges(light, heavy, dodge, parry);
            router.SetInteract(Input.GetKey(KeyCode.E) || Input.GetKey(KeyCode.F) || Input.GetKey(KeyCode.JoystickButton3));
#endif
        }

#if ENABLE_LEGACY_INPUT_MANAGER
        private Vector2 ReadMovement()
        {
            var value = new Vector2(ReadAxis(horizontalAxis), ReadAxis(verticalAxis));
            value += new Vector2(
                (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f),
                (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1f : 0f));
            value = Vector2.ClampMagnitude(value, 1f);
            return value.sqrMagnitude < movementDeadzone * movementDeadzone ? Vector2.zero : value;
        }

        private Vector2 ReadLook()
        {
            var mouse = new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y")) * mouseSensitivity;
            var stick = new Vector2(ReadAxis(rightStickHorizontalAxis), ReadAxis(rightStickVerticalAxis));
            if (stick.sqrMagnitude < lookDeadzone * lookDeadzone) stick = Vector2.zero;
            else stick = Vector2.ClampMagnitude(stick, 1f);
            return mouse + stick * (gamepadLookDegreesPerSecond * Time.unscaledDeltaTime);
        }

        private static float ReadAxis(string axis)
        {
            if (string.IsNullOrWhiteSpace(axis)) return 0f;
            try
            {
                return Input.GetAxisRaw(axis);
            }
            catch (UnityException)
            {
                // A project may omit optional right-stick axis names. Mouse and the
                // remaining configured axes continue to work without hidden setup.
                return 0f;
            }
        }

        private void HandleCursor()
        {
            if (!lockCursorDuringPlay || Application.isBatchMode) return;
            if (Input.GetKeyDown(KeyCode.Escape)) SetCursorLocked(false);
            else if (Input.GetMouseButtonDown(0) && Cursor.lockState != CursorLockMode.Locked) SetCursorLocked(true);
        }

        private static void SetCursorLocked(bool locked)
        {
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }
#endif

        private void LatchEdges(bool light, bool heavy, bool dodge, bool parry)
        {
            if (light && !_previousLight) router.Latch(ActionContract.Light);
            if (heavy && !_previousHeavy) router.Latch(ActionContract.Heavy);
            if (dodge && !_previousDodge) router.Latch(ActionContract.Dodge);
            if (parry && !_previousParry) router.Latch(ActionContract.Parry);
            _previousLight = light;
            _previousHeavy = heavy;
            _previousDodge = dodge;
            _previousParry = parry;
        }

        private void ClearEdges()
        {
            _previousLight = false;
            _previousHeavy = false;
            _previousDodge = false;
            _previousParry = false;
        }

        private void OnApplicationFocus(bool focused)
        {
            if (focused) return;
            router?.ClearContinuousInput();
            ClearEdges();
        }
    }
}
