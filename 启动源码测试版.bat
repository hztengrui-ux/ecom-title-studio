@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
start "跨多多标题工坊-源码测试" "%~dp0node_modules\electron\dist\electron.exe" . --dev

