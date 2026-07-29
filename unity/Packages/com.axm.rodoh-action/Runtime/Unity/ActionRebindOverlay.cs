using System;
using UnityEngine;

namespace Axm.Rodoh.Action
{
    /// <summary>
    /// Small local rebind surface. F10 opens the menu; a player chooses an action and
    /// then presses a keyboard, mouse, or gamepad button. The result is a preference
    /// only and feeds the same deterministic ActionInputFrame ingress.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class ActionRebindOverlay : MonoBehaviour
    {
        [SerializeField] private ActionInputBindings bindings;
        [SerializeField] private bool enabledByPreference = true;
        [SerializeField] private KeyCode toggleKey = KeyCode.F10;
        [SerializeField] private bool pauseWhileOpen = true;

        private bool _open;
        private string _captureAction;
        private string _captureDevice;
        private float _previousTimeScale = 1f;
        private GUIStyle _title;
        private GUIStyle _body;
        private GUIStyle _button;

        public bool IsOpen => _open;
        public bool Rebinding => !string.IsNullOrEmpty(_captureAction);

        private void Awake()
        {
            if (bindings == null) bindings = GetComponent<ActionInputBindings>();
        }

        private void OnDisable()
        {
            Close();
        }

        private void Update()
        {
            if (!enabledByPreference || Application.isBatchMode) return;
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKeyDown(toggleKey) || Input.GetKeyDown(KeyCode.JoystickButton7))
            {
                if (_open) Close();
                else Open();
            }
            if (!_open || string.IsNullOrEmpty(_captureAction)) return;
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                CancelCapture();
                return;
            }
            foreach (KeyCode key in Enum.GetValues(typeof(KeyCode)))
            {
                if (key == KeyCode.None || key == toggleKey || !Input.GetKeyDown(key)) continue;
                var gamepad = ActionInputBindingProfile.IsGamepadKey(key);
                if (_captureDevice == "gamepad" && !gamepad) continue;
                if (_captureDevice == "keyboard-mouse" && gamepad) continue;
                if (bindings != null && bindings.Rebind(_captureAction, _captureDevice, key))
                {
                    CancelCapture();
                    return;
                }
            }
#endif
        }

        public void Open()
        {
            if (_open) return;
            _open = true;
            _previousTimeScale = Time.timeScale;
            if (pauseWhileOpen) Time.timeScale = 0f;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        public void Close()
        {
            if (!_open) return;
            _open = false;
            CancelCapture();
            if (pauseWhileOpen) Time.timeScale = _previousTimeScale;
        }

        public void BeginCapture(string action, string device)
        {
            if (!_open || !ActionPlayerAction.IsKnown(action)) return;
            if (device != "keyboard-mouse" && device != "gamepad") return;
            _captureAction = action;
            _captureDevice = device;
        }

        public void CancelCapture()
        {
            _captureAction = null;
            _captureDevice = null;
        }

        private void OnGUI()
        {
            if (!_open || Application.isBatchMode) return;
            EnsureStyles();
            var width = Mathf.Min(760f, Screen.width - 32f);
            var height = Mathf.Min(610f, Screen.height - 32f);
            var area = new Rect((Screen.width - width) * 0.5f, (Screen.height - height) * 0.5f, width, height);
            GUI.Box(area, GUIContent.none);
            GUILayout.BeginArea(new Rect(area.x + 20f, area.y + 18f, area.width - 40f, area.height - 36f));
            GUILayout.Label("ACTION CONTROLS", _title);
            GUILayout.Label("Choose a binding, then press the replacement button. F10 closes this menu. Arc timing and action law do not change.", _body);
            GUILayout.Space(12f);

            if (bindings == null || bindings.Profile == null)
            {
                GUILayout.Label("No binding profile is installed.", _body);
            }
            else
            {
                foreach (var action in ActionPlayerAction.All) DrawAction(action);
                GUILayout.Space(12f);
                GUILayout.Label("Binding profile: " + bindings.ProfileDigest, _body);
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("RESET DEFAULTS", _button)) bindings.ResetToDefaults();
                if (GUILayout.Button("CLOSE", _button)) Close();
                GUILayout.EndHorizontal();
            }
            GUILayout.EndArea();
        }

        private void DrawAction(string action)
        {
            var profile = bindings.Profile;
            GUILayout.BeginHorizontal();
            GUILayout.Label(action.ToUpperInvariant(), _body, GUILayout.Width(110f));
            var keyboard = string.Equals(_captureAction, action, StringComparison.Ordinal) && _captureDevice == "keyboard-mouse"
                ? "PRESS KEY / MOUSE"
                : profile.Primary(action);
            var gamepad = string.Equals(_captureAction, action, StringComparison.Ordinal) && _captureDevice == "gamepad"
                ? "PRESS GAMEPAD"
                : profile.Gamepad(action);
            if (GUILayout.Button("KEYBOARD  " + keyboard, _button)) BeginCapture(action, "keyboard-mouse");
            if (GUILayout.Button("GAMEPAD  " + gamepad, _button)) BeginCapture(action, "gamepad");
            GUILayout.EndHorizontal();
        }

        private void EnsureStyles()
        {
            if (_title != null) return;
            _title = new GUIStyle(GUI.skin.label)
            {
                fontSize = 24,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            _body = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                wordWrap = true,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = new Color(0.88f, 0.9f, 0.84f, 1f) }
            };
            _button = new GUIStyle(GUI.skin.button)
            {
                fontSize = 13,
                fixedHeight = 42f
            };
        }
    }
}
