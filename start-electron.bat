@echo off
chcp 65001 >nul
title نظام إدارة المخزون الاحترافي - Electron

echo.
echo ═══════════════════════════════════════
echo 🚀 نظام إدارة المخزون الاحترافي
echo 📱 تطبيق سطح المكتب (Electron)
echo ═══════════════════════════════════════
echo.

REM فحص إذا كان Node.js مثبت
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js غير مثبت!
    echo 💡 يرجى تثبيت Node.js من: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js مثبت

echo.
echo 📦 فحص التبعيات...
if not exist node_modules (
    echo 📥 تثبيت التبعيات...
    npm install
    if errorlevel 1 (
        echo ❌ فشل في تثبيت التبعيات
        pause
        exit /b 1
    )
)

echo ✅ التبعيات موجودة

echo.
echo 🚀 بدء تطبيق Electron...
echo 💡 قد يستغرق بضع ثوان للتحميل...
echo.
echo ═══════════════════════════════════════
echo.

REM بدء التطبيق
npm run dev:electron

REM إذا انتهى البرنامج
echo.
echo 🛑 تم إيقاف التطبيق
pause

