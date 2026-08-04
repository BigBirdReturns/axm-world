#include <openxr/openxr.h>

#include <algorithm>
#include <array>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#endif

namespace {

std::string EscapeJson(const std::string& input) {
    std::ostringstream out;
    for (unsigned char value : input) {
        switch (value) {
            case '"': out << "\\\""; break;
            case '\\': out << "\\\\"; break;
            case '\b': out << "\\b"; break;
            case '\f': out << "\\f"; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (value < 0x20) {
                    constexpr char hex[] = "0123456789abcdef";
                    out << "\\u00" << hex[(value >> 4) & 0x0f] << hex[value & 0x0f];
                } else {
                    out << static_cast<char>(value);
                }
        }
    }
    return out.str();
}

std::string VersionString(XrVersion version) {
    std::ostringstream out;
    out << XR_VERSION_MAJOR(version) << '.' << XR_VERSION_MINOR(version) << '.' << XR_VERSION_PATCH(version);
    return out.str();
}

const char* Bool(bool value) { return value ? "true" : "false"; }

#ifdef _WIN32
std::string WideToUtf8(const std::wstring& input) {
    if (input.empty()) return {};
    const int required = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), nullptr, 0, nullptr, nullptr);
    if (required <= 0) return {};
    std::string output(static_cast<std::size_t>(required), '\0');
    WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, input.data(), static_cast<int>(input.size()), output.data(), required, nullptr, nullptr);
    return output;
}

std::string ReadActiveRuntimeManifest() {
    HKEY key = nullptr;
    constexpr wchar_t subkey[] = L"SOFTWARE\\Khronos\\OpenXR\\1";
    LONG result = RegOpenKeyExW(HKEY_LOCAL_MACHINE, subkey, 0, KEY_READ | KEY_WOW64_64KEY, &key);
    if (result != ERROR_SUCCESS) return {};
    DWORD type = 0;
    DWORD bytes = 0;
    result = RegQueryValueExW(key, L"ActiveRuntime", nullptr, &type, nullptr, &bytes);
    if (result != ERROR_SUCCESS || (type != REG_SZ && type != REG_EXPAND_SZ) || bytes < sizeof(wchar_t) || bytes > 32768) {
        RegCloseKey(key);
        return {};
    }
    std::vector<wchar_t> buffer(bytes / sizeof(wchar_t) + 1, L'\0');
    result = RegQueryValueExW(key, L"ActiveRuntime", nullptr, &type, reinterpret_cast<BYTE*>(buffer.data()), &bytes);
    RegCloseKey(key);
    if (result != ERROR_SUCCESS) return {};
    std::wstring value(buffer.data());
    if (type == REG_EXPAND_SZ) {
        DWORD needed = ExpandEnvironmentStringsW(value.c_str(), nullptr, 0);
        if (needed > 0 && needed < 32768) {
            std::vector<wchar_t> expanded(needed, L'\0');
            if (ExpandEnvironmentStringsW(value.c_str(), expanded.data(), needed) > 0) value.assign(expanded.data());
        }
    }
    return WideToUtf8(value);
}
#else
std::string ReadActiveRuntimeManifest() { return {}; }
#endif

std::vector<std::string> EnumerateExtensions(XrResult& resultOut) {
    uint32_t count = 0;
    resultOut = xrEnumerateInstanceExtensionProperties(nullptr, 0, &count, nullptr);
    if (XR_FAILED(resultOut)) return {};
    std::vector<XrExtensionProperties> properties(count, {XR_TYPE_EXTENSION_PROPERTIES});
    resultOut = xrEnumerateInstanceExtensionProperties(nullptr, count, &count, properties.data());
    if (XR_FAILED(resultOut)) return {};
    std::vector<std::string> names;
    names.reserve(count);
    for (const auto& property : properties) names.emplace_back(property.extensionName);
    std::sort(names.begin(), names.end());
    return names;
}

int SelfTest() {
    const std::string escaped = EscapeJson("quote=\" slash=\\ newline=\n");
    const bool passed = escaped == "quote=\\\" slash=\\\\ newline=\\n";
    std::cout << "{\"format\":\"motiondeck-openxr-probe-selftest/1\",\"status\":\""
              << (passed ? "passed" : "failed")
              << "\",\"openxrSdkCommit\":\"57af7fc61f9f2d492580cb28aab6d0ea59d8d417\","
              << "\"productAuthority\":\"none\"}\n";
    return passed ? 0 : 2;
}

