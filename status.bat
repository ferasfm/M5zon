@echo off
chcp 65001 >nul
title حالة نظام إدارة المخزون

echo.
echo ═══════════════════════════════════════
echo 📊 حالة نظام إدارة المخزون الاحترافي
echo ═══════════════════════════════════════
echo.

REM فحص Node.js
echo 🔍 فحص Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js غير مثبت
) else (
    for /f %%i in ('node --version') do echo ✅ Node.js: %%i
)

REM فحص npm
echo 🔍 فحص npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm غير متاح
) else (
    for /f %%i in ('npm --version') do echo ✅ npm: %%i
)

echo.
echo 🔍 فحص المنفذ 3000...

REM فحص المنفذ
netstat -ano | findstr :3000 >nul 2>&1
if errorlevel 1 (
    echo 🔴 الحالة: متوقف
    echo 📡 المنفذ 3000: متاح
    echo 💡 يمكنك تشغيل البرنامج باستخدام start.bat
) else (
    echo 🟢 الحالة: يعمل
    echo 📡 المنفذ 3000: مستخدم
    echo 🌐 الرابط: http://localhost:3000
    echo.
    echo 🔍 العمليات النشطة:
    netstat -ano | findstr :3000
    echo.
    echo 💡 لإيقاف البرنامج استخدم stop.bat
)

echo.
echo 📁 فحص ملفات المشروع...
if exist package.json (
    echo ✅ package.json موجود
) else (
    echo ❌ package.json غير موجود
)

if exist node_modules (
    echo ✅ node_modules موجود
) else (
    echo ❌ node_modules غير موجود - يحتاج npm install
)

if exist vite.config.ts (
    echo ✅ vite.config.ts موجود
) else (
    echo ❌ vite.config.ts غير موجود
)

echo.
echo ═══════════════════════════════════════
echo.
pause