@echo off
chcp 65001 >nul
echo ========================================
echo 🔍 التحقق من جدول أسعار الموردين
echo ========================================
echo.

set "DB_HOST=172.10.0.16"
set "DB_PORT=5432"
set "DB_NAME=m5zon_local"
set "DB_USER=postgres"

REM البحث عن psql
set "PSQL_CMD=psql"
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

echo 🔄 جاري الفحص...
echo.

set PGPASSWORD=P@$$w0rd@1234
"%PSQL_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "check-supplier-products.sql"

pause
