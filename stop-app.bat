@echo off
echo ========================================
echo SZA Schedule App - Stop Script
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo ✓ Successfully stopped all Node.js processes
    echo The app should no longer be running
) else (
    echo - No Node.js processes were found running
)

echo.
echo Press any key to exit...
pause >nul
