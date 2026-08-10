@echo off
chcp 65001 >nul

cd /d "%~dp0"

call hostly-core-win-x64.exe close myEnv

pause