int Probe() {
    const std::string activeRuntimeManifest = ReadActiveRuntimeManifest();
    XrResult extensionResult = XR_SUCCESS;
    const auto extensions = EnumerateExtensions(extensionResult);
    const bool headlessAvailable = std::find(extensions.begin(), extensions.end(), "XR_MND_headless") != extensions.end();

    std::vector<const char*> enabledExtensions;
    if (headlessAvailable) enabledExtensions.push_back("XR_MND_headless");

    XrInstanceCreateInfo createInfo{XR_TYPE_INSTANCE_CREATE_INFO};
    std::strncpy(createInfo.applicationInfo.applicationName, "MotionDeck Cabinet Probe", XR_MAX_APPLICATION_NAME_SIZE - 1);
    createInfo.applicationInfo.applicationVersion = 1;
    std::strncpy(createInfo.applicationInfo.engineName, "MotionDeck", XR_MAX_ENGINE_NAME_SIZE - 1);
    createInfo.applicationInfo.engineVersion = 1;
    createInfo.applicationInfo.apiVersion = XR_CURRENT_API_VERSION;
    createInfo.enabledExtensionCount = static_cast<uint32_t>(enabledExtensions.size());
    createInfo.enabledExtensionNames = enabledExtensions.empty() ? nullptr : enabledExtensions.data();

    XrInstance instance = XR_NULL_HANDLE;
    const XrResult instanceResult = XR_SUCCEEDED(extensionResult) ? xrCreateInstance(&createInfo, &instance) : extensionResult;
    XrInstanceProperties instanceProperties{XR_TYPE_INSTANCE_PROPERTIES};
    XrResult propertiesResult = XR_ERROR_HANDLE_INVALID;
    if (XR_SUCCEEDED(instanceResult)) propertiesResult = xrGetInstanceProperties(instance, &instanceProperties);

    XrSystemGetInfo systemInfo{XR_TYPE_SYSTEM_GET_INFO};
    systemInfo.formFactor = XR_FORM_FACTOR_HEAD_MOUNTED_DISPLAY;
    XrSystemId systemId = XR_NULL_SYSTEM_ID;
    XrResult systemResult = XR_ERROR_HANDLE_INVALID;
    if (XR_SUCCEEDED(instanceResult)) systemResult = xrGetSystem(instance, &systemInfo, &systemId);

    XrSession session = XR_NULL_HANDLE;
    XrResult sessionResult = XR_ERROR_EXTENSION_NOT_PRESENT;
    if (XR_SUCCEEDED(systemResult) && headlessAvailable) {
        XrSessionCreateInfo sessionInfo{XR_TYPE_SESSION_CREATE_INFO};
        sessionInfo.systemId = systemId;
        sessionResult = xrCreateSession(instance, &sessionInfo, &session);
    }

    XrSpace localSpace = XR_NULL_HANDLE;
    XrResult spaceResult = XR_ERROR_SESSION_NOT_RUNNING;
    if (XR_SUCCEEDED(sessionResult)) {
        XrReferenceSpaceCreateInfo spaceInfo{XR_TYPE_REFERENCE_SPACE_CREATE_INFO};
        spaceInfo.referenceSpaceType = XR_REFERENCE_SPACE_TYPE_LOCAL;
        spaceInfo.poseInReferenceSpace.orientation.w = 1.0F;
        spaceResult = xrCreateReferenceSpace(session, &spaceInfo, &localSpace);
    }

    if (localSpace != XR_NULL_HANDLE) xrDestroySpace(localSpace);
    if (session != XR_NULL_HANDLE) xrDestroySession(session);
    if (instance != XR_NULL_HANDLE) xrDestroyInstance(instance);

    const bool instanceAvailable = XR_SUCCEEDED(instanceResult) && XR_SUCCEEDED(propertiesResult);
    const bool systemAvailable = XR_SUCCEEDED(systemResult);
    const bool headlessSessionCreated = XR_SUCCEEDED(sessionResult);
    const char* status = instanceAvailable ? "passed" : "blocked";

    std::ostringstream json;
    json << "{\"format\":\"motiondeck-openxr-native-probe/1\","
         << "\"status\":\"" << status << "\","
         << "\"observationsOnly\":true,"
         << "\"productAuthority\":\"none\","
         << "\"openxrSdkCommit\":\"57af7fc61f9f2d492580cb28aab6d0ea59d8d417\","
         << "\"activeRuntimeManifest\":";
    if (activeRuntimeManifest.empty()) json << "null";
    else json << "\"" << EscapeJson(activeRuntimeManifest) << "\"";
    json << ",\"runtime\":{";
    if (instanceAvailable) {
        json << "\"name\":\"" << EscapeJson(instanceProperties.runtimeName) << "\","
             << "\"version\":\"" << VersionString(instanceProperties.runtimeVersion) << "\"";
    } else {
        json << "\"name\":null,\"version\":null";
    }
    json << "},\"extensions\":[";
    for (std::size_t index = 0; index < extensions.size(); ++index) {
        if (index > 0) json << ',';
        json << "\"" << EscapeJson(extensions[index]) << "\"";
    }
    json << "],\"system":{";
    json << "\"available\":" << Bool(systemAvailable) << ",\"systemId\":";
    if (systemAvailable) json << static_cast<unsigned long long>(systemId);
    else json << "null";
    json << "},\"headless":{";
    json << "\"extensionAvailable\":" << Bool(headlessAvailable) << ','
         << "\"sessionCreated\":" << Bool(headlessSessionCreated) << ','
         << "\"localSpaceCreated\":" << Bool(XR_SUCCEEDED(spaceResult)) << ','
         << "\"provesUnwornHmdTracking\":false},"
         << "\"results":{";
    json << "\"enumerateExtensions\":" << static_cast<int32_t>(extensionResult) << ','
         << "\"createInstance\":" << static_cast<int32_t>(instanceResult) << ','
         << "\"getInstanceProperties\":" << static_cast<int32_t>(propertiesResult) << ','
         << "\"getSystem\":" << static_cast<int32_t>(systemResult) << ','
         << "\"createHeadlessSession\":" << static_cast<int32_t>(sessionResult) << ','
         << "\"createLocalSpace\":" << static_cast<int32_t>(spaceResult)
         << "}}\n";
    std::cout << json.str();
    return instanceAvailable ? 0 : 2;
}

}  // namespace

int main(int argc, char** argv) {
    if (argc == 2 && std::string(argv[1]) == "--selftest") return SelfTest();
    if (argc == 2 && std::string(argv[1]) == "--probe") return Probe();
    std::cerr << "Usage: motiondeck-openxr-probe --selftest | --probe\n";
    return 64;
}
