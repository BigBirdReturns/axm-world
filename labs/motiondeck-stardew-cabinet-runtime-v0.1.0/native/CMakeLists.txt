cmake_minimum_required(VERSION 3.24)
project(MotionDeckOpenXRProbe VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
set(BUILD_LOADER ON CACHE BOOL "" FORCE)
set(DYNAMIC_LOADER OFF CACHE BOOL "" FORCE)
set(BUILD_API_LAYERS OFF CACHE BOOL "" FORCE)
set(BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(BUILD_CONFORMANCE_TESTS OFF CACHE BOOL "" FORCE)
set(BUILD_SDK_TESTS OFF CACHE BOOL "" FORCE)
set(BUILD_ALL_EXTENSIONS OFF CACHE BOOL "" FORCE)
set(BUILD_WITH_SYSTEM_JSONCPP OFF CACHE BOOL "" FORCE)
set(INSTALL_TO_ARCHITECTURE_PREFIXES OFF CACHE BOOL "" FORCE)

# OpenXR SDK 1.1.62, released 2026-07-31. Exact source authority is pinned.
FetchContent_Declare(
  openxr_sdk
  GIT_REPOSITORY https://github.com/KhronosGroup/OpenXR-SDK.git
  GIT_TAG 57af7fc61f9f2d492580cb28aab6d0ea59d8d417
  GIT_SHALLOW FALSE
  GIT_PROGRESS TRUE
)
FetchContent_MakeAvailable(openxr_sdk)

add_executable(motiondeck-openxr-probe src/main.cpp)
target_link_libraries(motiondeck-openxr-probe PRIVATE openxr_loader)
if(WIN32)
  target_compile_definitions(motiondeck-openxr-probe PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
  target_link_libraries(motiondeck-openxr-probe PRIVATE advapi32)
endif()

if(MSVC)
  target_compile_options(motiondeck-openxr-probe PRIVATE /W4 /permissive- /EHsc)
else()
  target_compile_options(motiondeck-openxr-probe PRIVATE -Wall -Wextra -Wpedantic)
endif()
