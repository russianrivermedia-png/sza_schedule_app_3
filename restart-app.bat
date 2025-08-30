@echo off
echo ========================================
echo SZA Schedule App - Restart Script
echo ========================================
echo.

echo [1/4] Stopping any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Stopped existing Node.js processes
) else (
    echo - No existing Node.js processes found
)

echo.
echo [2/4] Waiting for processes to fully stop...
timeout /t 2 /nobreak >nul

echo.
echo [3/4] Installing dependencies (if needed)...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Please make sure Node.js is installed and try again
    pause
    exit /b 1
)

echo.
echo [4/4] Starting the application...
echo.
echo Starting SZA Schedule App...
echo The app will open in your browser at: http://localhost:3000
echo.
echo To stop the app, press Ctrl+C in this window
echo.
echo ========================================
echo.

call npm start

echo.
echo ========================================
echo App stopped. Press any key to exit...
echo ========================================
pause >nul
