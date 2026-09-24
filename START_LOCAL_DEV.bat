@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo Pokreni najpre npm install
  pause
  exit /b 1
)
start "RMC V41 - API i React" cmd /k "npm run dev"
timeout /t 3 >nul
start "" "http://localhost:5173/"
