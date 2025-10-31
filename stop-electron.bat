@echo off
chcp 65001 >nul
title إيقاف تطبيق Electron

echo.
echo ═══════════════════════════════════════
echo 🛑 إيقاف تطبيق Electron
echo ═══════════════════════════════════════
echo.

REM إيقاف عمليات Electron
echo 🔍 البحث عن عمليات Electron...

tasklist | findstr /I "electron" >nul 2>&1
if errorlevel 1 (
    echo ℹ️  لا توجد عمليات Electron قيد التشغيل
) else (
    echo 🛑 إيقاف عمليات Electron...
    taskkill /IM electron.exe /F >nul 2>&1
    echo ✅ تم إيقاف عمليات Electron
)

REM إيقاف عمليات Node.js المتعلقة بـ Vite
echo 🔍 البحث عن عمليات Vite...

tasklist | findstr /I "node" >nul 2>&1
if errorlevel 1 (
    echo ℹ️  لا توجد عمليات Node.js قيد التشغيل
) else (
    echo 🛑 إيقاف عمليات Node.js...
    taskkill /IM node.exe /F >nul 2>&1
    echo ✅ تم إيقاف عمليات Node.js
)

echo.
echo ✅ تم إيقاف التطبيق بنجاح
echo.
echo ═══════════════════════════════════════
echo.
pause

