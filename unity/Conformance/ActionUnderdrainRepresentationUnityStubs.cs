using System;
using System.Collections.Generic;

namespace UnityEngine
{
    [AttributeUsage(AttributeTargets.Class)] public sealed class DisallowMultipleComponent : Attribute { }
    [AttributeUsage(AttributeTargets.Field)] public sealed class SerializeField : Attribute { }
    [AttributeUsage(AttributeTargets.Field)] public sealed class MinAttribute : Attribute { public MinAttribute(float value) { } }

    public class Object
    {
        public string name = string.Empty;
        public static void DestroyImmediate(Object value) { }
    }

    public class Component : Object
    {
        public GameObject gameObject = new GameObject(false);
        public Transform transform => gameObject.transform;
        public T GetComponentInChildren<T>(bool includeInactive = false) where T : class => default;
        public T[] GetComponentsInChildren<T>(bool includeInactive = false) => Array.Empty<T>();
    }

    public class MonoBehaviour : Component { }

    public class GameObject : Object
    {
        public readonly Transform transform;
        public bool isStatic;
        public string tag = string.Empty;
        public GameObject(string value = "") : this(true) { name = value; }
        internal GameObject(bool createTransform) { transform = createTransform ? new Transform(this) : null; }
        public T AddComponent<T>() where T : Component, new() { var value = new T(); value.gameObject = this; return value; }
        public T[] GetComponentsInChildren<T>(bool includeInactive) => Array.Empty<T>();
        public void SetActive(bool value) { }
    }

    public class Transform : Component
    {
        internal Transform(GameObject owner) { gameObject = owner; }
        public Vector3 position;
        public Quaternion rotation;
        public Vector3 localPosition;
        public Quaternion localRotation;
        public Vector3 localScale = Vector3.one;
        public Vector3 forward => Vector3.forward;
        public Vector3 right => Vector3.right;
        public void SetParent(Transform parent, bool worldPositionStays) { }
        public Transform Find(string name) => null;
    }

    public struct Vector2
    {
        public float x, y;
        public Vector2(float xValue, float yValue) { x = xValue; y = yValue; }
    }

    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float xValue, float yValue, float zValue) { x = xValue; y = yValue; z = zValue; }
        public float sqrMagnitude => x * x + y * y + z * z;
        public Vector3 normalized => this;
        public static Vector3 zero => new Vector3();
        public static Vector3 one => new Vector3(1f, 1f, 1f);
        public static Vector3 up => new Vector3(0f, 1f, 0f);
        public static Vector3 forward => new Vector3(0f, 0f, 1f);
        public static Vector3 right => new Vector3(1f, 0f, 0f);
        public static Vector3 operator +(Vector3 left, Vector3 right) => left;
        public static Vector3 operator -(Vector3 left, Vector3 right) => left;
        public static Vector3 operator *(Vector3 left, float right) => left;
        public static float Dot(Vector3 left, Vector3 right) => 0f;
    }

    public struct Quaternion
    {
        public static Quaternion identity => new Quaternion();
        public static Quaternion LookRotation(Vector3 forward, Vector3 upwards) => new Quaternion();
        public static Quaternion Euler(float x, float y, float z) => new Quaternion();
    }

    public struct Color
    {
        public float r, g, b, a;
        public Color(float red, float green, float blue, float alpha = 1f) { r = red; g = green; b = blue; a = alpha; }
        public static Color white => new Color(1f, 1f, 1f, 1f);
        public static Color Lerp(Color left, Color right, float progress) => left;
    }

    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte red, byte green, byte blue, byte alpha) { r = red; g = green; b = blue; a = alpha; }
    }

    public static class Mathf
    {
        public const float PI = 3.1415927f;
        public static float Max(float left, float right) => left;
        public static float Clamp01(float value) => value;
        public static float Lerp(float left, float right, float progress) => left;
        public static float Sqrt(float value) => value;
        public static int RoundToInt(float value) => (int)value;
    }

    public static class Time { public static float unscaledTime; }
    public static class Application { public static string unityVersion = string.Empty; public static string dataPath = string.Empty; public static bool isBatchMode; }
    public static class Debug { public static void Log(object value) { } public static void LogException(Exception exception) { } }
    public static class JsonUtility { public static T FromJson<T>(string json) => default; public static string ToJson(object value, bool pretty) => string.Empty; }

    public class Texture : Object { }
    public enum TextureFormat { RGBA32 }
    public enum FilterMode { Bilinear }
    public enum TextureWrapMode { Clamp }
    public class Texture2D : Texture
    {
        public Texture2D(int width, int height, TextureFormat format, bool mipChain) { }
        public void SetPixels32(Color32[] values) { }
        public void Apply(bool updateMipmaps, bool makeNoLongerReadable) { }
        public byte[] EncodeToPNG() => Array.Empty<byte>();
    }

    public class Sprite : Object { public Texture2D texture = new Texture2D(1, 1, TextureFormat.RGBA32, false); }
    public class Shader : Object { public static Shader Find(string name) => new Shader(); }
    public class Material : Object
    {
        public Material(Shader shaderValue) { shader = shaderValue; }
        public Shader shader;
        public Texture mainTexture;
        public Color color;
        public bool enableInstancing;
    }

    public class Renderer : Component { public Material sharedMaterial; }
    public class SpriteRenderer : Renderer { public Sprite sprite; public bool flipX; public int sortingOrder; public Color color; }
    public class Collider : Component { public bool enabled = true; public bool isTrigger; }
    public class BoxCollider : Collider { public Vector3 size; }
    public class CharacterController : Collider { }
    public class Rigidbody : Component { public bool isKinematic; public bool detectCollisions; public bool useGravity; }

    public enum AnimatorUpdateMode { Normal }
    public class RuntimeAnimatorController : Object { }
    public class Animator : Component { public RuntimeAnimatorController runtimeAnimatorController; public bool applyRootMotion; public AnimatorUpdateMode updateMode; }

    public enum WrapMode { Loop, Once }
    public class Keyframe { public Keyframe(float time, float value) { } }
    public class AnimationCurve { public AnimationCurve(params Keyframe[] values) { } }
    public class AnimationClip : Object
    {
        public float frameRate;
        public WrapMode wrapMode;
        public void ClearCurves() { }
        public void SetCurve(string path, Type type, string propertyName, AnimationCurve curve) { }
    }

    public class AudioClip : Object { }
    public class Camera : Component { public static Camera main; public float fieldOfView; }
    public enum LightType { Directional }
    public class Light : Component { public LightType type; public float intensity; public Color color; }
}

