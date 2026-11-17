Unicode true
RequestExecutionLevel user
SetCompressor zlib

!define PRODUCT_NAME "AetherCut Studio"
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.3.0"
!endif
!define PRODUCT_PUBLISHER "AetherCut Studio"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\AetherCutStudio"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
!ifndef OUT_FILE
  OutFile "/app/applet/Installers/v1.3/AetherCut-Studio-Setup-1.3.0.exe"
!else
  OutFile "${OUT_FILE}"
!endif
InstallDir "$LOCALAPPDATA\Programs\AetherCut Studio"
InstallDirRegKey HKCU "${UNINSTALL_KEY}" "InstallLocation"

VIProductVersion "${PRODUCT_VERSION}.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Setup Wizard"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 AetherCut Studio"

!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "/app/applet/build/icon.ico"
!define MUI_UNICON "/app/applet/build/icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp
!define MUI_FINISHPAGE_RUN_TEXT "Launch AetherCut Studio"
!insertmacro MUI_PAGE_FINISH

Function LaunchApp
  ExecShell "open" "$SYSDIR\wscript.exe" '"$INSTDIR\Launch-AetherCut.vbs"'
FunctionEnd

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

Section "AetherCut Studio" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "/app/applet/build/icon.ico"
  File "/app/applet/scripts/Launch-AetherCut.vbs"
  File "/app/applet/Installers/v1.3/AetherCut-Studio-Launcher.bat"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\AetherCut Studio"
  CreateShortCut "$SMPROGRAMS\AetherCut Studio\AetherCut Studio.lnk" "$SYSDIR\wscript.exe" '"$INSTDIR\Launch-AetherCut.vbs"' "$INSTDIR\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\AetherCut Studio\Uninstall AetherCut Studio.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\AetherCut Studio.lnk" "$SYSDIR\wscript.exe" '"$INSTDIR\Launch-AetherCut.vbs"' "$INSTDIR\icon.ico" 0

  ; Add/Remove Programs registration
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\AetherCut Studio.lnk"
  Delete "$SMPROGRAMS\AetherCut Studio\AetherCut Studio.lnk"
  Delete "$SMPROGRAMS\AetherCut Studio\Uninstall AetherCut Studio.lnk"
  RMDir "$SMPROGRAMS\AetherCut Studio"

  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\Launch-AetherCut.vbs"
  Delete "$INSTDIR\AetherCut-Studio-Launcher.bat"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "${UNINSTALL_KEY}"
SectionEnd
