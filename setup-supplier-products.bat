@echo off
chcp 65001 >nul
echo ========================================
echo 💰 إعداد نظام أسعار الموردين
echo ========================================
echo.

set "DB_HOST=172.10.0.16"
set "DB_PORT=5432"
set "DB_NAME=m5zon_local"
set "DB_USER=postgres"
set "SQL_FILE=supabase\create_supplier_products.sql"

echo 📍 معلومات الاتصال:
echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    Database: %DB_NAME%
echo    User: %DB_USER%
echo.

REM البحث عن psql
set "PSQL_CMD=psql"
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

echo 🔄 جاري إنشاء جدول أسعار الموردين...
echo.

set PGPASSWORD=P@$$w0rd@1234
"%PSQL_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%SQL_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ تم إنشاء الجدول بنجاح!
    echo ========================================
    echo.
    echo 📋 الخطوات التالية:
    echo    1. أعد بناء التطبيق: npm run build
    echo    2. ابنِ Electron: npx electron-builder --win
    echo    3. شغّل التطبيق: dist\m5zon 1.0.0.exe
    echo    4. اذهب إلى: المنتجات → اختر منتج → أسعار الموردين
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ فشل إنشاء الجدول
    echo ========================================
    echo.
    echo 💡 تحقق من:
    echo    - تشغيل PostgreSQL على 172.10.0.16
    echo    - صحة كلمة المرور
    echo    - وجود قاعدة البيانات m5zon_local
    echo.
)

pause
