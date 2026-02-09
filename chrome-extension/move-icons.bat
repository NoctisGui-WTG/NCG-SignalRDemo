@echo off
echo ====================================
echo 移动图标文件到icons文件夹
echo ====================================
echo.

set "source=%USERPROFILE%\Downloads"
set "dest=%~dp0icons"

echo 源文件夹: %source%
echo 目标文件夹: %dest%
echo.

if not exist "%dest%" (
    echo 创建icons文件夹...
    mkdir "%dest%"
)

echo 正在移动文件...
move /Y "%source%\icon16.png" "%dest%\" 2>nul
if %errorlevel% equ 0 echo ✓ icon16.png 已移动

move /Y "%source%\icon48.png" "%dest%\" 2>nul
if %errorlevel% equ 0 echo ✓ icon48.png 已移动

move /Y "%source%\icon128.png" "%dest%\" 2>nul
if %errorlevel% equ 0 echo ✓ icon128.png 已移动

echo.
echo ====================================
echo 检查文件是否存在...
echo ====================================

if exist "%dest%\icon16.png" (
    echo ✓ icon16.png 存在
) else (
    echo ✗ icon16.png 不存在
)

if exist "%dest%\icon48.png" (
    echo ✓ icon48.png 存在
) else (
    echo ✗ icon48.png 不存在
)

if exist "%dest%\icon128.png" (
    echo ✓ icon128.png 存在
) else (
    echo ✗ icon128.png 不存在
)

echo.
echo 按任意键继续...
pause >nul
