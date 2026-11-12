param(
  [string]$ExePath = "",
  [string]$CertificatePath = $env:CSC_LINK,
  [string]$CertificatePassword = $env:CSC_KEY_PASSWORD
)

$ErrorActionPreference = "Stop"

if (-not $ExePath) {
  $ExePath = Join-Path $PSScriptRoot "..\release\win-unpacked\KuaduoTitleWorkshop.exe"
}
$ExePath = (Resolve-Path -LiteralPath $ExePath).Path

if (-not $CertificatePath) {
  throw "缺少代码签名证书。请设置 CSC_LINK 为 .pfx 文件路径，CSC_KEY_PASSWORD 为证书密码。"
}
if (-not (Test-Path -LiteralPath $CertificatePath)) {
  throw "找不到证书文件：$CertificatePath（EV 硬件令牌请使用厂商签名工具，不能直接用 .pfx）。"
}
if (-not $CertificatePassword) {
  throw "缺少证书密码。请设置 CSC_KEY_PASSWORD。"
}

$signtool = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source
if (-not $signtool) {
  $kits = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin",
    "$env:ProgramFiles\Windows Kits\10\bin"
  ) | Where-Object { Test-Path $_ }
  $candidate = Get-ChildItem $kits -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($candidate) { $signtool = $candidate.FullName }
}
if (-not $signtool) {
  throw "找不到 signtool.exe。请安装 Windows SDK，或把 signtool 加入 PATH。"
}

Write-Host "签名文件：$ExePath"
Write-Host "证书：$CertificatePath"
Write-Host "时间戳：http://timestamp.digicert.com"

& $signtool sign `
  /fd SHA256 `
  /f "$CertificatePath" `
  /p "$CertificatePassword" `
  /tr "http://timestamp.digicert.com" `
  /td SHA256 `
  /a `
  "$ExePath"

if ($LASTEXITCODE -ne 0) {
  throw "signtool 签名失败，退出码 $LASTEXITCODE"
}

& $signtool verify /pa /v "$ExePath"
if ($LASTEXITCODE -ne 0) {
  throw "签名验证失败，退出码 $LASTEXITCODE"
}

Write-Host "签名完成。请重新打 zip，或运行 npm run dist:sign 生成带签名的安装包。" -ForegroundColor Green
