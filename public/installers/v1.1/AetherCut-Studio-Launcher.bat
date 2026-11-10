@echo off
setlocal enabledelayedexpansion
title AetherCut Studio Version 1.1

echo ====================================================================
echo               AetherCut Studio - Version 1.1
echo       Professional Video Editing & VFX Compositing Workstation
echo ====================================================================
echo.
echo Launching standalone native desktop workstation window...
echo.

set APP_URL=https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app

:: Check if Microsoft Edge is available (default on Windows 10 and 11)
where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching with Microsoft Edge App Runtime...
    start msedge --app="%APP_URL%" --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy
    goto :success
)

:: Check if Google Chrome is available
where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Launching with Google Chrome App Runtime...
    start chrome --app="%APP_URL%" --window-size=1440,900 --enable-gpu-rasterization
    goto :success
)

:: Fallback to default browser
echo [OK] Opening in default browser...
start "" "%APP_URL%"

:success
echo.
echo [DONE] AetherCut Studio is running!
timeout /t 3 >nul
exit /b 0
