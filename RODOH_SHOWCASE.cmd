@echo off
setlocal
cd /d "%~dp0"
where pwsh >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-infinite-fabric-showcase.ps1"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-infinite-fabric-showcase.ps1"
)
exit /b %ERRORLEVEL%
