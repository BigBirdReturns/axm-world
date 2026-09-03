@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-classic-trials.ps1"
if errorlevel 1 (
  echo.
  echo The Classic Trials launcher failed.
  pause
)
