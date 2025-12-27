@echo off
chcp 65001 >nul
echo ========================================
echo 🔓 إعادة تعيين كلمة مرور admin
echo ========================================
echo.

set "DB_HOST=172.10.0.16"
set "DB_PORT=5432"
set "DB_NAME=m5zon_local"
set "DB_USER=postgres"
set "PGPASSWORD=P@$$w0rd@1234"

REM البحث عن psql
set "PSQL_CMD=psql"
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

echo 🔄 جاري إعادة تعيين كلمة المرور...
echo.

REM تنفيذ الأمر مباشرة
"%PSQL_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "UPDATE users SET password_hash = '$2b$10$ln7sPMkRQFjrb1MmLKPLd.VokbQnExKe6aLGvisFrzlVa4Y6baqa6', failed_login_attempts = 0, locked_until = NULL WHERE username = 'admin'; SELECT username, is_active, failed_login_attempts FROM users WHERE username = 'admin';"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ تم إعادة تعيين كلمة المرور بنجاح!
    echo ========================================
    echo.
    echo 📋 بيانات الدخول:
    echo    اسم المستخدم: admin
    echo    كلمة المرور: admin123
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ فشل إعادة تعيين كلمة المرور
    echo ========================================
    echo.
)

pause
