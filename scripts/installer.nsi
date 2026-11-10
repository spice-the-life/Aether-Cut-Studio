Unicode true
RequestExecutionLevel user
SetCompressor zlib

!define PRODUCT_NAME "AetherCut Studio"
!define PRODUCT_VERSION "1.1.0"
!define PRODUCT_PUBLISHER "AetherCut Studio"
!define PRODUCT_EXE "AetherCut Studio.exe"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "/app/applet/public/installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe"
InstallDir "$LOCALAPPDATA\Programs\AetherCut Studio"

!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}/Contrib/Graphics/Icons/orange-install.ico"
!define MUI_UNICON "${NSISDIR}/Contrib/Graphics/Icons/orange-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch AetherCut Studio"
!insertmacro MUI_PAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite try
  File /r "/app/applet/release/win-unpacked/*.*"
  
  CreateDirectory "$SMPROGRAMS\AetherCut Studio"
  CreateShortCut "$SMPROGRAMS\AetherCut Studio\AetherCut Studio.lnk" "$INSTDIR\${PRODUCT_EXE}"
  CreateShortCut "$DESKTOP\AetherCut Studio.lnk" "$INSTDIR\${PRODUCT_EXE}"
SectionEnd
