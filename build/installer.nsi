Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!define PRODUCT_NAME "跨多多标题工坊"
!define PRODUCT_VERSION "1.1.0"
!define PRODUCT_PUBLISHER "Kuaduo"
!define APP_EXE "KuaduoTitleWorkshop.exe"
!define STAGE_DIR "E:\DSH项目\ecom-title-studio\release\installer-stage"
!define OUT_FILE "E:\DSH项目\ecom-title-studio\release\KuaduoTitleWorkshop-1.1.0-Setup.exe"
!define ICON_FILE "E:\DSH项目\ecom-title-studio\build\icon.ico"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\KuaduoTitleWorkshop"

Name "${PRODUCT_NAME}"
Caption "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\KuaduoTitleWorkshop"
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${PRODUCT_NAME}"
VIProductVersion "1.1.0.0"
VIAddVersionKey /LANG=2052 "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=2052 "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=2052 "FileDescription" "${PRODUCT_NAME} 安装程序"
VIAddVersionKey /LANG=2052 "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey /LANG=2052 "LegalCopyright" "Copyright (c) 2026 Kuaduo"

SetCompressor /SOLID lzma
SetCompressorDictSize 64
ManifestDPIAware true

!define MUI_ABORTWARNING
!define MUI_ICON "${ICON_FILE}"
!define MUI_UNICON "${ICON_FILE}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "启动 ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_LINK "打开安装目录"
!define MUI_FINISHPAGE_LINK_LOCATION "$INSTDIR"
!define MUI_DIRECTORYPAGE_TEXT_TOP "选择 ${PRODUCT_NAME} 的安装位置。建议使用默认目录，或安装到空间充足的 D 盘。"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "安装 ${PRODUCT_NAME}" SecInstall
  SectionIn RO
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "${STAGE_DIR}\*.*"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

  ; 保留用户数据 KuaduoTitleWorkshop-data，只删除程序文件。
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
