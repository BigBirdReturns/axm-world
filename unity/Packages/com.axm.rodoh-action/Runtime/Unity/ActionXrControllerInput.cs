using UnityEngine;
using UnityEngine.XR;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Dependency-light OpenXR/Quest controller adapter using UnityEngine.XR. It
    /// quantizes controller input into the same bounded trace as keyboard, gamepad,
    /// gesture, and recorded input. Device poses never become combat hitboxes.
    /// </summary>
    public sealed class ActionXrControllerInput : MonoBehaviour
    {
        [SerializeField] private ActionInputRouter router;
        [SerializeField] private XRNode movementHand = XRNode.LeftHand;
        [SerializeField] private XRNode aimHand = XRNode.RightHand;
        [SerializeField] private bool oneHandedMode;
        [SerializeField] private XRNode oneHandedController = XRNode.RightHand;
        [SerializeField, Range(0f, 0.95f)] private float stickDeadzone = 0.35f;
        [SerializeField, Range(0f, 0.95f)] private float stickRelease = 0.22f;
        [SerializeField] private bool aimFromControllerForwardWhenStickIdle = true;
        [SerializeField] private bool clearInputWhenTrackingLost = true;

        private InputDevice _moveDevice;
        private InputDevice _aimDevice;
        private InputDevice _oneDevice;
        private Vector2 _moveLatch;
        private Vector2 _aimLatch;
        private bool _previousLight;
        private bool _previousHeavy;
        private bool _previousDodge;
        private bool _previousParry;

        private void Awake()
        {
            if (router == null) router = GetComponentInParent<ActionInputRouter>();
            RefreshDevices();
        }

        private void OnEnable()
        {
            InputDevices.deviceConnected += OnDeviceChanged;
            InputDevices.deviceDisconnected += OnDeviceChanged;
            RefreshDevices();
        }

        private void OnDisable()
        {
            InputDevices.deviceConnected -= OnDeviceChanged;
            InputDevices.deviceDisconnected -= OnDeviceChanged;
            Clear();
        }

        private void Update()
        {
            if (router == null) return;
            if (oneHandedMode) UpdateOneHanded();
            else UpdateTwoHanded();
        }

        public void Configure(ActionInputRouter inputRouter, bool oneHanded, XRNode dominantHand = XRNode.RightHand)
        {
            router = inputRouter;
            oneHandedMode = oneHanded;
            oneHandedController = dominantHand;
            RefreshDevices();
        }

        private void UpdateTwoHanded()
        {
            if (!_moveDevice.isValid || !_aimDevice.isValid) RefreshDevices();
            var movementTracked = IsTracked(_moveDevice);
            var aimTracked = IsTracked(_aimDevice);
            if (clearInputWhenTrackingLost && (!movementTracked || !aimTracked))
            {
                Clear();
                return;
            }
            var move = ReadStick(_moveDevice, ref _moveLatch);
            var aim = ReadStick(_aimDevice, ref _aimLatch);
            if (aim == Vector2.zero && aimFromControllerForwardWhenStickIdle) aim = ReadForward(_aimDevice);
            router.SetContinuous(move, aim);
            var light = ReadBool(_aimDevice, CommonUsages.triggerButton);
            var heavy = ReadBool(_aimDevice, CommonUsages.gripButton);
            var dodge = ReadBool(_moveDevice, CommonUsages.primaryButton) || ReadBool(_moveDevice, CommonUsages.secondaryButton);
            var parry = ReadBool(_aimDevice, CommonUsages.primaryButton) || ReadBool(_aimDevice, CommonUsages.secondaryButton);
            LatchEdges(light, heavy, dodge, parry);
        }

        private void UpdateOneHanded()
        {
            if (!_oneDevice.isValid) RefreshDevices();
            if (clearInputWhenTrackingLost && !IsTracked(_oneDevice))
            {
                Clear();
                return;
            }
            var move = ReadStick(_oneDevice, ref _moveLatch);
            var aim = aimFromControllerForwardWhenStickIdle ? ReadForward(_oneDevice) : move;
            if (aim == Vector2.zero) aim = move == Vector2.zero ? Vector2.up : move;
            router.SetContinuous(move, aim);
            var light = ReadBool(_oneDevice, CommonUsages.triggerButton);
            var heavy = ReadBool(_oneDevice, CommonUsages.gripButton);
            var dodge = ReadBool(_oneDevice, CommonUsages.primaryButton);
            var parry = ReadBool(_oneDevice, CommonUsages.secondaryButton);
            LatchEdges(light, heavy, dodge, parry);
        }

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

        private Vector2 ReadStick(InputDevice device, ref Vector2 latch)
        {
            if (!device.isValid || !device.TryGetFeatureValue(CommonUsages.primary2DAxis, out var value))
            {
                latch = Vector2.zero;
                return Vector2.zero;
            }
            latch.x = Quantize(value.x, latch.x);
            latch.y = Quantize(value.y, latch.y);
            return latch;
        }

        private Vector2 ReadForward(InputDevice device)
        {
            if (!device.isValid || !device.TryGetFeatureValue(CommonUsages.deviceRotation, out var rotation)) return Vector2.zero;
            var forward = rotation * Vector3.forward;
            var planar = new Vector2(forward.x, forward.z);
            if (planar.sqrMagnitude < stickDeadzone * stickDeadzone) return Vector2.zero;
            planar.Normalize();
            return new Vector2(Quantize(planar.x, 0f), Quantize(planar.y, 0f));
        }

        private float Quantize(float value, float previous)
        {
            var threshold = previous == 0f ? stickDeadzone : stickRelease;
            if (value > threshold) return 1f;
            if (value < -threshold) return -1f;
            return 0f;
        }

        private static bool ReadBool(InputDevice device, InputFeatureUsage<bool> usage)
        {
            return device.isValid && device.TryGetFeatureValue(usage, out var value) && value;
        }

        private static bool IsTracked(InputDevice device)
        {
            if (!device.isValid) return false;
            return !device.TryGetFeatureValue(CommonUsages.isTracked, out var tracked) || tracked;
        }

        private void RefreshDevices()
        {
            _moveDevice = InputDevices.GetDeviceAtXRNode(movementHand);
            _aimDevice = InputDevices.GetDeviceAtXRNode(aimHand);
            _oneDevice = InputDevices.GetDeviceAtXRNode(oneHandedController);
        }

        private void OnDeviceChanged(InputDevice device)
        {
            RefreshDevices();
        }

        private void OnApplicationFocus(bool focused)
        {
            if (!focused) Clear();
        }

        private void Clear()
        {
            _moveLatch = Vector2.zero;
            _aimLatch = Vector2.zero;
            _previousLight = false;
            _previousHeavy = false;
            _previousDodge = false;
            _previousParry = false;
            router?.ClearContinuousInput();
        }
    }
}
