@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   DIY动效编辑台  -  视频动效编辑工作台
echo ============================================
echo.
echo 正在启动本地服务（首次启动约需 3-5 秒）...
echo 浏览器将自动打开 http://localhost:9379/
echo 关闭此窗口即停止服务。
echo.
start "" http://localhost:9379/
call npm.cmd run dev -- --host --port 9379
pause
