@echo off
cd /d "%~dp0"
echo 正在启动本地网页测试版，浏览器会自动打开...
node server.mjs --open
pause

