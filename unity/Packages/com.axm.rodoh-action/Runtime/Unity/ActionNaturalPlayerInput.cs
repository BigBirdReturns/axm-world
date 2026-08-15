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
        [SerializeField] private ActionInputBindings bindings;
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
        private bool _sawKeyboardMouse;
        private bool _sawGamepad;
        private string _lastInputDevice = "none";

        public bool SawKeyboardMouse => _sawKeyboardMouse;
        public bool SawGamepad => _sawGamepad;
        public string LastInputDevice => _lastInputDevice;
        public string ObservedDeviceClass => _sawKeyboardMouse && _sawGamepad
            ? "mixed"
            : _sawGamepad ? "gamepad" : _sawKeyboardMouse ? "keyboard-mouse" : "none";
        public string BindingProfileDigest => bindings?.ProfileDigest ?? "legacy-default";
        public bool RebindingEnabled => bindings != null;
        public ActionInputBindings Bindings => bindings;

        private void Awake()
        {
            if (router == null) router = GetComponentInParent<ActionInputRouter>();
            if (cameraRig == null) cameraRig = GetComponentInParent<ActionCombatCamera>();
            if (bindings == null) bindings = GetComponent<ActionInputBindings>();
        }

        private void OnEnable()
        {
            if (router == null) router = GetComponentInParent<ActionInputRouter>();
            if (cameraRig == null) cameraRig = GetComponentInParent<ActionCombatCamera>();
            if (bindings == null) bindings = GetComponent<ActionInputBindings>();
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
            Configure(inputRouter, actionCamera, bindings);
        }

        public void Configure(ActionInputRouter inputRouter, ActionCombatCamera actionCamera, ActionInputBindings inputBindings)
        {
            router = inputRouter;
            cameraRig = actionCamera;
            bindings = inputBindings;
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
            var move = ReadMovement(out var keyboardMovement, out var axisMovement);
            var look = ReadLook(out var mouseLook, out var gamepadLook);
            cameraRig?.AddLook(look);

            var forward = cameraRig == null ? Vector2.up : cameraRig.PlanarForward;
            var right = cameraRig == null ? Vector2.right : cameraRig.PlanarRight;
            var worldMove = Vector2.ClampMagnitude(right * move.x + forward * move.y, 1f);
            router.SetContinuous(worldMove, forward.sqrMagnitude <= 0f ? Vector2.up : forward.normalized);

            bool lightKeyboardMouse;
            bool lightGamepad;
            bool heavyKeyboardMouse;
            bool heavyGamepad;
            bool dodgeKeyboardMouse;
            bool dodgeGamepad;
            bool parryKeyboardMouse;
            bool parryGamepad;
            bool interactKeyboardMouse;
            bool interactGamepad;
            bool light;
            bool heavy;
            bool dodge;
            bool parry;
            bool interact;
            if (bindings != null)
            {
                light = bindings.IsHeld(ActionPlayerAction.Light, out lightKeyboardMouse, out lightGamepad);
                heavy = bindings.IsHeld(ActionPlayerAction.Heavy, out heavyKeyboardMouse, out heavyGamepad);
                dodge = bindings.IsHeld(ActionPlayerAction.Dodge, out dodgeKeyboardMouse, out dodgeGamepad);
                parry = bindings.IsHeld(ActionPlayerAction.Parry, out parryKeyboardMouse, out parryGamepad);
                interact = bindings.IsHeld(ActionPlayerAction.Interact, out interactKeyboardMouse, out interactGamepad);
            }
            else
            {
                lightKeyboardMouse = Input.GetMouseButton(0) || Input.GetKey(KeyCode.J);
                lightGamepad = Input.GetKey(KeyCode.JoystickButton0);
                heavyKeyboardMouse = Input.GetMouseButton(1) || Input.GetKey(KeyCode.K);
                heavyGamepad = Input.GetKey(KeyCode.JoystickButton2);
                dodgeKeyboardMouse = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.LeftShift);
                dodgeGamepad = Input.GetKey(KeyCode.JoystickButton1);
                parryKeyboardMouse = Input.GetKey(KeyCode.Q) || Input.GetKey(KeyCode.L);
                parryGamepad = Input.GetKey(KeyCode.JoystickButton4);
                interactKeyboardMouse = Input.GetKey(KeyCode.E) || Input.GetKey(KeyCode.F);
                interactGamepad = Input.GetKey(KeyCode.JoystickButton3);
                light = lightKeyboardMouse || lightGamepad;
                heavy = heavyKeyboardMouse || heavyGamepad;
                dodge = dodgeKeyboardMouse || dodgeGamepad;
                parry = parryKeyboardMouse || parryGamepad;
                interact = interactKeyboardMouse || interactGamepad;
            }
            LatchEdges(light, heavy, dodge, parry);
            router.SetInteract(interact);

            var keyboardMouseAction = lightKeyboardMouse || heavyKeyboardMouse || dodgeKeyboardMouse || parryKeyboardMouse || interactKeyboardMouse;
            var gamepadAction = lightGamepad || heavyGamepad || dodgeGamepad || parryGamepad || interactGamepad;
            if (keyboardMovement || mouseLook || keyboardMouseAction) MarkDevice("keyboard-mouse");
            if ((!keyboardMovement && axisMovement) || gamepadLook || gamepadAction) MarkDevice("gamepad");
#endif
        }

#if ENABLE_LEGACY_INPUT_MANAGER
        private Vector2 ReadMovement(out bool keyboardUsed, out bool axisUsed)
        {
            var horizontal = bindings == null
                ? ReadAxis(horizontalAxis)
                : bindings.ReadAxis(bindings.Profile.horizontalAxis);
            var vertical = bindings == null
                ? ReadAxis(verticalAxis)
                : bindings.ReadAxis(bindings.Profile.verticalAxis);
            var value = new Vector2(horizontal, vertical);
            var keyboard = new Vector2(
                (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f),
                (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1f : 0f));
            keyboardUsed = keyboard.sqrMagnitude > 0f;
            axisUsed = value.sqrMagnitude > 0f;
            value += keyboard;
            value = Vector2.ClampMagnitude(value, 1f);
            return value.sqrMagnitude < movementDeadzone * movementDeadzone ? Vector2.zero : value;
        }

        private Vector2 ReadLook(out bool mouseUsed, out bool gamepadUsed)
        {
            var mouse = new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y")) * mouseSensitivity;
            var stick = new Vector2(
                bindings == null ? ReadAxis(rightStickHorizontalAxis) : bindings.ReadAxis(bindings.Profile.rightStickHorizontalAxis),
                bindings == null ? ReadAxis(rightStickVerticalAxis) : bindings.ReadAxis(bindings.Profile.rightStickVerticalAxis));
            if (stick.sqrMagnitude < lookDeadzone * lookDeadzone) stick = Vector2.zero;
            else stick = Vector2.ClampMagnitude(stick, 1f);
            mouseUsed = mouse.sqrMagnitude > 0f;
            gamepadUsed = stick.sqrMagnitude > 0f;
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

        private void MarkDevice(string device)
        {
            _lastInputDevice = device;
            if (device == "keyboard-mouse") _sawKeyboardMouse = true;
            if (device == "gamepad") _sawGamepad = true;
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
