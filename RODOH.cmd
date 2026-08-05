@echo off
setlocal
where pwsh.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set "RODOH_PS=pwsh.exe"
) else (
  set "RODOH_PS=powershell.exe"
)
"%RODOH_PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-estate\Invoke-RodohEstate.ps1" %*
exit /b %ERRORLEVEL%
