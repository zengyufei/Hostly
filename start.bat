@echo off
chcp 65001 >nul

rem 当右键选择“以管理员身份运行”时，

rem Windows 会将当前工作目录 (Current Working Directory) 默认切换到 C:\Windows\System32，而不是脚本所在的目录。

rem 需要 cd /d "%~dp0" 命令将工作目录切换到当前脚本所在的目录

cd /d "%~dp0"

call hostly-core-win-x64.exe import myEnv  --target hosts.txt --open --single

pause
