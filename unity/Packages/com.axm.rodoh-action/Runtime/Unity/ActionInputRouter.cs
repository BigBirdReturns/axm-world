using System;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// One explicit ingress for keyboard, gamepad, XR controllers, hand gestures,
    /// room-scale tracking, accessibility switches, or remote control. Sources may
    /// set continuous axes and latch button edges. The deterministic runtime samples
    /// this router exactly once per 30 Hz action tick.
    /// </summary>
    public sealed class ActionInputRouter : MonoBehaviour
    {
        [SerializeField, Range(0.05f, 0.95f)] private float engageThreshold = 0.45f;
        [SerializeField, Range(0.01f, 0.90f)] private float releaseThreshold = 0.30f;
        [SerializeField] private bool desktopKeyboardFallback = true;

        private Vector2 _move;
        private Vector2 _aim;
        private int _latchedButtons;
        private int _moveX;
        private int _moveY;
        private int _aimX;
        private int _aimY;

        public void SetMove(Vector2 value)
        {
            _move = Vector2.ClampMagnitude(value, 1f);
        }

        public void SetAim(Vector2 value)
        {
            _aim = Vector2.ClampMagnitude(value, 1f);
        }

        public void PressLight() => Latch(ActionContract.Light);
        public void PressHeavy() => Latch(ActionContract.Heavy);
        public void PressDodge() => Latch(ActionContract.Dodge);
        public void PressParry() => Latch(ActionContract.Parry);

        public void Latch(int buttons)
        {
            _latchedButtons |= buttons & ActionContract.ButtonMask;
        }

        public void ClearContinuousInput()
        {
            _move = Vector2.zero;
            _aim = Vector2.zero;
            _moveX = 0;
            _moveY = 0;
            _aimX = 0;
            _aimY = 0;
        }

        public ActionInputFrame SampleTick()
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
                if (Input.GetKeyDown(KeyCode.J)) Latch(ActionContract.Light);
                if (Input.GetKeyDown(KeyCode.K)) Latch(ActionContract.Heavy);
                if (Input.GetKeyDown(KeyCode.Space)) Latch(ActionContract.Dodge);
                if (Input.GetKeyDown(KeyCode.L)) Latch(ActionContract.Parry);
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
            var result = new ActionInputFrame
            {
                moveX = _moveX,
                moveY = _moveY,
                aimX = _aimX,
                aimY = _aimY,
                buttons = _latchedButtons
            };
            _latchedButtons = 0;
            return result;
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
        }
    }
}
