using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    public static class ActionPlayerAction
    {
        public const string Light = "light";
        public const string Heavy = "heavy";
        public const string Dodge = "dodge";
        public const string Parry = "parry";
        public const string Interact = "interact";

        public static readonly string[] All = { Light, Heavy, Dodge, Parry, Interact };

        public static bool IsKnown(string value)
        {
            foreach (var action in All) if (action == value) return true;
            return false;
        }
    }

    [Serializable]
    public sealed class ActionInputBindingProfile
    {
        public const string Format = "rodoh-action-input-bindings/1";

        public string format = Format;
        public string profileId = "default";
        public string horizontalAxis = "Horizontal";
        public string verticalAxis = "Vertical";
        public string rightStickHorizontalAxis = "RightStickHorizontal";
        public string rightStickVerticalAxis = "RightStickVertical";

        public string lightPrimary = "Mouse0";
        public string lightSecondary = "J";
        public string lightGamepad = "JoystickButton0";
        public string heavyPrimary = "Mouse1";
        public string heavySecondary = "K";
        public string heavyGamepad = "JoystickButton2";
        public string dodgePrimary = "Space";
        public string dodgeSecondary = "LeftShift";
        public string dodgeGamepad = "JoystickButton1";
        public string parryPrimary = "Q";
        public string parrySecondary = "L";
        public string parryGamepad = "JoystickButton4";
        public string interactPrimary = "E";
        public string interactSecondary = "F";
        public string interactGamepad = "JoystickButton3";

        public static ActionInputBindingProfile CreateDefault()
        {
            return new ActionInputBindingProfile();
        }

        public IReadOnlyList<string> Validate()
        {
            var errors = new List<string>();
            if (format != Format) errors.Add("Input binding profile format is unsupported.");
            if (string.IsNullOrWhiteSpace(profileId)) errors.Add("Input binding profile id is absent.");
            foreach (var axis in new[] { horizontalAxis, verticalAxis, rightStickHorizontalAxis, rightStickVerticalAxis })
            {
                if (string.IsNullOrWhiteSpace(axis)) errors.Add("Input binding axis name is absent.");
            }
            foreach (var action in ActionPlayerAction.All)
            {
                if (!TryKey(Primary(action), out _)) errors.Add("Input primary binding is invalid: " + action + ".");
                if (!TryKey(Secondary(action), out _)) errors.Add("Input secondary binding is invalid: " + action + ".");
                if (!TryKey(Gamepad(action), out var gamepad) || !IsGamepadKey(gamepad))
                {
                    errors.Add("Input gamepad binding is invalid: " + action + ".");
                }
            }
            return errors;
        }

        public string Primary(string action)
        {
            switch (action)
            {
                case ActionPlayerAction.Light: return lightPrimary;
                case ActionPlayerAction.Heavy: return heavyPrimary;
                case ActionPlayerAction.Dodge: return dodgePrimary;
                case ActionPlayerAction.Parry: return parryPrimary;
                case ActionPlayerAction.Interact: return interactPrimary;
                default: return string.Empty;
            }
        }

        public string Secondary(string action)
        {
            switch (action)
            {
                case ActionPlayerAction.Light: return lightSecondary;
                case ActionPlayerAction.Heavy: return heavySecondary;
                case ActionPlayerAction.Dodge: return dodgeSecondary;
                case ActionPlayerAction.Parry: return parrySecondary;
                case ActionPlayerAction.Interact: return interactSecondary;
                default: return string.Empty;
            }
        }

        public string Gamepad(string action)
        {
            switch (action)
            {
                case ActionPlayerAction.Light: return lightGamepad;
                case ActionPlayerAction.Heavy: return heavyGamepad;
                case ActionPlayerAction.Dodge: return dodgeGamepad;
                case ActionPlayerAction.Parry: return parryGamepad;
                case ActionPlayerAction.Interact: return interactGamepad;
                default: return string.Empty;
            }
        }

        public bool SetBinding(string action, string device, KeyCode key)
        {
            if (!ActionPlayerAction.IsKnown(action)) return false;
            if (device == "gamepad")
            {
                if (!IsGamepadKey(key)) return false;
                SetGamepad(action, key.ToString());
                return true;
            }
            if (device == "keyboard-mouse")
            {
                if (IsGamepadKey(key) || key == KeyCode.None) return false;
                SetPrimary(action, key.ToString());
                return true;
            }
            return false;
        }

        public string Digest()
        {
            using (var sha = SHA256.Create())
            {
                var payload = Encoding.UTF8.GetBytes(CanonicalPayload());
                var digest = sha.ComputeHash(payload);
                return "actbind1_" + BitConverter.ToString(digest).Replace("-", string.Empty).ToLowerInvariant();
            }
        }

        public string ControlSummary()
        {
            return Short(lightPrimary) + " sweep   "
                + Short(heavyPrimary) + " crush   "
                + Short(dodgePrimary) + " dodge   "
                + Short(parryPrimary) + " parry   "
                + Short(interactPrimary) + " work   F10 rebind";
        }

        public string GamepadSummary()
        {
            return Short(lightGamepad) + " sweep   "
                + Short(heavyGamepad) + " crush   "
                + Short(dodgeGamepad) + " dodge   "
                + Short(parryGamepad) + " parry   "
                + Short(interactGamepad) + " work";
        }

        public static bool TryKey(string value, out KeyCode key)
        {
            return Enum.TryParse(value ?? string.Empty, true, out key) && key != KeyCode.None;
        }

        public static bool IsGamepadKey(KeyCode key)
        {
            return key.ToString().StartsWith("Joystick", StringComparison.Ordinal);
        }

        private string CanonicalPayload()
        {
            var values = new[]
            {
                format, profileId, horizontalAxis, verticalAxis,
                rightStickHorizontalAxis, rightStickVerticalAxis,
                lightPrimary, lightSecondary, lightGamepad,
                heavyPrimary, heavySecondary, heavyGamepad,
                dodgePrimary, dodgeSecondary, dodgeGamepad,
                parryPrimary, parrySecondary, parryGamepad,
                interactPrimary, interactSecondary, interactGamepad
            };
            return string.Join("\n", values) + "\n";
        }

        private static string Short(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "?";
            return value.Replace("JoystickButton", "Pad ").Replace("Mouse", "Mouse ");
        }

        private void SetPrimary(string action, string value)
        {
            switch (action)
            {
                case ActionPlayerAction.Light: lightPrimary = value; break;
                case ActionPlayerAction.Heavy: heavyPrimary = value; break;
                case ActionPlayerAction.Dodge: dodgePrimary = value; break;
                case ActionPlayerAction.Parry: parryPrimary = value; break;
                case ActionPlayerAction.Interact: interactPrimary = value; break;
            }
        }

        private void SetGamepad(string action, string value)
        {
            switch (action)
            {
                case ActionPlayerAction.Light: lightGamepad = value; break;
                case ActionPlayerAction.Heavy: heavyGamepad = value; break;
                case ActionPlayerAction.Dodge: dodgeGamepad = value; break;
                case ActionPlayerAction.Parry: parryGamepad = value; break;
                case ActionPlayerAction.Interact: interactGamepad = value; break;
            }
        }
    }

    /// <summary>
    /// Local player preference surface for keyboard, mouse, and gamepad actions.
    /// Bindings are sampled into the same bounded deterministic input frame and never
    /// alter Arc timing, action law, objectives, candidates, or receipts.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionInputBindings : MonoBehaviour
    {
        [SerializeField] private ActionInputBindingProfile profile = new ActionInputBindingProfile();
        [SerializeField] private bool persist = true;
        [SerializeField] private string playerPrefsKey = "axm.rodoh.action.bindings.v1";

        public event Action BindingsChanged;

        public ActionInputBindingProfile Profile => profile;
        public string ProfileDigest => profile == null ? string.Empty : profile.Digest();
        public bool PersistenceEnabled => persist;

        private void Awake()
        {
            if (profile == null) profile = ActionInputBindingProfile.CreateDefault();
            Load();
            RequireValid();
        }

        public bool IsHeld(string action, out bool keyboardMouse, out bool gamepad)
        {
            keyboardMouse = false;
            gamepad = false;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (profile == null || !ActionPlayerAction.IsKnown(action)) return false;
            keyboardMouse = KeyHeld(profile.Primary(action)) || KeyHeld(profile.Secondary(action));
            gamepad = KeyHeld(profile.Gamepad(action));
#endif
            return keyboardMouse || gamepad;
        }

        public bool IsDown(string action, out bool keyboardMouse, out bool gamepad)
        {
            keyboardMouse = false;
            gamepad = false;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (profile == null || !ActionPlayerAction.IsKnown(action)) return false;
            keyboardMouse = KeyDown(profile.Primary(action)) || KeyDown(profile.Secondary(action));
            gamepad = KeyDown(profile.Gamepad(action));
#endif
            return keyboardMouse || gamepad;
        }

        public float ReadAxis(string axisName)
        {
#if ENABLE_LEGACY_INPUT_MANAGER
            if (string.IsNullOrWhiteSpace(axisName)) return 0f;
            try
            {
                return Input.GetAxisRaw(axisName);
            }
            catch (UnityException)
            {
                return 0f;
            }
#else
            return 0f;
#endif
        }

        public bool Rebind(string action, string device, KeyCode key)
        {
            if (profile == null) profile = ActionInputBindingProfile.CreateDefault();
            if (!profile.SetBinding(action, device, key)) return false;
            RequireValid();
            Save();
            BindingsChanged?.Invoke();
            return true;
        }

        public void ResetToDefaults()
        {
            profile = ActionInputBindingProfile.CreateDefault();
            Save();
            BindingsChanged?.Invoke();
        }

        public void Save()
        {
            if (!persist || profile == null || string.IsNullOrWhiteSpace(playerPrefsKey)) return;
            PlayerPrefs.SetString(playerPrefsKey, JsonUtility.ToJson(profile));
            PlayerPrefs.Save();
        }

        public void Load()
        {
            if (!persist || string.IsNullOrWhiteSpace(playerPrefsKey) || !PlayerPrefs.HasKey(playerPrefsKey)) return;
            var value = JsonUtility.FromJson<ActionInputBindingProfile>(PlayerPrefs.GetString(playerPrefsKey));
            if (value == null || value.Validate().Count > 0) return;
            profile = value;
        }

        private void RequireValid()
        {
            var errors = profile?.Validate();
            if (errors != null && errors.Count > 0)
            {
                throw new InvalidOperationException("Action input binding profile is invalid: " + string.Join(" ", errors));
            }
        }

#if ENABLE_LEGACY_INPUT_MANAGER
        private static bool KeyHeld(string value)
        {
            return ActionInputBindingProfile.TryKey(value, out var key) && Input.GetKey(key);
        }

        private static bool KeyDown(string value)
        {
            return ActionInputBindingProfile.TryKey(value, out var key) && Input.GetKeyDown(key);
        }
#endif
    }
}
