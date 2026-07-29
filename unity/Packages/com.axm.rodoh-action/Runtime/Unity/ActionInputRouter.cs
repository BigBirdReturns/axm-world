using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// One explicit ingress for keyboard, gamepad, XR controllers, hand gestures,
    /// room-scale tracking, accessibility switches, or remote control. Continuous
    /// intent is quantized once per action tick. Short button edges remain buffered
    /// until the deterministic player state can legally consume them.
    /// </summary>
    public sealed class ActionInputRouter : MonoBehaviour
    {
        [SerializeField, Range(0.05f, 0.95f)] private float engageThreshold = 0.45f;
        [SerializeField, Range(0.01f, 0.90f)] private float releaseThreshold = 0.30f;
        [SerializeField, Range(0, 12)] private int inputBufferTicks = 5;
        [SerializeField] private bool desktopKeyboardFallback = true;

        private Vector2 _move;
        private Vector2 _aim;
        private int _heldButtons;
        private bool _latchedInteract;
        private int _moveX;
        private int _moveY;
        private int _aimX;
        private int _aimY;
        private ActionBufferedInput _bufferedInput;

        public int InputBufferTicks => inputBufferTicks;
        public int PendingButtons => Buffer.PendingButtons | (_latchedInteract ? ActionContract.Interact : 0) | _heldButtons;

        private ActionBufferedInput Buffer
        {
            get
            {
                if (_bufferedInput == null || _bufferedInput.BufferTicks != inputBufferTicks)
                {
                    _bufferedInput = new ActionBufferedInput(inputBufferTicks);
                }
                return _bufferedInput;
            }
        }

        private void Awake()
        {
            _ = Buffer;
        }

        public void SetMove(Vector2 value)
        {
            _move = Vector2.ClampMagnitude(value, 1f);
        }

        public void SetAim(Vector2 value)
        {
            _aim = Vector2.ClampMagnitude(value, 1f);
        }

        public void SetContinuous(Vector2 move, Vector2 aim)
        {
            SetMove(move);
            SetAim(aim);
        }

        public void SetDesktopKeyboardFallback(bool enabled)
        {
            desktopKeyboardFallback = enabled;
        }

        public void PressLight() => Latch(ActionContract.Light);
        public void PressHeavy() => Latch(ActionContract.Heavy);
        public void PressDodge() => Latch(ActionContract.Dodge);
        public void PressParry() => Latch(ActionContract.Parry);
        public void PressInteract() => Latch(ActionContract.Interact);

        public void SetInteract(bool active)
        {
            SetHeld(ActionContract.Interact, active);
        }

        public void SetHeld(int buttons, bool active)
        {
            buttons &= ActionContract.Interact;
            if (active) _heldButtons |= buttons;
            else _heldButtons &= ~buttons;
        }

        public void Latch(int buttons)
        {
            buttons &= ActionContract.ButtonMask;
            Buffer.Buffer(buttons);
            if ((buttons & ActionContract.Interact) != 0) _latchedInteract = true;
        }

        public void ClearContinuousInput()
        {
            _move = Vector2.zero;
            _aim = Vector2.zero;
            _heldButtons = 0;
            _latchedInteract = false;
            _moveX = 0;
            _moveY = 0;
            _aimX = 0;
            _aimY = 0;
            Buffer.Reset();
        }

        public ActionInputFrame SampleTick()
        {
            return SampleTick(ActionPlayerMode.Idle);
        }

        public ActionInputFrame SampleTick(ActionPlayerMode playerMode)
        {
            var move = _move;
            var aim = _aim;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (desktopKeyboardFallback)
            {
                var keyboardMove = new Vector2(
                    (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f),
                    (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1f : 0f));
                if (keyboardMove.sqrMagnitude > 0f) move = Vector2.ClampMagnitude(keyboardMove, 1f);

                if (Input.GetKeyDown(KeyCode.J) || Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.JoystickButton0)) Latch(ActionContract.Light);
                if (Input.GetKeyDown(KeyCode.K) || Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.JoystickButton2)) Latch(ActionContract.Heavy);
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.JoystickButton1)) Latch(ActionContract.Dodge);
                if (Input.GetKeyDown(KeyCode.Q) || Input.GetKeyDown(KeyCode.L) || Input.GetKeyDown(KeyCode.JoystickButton4)) Latch(ActionContract.Parry);
                SetInteract(Input.GetKey(KeyCode.E) || Input.GetKey(KeyCode.F) || Input.GetKey(KeyCode.JoystickButton3));
            }
#endif
            _moveX = Quantize(move.x, _moveX);
            _moveY = Quantize(move.y, _moveY);
            _aimX = Quantize(aim.x, _aimX);
            _aimY = Quantize(aim.y, _aimY);
            if (_aimX == 0 && _aimY == 0)
            {
                _aimX = _moveX;
                _aimY = _moveY;
            }

            var continuous = new ActionInputFrame
            {
                moveX = _moveX,
                moveY = _moveY,
                aimX = _aimX,
                aimY = _aimY,
                buttons = _heldButtons | (_latchedInteract ? ActionContract.Interact : 0)
            };
            _latchedInteract = false;
            return Buffer.Sample(continuous, playerMode);
        }

        private int Quantize(float value, int previous)
        {
            var absolute = Mathf.Abs(value);
            if (previous == 0)
            {
                if (absolute < engageThreshold) return 0;
                return value > 0f ? 1 : -1;
            }
            if (absolute <= releaseThreshold) return 0;
            if (value > engageThreshold) return 1;
            if (value < -engageThreshold) return -1;
            return previous;
        }

        private void OnValidate()
        {
            engageThreshold = Mathf.Clamp(engageThreshold, 0.05f, 0.95f);
            releaseThreshold = Mathf.Clamp(releaseThreshold, 0.01f, engageThreshold - 0.01f);
            inputBufferTicks = Mathf.Clamp(inputBufferTicks, 0, 12);
            _bufferedInput = null;
        }

        private void OnApplicationFocus(bool focused)
        {
            if (!focused) ClearContinuousInput();
        }
    }
}
