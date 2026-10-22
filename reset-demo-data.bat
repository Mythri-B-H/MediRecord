@echo off
REM MediRecord - put the demo data back to its clean starting state (takes seconds).
cd /d "%~dp0web"
node scripts\seed-demo.js
pause
