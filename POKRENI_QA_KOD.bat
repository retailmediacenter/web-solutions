@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\qa\POKRENI_PRIVATNI_QA_KOD.ps1"
pause
