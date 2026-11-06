$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'LinguaDesk.lnk'
$launcher = Join-Path $root 'scripts\launch.vbs'
$icon = Join-Path $root 'public\icons\linguadesk.ico'

if (-not (Test-Path $launcher)) {
  throw "找不到启动脚本：$launcher"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$shortcut.Arguments = '"' + $launcher + '"'
$shortcut.WorkingDirectory = $root
$shortcut.Description = 'LinguaDesk · 安静书桌'
if (Test-Path $icon) {
  $shortcut.IconLocation = "$icon,0"
}
$shortcut.Save()

Write-Host "已创建桌面快捷方式：$shortcutPath"
