@echo off
setlocal
title AetherCut Studio Version 1.1

echo ================================================================
echo   AetherCut Studio - Version 1.1 Desktop Launcher
echo ================================================================
echo   Launching high-performance native desktop workstation...
echo ================================================================
echo.

:: 1. Try launching in dedicated window using Microsoft Edge (installed on all Windows 10 & 11)
where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start msedge --app="https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app" --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy
    goto :done
)

:: 2. Try Google Chrome app mode
where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start chrome --app="https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app" --window-size=1440,900 --enable-gpu-rasterization
    goto :done
)

:: 3. Fallback: Launch default browser
start "" "https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app"

:done
exit /b 0