namespace UnityEngine.SceneManagement
{
    public struct Scene { }
    public static class SceneManager { public static void MoveGameObjectToScene(UnityEngine.GameObject value, Scene scene) { } }
}

namespace UnityEditor
{
    [Flags] public enum ImportAssetOptions { Default = 0, ForceUpdate = 1, ForceSynchronousImport = 2 }
    public enum TextureImporterType { Sprite }
    public enum SpriteImportMode { Single }
    public enum TextureImporterCompression { Uncompressed }

    public class AssetImporter
    {
        public static AssetImporter GetAtPath(string path) => new TextureImporter();
    }

    public class TextureImporter : AssetImporter
    {
        public TextureImporterType textureType;
        public SpriteImportMode spriteImportMode;
        public float spritePixelsPerUnit;
        public UnityEngine.Vector2 spritePivot;
        public bool alphaIsTransparency;
        public bool mipmapEnabled;
        public TextureImporterCompression textureCompression;
        public UnityEngine.FilterMode filterMode;
        public UnityEngine.TextureWrapMode wrapMode;
        public void SaveAndReimport() { }
    }

    public static class AssetDatabase
    {
        public static void ImportAsset(string path, ImportAssetOptions options) { }
        public static T LoadAssetAtPath<T>(string path) where T : UnityEngine.Object => default;
        public static void CreateAsset(UnityEngine.Object value, string path) { }
        public static void SaveAssets() { }
        public static void Refresh(ImportAssetOptions options) { }
        public static string AssetPathToGUID(string path) => new string('a', 32);
    }

    public static class EditorUtility { public static void SetDirty(UnityEngine.Object value) { } }
    public static class EditorApplication { public static void Exit(int code) { } }

    public static class PrefabUtility
    {
        public static UnityEngine.GameObject SaveAsPrefabAsset(UnityEngine.GameObject value, string path) => value;
        public static UnityEngine.Object InstantiatePrefab(UnityEngine.Object value, UnityEngine.SceneManagement.Scene scene) => new UnityEngine.GameObject();
    }
}

namespace UnityEditor.Animations
{
    public enum AnimatorControllerParameterType { Int, Bool, Trigger }
    public enum AnimatorConditionMode { Equals }

