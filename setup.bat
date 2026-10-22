@echo off
REM MediRecord - one-time setup + start. Double-click this file.
cd /d "%~dp0web"

echo.
echo ===== Step 1/3: installing dependencies (first time takes a few minutes) =====
call npm install
if errorlevel 1 goto :err

echo.
echo ===== Step 2/3: database setup + demo data =====
node scripts\setup.js
if errorlevel 1 goto :err

echo.
echo ===== Step 3/3: starting MediRecord =====
echo Open http://localhost:3000 in your browser. Keep this window open while you use the app.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm run dev
goto :eof

:err
echo.
echo Setup stopped because of an error (read the message above).
pause
