@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo [GRESKA] Potreban Node.js 20.19+ & pause & exit /b 1)
if not exist "node_modules\vite" (
  echo Instaliram Vite u poseban Booking Manager...
  call npm install
  if errorlevel 1 (echo [GRESKA] npm install nije uspeo & pause & exit /b 1)
)
echo OTVORI: http://localhost:4184
call npm run dev
pause
