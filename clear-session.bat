@echo off
chcp 65001 >nul

REM تشغيل سكريبت Node.js لمسح البيانات
node scripts/clear-electron-data.js

pause
