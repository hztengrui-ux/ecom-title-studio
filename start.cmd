@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 需要 Node.js 20 或更高版本。
  echo 请先安装 Node.js：https://nodejs.org/
  echo.
  pause
  exit /b 1
)
node server.mjs --open
if errorlevel 1 pause
