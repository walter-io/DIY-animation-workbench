@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DIY动效编辑台
echo ============================================
echo   DIY动效编辑台  -  视频动效编辑工作台
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if exist "node_modules" goto :start_server

echo 首次运行，正在安装依赖（约 1-3 分钟，只需一次）...
echo.
call npm.cmd install
if errorlevel 1 goto :install_failed
echo.
echo 依赖安装完成。
echo.

:start_server
echo 正在启动本地服务（约需 3-5 秒）...
echo 浏览器将自动打开 http://localhost:9379/
echo 关闭此窗口即停止服务。
echo.
start "" http://localhost:9379/
call npm.cmd run dev -- --host --port 9379
pause
exit /b 0

:no_node
echo [错误] 没有检测到 Node.js。
echo        请先安装 Node.js 20 或更高版本：https://nodejs.org/
echo.
pause
exit /b 1

:install_failed
echo.
echo [错误] 依赖安装失败。常见原因：
echo        1. 网络不通 —— 可先切换国内镜像再试：
echo           npm config set registry https://registry.npmmirror.com
echo        2. Node.js 版本过低 —— 需要 20 或更高。
echo.
pause
exit /b 1