    public class AnimatorControllerParameter { }
    public class AnimatorState : UnityEngine.Object { public UnityEngine.AnimationClip motion; public bool writeDefaultValues; }
    public class AnimatorStateTransition
    {
        public bool hasExitTime;
        public bool hasFixedDuration;
        public float duration;
        public bool canTransitionToSelf;
        public void AddCondition(AnimatorConditionMode mode, float threshold, string parameter) { }
    }
    public struct ChildAnimatorState { public AnimatorState state; }
    public class AnimatorStateMachine
    {
        public ChildAnimatorState[] states => Array.Empty<ChildAnimatorState>();
        public AnimatorStateTransition[] anyStateTransitions => Array.Empty<AnimatorStateTransition>();
        public AnimatorState defaultState;
        public AnimatorState AddState(string name) => new AnimatorState();
        public AnimatorStateTransition AddAnyStateTransition(AnimatorState state) => new AnimatorStateTransition();
        public void RemoveAnyStateTransition(AnimatorStateTransition transition) { }
        public void RemoveState(AnimatorState state) { }
    }
    public class AnimatorControllerLayer { public AnimatorStateMachine stateMachine = new AnimatorStateMachine(); }
    public class AnimatorController : UnityEngine.RuntimeAnimatorController
    {
        public AnimatorControllerParameter[] parameters { get; set; } = Array.Empty<AnimatorControllerParameter>();
        public AnimatorControllerLayer[] layers = { new AnimatorControllerLayer() };
        public static AnimatorController CreateAnimatorControllerAtPath(string path) => new AnimatorController();
        public void AddParameter(string name, AnimatorControllerParameterType type) { }
    }
}

namespace UnityEditor.SceneManagement
{
    public enum NewSceneSetup { EmptyScene }
    public enum NewSceneMode { Single }
    public static class EditorSceneManager
    {
        public static UnityEngine.SceneManagement.Scene NewScene(NewSceneSetup setup, NewSceneMode mode) => new UnityEngine.SceneManagement.Scene();
        public static bool SaveScene(UnityEngine.SceneManagement.Scene scene, string path) => true;
    }
}

namespace Axm.Rodoh.Action
{
    public sealed class ActionMotionSet { public string idle, move, light, heavy, dodge, parry, stagger, defeat; }
    public class ActionActorPresentation { public string actorId, bodyPrefab, animatorController; public ActionMotionSet motionSet = new ActionMotionSet(); public bool neutralFallback; public float scale; }
    public sealed class ActionEnemyPresentation : ActionActorPresentation { public string kit; }
    public sealed class ActionArenaPresentation { public string kit, recipe; public bool neutralFallback; public float metersPerActionUnit; }
    public sealed class ActionFeedbackPresentation { public string @event, vfxPrefab, audioClip; public float haptic, cameraImpulse; public int hitStopMilliseconds; public bool neutralFallback; }
    public sealed class ActionPresentationManifest
    {
        public const string Format = "rodoh-action-presentation-manifest/1";
        public string format, manifestId, sourceActionSpecDigest, themeId;
        public ActionActorPresentation player = new ActionActorPresentation();
        public ActionEnemyPresentation[] enemies = Array.Empty<ActionEnemyPresentation>();
        public ActionArenaPresentation arena = new ActionArenaPresentation();
        public ActionFeedbackPresentation[] feedback = Array.Empty<ActionFeedbackPresentation>();
        public ActionEnemyPresentation Enemy(string kit) => null;
    }

    public sealed class ActionActorBinding : UnityEngine.MonoBehaviour { public void Configure(string id, UnityEngine.Animator animator, UnityEngine.Transform visual) { } }
    public sealed class ActionPhysicsQuarantine : UnityEngine.MonoBehaviour { }
    public sealed class ActionProductionAssetMarker : UnityEngine.MonoBehaviour { public bool ProductionApproved => false; }

    public static class ActionProductionAssetDigest
    {
        public sealed class PrefabClosure
        {
            public string visualSourceSha256 = new string('a', 64);
            public string dependencyClosureSha256 = new string('b', 64);
            public int dependencyCount = 1;
        }
        public sealed class DeclaredBindingRecord { public string assetPath = string.Empty; }
        public sealed class DeclaredBindingClosure
        {
            public string declaredBindingClosureSha256 = new string('c', 64);
            public DeclaredBindingRecord[] bindings = Array.Empty<DeclaredBindingRecord>();
            public int declaredBindingCount = 27;
            public int uniqueDeclaredAssetCount = 23;
        }
        public static PrefabClosure ComputePrefabClosure(UnityEngine.GameObject prefab, string[] forbiddenRoots) => new PrefabClosure();
        public static DeclaredBindingClosure ComputeDeclaredBindingClosure(ActionPresentationManifest presentation, string[] forbiddenRoots) => new DeclaredBindingClosure();
    }
}
