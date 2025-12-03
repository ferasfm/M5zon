@echo off
setlocal

REM --- Configuration ---
set "DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com"
set "DB_PORT=6543"
set "DB_USER=postgres.guwikjytecvuplplpkmx"
set "DB_NAME=postgres"
set "PGPASSWORD=P@$$w0rd@1234@123"

REM Set backup filename with timestamp
set "BACKUP_DIR=%~dp0backups"
set "TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "FILENAME=%BACKUP_DIR%\%DB_NAME%_backup_%TIMESTAMP%.sql"

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Starting backup from Supabase (via Pooler)...
echo Host: %DB_HOST%
echo Port: %DB_PORT%
echo Database: %DB_NAME%
echo User: %DB_USER%
echo.

echo [DEBUG] Testing DNS resolution...
nslookup %DB_HOST%
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] DNS Resolution Failed!
    echo The computer cannot find the IP address for: %DB_HOST%
    echo.
    pause
    exit /b 1
)
echo [SUCCESS] DNS resolved successfully.
echo.

echo [DEBUG] Testing connection (Ping)...
ping %DB_HOST% -n 2
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Ping failed. This is normal for some cloud servers.
    echo Proceeding with backup attempt...
) else (
    echo [SUCCESS] Connection established.
)
echo.

REM 1. Check if pg_dump is in PATH
where pg_dump >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PG_DUMP_CMD=pg_dump"
    goto :RunBackup
)
echo pg_dump not found in PATH. Searching in Program Files...

if exist "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" (
    set "PG_DUMP_CMD=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
    goto :RunBackup
)

if exist "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" (
    set "PG_DUMP_CMD=C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
    goto :RunBackup
)

if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" (
    set "PG_DUMP_CMD=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    goto :RunBackup
)

if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" (
    set "PG_DUMP_CMD=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    goto :RunBackup
)

REM If not found anywhere
echo [ERROR] pg_dump command not found!
echo Please make sure PostgreSQL is installed or add the bin folder to your PATH.
echo.
pause
exit /b 1

:RunBackup
echo Found pg_dump at: "%PG_DUMP_CMD%"
echo Backing up...

"%PG_DUMP_CMD%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%FILENAME%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup completed successfully!
    echo File saved as: %FILENAME%
) else (
    echo.
    echo [ERROR] Backup failed. Please check your internet connection.
)

pause
