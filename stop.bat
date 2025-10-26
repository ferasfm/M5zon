@echo off
chcp 65001 >nul
title إيقاف نظام إدارة المخزون

echo.
echo ═══════════════════════════════════════
echo 🛑 إيقاف نظام إدارة المخزون الاحترافي
echo ═══════════════════════════════════════
echo.

echo 🔍 البحث عن العمليات التي تستخدم المنفذ 3000...

REM البحث عن العمليات
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    set PID=%%a
    goto :found
)

echo ✅ لا توجد عمليات تعمل على المنفذ 3000
goto :end

:found
if "%PID%"=="" (
    echo ✅ لا توجد عمليات تعمل على المنفذ 3000
    goto :end
)

echo 🛑 إيقاف العملية %PID%...
taskkill /PID %PID% /F >nul 2>&1

if errorlevel 1 (
    echo ❌ فشل في إيقاف العملية %PID%
    echo 💡 جرب إغلاق نافذة Terminal يدوياً
) else (
    echo ✅ تم إيقاف العملية %PID% بنجاح
)

REM البحث عن عمليات إضافية وإيقافها
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo 🛑 إيقاف العملية الإضافية %%a...
    taskkill /PID %%a /F >nul 2>&1
)

:end
echo.
echo 🎉 تم إيقاف جميع العمليات
echo 💡 يمكنك الآن تشغيل البرنامج مرة أخرى باستخدام start.bat
echo.
pause