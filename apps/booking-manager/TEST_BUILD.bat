@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite" call npm install
if errorlevel 1 (echo [GRESKA] npm install nije uspeo & pause & exit /b 1)
call npm test
if errorlevel 1 (pause & exit /b 1)
call npm run build
if errorlevel 1 (pause & exit /b 1)
echo [OK] Testovi + Vite PWA build.
pause
