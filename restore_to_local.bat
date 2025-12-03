@echo off
setlocal

REM --- Configuration ---
REM ضع الرقم السري لقاعدة البيانات المحلية هنا
set "PGPASSWORD=P@$$w0rd@1234@123"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_USER=postgres"
set "TARGET_DB=m5zon_local"

REM Check if a file was dragged onto the script
set "BACKUP_FILE=%~1"
if "%BACKUP_FILE%"=="" (
    echo.
    echo [INFO] No backup file provided.
    echo Please drag and drop the .sql file onto this script.
    echo.
    set /p "BACKUP_FILE=Or paste the full path to the .sql file here: "
)

REM Remove quotes if present
set "BACKUP_FILE=%BACKUP_FILE:"=%"

if not exist "%BACKUP_FILE%" (
    echo.
    echo [ERROR] File not found: "%BACKUP_FILE%"
    pause
    exit /b 1
)

REM Find psql
set "PSQL_CMD=psql"
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_CMD=C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

echo.
echo [INFO] Creating database '%TARGET_DB%' if it doesn't exist...
"%PSQL_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %TARGET_DB%;" >nul 2>&1

echo.
echo [INFO] Restoring data from: "%BACKUP_FILE%"
echo [INFO] Target Database: %TARGET_DB%
echo.
echo Please wait... this may take a while depending on the file size.
echo.

"%PSQL_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %TARGET_DB% -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Restore completed successfully!
) else (
    echo.
    echo [ERROR] Restore failed. Check the error messages above.
)

pause
