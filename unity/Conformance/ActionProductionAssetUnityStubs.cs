using System;

namespace UnityEngine
{
    [AttributeUsage(AttributeTargets.Class)]
    public sealed class DisallowMultipleComponent : Attribute { }

    [AttributeUsage(AttributeTargets.Field)]
    public sealed class SerializeField : Attribute { }

    [AttributeUsage(AttributeTargets.Field)]
    public sealed class RangeAttribute : Attribute
    {
        public RangeAttribute(float minimum, float maximum) { }
    }

    public class Object
    {
        public string name = string.Empty;
    }

    public class Component : Object { }
    public class MonoBehaviour : Component { }
    public class Mesh : Object { }
    public class Sprite : Object { }

    public class GameObject : Object
    {
        public T[] GetComponentsInChildren<T>(bool includeInactive) => Array.Empty<T>();
        public T AddComponent<T>() where T : new() => new T();
    }

    public class MeshFilter : Component
    {
        public Mesh sharedMesh;
    }

    public class SkinnedMeshRenderer : Component
    {
        public Mesh sharedMesh;
    }

    public class SpriteRenderer : Component
    {
        public Sprite sprite;
    }

    public class Rigidbody : Component
    {
        public bool isKinematic;
        public bool detectCollisions;
        public bool useGravity;
    }

    public class Collider : Component
    {
        public bool enabled;
    }

    public static class Application
    {
        public static string dataPath = string.Empty;
        public static string unityVersion = string.Empty;
        public static bool isBatchMode;
    }

    public static class JsonUtility
    {
        public static T FromJson<T>(string json) => default;
        public static string ToJson(object value, bool prettyPrint) => string.Empty;
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogException(Exception exception) { }
    }
}

namespace UnityEngine.Serialization
{
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class FormerlySerializedAsAttribute : Attribute
    {
        public FormerlySerializedAsAttribute(string oldName) { }
    }
}

namespace UnityEditor
{
    [Flags]
    public enum ImportAssetOptions
    {
        Default = 0,
        ForceUpdate = 1,
        ForceSynchronousImport = 2
    }

    public static class AssetDatabase
    {
        public static string GetAssetPath(UnityEngine.Object asset) => string.Empty;
        public static string[] GetDependencies(string path, bool recursive) => Array.Empty<string>();
        public static string AssetPathToGUID(string path) => string.Empty;
        public static T LoadAssetAtPath<T>(string path) where T : UnityEngine.Object => default;
        public static void SaveAssets() { }
        public static void Refresh(ImportAssetOptions options) { }
        public static void ImportAsset(string path, ImportAssetOptions options) { }
    }

    public static class PrefabUtility
    {
        public static UnityEngine.GameObject LoadPrefabContents(string path) => new UnityEngine.GameObject();
        public static UnityEngine.GameObject SaveAsPrefabAsset(UnityEngine.GameObject root, string path) => root;
        public static void UnloadPrefabContents(UnityEngine.GameObject root) { }
    }

    public static class EditorUtility
    {
        public static void SetDirty(UnityEngine.Object target) { }
    }

    public static class EditorApplication
    {
        public static void Exit(int code) { }
    }
}

namespace Axm.Rodoh.Action
{
    public sealed class ActionSpecProjection
    {
        public string sourceSpecDigest = string.Empty;
        public ActionArenaProjection arena = new ActionArenaProjection();
    }

    public sealed class ActionArenaProjection
    {
        public string kit = string.Empty;
    }

    public static class ActionContract
    {
        public static bool IsEnemyKit(string value) => true;
        public static bool IsArenaKit(string value) => true;
    }
}
