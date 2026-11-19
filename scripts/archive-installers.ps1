param(
  [string]$Archive = 'E:\跨多多安装包\跨多多标题工坊'
)
# Move freshly built installers from release/ into the central archive folder,
# then refresh SHA256SUMS.txt. ASCII-only on purpose: PowerShell 5.1 reads
# UTF-8 without BOM as ANSI, which can break parsing.
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Archive | Out-Null

$release = Join-Path $PSScriptRoot '..\release'
Get-ChildItem $release -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^KuaduoTitleWorkshop-.*\.(zip|7z|exe)$' } |
  ForEach-Object {
    Move-Item $_.FullName (Join-Path $Archive $_.Name) -Force
    Write-Host "moved: $($_.Name)"
  }

$lines = Get-ChildItem $Archive -File |
  Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
  Sort-Object Name |
  ForEach-Object {
    $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
    "$hash  $($_.Name)"
  }
$lines | Set-Content (Join-Path $Archive 'SHA256SUMS.txt') -Encoding ASCII
Write-Host "archive: $Archive ($($lines.Count) files)"
