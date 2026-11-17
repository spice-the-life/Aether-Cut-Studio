Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appUrl = "https://ais-pre-2qvmmu72gwpzslfpemhobj-38638488375.us-east1.run.app"

edge64 = shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
edge32 = shell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
chrome64 = shell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
chrome32 = shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")
chromeUser = shell.ExpandEnvironmentStrings("%LocalAppData%\Google\Chrome\Application\chrome.exe")

If fso.FileExists(edge64) Then
  shell.Run """" & edge64 & """ --app=""" & appUrl & """ --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy", 1, False
ElseIf fso.FileExists(edge32) Then
  shell.Run """" & edge32 & """ --app=""" & appUrl & """ --window-size=1440,900 --enable-gpu-rasterization --enable-zero-copy", 1, False
ElseIf fso.FileExists(chrome64) Then
  shell.Run """" & chrome64 & """ --app=""" & appUrl & """ --window-size=1440,900 --enable-gpu-rasterization", 1, False
ElseIf fso.FileExists(chrome32) Then
  shell.Run """" & chrome32 & """ --app=""" & appUrl & """ --window-size=1440,900 --enable-gpu-rasterization", 1, False
ElseIf fso.FileExists(chromeUser) Then
  shell.Run """" & chromeUser & """ --app=""" & appUrl & """ --window-size=1440,900 --enable-gpu-rasterization", 1, False
Else
  shell.Run """" & appUrl & """", 1, False
End If
