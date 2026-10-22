@echo off
REM MediRecord - start the app (after setup.bat has been run once).
cd /d "%~dp0web"
echo Open http://localhost:3000 in your browser. Keep this window open while you use the app.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"
call npm run dev
